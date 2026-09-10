import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Staff Users (email+password login) ──────────────────────────────────────

export const staffUsers = pgTable("staffUsers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  role: roleEnum("role").default("user").notNull(),
  mustChangePassword: boolean("mustChangePassword").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type StaffUser = typeof staffUsers.$inferSelect;
export type InsertStaffUser = typeof staffUsers.$inferInsert;

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  spouseName: varchar("spouseName", { length: 256 }),
  spouseFirstName: varchar("spouseFirstName", { length: 128 }),
  spouseLastName: varchar("spouseLastName", { length: 128 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Businesses ──────────────────────────────────────────────────────────────

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  notes: text("notes"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;

// ─── Tax Year Records ─────────────────────────────────────────────────────────

export const TAX_STATUSES = [
  "In Vault",
  "Contacted",
  "Scheduled",
  "Prepped for Pickup",
  "Picked Up",
  "Prepped for Mail",
  "Mailed",
  "Prep to Shred",
  "Shredded",
  "Hold",
] as const;

export type TaxStatus = (typeof TAX_STATUSES)[number];

export const taxStatusEnum = pgEnum("tax_status", TAX_STATUSES);

export const COMM_STATUSES = [
  "Not Contacted",
  "Left Voicemail",
  "Called No Answer",
  "Spoke to Client",
  "Email Sent",
] as const;

export type CommStatus = (typeof COMM_STATUSES)[number];
/** @deprecated use CommStatus */
export const CONTACT_STATUSES = COMM_STATUSES;
export type ContactStatus = CommStatus;

export const commStatusEnum = pgEnum("comm_status", COMM_STATUSES);
export const printedCopyEnum = pgEnum("printed_copy", ["Yes", "No"]);

export const taxYearRecords = pgTable("tax_year_records", {
  id: serial("id").primaryKey(),
  // Either clientId or businessId must be set (not both)
  clientId: integer("clientId"),
  businessId: integer("businessId"),
  taxYear: integer("taxYear").notNull(),
  status: taxStatusEnum("status").default("In Vault").notNull(),
  commStatus: commStatusEnum("commStatus").default("Not Contacted").notNull(),
  commDate: timestamp("commDate"),
  statusDate: timestamp("statusDate"),
  printedCopy: printedCopyEnum("printedCopy"),
  datePickedUp: date("datePickedUp"),
  dateShredded: date("dateShredded"),
  locationVaultSlot: varchar("locationVaultSlot", { length: 128 }),
  notes: text("notes"),
  isArchived: boolean("isArchived").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TaxYearRecord = typeof taxYearRecords.$inferSelect;
export type InsertTaxYearRecord = typeof taxYearRecords.$inferInsert;

// ─── Record History ───────────────────────────────────────────────────────────

export const recordHistory = pgTable("record_history", {
  id: serial("id").primaryKey(),
  taxYearRecordId: integer("taxYearRecordId").notNull(),
  userId: integer("userId"),
  userName: varchar("userName", { length: 256 }),
  changeType: varchar("changeType", { length: 64 }).notNull(),
  fieldChanged: varchar("fieldChanged", { length: 128 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecordHistory = typeof recordHistory.$inferSelect;
export type InsertRecordHistory = typeof recordHistory.$inferInsert;

// ─── Dismissed Duplicates ─────────────────────────────────────────────────────

export const dismissedDuplicates = pgTable("dismissed_duplicates", {
  id: serial("id").primaryKey(),
  client1Id: integer("client1Id").notNull(),
  client2Id: integer("client2Id").notNull(),
  dismissedBy: varchar("dismissedBy", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DismissedDuplicate = typeof dismissedDuplicates.$inferSelect;
export type InsertDismissedDuplicate = typeof dismissedDuplicates.$inferInsert;
