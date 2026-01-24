CREATE TABLE `active_board_games_table` (
	`active_id` text NOT NULL,
	`board_game_id` text NOT NULL,
	`create_at` integer,
	PRIMARY KEY(`active_id`, `board_game_id`),
	FOREIGN KEY (`active_id`) REFERENCES `actives_table`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_game_id`) REFERENCES `board_games_table`(`id`) ON UPDATE no action ON DELETE cascade
);
