import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const CSV_PATH = "/home/ubuntu/upload/UPDATEDTaxAcePickUpLog-MASTERPICKUPLOG.csv";

// ─── Simple CSV parser (handles quoted fields with newlines) ──────────────────
function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ─── Mappings ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  "in vault": "In Vault",
  "picked up": "Picked Up",
  "contacted": "Contacted",
  "scheduled": "Scheduled",
  "shred": "Prep to Shred",
  "prep to shred": "Prep to Shred",
  "shredded": "Shredded",
  "hold": "Hold",
  "prepped for pickup": "Prepped for Pickup",
};

const COMM_MAP = {
  "not called": "Not Contacted",
  "not contacted": "Not Contacted",
  "spoke to client": "Spoke to Client",
  "left vm": "Left Voicemail",
  "left voicemail": "Left Voicemail",
  "email sent": "Email Sent",
  "scheduled": "Scheduled",
  "n/a": "Not Contacted",
  "": "Not Contacted",
};

// Entries that are businesses (not personal clients)
const BUSINESS_NAMES = [
  "AAG CABINET CO., INC. DBA NAPA KITCHEN & BATH",
  "THE GST NON-EXEMPT TRUST FBO JENNIFER MARCUS",
  "GST EXEMPT TR FBO JENNIFER MARCUS",
  "Manuel Morillo Insurance Agency Inc",
];

// Business → personal client name mapping
const BUSINESS_TO_CLIENT = {
  "AAG CABINET CO., INC. DBA NAPA KITCHEN & BATH": "Gail Otis",
  "THE GST NON-EXEMPT TRUST FBO JENNIFER MARCUS": "Jennifer Marcus",
  "GST EXEMPT TR FBO JENNIFER MARCUS": "Jennifer Marcus",
  "Manuel Morillo Insurance Agency Inc": "Manuel Morillo",
};

