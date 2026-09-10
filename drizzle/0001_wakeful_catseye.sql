CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`notes` text,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`spouseName` varchar(256),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `record_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taxYearRecordId` int NOT NULL,
	`userId` int,
	`userName` varchar(256),
	`changeType` varchar(64) NOT NULL,
	`fieldChanged` varchar(128),
	`oldValue` text,
	`newValue` text,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `record_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tax_year_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int,
	`businessId` int,
	`taxYear` int NOT NULL,
	`status` enum('In Vault','Ready for Pickup','Picked Up','Hold','Eligible for Shred','Shredded','Research Needed') NOT NULL DEFAULT 'In Vault',
	`printedCopy` enum('Yes','No'),
	`datePickedUp` date,
	`dateShredded` date,
	`locationVaultSlot` varchar(128),
	`notes` text,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_year_records_id` PRIMARY KEY(`id`)
);
