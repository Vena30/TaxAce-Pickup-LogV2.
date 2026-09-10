import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  InsertUser,
  businesses,
  clients,
  dismissedDuplicates,
  recordHistory,
  taxYearRecords,
  users,
  type InsertBusiness,
  type InsertClient,
  type InsertDismissedDuplicate,
  type InsertRecordHistory,
  type InsertTaxYearRecord,
  type TaxStatus,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sqlClient = neon(process.env.DATABASE_URL);
      _db = drizzle(sqlClient);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listClients(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [isNull(clients.deletedAt)];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(clients.firstName, term),
        ilike(clients.lastName, term),
        ilike(clients.spouseFirstName, term),
        ilike(clients.spouseLastName, term),
        ilike(sql`CONCAT(${clients.firstName}, ' ', ${clients.lastName})`, term)
      )!
    );
  }
  return db
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(clients.lastName, clients.firstName);
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data).returning();
  return result[0];
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function softDeleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));
}

// ─── Businesses ───────────────────────────────────────────────────────────────

export async function listBusinessesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(businesses)
    .where(and(eq(businesses.clientId, clientId), isNull(businesses.deletedAt)))
    .orderBy(businesses.name);
}

export async function getBusinessById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, id), isNull(businesses.deletedAt)))
    .limit(1);
  return result[0];
}

export async function createBusiness(data: InsertBusiness) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(businesses).values(data);
}

export async function updateBusiness(id: number, data: Partial<InsertBusiness>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(businesses).set(data).where(eq(businesses.id, id));
}

export async function softDeleteBusiness(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(businesses).set({ deletedAt: new Date() }).where(eq(businesses.id, id));
}

