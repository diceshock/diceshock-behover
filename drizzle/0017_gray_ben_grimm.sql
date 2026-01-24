CREATE TABLE `user_business_card` (
	`id` text PRIMARY KEY NOT NULL,
	`share_phone` integer,
	`wechat` text,
	`qq` text,
	`custom_content` text,
	`create_at` integer,
	`update_at` integer,
	FOREIGN KEY (`id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
