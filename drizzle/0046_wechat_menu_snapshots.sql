CREATE TABLE `wechat_menu_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`store_id` text,
	`data` text,
	`status` text NOT NULL,
	`created_at` integer,
	`published_at` integer,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_wechat_menu_snapshots_store_id` ON `wechat_menu_snapshots` (`store_id`);