export async function searchBusinesses(search: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${search.trim()}%`;
  return db
    .select()
    .from(businesses)
    .where(and(ilike(businesses.name, term), isNull(businesses.deletedAt)))
    .orderBy(businesses.name)
    .limit(20);
}

// ─── Tax Year Records ─────────────────────────────────────────────────────────

export async function listTaxYearRecords(opts?: {
  clientId?: number;
  businessId?: number;
  status?: TaxStatus;
  taxYear?: number;
  showArchived?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [isNull(taxYearRecords.deletedAt)];
  if (opts?.clientId) conditions.push(eq(taxYearRecords.clientId, opts.clientId));
  if (opts?.businessId) conditions.push(eq(taxYearRecords.businessId, opts.businessId));
  if (opts?.status) conditions.push(eq(taxYearRecords.status, opts.status));
  if (opts?.taxYear) conditions.push(eq(taxYearRecords.taxYear, opts.taxYear));
  conditions.push(eq(taxYearRecords.isArchived, opts?.showArchived === true));

  return db
    .select()
    .from(taxYearRecords)
    .where(and(...conditions))
    .orderBy(desc(taxYearRecords.taxYear));
}

export async function getTaxYearRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(taxYearRecords)
    .where(and(eq(taxYearRecords.id, id), isNull(taxYearRecords.deletedAt)))
    .limit(1);
  return result[0];
}

export async function createTaxYearRecord(data: InsertTaxYearRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taxYearRecords).values(data);
}

export async function updateTaxYearRecord(id: number, data: Partial<InsertTaxYearRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(taxYearRecords).set(data).where(eq(taxYearRecords.id, id));
}

export async function bulkUpdateTaxYearRecordStatus(ids: number[], status: TaxStatus, userName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch existing records to log history
  const existing = await db
    .select()
    .from(taxYearRecords)
    .where(and(inArray(taxYearRecords.id, ids), isNull(taxYearRecords.deletedAt)));

  // Skip records already in terminal statuses (Picked Up or Shredded)
  const TERMINAL: TaxStatus[] = ["Picked Up", "Shredded"];
  const eligible = existing.filter((r) => !TERMINAL.includes(r.status as TaxStatus));
  const skipped = existing.length - eligible.length;

  if (eligible.length === 0) return { updated: 0, skipped };

  const eligibleIds = eligible.map((r) => r.id);

  // Auto-stamp statusDate and legacy date fields
  const now = new Date();
  const extraFields: Partial<InsertTaxYearRecord> = { statusDate: now };
  if (status === "Picked Up") extraFields.datePickedUp = new Date().toISOString().split("T")[0];
  if (status === "Shredded") extraFields.dateShredded = new Date().toISOString().split("T")[0];

  await db
    .update(taxYearRecords)
    .set({ status, ...extraFields })
    .where(inArray(taxYearRecords.id, eligibleIds));

  // Log history for each updated record
  for (const rec of eligible) {
    if (rec.status !== status) {
      await db.insert(recordHistory).values({
        taxYearRecordId: rec.id,
        userName: userName ?? "Staff",
        changeType: "status_change",
        fieldChanged: "status",
        oldValue: rec.status,
        newValue: status,
        description: `Bulk status change from "${rec.status}" to "${status}"`,
      });
    }
  }

  return { updated: eligible.length, skipped };
}

export async function softDeleteTaxYearRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(taxYearRecords)
    .set({ deletedAt: new Date() })
    .where(eq(taxYearRecords.id, id));
}

// ─── Record History ───────────────────────────────────────────────────────────

export async function getRecordHistory(taxYearRecordId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(recordHistory)
    .where(eq(recordHistory.taxYearRecordId, taxYearRecordId))
    .orderBy(desc(recordHistory.createdAt));
}

export async function addRecordHistory(data: InsertRecordHistory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(recordHistory).values(data);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalClients: 0,
      activeClients: 0,
      inactiveClients: 0,
      inVault: 0,
      contacted: 0,
      scheduled: 0,
      prepped: 0,
      pickedUp: 0,
      preppedMail: 0,
      mailed: 0,
      prepToShred: 0,
      shredded: 0,
      hold: 0,
    };
  }

  const [totalClientsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clients)
    .where(isNull(clients.deletedAt));

  const [activeResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clients)
    .where(and(isNull(clients.deletedAt), eq(clients.isActive, true)));

  const [inactiveResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clients)
    .where(and(isNull(clients.deletedAt), eq(clients.isActive, false)));

  const statusCounts = await db
    .select({ status: taxYearRecords.status, count: sql<number>`COUNT(*)` })
    .from(taxYearRecords)
    .where(isNull(taxYearRecords.deletedAt))
    .groupBy(taxYearRecords.status);

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    byStatus[row.status] = Number(row.count);
  }

  return {
    totalClients: Number(totalClientsResult?.count ?? 0),
    activeClients: Number(activeResult?.count ?? 0),
    inactiveClients: Number(inactiveResult?.count ?? 0),
    inVault: byStatus["In Vault"] ?? 0,
    contacted: byStatus["Contacted"] ?? 0,
    scheduled: byStatus["Scheduled"] ?? 0,
    prepped: byStatus["Prepped for Pickup"] ?? 0,
    pickedUp: byStatus["Picked Up"] ?? 0,
    preppedMail: byStatus["Prepped for Mail"] ?? 0,
    mailed: byStatus["Mailed"] ?? 0,
    prepToShred: byStatus["Prep to Shred"] ?? 0,
    shredded: byStatus["Shredded"] ?? 0,
    hold: byStatus["Hold"] ?? 0,
  };
}

// ─── Global Search ────────────────────────────────────────────────────────────

export async function globalSearch(query: string) {
  const db = await getDb();
  if (!db) return { clients: [], businesses: [] };

  const term = `%${query.trim()}%`;

  const matchedClients = await db
    .select()
    .from(clients)
    .where(
      and(
        isNull(clients.deletedAt),
        or(
          ilike(clients.firstName, term),
          ilike(clients.lastName, term),
          ilike(clients.spouseFirstName, term),
          ilike(clients.spouseLastName, term),
          ilike(sql`CONCAT(${clients.firstName}, ' ', ${clients.lastName})`, term)
        )
      )
    )
    .limit(20);

  const matchedBusinesses = await db
    .select()
    .from(businesses)
    .where(and(isNull(businesses.deletedAt), ilike(businesses.name, term)))
    .limit(20);

  return { clients: matchedClients, businesses: matchedBusinesses };
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

export async function findDuplicateCandidates() {
  const db = await getDb();
  if (!db) return [];

  const allClients = await db
    .select()
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(clients.lastName, clients.firstName);

  const allBusinesses = await db
    .select()
    .from(businesses)
    .where(isNull(businesses.deletedAt));

  // Load dismissed pairs to filter them out
  const dismissed = await db.select().from(dismissedDuplicates);
  const dismissedKeys = new Set(
    dismissed.map((d) => `${Math.min(d.client1Id, d.client2Id)}-${Math.max(d.client1Id, d.client2Id)}`)
  );

  const duplicates: Array<{
    type: "name" | "spouse" | "business";
    reason: string;
    client1Id: number;
    client1Name: string;
    client2Id: number;
    client2Name: string;
  }> = [];

  const seen = new Set<string>();

  for (let i = 0; i < allClients.length; i++) {
    for (let j = i + 1; j < allClients.length; j++) {
      const a = allClients[i];
      const b = allClients[j];
      const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;

      if (seen.has(key) || dismissedKeys.has(key)) continue;

      const aFullName = `${a.firstName} ${a.lastName}`.toLowerCase();
      const bFullName = `${b.firstName} ${b.lastName}`.toLowerCase();

      // Similar name (same last name + similar first name)
      if (
        a.lastName.toLowerCase() === b.lastName.toLowerCase() &&
        (a.firstName.toLowerCase().startsWith(b.firstName.toLowerCase().charAt(0)) ||
          b.firstName.toLowerCase().startsWith(a.firstName.toLowerCase().charAt(0)))
      ) {
        duplicates.push({
          type: "name",
          reason: `Similar names: "${aFullName}" and "${bFullName}"`,
          client1Id: a.id,
          client1Name: `${a.firstName} ${a.lastName}`,
          client2Id: b.id,
          client2Name: `${b.firstName} ${b.lastName}`,
        });
        seen.add(key);
        continue;
      }

      // Shared spouse
      const aSpouse = [a.spouseFirstName, a.spouseLastName].filter(Boolean).join(" ").toLowerCase().trim();
      const bSpouse = [b.spouseFirstName, b.spouseLastName].filter(Boolean).join(" ").toLowerCase().trim();
      if (aSpouse && bSpouse && aSpouse === bSpouse) {
        duplicates.push({
          type: "spouse",
          reason: `Shared spouse name: "${[a.spouseFirstName, a.spouseLastName].filter(Boolean).join(" ")}"`,
          client1Id: a.id,
          client1Name: `${a.firstName} ${a.lastName}`,
          client2Id: b.id,
          client2Name: `${b.firstName} ${b.lastName}`,
        });
        seen.add(key);
      }
    }
  }

  // Shared business names across different clients
  const bizByName = new Map<string, typeof allBusinesses>();
  for (const biz of allBusinesses) {
    const k = biz.name.toLowerCase().trim();
    if (!bizByName.has(k)) bizByName.set(k, []);
    bizByName.get(k)!.push(biz);
  }

  for (const [, bizGroup] of Array.from(bizByName)) {
    if (bizGroup.length < 2) continue;
    for (let i = 0; i < bizGroup.length; i++) {
      for (let j = i + 1; j < bizGroup.length; j++) {
        const biz1 = bizGroup[i];
        const biz2 = bizGroup[j];
        if (biz1.clientId === biz2.clientId) continue;

        const c1 = allClients.find((c) => c.id === biz1.clientId);
        const c2 = allClients.find((c) => c.id === biz2.clientId);
        if (!c1 || !c2) continue;

        const key = `${Math.min(c1.id, c2.id)}-${Math.max(c1.id, c2.id)}`;
        if (seen.has(key) || dismissedKeys.has(key)) continue;

        duplicates.push({
          type: "business",
          reason: `Shared business name: "${biz1.name}"`,
          client1Id: c1.id,
          client1Name: `${c1.firstName} ${c1.lastName}`,
          client2Id: c2.id,
          client2Name: `${c2.firstName} ${c2.lastName}`,
        });
        seen.add(key);
      }
    }
  }

  return duplicates;
}

// ─── Archive / Unarchive ─────────────────────────────────────────────────────

export async function archiveTaxYearRecord(id: number, archive: boolean, userName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getTaxYearRecordById(id);
  if (!existing) throw new Error("Record not found");
  await db.update(taxYearRecords).set({ isArchived: archive }).where(eq(taxYearRecords.id, id));
  await db.insert(recordHistory).values({
    taxYearRecordId: id,
    userName: userName ?? "Staff",
    changeType: "archive",
    fieldChanged: "isArchived",
    oldValue: String(!archive),
    newValue: String(archive),
    description: archive ? "Record archived" : "Record unarchived",
  });
}

// ─── Merge Clients ────────────────────────────────────────────────────────────

export async function mergeClients(opts: {
  primaryClientId: number;
  duplicateClientId: number;
  conflictResolutions: Array<{ primaryRecordId: number | null; duplicateRecordId: number | null; keepWhich: "primary" | "duplicate" }>;
  userName?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { primaryClientId, duplicateClientId, conflictResolutions, userName } = opts;

  // Move all businesses from duplicate to primary
  await db
    .update(businesses)
    .set({ clientId: primaryClientId })
    .where(and(eq(businesses.clientId, duplicateClientId), isNull(businesses.deletedAt)));

  // Get all tax year records for both clients
  const primaryRecords = await db
    .select()
    .from(taxYearRecords)
    .where(and(eq(taxYearRecords.clientId, primaryClientId), isNull(taxYearRecords.deletedAt)));

  const dupRecords = await db
    .select()
    .from(taxYearRecords)
    .where(and(eq(taxYearRecords.clientId, duplicateClientId), isNull(taxYearRecords.deletedAt)));

  // Build set of years already on primary
  const primaryYears = new Set(primaryRecords.map((r) => r.taxYear));

  for (const dupRec of dupRecords) {
    if (!primaryYears.has(dupRec.taxYear)) {
      // No conflict — move record to primary
      await db
        .update(taxYearRecords)
        .set({ clientId: primaryClientId })
        .where(eq(taxYearRecords.id, dupRec.id));
    } else {
      // Conflict — check resolution
      const resolution = conflictResolutions.find(
        (r) => r.duplicateRecordId === dupRec.id
      );
      if (resolution?.keepWhich === "duplicate") {
        // Keep duplicate's record: move it to primary, soft-delete primary's
        const primaryRec = primaryRecords.find((r) => r.taxYear === dupRec.taxYear);
        if (primaryRec) {
          await db
            .update(taxYearRecords)
            .set({ deletedAt: new Date() })
            .where(eq(taxYearRecords.id, primaryRec.id));
        }
        await db
          .update(taxYearRecords)
          .set({ clientId: primaryClientId })
          .where(eq(taxYearRecords.id, dupRec.id));
      } else {
        // Keep primary's record: soft-delete duplicate's
        await db
          .update(taxYearRecords)
          .set({ deletedAt: new Date() })
          .where(eq(taxYearRecords.id, dupRec.id));
      }
    }
  }

  // Soft-delete the duplicate client
  await db
    .update(clients)
    .set({ deletedAt: new Date() })
    .where(eq(clients.id, duplicateClientId));

  // Log the merge in history for all moved records
  const movedRecords = await db
    .select()
    .from(taxYearRecords)
    .where(and(eq(taxYearRecords.clientId, primaryClientId), isNull(taxYearRecords.deletedAt)));

  for (const rec of movedRecords) {
    await db.insert(recordHistory).values({
      taxYearRecordId: rec.id,
      userName: userName ?? "Staff",
      changeType: "merge",
      fieldChanged: "clientId",
      oldValue: String(duplicateClientId),
      newValue: String(primaryClientId),
      description: `Client merged: duplicate client #${duplicateClientId} merged into primary client #${primaryClientId}`,
    });
  }

  return { success: true, primaryClientId };
}

