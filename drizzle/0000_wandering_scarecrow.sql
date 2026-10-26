CREATE TABLE `accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
