ALTER TABLE `user_info` ADD `phone` text;--> statement-breakpoint
-- SQLite 不支持直接删除列，需要重建表来删除 user 表的 phone 字段
CREATE TABLE `user_new` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text
);
INSERT INTO `user_new` SELECT `id`, `name`, `email`, `emailVerified`, `image` FROM `user`;
DROP TABLE `user`;
ALTER TABLE `user_new` RENAME TO `user`;
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);