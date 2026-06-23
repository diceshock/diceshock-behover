CREATE TABLE `user_points_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`note` text,
	`created_by` text,
	`create_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_points_log_user_id` ON `user_points_log` (`user_id`);--> statement-breakpoint
ALTER TABLE `user_info` ADD `points` integer;