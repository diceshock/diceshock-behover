CREATE TABLE `user_info` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`create_at` integer,
	`nickname` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
