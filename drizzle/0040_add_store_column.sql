ALTER TABLE `board_games_table` ADD `store` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `actives` ADD `store` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `events` ADD `store` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `tables` ADD `store` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `table_occupancy` ADD `store` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `pricing_snapshots` ADD `store` text NOT NULL DEFAULT 'legacy';
