ALTER TABLE `tax_year_records` RENAME COLUMN `contactStatus` TO `commStatus`;--> statement-breakpoint
ALTER TABLE `clients` ADD `spouseFirstName` varchar(128);--> statement-breakpoint
ALTER TABLE `clients` ADD `spouseLastName` varchar(128);--> statement-breakpoint
ALTER TABLE `tax_year_records` ADD `commDate` timestamp;--> statement-breakpoint
ALTER TABLE `tax_year_records` ADD `statusDate` timestamp;