-- 0061: password credentials for admin/staff login (PBKDF2-SHA256)
CREATE TABLE IF NOT EXISTS `user_credentials` (
  `user_id` TEXT PRIMARY KEY NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `password_hash` TEXT NOT NULL,
  `algorithm` TEXT NOT NULL DEFAULT 'PBKDF2-SHA256',
  `salt` TEXT NOT NULL,
  `iterations` INTEGER NOT NULL DEFAULT 600000,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
