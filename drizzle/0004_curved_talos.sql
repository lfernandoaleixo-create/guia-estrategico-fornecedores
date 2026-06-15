CREATE TABLE `macros` (
	`id` varchar(96) NOT NULL,
	`number` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`color` varchar(32) NOT NULL DEFAULT '#8b5cf6',
	`items` json,
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `macros_id` PRIMARY KEY(`id`)
);
