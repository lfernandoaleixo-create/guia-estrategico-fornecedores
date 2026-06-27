CREATE TABLE `import_simulations` (
	`id` varchar(96) NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT '',
	`ncm` varchar(64) NOT NULL DEFAULT '',
	`custoUnitarioBRL` varchar(40) NOT NULL DEFAULT '0',
	`custoTotalBRL` varchar(40) NOT NULL DEFAULT '0',
	`data` longtext NOT NULL,
	`createdAt` varchar(40) NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `import_simulations_id` PRIMARY KEY(`id`)
);
