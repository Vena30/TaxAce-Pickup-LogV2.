CREATE TABLE `dismissed_duplicates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client1Id` int NOT NULL,
	`client2Id` int NOT NULL,
	`dismissedBy` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dismissed_duplicates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tax_year_records` MODIFY COLUMN `status` enum('In Vault','Contacted','Scheduled','Prepped','Picked Up','Prep to Shred','Shredded','Hold') NOT NULL DEFAULT 'In Vault';--> statement-breakpoint
ALTER TABLE `tax_year_records` ADD `contactStatus` enum('Not Contacted','Left Voicemail','Called No Answer','Spoke to Client','Email Sent') DEFAULT 'Not Contacted' NOT NULL;