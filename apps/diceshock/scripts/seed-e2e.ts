import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runWrangler(commandCwd: string, args: string[]) {
  return execFileAsync("pnpm", ["exec", "wrangler", ...args], {
    cwd: commandCwd,
  });
}

async function addColumnIfMissing(commandCwd: string, table: string, columnSql: string) {
  try {
    await runWrangler(commandCwd, [
      "d1",
      "execute",
      "diceshock",
      "--local",
      "--command",
      `ALTER TABLE ${table} ADD COLUMN ${columnSql}`,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate column name") && !message.includes("no such table")) {
      throw error;
    }
  }
}

const sql = String.raw`
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, address TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER);
CREATE TABLE IF NOT EXISTS "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, emailVerified INTEGER, image TEXT, role TEXT NOT NULL DEFAULT 'customer');
CREATE TABLE IF NOT EXISTS user_info (id TEXT PRIMARY KEY, uid TEXT NOT NULL, create_at INTEGER, nickname TEXT NOT NULL, phone TEXT, points INTEGER DEFAULT 0, avatar_url TEXT, meta TEXT, preferred_store_id TEXT, preferred_locale TEXT);
CREATE TABLE IF NOT EXISTS tables (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'boardgame', status TEXT NOT NULL DEFAULT 'active', capacity INTEGER NOT NULL, description TEXT, code TEXT NOT NULL, store_id TEXT, create_at INTEGER, update_at INTEGER);
CREATE TABLE IF NOT EXISTS table_occupancy (id TEXT PRIMARY KEY, table_id TEXT NOT NULL, user_id TEXT, temp_id TEXT, seats INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', start_at INTEGER NOT NULL, end_at INTEGER, final_price INTEGER, pricing_snapshot_id TEXT, price_breakdown TEXT, settlement_snapshot TEXT);
CREATE TABLE IF NOT EXISTS order_pause_logs (id TEXT PRIMARY KEY, occupancy_id TEXT NOT NULL, paused_at INTEGER NOT NULL, resumed_at INTEGER, pause_reason TEXT DEFAULT 'manual');
CREATE TABLE IF NOT EXISTS actives (id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, title TEXT NOT NULL, board_game_id TEXT, store_id TEXT, date TEXT NOT NULL, time TEXT, max_players INTEGER NOT NULL, content TEXT, is_game INTEGER DEFAULT 1, is_system_recommended INTEGER DEFAULT 0, create_at INTEGER, update_at INTEGER);
CREATE TABLE IF NOT EXISTS active_registrations (id TEXT PRIMARY KEY, active_id TEXT NOT NULL, user_id TEXT NOT NULL, is_watching INTEGER DEFAULT 0, create_at INTEGER);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, cover_image_url TEXT, content TEXT, store_id TEXT, is_published INTEGER DEFAULT 0, create_at INTEGER, update_at INTEGER);
CREATE TABLE IF NOT EXISTS pricing_snapshots (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '未命名', store_id TEXT, data TEXT, status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER, published_at INTEGER);
CREATE TABLE IF NOT EXISTS mahjong_matches (id TEXT PRIMARY KEY, table_id TEXT, store_id TEXT, match_type TEXT, gsz_record_id INTEGER, mode TEXT NOT NULL, format TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL, termination_reason TEXT NOT NULL, players TEXT, round_history TEXT, config TEXT, gsz_synced INTEGER NOT NULL DEFAULT 0, gsz_error TEXT, gsz_synced_at INTEGER, created_at INTEGER);

DELETE FROM mahjong_matches WHERE id LIKE 'e2e-%';
DELETE FROM table_occupancy WHERE id LIKE 'e2e-%';
DELETE FROM tables WHERE id LIKE 'table-e2e-%';
DELETE FROM events WHERE id LIKE 'e2e-%';
DELETE FROM active_registrations WHERE active_id LIKE 'e2e-%' OR user_id LIKE 'e2e-%';
DELETE FROM actives WHERE id LIKE 'e2e-%';
DELETE FROM user_info WHERE id LIKE 'e2e-%';
DELETE FROM "user" WHERE id LIKE 'e2e-%';
DELETE FROM stores WHERE id = 'store-e2e-gg';

INSERT INTO stores (id, code, name, address, is_active, created_at) VALUES
  ('store-e2e-gg', 'gg', '光谷测试店', '测试地址', 1, 1717200000000);

INSERT INTO "user" (id, name, email, role) VALUES
  ('e2e-test-staff-001', 'E2E Staff', 'e2e@test.local', 'staff'),
  ('e2e-customer-001', 'E2E Customer One', 'e2e-customer-001@test.local', 'customer'),
  ('e2e-customer-002', 'E2E Customer Two', 'e2e-customer-002@test.local', 'customer'),
  ('e2e-customer-003', 'E2E Customer Three', 'e2e-customer-003@test.local', 'customer');

INSERT INTO user_info (id, uid, create_at, nickname, phone, points, preferred_store_id, preferred_locale) VALUES
  ('e2e-test-staff-001', 'e2e-uid-001', 1717200000000, '测试店员', '13800000001', 0, 'store-e2e-gg', 'zh'),
  ('e2e-customer-001', 'e2e-uid-101', 1717200000000, '张三', '13800000101', 30, 'store-e2e-gg', 'zh'),
  ('e2e-customer-002', 'e2e-uid-102', 1717200000000, '李四', '13800000102', 20, 'store-e2e-gg', 'zh'),
  ('e2e-customer-003', 'e2e-uid-103', 1717200000000, '王五', '13800000103', 10, 'store-e2e-gg', 'zh');

INSERT INTO tables (id, name, type, scope, status, capacity, description, code, store_id, create_at, update_at) VALUES
  ('table-e2e-a1', 'A1 测试桌', 'fixed', 'boardgame', 'active', 6, 'E2E seed table A1', 'A1', 'store-e2e-gg', 1717200000000, 1717200000000),
  ('table-e2e-a2', 'A2 测试桌', 'fixed', 'boardgame', 'active', 6, 'E2E seed table A2', 'A2', 'store-e2e-gg', 1717200000000, 1717200000000),
  ('table-e2e-a3', 'A3 测试桌', 'solo', 'boardgame', 'active', 4, 'E2E seed table A3', 'A3', 'store-e2e-gg', 1717200000000, 1717200000000),
  ('table-e2e-a4', 'A4 测试桌', 'fixed', 'boardgame', 'active', 8, 'E2E seed table A4', 'A4', 'store-e2e-gg', 1717200000000, 1717200000000),
  ('table-e2e-a5', 'A5 测试桌', 'solo', 'boardgame', 'active', 4, 'E2E seed table A5', 'A5', 'store-e2e-gg', 1717200000000, 1717200000000);

INSERT INTO table_occupancy (id, table_id, user_id, seats, status, start_at, end_at, final_price, pricing_snapshot_id, price_breakdown, settlement_snapshot) VALUES
  ('e2e-order-001', 'table-e2e-a1', 'e2e-customer-001', 2, 'active', 1718013600000, NULL, NULL, NULL, NULL, NULL),
  ('e2e-order-002', 'table-e2e-a2', 'e2e-customer-002', 1, 'active', 1718100000000, NULL, NULL, NULL, NULL, NULL),
  ('e2e-order-003', 'table-e2e-a3', 'e2e-customer-003', 3, 'paused', 1718186400000, NULL, NULL, NULL, NULL, NULL),
  ('e2e-order-004', 'table-e2e-a4', 'e2e-customer-001', 4, 'ended', 1718272800000, 1718280000000, NULL, NULL, NULL, NULL),
  ('e2e-order-005', 'table-e2e-a5', 'e2e-customer-002', 2, 'ended', 1718359200000, 1718366400000, NULL, NULL, NULL, NULL);

INSERT INTO actives (id, creator_id, title, store_id, date, time, max_players, content, is_game, is_system_recommended, create_at, update_at) VALUES
  ('e2e-active-001', 'e2e-test-staff-001', 'E2E 公开桌游局', 'store-e2e-gg', '2027-07-01', '19:00', 5, '{}', 1, 1, 1717200000000, 1717200000000),
  ('e2e-active-002', 'e2e-test-staff-001', 'E2E 新手跑团', 'store-e2e-gg', '2027-08-01', '20:00', 4, '{}', 1, 0, 1717200000000, 1717200000000),
  ('e2e-active-003', 'e2e-test-staff-001', 'E2E 过期活动', 'store-e2e-gg', '2024-01-01', '18:00', 3, '{}', 1, 0, 1717200000000, 1717200000000);

INSERT INTO events (id, title, description, cover_image_url, content, store_id, is_published, create_at, update_at) VALUES
  ('e2e-event-001', 'E2E Game Night', 'Seeded published event', NULL, '{}', 'store-e2e-gg', 1, 1717200000000, 1717200000000),
  ('e2e-event-002', 'E2E Mahjong League', 'Seeded published event', NULL, '{}', 'store-e2e-gg', 1, 1717286400000, 1717286400000),
  ('e2e-event-003', 'E2E Draft Event', 'Seeded draft event', NULL, '{}', 'store-e2e-gg', 0, 1717372800000, 1717372800000);

INSERT INTO mahjong_matches (id, table_id, store_id, match_type, gsz_record_id, mode, format, started_at, ended_at, termination_reason, players, round_history, config, gsz_synced, gsz_error, gsz_synced_at, created_at) VALUES
  ('e2e-mahjong-001', 'table-e2e-a1', 'store-e2e-gg', 'store', NULL, '4p', 'hanchan', 1718013600000, 1718020800000, 'score_complete', '[{"userId":"e2e-customer-001","nickname":"张三","seat":"east","finalScore":32000}]', '[]', '{"mode":"4p","format":"hanchan"}', 0, NULL, NULL, 1718020800000),
  ('e2e-mahjong-002', 'table-e2e-a2', 'store-e2e-gg', 'store', NULL, '3p', 'tonpuu', 1718100000000, 1718103600000, 'vote', '[{"userId":"e2e-customer-002","nickname":"李四","seat":"south","finalScore":28000}]', '[]', '{"mode":"3p","format":"tonpuu"}', 0, NULL, NULL, 1718103600000),
  ('e2e-mahjong-003', 'table-e2e-a3', 'store-e2e-gg', 'store', NULL, '4p', 'tonpuu', 1718186400000, 1718190000000, 'admin_abort', '[{"userId":"e2e-customer-003","nickname":"王五","seat":"west","finalScore":25000}]', '[]', '{"mode":"4p","format":"tonpuu"}', 0, 'aborted', NULL, 1718190000000),
  ('e2e-mahjong-004', 'table-e2e-a4', 'store-e2e-gg', 'tournament', 9001, '4p', 'hanchan', 1718272800000, 1718280000000, 'score_complete', '[{"userId":"e2e-customer-001","nickname":"张三","seat":"north","finalScore":41000}]', '[]', '{"mode":"4p","format":"hanchan","type":"tournament"}', 1, NULL, 1718280000000, 1718280000000),
  ('e2e-mahjong-005', 'table-e2e-a5', 'store-e2e-gg', 'tournament', NULL, '3p', 'hanchan', 1718359200000, 1718366400000, 'order_invalid', '[{"userId":"e2e-customer-002","nickname":"李四","seat":"east","finalScore":18000}]', '[]', '{"mode":"3p","format":"hanchan","type":"tournament"}', 0, 'missing order', NULL, 1718366400000);

COMMIT;
`;

const tmpDir = await mkdtemp(join(tmpdir(), "diceshock-e2e-seed-"));
const sqlFile = join(tmpDir, "seed.sql");

try {
  await writeFile(sqlFile, sql);
  const commandCwd = new URL("..", import.meta.url).pathname;
  await addColumnIfMissing(commandCwd, "stores", "address TEXT");
  await addColumnIfMissing(commandCwd, "stores", "is_active INTEGER DEFAULT 1");
  await addColumnIfMissing(commandCwd, "stores", "created_at INTEGER");
  await addColumnIfMissing(commandCwd, '"user"', "email TEXT");
  await addColumnIfMissing(commandCwd, '"user"', "role TEXT DEFAULT 'customer'");
  await addColumnIfMissing(commandCwd, "user_info", "points INTEGER DEFAULT 0");
  await addColumnIfMissing(commandCwd, "user_info", "avatar_url TEXT");
  await addColumnIfMissing(commandCwd, "user_info", "preferred_store_id TEXT");
  await addColumnIfMissing(commandCwd, "user_info", "preferred_locale TEXT");
  await addColumnIfMissing(commandCwd, "tables", "scope TEXT DEFAULT 'boardgame'");
  await addColumnIfMissing(commandCwd, "tables", "status TEXT DEFAULT 'active'");
  await addColumnIfMissing(commandCwd, "tables", "capacity INTEGER DEFAULT 4");
  await addColumnIfMissing(commandCwd, "tables", "description TEXT");
  await addColumnIfMissing(commandCwd, "tables", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "tables", "create_at INTEGER");
  await addColumnIfMissing(commandCwd, "tables", "update_at INTEGER");
  await addColumnIfMissing(commandCwd, "table_occupancy", "temp_id TEXT");
  await addColumnIfMissing(commandCwd, "table_occupancy", "seats INTEGER DEFAULT 1");
  await addColumnIfMissing(commandCwd, "table_occupancy", "end_at INTEGER");
  await addColumnIfMissing(commandCwd, "table_occupancy", "final_price INTEGER");
  await addColumnIfMissing(commandCwd, "table_occupancy", "pricing_snapshot_id TEXT");
  await addColumnIfMissing(commandCwd, "table_occupancy", "price_breakdown TEXT");
  await addColumnIfMissing(commandCwd, "table_occupancy", "settlement_snapshot TEXT");
  await addColumnIfMissing(commandCwd, "actives", "board_game_id TEXT");
  await addColumnIfMissing(commandCwd, "actives", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "actives", "time TEXT");
  await addColumnIfMissing(commandCwd, "actives", "content TEXT");
  await addColumnIfMissing(commandCwd, "actives", "is_game INTEGER DEFAULT 1");
  await addColumnIfMissing(commandCwd, "actives", "is_system_recommended INTEGER DEFAULT 0");
  await addColumnIfMissing(commandCwd, "events", "description TEXT");
  await addColumnIfMissing(commandCwd, "events", "cover_image_url TEXT");
  await addColumnIfMissing(commandCwd, "events", "content TEXT");
  await addColumnIfMissing(commandCwd, "events", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "events", "is_published INTEGER DEFAULT 0");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "match_type TEXT");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "gsz_record_id INTEGER");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "gsz_synced INTEGER DEFAULT 0");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "gsz_error TEXT");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "gsz_synced_at INTEGER");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "created_at INTEGER");
  const { stdout, stderr } = await runWrangler(commandCwd, [
    "d1",
    "execute",
    "diceshock",
    "--local",
    "--file",
    sqlFile,
  ]);
  process.stdout.write(stdout);
  process.stderr.write(stderr);
} finally {
  await rm(tmpDir, { force: true, recursive: true });
}
