CREATE TABLE `store_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`board_game_id` text,
	`quantity` integer DEFAULT 0,
	`status` text DEFAULT 'available',
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`board_game_id`) REFERENCES `board_games_table`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_store_inventory_store_id` ON `store_inventory` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_store_inventory_board_game_id` ON `store_inventory` (`board_game_id`);--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`address` text,
	`is_active` integer DEFAULT 1,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_code_unique` ON `stores` (`code`);--> statement-breakpoint
ALTER TABLE `actives` ADD `store_id` text REFERENCES stores(id);--> statement-breakpoint
CREATE INDEX `idx_actives_store_id` ON `actives` (`store_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `store_id` text REFERENCES stores(id);--> statement-breakpoint
CREATE INDEX `idx_events_store_id` ON `events` (`store_id`);--> statement-breakpoint
ALTER TABLE `leaderboard_snapshots` ADD `store_id` text REFERENCES stores(id);--> statement-breakpoint
CREATE INDEX `idx_leaderboard_snapshots_store_id` ON `leaderboard_snapshots` (`store_id`);--> statement-breakpoint
ALTER TABLE `mahjong_matches` ADD `store_id` text REFERENCES stores(id);--> statement-breakpoint
CREATE INDEX `idx_mahjong_matches_store_id` ON `mahjong_matches` (`store_id`);--> statement-breakpoint
ALTER TABLE `pricing_snapshots` ADD `store_id` text REFERENCES stores(id);--> statement-breakpoint
CREATE INDEX `idx_pricing_snapshots_store_id` ON `pricing_snapshots` (`store_id`);--> statement-breakpoint
ALTER TABLE `tables` ADD `store_id` text REFERENCES stores(id);--> statement-breakpoint
CREATE INDEX `idx_tables_store_id` ON `tables` (`store_id`);--> statement-breakpoint
ALTER TABLE `user_info` ADD `preferred_store_id` text REFERENCES stores(id);--> statement-breakpoint
ALTER TABLE `user_info` ADD `preferred_locale` text;