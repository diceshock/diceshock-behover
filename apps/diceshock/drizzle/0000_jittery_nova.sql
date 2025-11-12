CREATE TABLE `board_games_table` (
	`id` text,
	`sch_name` text,
	`eng_name` text,
	`gstone_id` integer,
	`gstone_rating` real,
	`content` text,
	`meta` blob
);
--> statement-breakpoint
CREATE TABLE `docs_table` (
	`id` text,
	`timestamp_ms` integer,
	`meta` blob,
	`content` text
);
