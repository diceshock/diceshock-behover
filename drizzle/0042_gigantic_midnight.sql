CREATE TABLE `wechat_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`open_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_wechat_conversations_open_id` ON `wechat_conversations` (`open_id`);--> statement-breakpoint
CREATE INDEX `idx_wechat_conversations_created_at` ON `wechat_conversations` (`created_at`);--> statement-breakpoint
ALTER TABLE `temp_identities` DROP COLUMN `expires_at`;