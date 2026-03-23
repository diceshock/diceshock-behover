CREATE TABLE `user_membership_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_type` text NOT NULL,
	`amount` integer,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`create_at` integer,
	`update_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