// ─── Clients with Tax Year Summaries ─────────────────────────────────────────

export async function listClientsWithSummary(search?: string, showInactive = false) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [isNull(clients.deletedAt), eq(clients.isActive, showInactive ? false : true)];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(clients.firstName, term),
        ilike(clients.lastName, term),
        ilike(clients.spouseFirstName, term),
        ilike(clients.spouseLastName, term),
        ilike(sql`CONCAT(${clients.firstName}, ' ', ${clients.lastName})`, term)
      )!
    );
  }

  const allClients = await db
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(clients.lastName, clients.firstName);

  if (allClients.length === 0) return [];

  const clientIds = allClients.map((c) => c.id);
  const records = await db
    .select({ id: taxYearRecords.id, clientId: taxYearRecords.clientId, taxYear: taxYearRecords.taxYear, status: taxYearRecords.status, isArchived: taxYearRecords.isArchived })
    .from(taxYearRecords)
    .where(
      and(
        isNull(taxYearRecords.deletedAt),
        isNull(taxYearRecords.businessId),
        inArray(taxYearRecords.clientId, clientIds)
      )
    );

  const summaryMap = new Map<number, Array<{ id: number; taxYear: number; status: string; isArchived: boolean }>>();
  for (const rec of records) {
    if (!rec.clientId) continue;
    if (!summaryMap.has(rec.clientId)) summaryMap.set(rec.clientId, []);
    summaryMap.get(rec.clientId)!.push({ id: rec.id, taxYear: rec.taxYear, status: rec.status, isArchived: rec.isArchived });
  }

  // Fetch business names for each client
  const bizRows = await db
    .select({ id: businesses.id, clientId: businesses.clientId, name: businesses.name })
    .from(businesses)
    .where(and(isNull(businesses.deletedAt), inArray(businesses.clientId, clientIds)));

  const bizMap = new Map<number, string[]>();
  for (const biz of bizRows) {
    if (!biz.clientId) continue;
    if (!bizMap.has(biz.clientId)) bizMap.set(biz.clientId, []);
    bizMap.get(biz.clientId)!.push(biz.name);
  }

  return allClients.map((c) => ({
    ...c,
    taxYearSummary: (summaryMap.get(c.id) ?? []).sort((a, b) => b.taxYear - a.taxYear),
    businessNames: bizMap.get(c.id) ?? [],
  }));
}

