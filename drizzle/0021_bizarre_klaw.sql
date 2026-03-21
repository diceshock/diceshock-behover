CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cover_image_url` text,
	`content` text,
	`is_published` integer,
	`create_at` integer,
	`update_at` integer
);
