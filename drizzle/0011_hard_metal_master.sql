CREATE TABLE `quotation_tables` (
	`scope` varchar(128) NOT NULL,
	`columns` longtext NOT NULL,
	`rows` longtext NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `quotation_tables_scope` PRIMARY KEY(`scope`)
);
