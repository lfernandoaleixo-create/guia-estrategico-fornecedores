CREATE TABLE `custom_groups` (
	`id` varchar(64) NOT NULL,
	`number` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`branch` varchar(255) NOT NULL DEFAULT '',
	`color` varchar(32) NOT NULL DEFAULT '#64748b',
	`description` text,
	`promotedToDashboard` boolean NOT NULL DEFAULT false,
	`promotedAt` varchar(40),
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `custom_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extra_suppliers` (
	`id` varchar(64) NOT NULL,
	`groupId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`chineseName` varchar(255),
	`category` varchar(255),
	`ncm` varchar(64),
	`city` varchar(255),
	`province` varchar(255),
	`address` text,
	`phones` json,
	`emails` json,
	`links` json,
	`contactName` varchar(255),
	`contactRole` varchar(255),
	`contactLanguage` varchar(255),
	`moq` varchar(255),
	`priceFob` varchar(255),
	`leadTime` varchar(255),
	`paymentTerms` varchar(255),
	`incoterm` varchar(255),
	`notes` text,
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `extra_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_notes` (
	`scope` varchar(96) NOT NULL,
	`supplierId` varchar(191) NOT NULL,
	`status` varchar(48) NOT NULL DEFAULT 'nao-visitado',
	`observacoes` text,
	`fields` json,
	`attachments` longtext,
	`quoteRows` json,
	`groupIds` json,
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
