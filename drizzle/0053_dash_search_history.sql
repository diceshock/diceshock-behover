CREATE TABLE `dash_search_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `label` text NOT NULL,
  `category_id` text NOT NULL,
  `route` text NOT NULL,
  `params` text NOT NULL DEFAULT '{}',
  `created_at` integer NOT NULL
);
CREATE INDEX `idx_dash_search_history_user_id` ON `dash_search_history`(`user_id`);
