CREATE TABLE `pricing_global_config` (
	`id` text PRIMARY KEY NOT NULL,
	`daytime_start` text NOT NULL,
	`daytime_end` text NOT NULL,
	`update_at` integer
);
--> statement-breakpoint
CREATE TABLE `pricing_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_type` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`enabled` integer NOT NULL,
	`conditions` text,
	`billing_type` text NOT NULL,
	`price` integer NOT NULL,
	`cap_enabled` integer NOT NULL,
	`cap_unit` text,
	`cap_price` integer,
	`cap_price_day` integer,
	`cap_price_night` integer,
	`create_at` integer,
	`update_at` integer
);
