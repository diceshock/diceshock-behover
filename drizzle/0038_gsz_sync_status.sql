ALTER TABLE `mahjong_matches` ADD `gsz_synced` integer DEFAULT false NOT NULL;
ALTER TABLE `mahjong_matches` ADD `gsz_error` text;
ALTER TABLE `mahjong_matches` ADD `gsz_synced_at` integer;
ALTER TABLE `mahjong_registrations` ADD `gsz_synced` integer DEFAULT false NOT NULL;
ALTER TABLE `mahjong_registrations` ADD `gsz_error` text;
ALTER TABLE `mahjong_registrations` ADD `gsz_synced_at` integer;
