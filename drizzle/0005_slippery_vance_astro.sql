CREATE TABLE `subgroups` (
	`id` varchar(96) NOT NULL,
	`macroNumber` int NOT NULL,
	`sub` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(32) NOT NULL DEFAULT '#10b981',
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `subgroups_id` PRIMARY KEY(`id`)
);
