CREATE TABLE `order_pause_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`occupancy_id` text NOT NULL,
	`paused_at` integer NOT NULL,
	`resumed_at` integer,
	FOREIGN KEY (`occupancy_id`) REFERENCES `table_occupancy`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `table_occupancy` ADD `settlement_snapshot` text;