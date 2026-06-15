CREATE TABLE `partner_topics` (
	`id` varchar(96) NOT NULL,
	`partnerId` varchar(96) NOT NULL,
	`scope` varchar(96) NOT NULL,
	`title` varchar(255) NOT NULL,
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `partner_topics_id` PRIMARY KEY(`id`)
);
