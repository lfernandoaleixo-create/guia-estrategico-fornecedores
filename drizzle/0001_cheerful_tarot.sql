CREATE TABLE `custom_suppliers` (
	`id` varchar(96) NOT NULL,
	`scope` varchar(48) NOT NULL,
	`name` varchar(255) NOT NULL,
	`data` longtext NOT NULL,
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `custom_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_groups` (
	`id` varchar(64) NOT NULL,
	`number` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`legend` text,
	`color` varchar(32) NOT NULL DEFAULT '#64748b',
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `supplier_groups_id` PRIMARY KEY(`id`)
);
