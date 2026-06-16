CREATE TABLE `app_settings` (
	`key` varchar(96) NOT NULL,
	`value` longtext NOT NULL,
	`updatedAt` varchar(40) NOT NULL,
	CONSTRAINT `app_settings_key` PRIMARY KEY(`key`)
);
