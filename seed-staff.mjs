import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const TEMP_PASSWORD = "WelcomeTaxAce!";

const staff = [
  { name: "Nataly", email: "nataly@taxace.com", role: "admin" },
  { name: "Ivy", email: "ivy@taxace.com", role: "admin" },
  { name: "Cassandra", email: "cassandra@taxace.com", role: "admin" },
  { name: "Yesenia", email: "yesenia@taxace.com", role: "admin" },
  { name: "Samantha", email: "samantha@taxace.com", role: "user" },
  { name: "Amecille", email: "amecille@taxace.com", role: "user" },
  { name: "Amber", email: "amber@taxace.com", role: "user" },
  { name: "Valjoseph", email: "valjoseph@taxace.com", role: "user" },
];

const conn = await createConnection(DATABASE_URL);

const hash = await bcrypt.hash(TEMP_PASSWORD, 12);

for (const member of staff) {
  try {
    await conn.execute(
      `INSERT INTO staffUsers (name, email, passwordHash, role, mustChangePassword, isActive)
       VALUES (?, ?, ?, ?, true, true)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         role = VALUES(role),
         isActive = true`,
      [member.name, member.email, hash, member.role]
    );
    console.log(`✓ ${member.name} (${member.email}) — ${member.role}`);
  } catch (err) {
    console.error(`✗ ${member.email}:`, err.message);
  }
}

await conn.end();
console.log("\nDone! All staff seeded with temp password: WelcomeTaxAce!");
