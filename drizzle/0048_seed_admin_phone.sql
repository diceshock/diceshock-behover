-- Seed admin phone list into KV and create initial admin user
-- This migration is a data seed, executed via wrangler d1 execute

-- Create initial admin user record
INSERT OR IGNORE INTO "user" (id, name, role, email)
VALUES ('00000000-0000-4000-a000-000000000001', 'nerd', 'admin', NULL);

-- Create corresponding user_info with phone
INSERT OR IGNORE INTO "user_info" (id, uid, nickname, phone, points, create_at)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'admin0',
  'nerd',
  '15571055640',
  0,
  unixepoch('now') * 1000
);

-- Create SMS account record so phone login works
INSERT OR IGNORE INTO "account" (userId, type, provider, providerAccountId)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'credentials',
  'SMS',
  '15571055640'
);
