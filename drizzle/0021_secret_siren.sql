CREATE TABLE `active_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`active_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_watching` integer,
	`create_at` integer,
	FOREIGN KEY (`active_id`) REFERENCES `actives`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `actives` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`title` text NOT NULL,
	`board_game_id` text,
	`date` text NOT NULL,
	`time` text,
	`max_players` integer NOT NULL,
	`content` text,
	`is_game` integer,
	`create_at` integer,
	`update_at` integer,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_game_id`) REFERENCES `board_games_table`(`id`) ON UPDATE no action ON DELETE no action
);
