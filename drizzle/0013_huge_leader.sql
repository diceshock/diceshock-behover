PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_active_board_games_table` (
	`active_id` text NOT NULL,
	`board_game_id` integer NOT NULL,
	`create_at` integer,
	PRIMARY KEY(`active_id`, `board_game_id`),
	FOREIGN KEY (`active_id`) REFERENCES `actives_table`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- 将原有的 board_game_id (主键 text) 转换为 gstone_id (integer)
INSERT INTO `__new_active_board_games_table`("active_id", "board_game_id", "create_at") 
SELECT 
	abg."active_id",
	COALESCE(bg."gstone_id", 0) as "board_game_id",
	abg."create_at"
FROM `active_board_games_table` abg
LEFT JOIN `board_games_table` bg ON bg."id" = abg."board_game_id"
WHERE bg."gstone_id" IS NOT NULL;
--> statement-breakpoint
DROP TABLE `active_board_games_table`;--> statement-breakpoint
ALTER TABLE `__new_active_board_games_table` RENAME TO `active_board_games_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;