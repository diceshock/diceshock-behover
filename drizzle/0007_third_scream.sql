CREATE TABLE `active_registrations_table` (
	`id` text PRIMARY KEY NOT NULL,
	`active_id` text NOT NULL,
	`team_id` text,
	`user_id` text NOT NULL,
	`is_watching` integer,
	`create_at` integer,
	FOREIGN KEY (`active_id`) REFERENCES `actives_table`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `active_teams_table`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `active_teams_table` (
	`id` text PRIMARY KEY NOT NULL,
	`active_id` text NOT NULL,
	`name` text NOT NULL,
	`max_participants` integer,
	`create_at` integer,
	FOREIGN KEY (`active_id`) REFERENCES `actives_table`(`id`) ON UPDATE no action ON DELETE cascade
);
