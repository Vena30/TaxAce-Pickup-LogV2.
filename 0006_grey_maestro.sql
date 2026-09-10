CREATE TABLE `staffUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`mustChangePassword` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `staffUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffUsers_email_unique` UNIQUE(`email`)
);
