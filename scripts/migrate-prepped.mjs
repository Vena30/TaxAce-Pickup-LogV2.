import { createConnection } from 'mysql2/promise';

async function run() {
  const conn = await createConnection(process.env.DATABASE_URL);
  try {
    // Step 1: Expand the enum to include BOTH old and new values
    await conn.execute(
      "ALTER TABLE tax_year_records MODIFY COLUMN status enum('In Vault','Contacted','Scheduled','Prepped','Prepped for Pickup','Picked Up','Prep to Shred','Shredded','Hold') NOT NULL DEFAULT 'In Vault'"
    );
    console.log('Step 1: enum expanded');

    // Step 2: Update existing Prepped rows to Prepped for Pickup
    const [result] = await conn.execute(
      "UPDATE tax_year_records SET status = 'Prepped for Pickup' WHERE status = 'Prepped'"
    );
    console.log('Step 2: updated rows:', result.affectedRows);

    // Step 3: Remove old Prepped value from enum
    await conn.execute(
      "ALTER TABLE tax_year_records MODIFY COLUMN status enum('In Vault','Contacted','Scheduled','Prepped for Pickup','Picked Up','Prep to Shred','Shredded','Hold') NOT NULL DEFAULT 'In Vault'"
    );
    console.log('Step 3: enum finalized');
  } finally {
    await conn.end();
  }
}

run().catch(console.error);