const SKIP_NAMES = ["Doe, John"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isBusiness(name) {
  return BUSINESS_NAMES.some(b => b.toLowerCase() === name.toLowerCase());
}

function formatPersonName(raw) {
  const name = raw.trim();
  // Business indicators — don't reformat
  if (/\b(INC|LLC|CORP|DBA|TRUST|FBO|AGENCY|SERVICES|GROUP|ASSOCIATES|LTD|LP|PC)\b/i.test(name)) return name;
  if (/,\s*(INC|LLC|CORP|LTD)\.?$/i.test(name)) return name;

  // "LAST, FIRST" — swap and title-case
  if (name.includes(",")) {
    const commaIdx = name.indexOf(",");
    const last = name.slice(0, commaIdx).trim();
    const first = name.slice(commaIdx + 1).trim();
    if (first && last) {
      const toTitle = s => s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      return `${toTitle(first)} ${toTitle(last)}`;
    }
  }
  // "FIRST LAST" — just title-case
  return name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function parseDate(str) {
  if (!str) return null;
  const s = str.trim();
  if (!s || s.toUpperCase() === "N/A" || s === "?" || s === "-" || s === "TBD") return null;
  // Only accept mm/dd/yyyy or yyyy-mm-dd patterns
  if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function mapStatus(s) { return STATUS_MAP[(s || "").trim().toLowerCase()] || "In Vault"; }
function mapComm(s) { return COMM_MAP[(s || "").trim().toLowerCase()] || "Not Contacted"; }

function parseYears(currentYear, otherYears) {
  const years = new Set();
  const cur = parseInt(currentYear);
  if (!isNaN(cur) && cur > 2000) years.add(cur);
  if (otherYears && otherYears.trim()) {
    for (const y of otherYears.split(",")) {
      const n = parseInt(y.trim().replace(/[^0-9]/g, ""));
      if (!isNaN(n) && n > 2000 && n < 2030) years.add(n);
    }
  }
  return [...years];
}

function combineNotes(notes, lykaNotes) {
  const parts = [];
  if (notes && notes.trim()) parts.push(notes.trim());
  if (lykaNotes && lykaNotes.trim()) parts.push(`[Lyka] ${lykaNotes.trim()}`);
  return parts.join("\n") || null;
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────
const content = readFileSync(CSV_PATH, "utf-8").replace(/^\uFEFF/, "");
const allRows = parseCSV(content);

// Find header row (contains "CLIENT NAME")
const headerIdx = allRows.findIndex(r => r[0] && r[0].includes("CLIENT NAME"));
const dataRows = allRows.slice(headerIdx + 1).filter(r => r[0] && r[0].trim());

console.log(`Parsed ${dataRows.length} data rows from CSV`);

// ─── Import ───────────────────────────────────────────────────────────────────
const conn = await createConnection(DATABASE_URL);
const now = new Date();

let clientsCreated = 0;
let businessesCreated = 0;
let recordsCreated = 0;
let skipped = 0;

// Map: formatted name (lowercase) → DB id
const clientNameToId = {};

// ── Pass 1: Create personal clients ──────────────────────────────────────────
for (const row of dataRows) {
  const rawName = row[0]?.trim();
  if (!rawName) continue;
  if (SKIP_NAMES.some(s => s.toLowerCase() === rawName.toLowerCase())) { skipped++; continue; }
  if (isBusiness(rawName)) continue;

  const formatted = formatPersonName(rawName);
  const key = formatted.toLowerCase();
  if (clientNameToId[key]) continue; // already created

  // Split into firstName / lastName (first word = first name, rest = last name)
  const parts = formatted.split(/\s+/);
  const firstName = parts[0] || formatted;
  const lastName = parts.slice(1).join(" ") || "";

  const [result] = await conn.execute(
    `INSERT INTO clients (firstName, lastName, isActive, createdAt, updatedAt) VALUES (?, ?, 1, ?, ?)`,
    [firstName, lastName, now, now]
  );
  clientNameToId[key] = result.insertId;
  clientsCreated++;
}

// Ensure Gail Otis exists (for AAG Cabinet)
const gailKey = "gail otis";
if (!clientNameToId[gailKey]) {
  const [result] = await conn.execute(
    `INSERT INTO clients (firstName, lastName, isActive, createdAt, updatedAt) VALUES (?, ?, 1, ?, ?)`,
    ["Gail", "Otis", now, now]
  );
  clientNameToId[gailKey] = result.insertId;
  clientsCreated++;
  console.log("  + Created: Gail Otis (for AAG Cabinet)");
}

console.log(`Created ${clientsCreated} clients`);

// ── Pass 2: Create tax year records for personal clients ──────────────────────
for (const row of dataRows) {
  const rawName = row[0]?.trim();
  if (!rawName) continue;
  if (SKIP_NAMES.some(s => s.toLowerCase() === rawName.toLowerCase())) continue;
  if (isBusiness(rawName)) continue;

  const formatted = formatPersonName(rawName);
  const clientId = clientNameToId[formatted.toLowerCase()];
  if (!clientId) continue;

  const years = parseYears(row[1], row[2]);
  const status = mapStatus(row[3]);
  const commStatus = mapComm(row[4]);
  const commDate = parseDate(row[5]);
  const scheduledDate = parseDate(row[7]);
  const datePickedUp = parseDate(row[8]);
  const notes = combineNotes(row[11], row[13]);
  const statusDate = datePickedUp || scheduledDate;

  for (const year of years) {
    const [existing] = await conn.execute(
      `SELECT id FROM tax_year_records WHERE clientId = ? AND taxYear = ? AND deletedAt IS NULL LIMIT 1`,
      [clientId, year]
    );
    if (existing.length > 0) continue;

    await conn.execute(
      `INSERT INTO tax_year_records (clientId, taxYear, status, commStatus, commDate, statusDate, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, year, status, commStatus, commDate, statusDate, notes, now, now]
    );
    recordsCreated++;
  }
}

// ── Pass 3: Create businesses and their tax year records ──────────────────────
for (const row of dataRows) {
  const rawName = row[0]?.trim();
  if (!rawName) continue;
  if (!isBusiness(rawName)) continue;

  const clientName = BUSINESS_TO_CLIENT[rawName];
  if (!clientName) { console.log(`  WARNING: No client for business: ${rawName}`); continue; }

  // Find client — try formatted name first, then original
  const clientKey = formatPersonName(clientName).toLowerCase();
  const clientId = clientNameToId[clientKey] || clientNameToId[clientName.toLowerCase()];
  if (!clientId) { console.log(`  WARNING: Client not found: ${clientName}`); continue; }

  const [bizResult] = await conn.execute(
    `INSERT INTO businesses (name, clientId, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
    [rawName, clientId, now, now]
  );
  const businessId = bizResult.insertId;
  businessesCreated++;
  console.log(`  + Business: ${rawName} → ${clientName}`);

  const years = parseYears(row[1], row[2]);
  const status = mapStatus(row[3]);
  const commStatus = mapComm(row[4]);
  const commDate = parseDate(row[5]);
  const scheduledDate = parseDate(row[7]);
  const datePickedUp = parseDate(row[8]);
  const notes = combineNotes(row[11], row[13]);
  const statusDate = datePickedUp || scheduledDate;

  for (const year of years) {
    await conn.execute(
      `INSERT INTO tax_year_records (businessId, taxYear, status, commStatus, commDate, statusDate, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, year, status, commStatus, commDate, statusDate, notes, now, now]
    );
    recordsCreated++;
  }
}

await conn.end();

console.log(`\n✅ Import complete!`);
console.log(`   Clients created:    ${clientsCreated}`);
console.log(`   Businesses created: ${businessesCreated}`);
console.log(`   Tax year records:   ${recordsCreated}`);
console.log(`   Skipped:            ${skipped}`);
