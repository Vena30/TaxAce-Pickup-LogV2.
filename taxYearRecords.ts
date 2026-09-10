import { z } from "zod";
import {
  addRecordHistory,
  archiveTaxYearRecord,
  createTaxYearRecord,
  getTaxYearRecordById,
  listAllTaxYearRecordsWithDetails,
  listTaxYearRecords,
  softDeleteTaxYearRecord,
  updateTaxYearRecord,
} from "../db";
import { TAX_STATUSES, COMM_STATUSES } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

const TaxStatusEnum = z.enum(TAX_STATUSES);
const CommStatusEnum = z.enum(COMM_STATUSES);

export const taxYearRecordsRouter = router({
  listByClient: publicProcedure
    .input(z.object({ clientId: z.number(), showArchived: z.boolean().optional() }))
    .query(({ input }) => listTaxYearRecords({ clientId: input.clientId, showArchived: input.showArchived })),

  listByBusiness: publicProcedure
    .input(z.object({ businessId: z.number(), showArchived: z.boolean().optional() }))
    .query(({ input }) => listTaxYearRecords({ businessId: input.businessId, showArchived: input.showArchived })),

  listAll: publicProcedure
    .input(
      z.object({
        statuses: z.array(TaxStatusEnum).optional(),
        taxYears: z.array(z.number()).optional(),
        showArchived: z.boolean().optional(),
        showInactive: z.boolean().optional(),
      }).optional()
    )
    .query(({ input }) =>
      listAllTaxYearRecordsWithDetails({
        statuses: input?.statuses,
        taxYears: input?.taxYears,
        showArchived: input?.showArchived,
        showInactive: input?.showInactive,
      })
    ),

  archive: publicProcedure
    .input(z.object({ id: z.number(), archive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await archiveTaxYearRecord(input.id, input.archive, ctx.user?.name ?? "Staff");
      return { success: true };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTaxYearRecordById(input.id)),

  create: publicProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        businessId: z.number().optional(),
        taxYear: z.number().int().min(1900).max(2100),
        status: TaxStatusEnum.optional(),
        printedCopy: z.enum(["Yes", "No"]).optional(),
        statusDate: z.string().nullable().optional(),
        commStatus: CommStatusEnum.optional(),
        commDate: z.string().nullable().optional(),
        notes: z.string().optional(),
        // legacy aliases kept for CSV import compatibility
        datePickedUp: z.string().nullable().optional(),
        dateShredded: z.string().nullable().optional(),
        contactStatus: CommStatusEnum.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const now = new Date();
      const resolvedStatus = input.status ?? "In Vault";
      const resolvedCommStatus = input.commStatus ?? input.contactStatus ?? "Not Contacted";

      await createTaxYearRecord({
        clientId: input.clientId ?? null,
        businessId: input.businessId ?? null,
        taxYear: input.taxYear,
        status: resolvedStatus,
        commStatus: resolvedCommStatus,
        statusDate: input.statusDate ? new Date(input.statusDate) : now,
        commDate: input.commDate ? new Date(input.commDate) : (resolvedCommStatus !== "Not Contacted" ? now : null),
        printedCopy: input.printedCopy ?? null,
        // keep legacy date fields for backward compat
        datePickedUp: input.datePickedUp ?? null,
        dateShredded: input.dateShredded ?? null,
        notes: input.notes ?? null,
      });
      return { success: true };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: TaxStatusEnum.optional(),
        printedCopy: z.enum(["Yes", "No"]).nullable().optional(),
        statusDate: z.string().nullable().optional(),
        commStatus: CommStatusEnum.nullable().optional(),
        commDate: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        taxYear: z.number().int().min(1900).max(2100).optional(),
        // legacy aliases
        datePickedUp: z.string().nullable().optional(),
        dateShredded: z.string().nullable().optional(),
        contactStatus: CommStatusEnum.nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;

      // Fetch old record for history
      const oldRecord = await getTaxYearRecordById(id);

      const now = new Date();
      const updateData: Record<string, unknown> = {};

      if (updates.status !== undefined) {
        updateData.status = updates.status;
        // Auto-stamp statusDate whenever status changes
        if (updates.status !== oldRecord?.status) {
          updateData.statusDate = updates.statusDate ? new Date(updates.statusDate) : now;
        }
      }
      // Allow explicit statusDate override
      if (updates.statusDate !== undefined && updates.status === undefined) {
        updateData.statusDate = updates.statusDate ? new Date(updates.statusDate) : null;
      }

      // Handle commStatus (also accept legacy contactStatus)
      const newCommStatus = updates.commStatus ?? updates.contactStatus;
      if (newCommStatus !== undefined) {
        updateData.commStatus = newCommStatus;
        // Auto-stamp commDate whenever commStatus changes
        if (newCommStatus !== oldRecord?.commStatus) {
          updateData.commDate = updates.commDate ? new Date(updates.commDate) : (newCommStatus ? now : null);
        }
        // Auto-set main status to "Contacted" when commStatus is "Spoke to Client"
        if (newCommStatus === "Spoke to Client" && (!updates.status || updates.status === oldRecord?.status)) {
          updateData.status = "Contacted";
          if (!updateData.statusDate) updateData.statusDate = now;
          updates.status = "Contacted";
        }
      }
      // Allow explicit commDate override
      if (updates.commDate !== undefined && newCommStatus === undefined) {
        updateData.commDate = updates.commDate ? new Date(updates.commDate) : null;
      }

      if (updates.printedCopy !== undefined) updateData.printedCopy = updates.printedCopy;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.taxYear !== undefined) updateData.taxYear = updates.taxYear;

      // Legacy date fields
      if (updates.datePickedUp !== undefined)
        updateData.datePickedUp = updates.datePickedUp ?? null;
      if (updates.dateShredded !== undefined)
        updateData.dateShredded = updates.dateShredded ?? null;

      // Auto-populate datePickedUp when status changes to "Picked Up" (legacy compat)
      if (updates.status === "Picked Up" && updates.datePickedUp === undefined && !oldRecord?.datePickedUp) {
        updateData.datePickedUp = new Date().toISOString().split("T")[0];
      }

      await updateTaxYearRecord(id, updateData as any);

      // Log history for each changed field
      const userName = ctx.user?.name ?? "System";
      const userId = ctx.user?.id ?? null;

      if (oldRecord) {
        const historyEntries = [];

        if (updates.status !== undefined && updates.status !== oldRecord.status) {
          historyEntries.push({
            taxYearRecordId: id,
            userId,
            userName,
            changeType: "status_change",
            fieldChanged: "status",
            oldValue: oldRecord.status,
            newValue: updates.status,
            description: `Status changed from "${oldRecord.status}" to "${updates.status}"`,
          });
        }
        if (newCommStatus !== undefined && newCommStatus !== oldRecord.commStatus) {
          historyEntries.push({
            taxYearRecordId: id,
            userId,
            userName,
            changeType: "comm_status_change",
            fieldChanged: "commStatus",
            oldValue: oldRecord.commStatus,
            newValue: newCommStatus,
            description: `Communication status changed from "${oldRecord.commStatus}" to "${newCommStatus}"`,
          });
        }
        if (updates.notes !== undefined && updates.notes !== oldRecord.notes) {
          historyEntries.push({
            taxYearRecordId: id,
            userId,
            userName,
            changeType: "notes_edit",
            fieldChanged: "notes",
            oldValue: oldRecord.notes,
            newValue: updates.notes,
            description: `Notes updated`,
          });
        }

        for (const entry of historyEntries) {
          await addRecordHistory(entry);
        }
      }

      return { success: true };
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete records." });
      }
      await softDeleteTaxYearRecord(input.id);
      return { success: true };
    }),
});
