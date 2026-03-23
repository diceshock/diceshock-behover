CREATE TABLE `table_occupancy` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`user_id` text NOT NULL,
	`seats` integer NOT NULL,
	`start_at` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`capacity` integer NOT NULL,
	`description` text,
	`code` text NOT NULL,
	`create_at` integer,
	`update_at` integer
);
