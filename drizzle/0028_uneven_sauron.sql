CREATE TABLE `pricing_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text,
	`status` text NOT NULL,
	`created_at` integer,
	`published_at` integer
);
