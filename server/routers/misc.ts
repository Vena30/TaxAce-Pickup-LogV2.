import { z } from "zod";
import {
  addRecordHistory,
  bulkUpdateTaxYearRecordStatus,
  dismissDuplicatePair,
  findDuplicateCandidates,
  getDashboardStats,
  getRecordHistory,
  globalSearch,
  listTaxYearRecords,
  mergeClients,
} from "../db";
import { TAX_STATUSES } from "../../drizzle/schema";
import { publicProcedure, router } from "../_core/trpc";

export const historyRouter = router({
  getByRecord: publicProcedure
    .input(z.object({ taxYearRecordId: z.number() }))
    .query(({ input }) => getRecordHistory(input.taxYearRecordId)),
});

export const dashboardRouter = router({
  stats: publicProcedure.query(() => getDashboardStats()),
});

export const searchRouter = router({
  global: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(({ input }) => globalSearch(input.query)),
});

export const duplicatesRouter = router({
  candidates: publicProcedure.query(() => findDuplicateCandidates()),

  dismiss: publicProcedure
    .input(z.object({ client1Id: z.number(), client2Id: z.number(), dismissedBy: z.string().optional() }))
    .mutation(({ input }) => dismissDuplicatePair(input)),

  getClientRecords: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => listTaxYearRecords({ clientId: input.clientId, showArchived: true })),

  merge: publicProcedure
    .input(
      z.object({
        primaryClientId: z.number(),
        duplicateClientId: z.number(),
        conflictResolutions: z.array(
          z.object({
            primaryRecordId: z.number().nullable(),
            duplicateRecordId: z.number().nullable(),
            keepWhich: z.enum(["primary", "duplicate"]),
          })
        ),
      })
    )
    .mutation(({ input, ctx }) =>
      mergeClients({
        primaryClientId: input.primaryClientId,
        duplicateClientId: input.duplicateClientId,
        conflictResolutions: input.conflictResolutions,
        userName: ctx.user?.name ?? "Staff",
      })
    ),
});

export const bulkRouter = router({
  updateStatus: publicProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1),
        status: z.enum(TAX_STATUSES),
        userName: z.string().optional(),
      })
    )
    .mutation(({ input }) => bulkUpdateTaxYearRecordStatus(input.ids, input.status, input.userName)),
});

// ─── CSV Import ───────────────────────────────────────────────────────────────

const VALID_STATUSES_IMPORT = [
  "In Vault",
  "Contacted",
  "Scheduled",
  "Prepped for Pickup",
  "Picked Up",
  "Prep to Shred",
  "Shredded",
  "Hold",
] as const;

function normalizeStatus(raw: string): (typeof VALID_STATUSES_IMPORT)[number] {
  const trimmed = raw?.trim() ?? "";
  const found = VALID_STATUSES_IMPORT.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  return found ?? "Hold";
}

export const csvImportRouter = router({
  importRecords: publicProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            clientFirstName: z.string(),
            clientLastName: z.string(),
            spouseFirstName: z.string().optional(),
            spouseLastName: z.string().optional(),
            clientNotes: z.string().optional(),
            businessName: z.string().optional(),
            taxYear: z.number().int(),
            status: z.string().optional(),
            printedCopy: z.string().optional(),
            statusDate: z.string().optional(),
            recordNotes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = {
        clientsCreated: 0,
        businessesCreated: 0,
        recordsCreated: 0,
        errors: [] as string[],
      };

      // Group rows by client
      const clientMap = new Map<
        string,
        {
          firstName: string;
          lastName: string;
          spouseFirstName?: string;
          spouseLastName?: string;
          notes?: string;
          id?: number;
        }
      >();

      for (const row of input.rows) {
        const key = `${row.clientFirstName.trim().toLowerCase()}|${row.clientLastName.trim().toLowerCase()}`;
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            firstName: row.clientFirstName.trim(),
            lastName: row.clientLastName.trim(),
            spouseFirstName: row.spouseFirstName?.trim() || undefined,
            spouseLastName: row.spouseLastName?.trim() || undefined,
            notes: row.clientNotes?.trim() || undefined,
          });
        }
      }

      const { getDb } = await import("../db");
      const { clients, businesses: bizTable, taxYearRecords } = await import("../../drizzle/schema");
      const { eq, and, isNull, sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const createdClientIds = new Map<string, number>();

      for (const [key, clientData] of Array.from(clientMap)) {
        try {
          const existing = await db
            .select()
            .from(clients)
            .where(
              and(
                isNull(clients.deletedAt),
                eq(clients.firstName, clientData.firstName),
                eq(clients.lastName, clientData.lastName)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            createdClientIds.set(key, existing[0].id);
          } else {
            await db.insert(clients).values({
              firstName: clientData.firstName,
              lastName: clientData.lastName,
              spouseFirstName: clientData.spouseFirstName ?? null,
              spouseLastName: clientData.spouseLastName ?? null,
              notes: clientData.notes ?? null,
              isActive: true,
            });
            const newClient = await db
              .select()
              .from(clients)
              .where(
                and(
                  eq(clients.firstName, clientData.firstName),
                  eq(clients.lastName, clientData.lastName)
                )
              )
              .orderBy(sql`id DESC`)
              .limit(1);
            if (newClient[0]) {
              createdClientIds.set(key, newClient[0].id);
              results.clientsCreated++;
            }
          }
        } catch (e) {
          results.errors.push(`Failed to create client ${clientData.firstName} ${clientData.lastName}: ${e}`);
        }
      }

      for (const row of input.rows) {
        const clientKey = `${row.clientFirstName.trim().toLowerCase()}|${row.clientLastName.trim().toLowerCase()}`;
        const clientId = createdClientIds.get(clientKey);
        if (!clientId) {
          results.errors.push(`Client not found for row: ${row.clientFirstName} ${row.clientLastName}`);
          continue;
        }

        try {
          let businessId: number | null = null;

          if (row.businessName?.trim()) {
            const existingBiz = await db
              .select()
              .from(bizTable)
              .where(
                and(
                  eq(bizTable.clientId, clientId),
                  eq(bizTable.name, row.businessName.trim()),
                  isNull(bizTable.deletedAt)
                )
              )
              .limit(1);

            if (existingBiz.length > 0) {
              businessId = existingBiz[0].id;
            } else {
              await db.insert(bizTable).values({ clientId, name: row.businessName.trim() });
              const newBiz = await db
                .select()
                .from(bizTable)
                .where(and(eq(bizTable.clientId, clientId), eq(bizTable.name, row.businessName.trim())))
                .orderBy(sql`id DESC`)
                .limit(1);
              if (newBiz[0]) {
                businessId = newBiz[0].id;
                results.businessesCreated++;
              }
            }
          }

          const status = normalizeStatus(row.status ?? "");

          await db.insert(taxYearRecords).values({
            clientId: businessId ? null : clientId,
            businessId: businessId ?? null,
            taxYear: row.taxYear,
            status,
            printedCopy:
              row.printedCopy?.trim().toLowerCase() === "yes"
                ? "Yes"
                : row.printedCopy?.trim().toLowerCase() === "no"
                ? "No"
                : null,
            statusDate: row.statusDate ? new Date(row.statusDate) : (status !== "In Vault" ? new Date() : null),
            notes: row.recordNotes?.trim() || null,
          });

          results.recordsCreated++;
        } catch (e) {
          results.errors.push(`Failed to import row for ${row.clientFirstName} ${row.clientLastName} ${row.taxYear}: ${e}`);
        }
      }

      return results;
    }),
});
