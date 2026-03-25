CREATE TABLE `temp_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text,
	`totp_secret` text,
	`created_at` integer,
	`expires_at` integer
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_table_occupancy` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`user_id` text,
	`temp_id` text,
	`seats` integer NOT NULL,
	`status` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_table_occupancy`("id", "table_id", "user_id", "temp_id", "seats", "status", "start_at", "end_at") SELECT "id", "table_id", "user_id", "temp_id", "seats", "status", "start_at", "end_at" FROM `table_occupancy`;--> statement-breakpoint
DROP TABLE `table_occupancy`;--> statement-breakpoint
ALTER TABLE `__new_table_occupancy` RENAME TO `table_occupancy`;--> statement-breakpoint
PRAGMA foreign_keys=ON;