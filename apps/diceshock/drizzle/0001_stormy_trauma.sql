PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_board_games_table` (
	`id` text,
	`sch_name` text,
	`eng_name` text,
	`gstone_id` integer,
	`gstone_rating` real,
	`category` text,
	`mode` text,
	`player_num` text,
	`best_player_num` text,
	`content` blob
);
--> statement-breakpoint
INSERT INTO `__new_board_games_table`("id", "sch_name", "eng_name", "gstone_id", "gstone_rating", "category", "mode", "player_num", "best_player_num", "content") SELECT "id", "sch_name", "eng_name", "gstone_id", "gstone_rating", "category", "mode", "player_num", "best_player_num", "content" FROM `board_games_table`;--> statement-breakpoint
DROP TABLE `board_games_table`;--> statement-breakpoint
ALTER TABLE `__new_board_games_table` RENAME TO `board_games_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;