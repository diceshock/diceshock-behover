CREATE TABLE `active_tag_mappings_table` (
	`active_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`active_id`, `tag_id`),
	FOREIGN KEY (`active_id`) REFERENCES `actives_table`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `active_tags_table`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `active_tags_table` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text
);
--> statement-breakpoint
CREATE TABLE `actives_table` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`is_published` integer,
	`is_deleted` integer,
	`description` text,
	`publish_at` integer,
	`content` text
);
--> statement-breakpoint
CREATE TABLE `board_games_table` (
	`id` text PRIMARY KEY NOT NULL,
	`sch_name` text,
	`eng_name` text,
	`gstone_id` integer,
	`gstone_rating` real,
	`category` text,
	`mode` text,
	`player_num` text,
	`best_player_num` text,
	`content` blob,
	`timestamp_ms` integer
);
--> statement-breakpoint
CREATE TABLE `docs_table` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp_ms` integer,
	`meta` blob,
	`content` text
);
