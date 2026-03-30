CREATE TABLE `mahjong_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text,
	`mode` text NOT NULL,
	`format` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`termination_reason` text NOT NULL,
	`players` text,
	`round_history` text,
	`config` text,
	`created_at` integer,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mahjong_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phone` text NOT NULL,
	`registered_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mahjong_registrations_user_id_unique` ON `mahjong_registrations` (`user_id`);