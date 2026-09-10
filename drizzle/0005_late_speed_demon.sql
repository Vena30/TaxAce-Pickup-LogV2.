ALTER TABLE `tax_year_records` MODIFY COLUMN `status` enum('In Vault','Contacted','Scheduled','Prepped for Pickup','Picked Up','Prep to Shred','Shredded','Hold') NOT NULL DEFAULT 'In Vault';