export async function dismissDuplicatePair(data: InsertDismissedDuplicate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Normalize order so (1,2) and (2,1) are treated the same
  const client1Id = Math.min(data.client1Id, data.client2Id);
  const client2Id = Math.max(data.client1Id, data.client2Id);
  await db.insert(dismissedDuplicates).values({ ...data, client1Id, client2Id });
}

// ─── All Tax Year Records with client/business info ───────────────────────────

export async function listAllTaxYearRecordsWithDetails(opts?: {
  status?: TaxStatus;
  statuses?: TaxStatus[];
  taxYear?: number;
  taxYears?: number[];
  showArchived?: boolean;
  showInactive?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [isNull(taxYearRecords.deletedAt)];
  if (opts?.status) conditions.push(eq(taxYearRecords.status, opts.status));
  if (opts?.statuses && opts.statuses.length > 0) conditions.push(inArray(taxYearRecords.status, opts.statuses));
  if (opts?.taxYear) conditions.push(eq(taxYearRecords.taxYear, opts.taxYear));
  if (opts?.taxYears && opts.taxYears.length > 0) conditions.push(inArray(taxYearRecords.taxYear, opts.taxYears));
  conditions.push(eq(taxYearRecords.isArchived, opts?.showArchived === true));

  const records = await db
    .select()
    .from(taxYearRecords)
    .where(and(...conditions))
    .orderBy(desc(taxYearRecords.taxYear));

  const allClients = await db.select().from(clients).where(isNull(clients.deletedAt));
  const allBusinesses = await db.select().from(businesses).where(isNull(businesses.deletedAt));

  const clientMap = new Map(allClients.map((c) => [c.id, c]));
  const bizMap = new Map(allBusinesses.map((b) => [b.id, b]));

  return records
    .map((r) => {
      const client = r.clientId ? clientMap.get(r.clientId) : undefined;
      const business = r.businessId ? bizMap.get(r.businessId) : undefined;
      const primaryClient = business ? clientMap.get(business.clientId) : client;

      return {
        ...r,
        clientName: client ? `${client.firstName} ${client.lastName}` : undefined,
        businessName: business?.name,
        primaryClientName: business && primaryClient
          ? `${primaryClient.firstName} ${primaryClient.lastName}`
          : undefined,
        primaryClientId: business?.clientId ?? r.clientId,
        primaryClientIsActive: primaryClient?.isActive,
      };
    })
    .filter((r) => r.primaryClientIsActive === (opts?.showInactive === true ? false : true));
}
