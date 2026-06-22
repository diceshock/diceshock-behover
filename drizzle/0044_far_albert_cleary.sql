CREATE TABLE `preference_push_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`preference_id` text,
	`active_id` text,
	`push_type` text NOT NULL,
	`push_date` text NOT NULL,
	`sent_at` integer NOT NULL,
	`message_summary` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preference_id`) REFERENCES `user_preferences`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`active_id`) REFERENCES `actives`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_push_log_user_date` ON `preference_push_log` (`user_id`,`push_date`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`raw_text` text NOT NULL,
	`rrule` text NOT NULL,
	`categories` text NOT NULL,
	`player_count` integer,
	`enabled` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_preferences_user_id` ON `user_preferences` (`user_id`);--> statement-breakpoint
ALTER TABLE `actives` ADD `is_system_recommended` integer;--> statement-breakpoint

-- Seed system user for preference recommendations
INSERT OR IGNORE INTO user (id, name, email, role) VALUES ('00000000-0000-4000-a000-000000000001', 'DiceShock 推荐', 'system@diceshock.com', 'admin');
INSERT OR IGNORE INTO user_info (id, uid, nickname) VALUES ('00000000-0000-4000-a000-000000000001', 'SYSTEM', 'DiceShock 推荐');