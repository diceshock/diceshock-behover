/**
 * Full-Coverage E2E Seed Script
 * 
 * Seeds comprehensive test data for all features:
 * - 13 customers (varied profiles, memberships, preferences)
 * - 3 staff members (different stores)
 * - Complete feature coverage: tables, orders, actives, events, mahjong, inventory
 * - Real-world scenarios with timing, states, and relationships
 */

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

const NOW = Date.now();
function ts(daysAgo: number, hoursExtra = 0): number {
  return NOW - daysAgo * 86_400_000 + hoursExtra * 3_600_000;
}

const sql = String.raw`
BEGIN TRANSACTION;

-- ═══════ Schema Ensure ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, address TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER);
CREATE TABLE IF NOT EXISTS "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, email_verified INTEGER, image TEXT, role TEXT DEFAULT 'customer');
CREATE TABLE IF NOT EXISTS user_info (id TEXT PRIMARY KEY, uid TEXT UNIQUE, nickname TEXT, phone TEXT, avatar_url TEXT, points INTEGER DEFAULT 0, create_at INTEGER, meta TEXT, preferred_store_id TEXT, preferred_theme TEXT, is_active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS tables (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, scope TEXT NOT NULL, status TEXT DEFAULT 'active', capacity INTEGER, code TEXT UNIQUE, description TEXT, store_id TEXT, create_at INTEGER, update_at INTEGER);
CREATE TABLE IF NOT EXISTS table_occupancy (id TEXT PRIMARY KEY, table_id TEXT NOT NULL, user_id TEXT, temp_id TEXT, seats INTEGER DEFAULT 1, status TEXT DEFAULT 'active', start_at INTEGER NOT NULL, end_at INTEGER, final_price INTEGER, pricing_snapshot_id TEXT, price_breakdown TEXT, settlement_snapshot TEXT);
CREATE TABLE IF NOT EXISTS actives (id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, title TEXT NOT NULL, board_game_id TEXT, store_id TEXT, date TEXT NOT NULL, time TEXT, max_players INTEGER NOT NULL, content TEXT, is_game INTEGER DEFAULT 1, is_system_recommended INTEGER DEFAULT 0, create_at INTEGER, update_at INTEGER);
CREATE TABLE IF NOT EXISTS active_registrations (id TEXT PRIMARY KEY, active_id TEXT NOT NULL, user_id TEXT NOT NULL, is_watching INTEGER DEFAULT 0, create_at INTEGER);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, cover_image_url TEXT, content TEXT, is_published INTEGER DEFAULT 0, store_id TEXT, create_at INTEGER, update_at INTEGER);
CREATE TABLE IF NOT EXISTS mahjong_matches (id TEXT PRIMARY KEY, table_id TEXT, match_type TEXT, gsz_record_id INTEGER, mode TEXT, format TEXT, started_at INTEGER, ended_at INTEGER, termination_reason TEXT, players TEXT, round_history TEXT, config TEXT, gsz_synced INTEGER DEFAULT 0, gsz_error TEXT, gsz_synced_at INTEGER, created_at INTEGER, store_id TEXT);
CREATE TABLE IF NOT EXISTS membership_plans (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_type TEXT NOT NULL, amount INTEGER, note TEXT, start_date TEXT NOT NULL, end_date TEXT, create_at INTEGER, update_at INTEGER);

-- ═══════ Cleanup ═══════════════════════════════════════════════════════════════
DELETE FROM membership_plans WHERE user_id LIKE 'fc-%';
DELETE FROM mahjong_matches WHERE id LIKE 'fc-%';
DELETE FROM table_occupancy WHERE id LIKE 'fc-%';
DELETE FROM tables WHERE id LIKE 'fc-%';
DELETE FROM active_registrations WHERE active_id LIKE 'fc-%' OR user_id LIKE 'fc-%';
DELETE FROM actives WHERE id LIKE 'fc-%';
DELETE FROM events WHERE id LIKE 'fc-%';
DELETE FROM user_info WHERE id LIKE 'fc-%';
DELETE FROM "user" WHERE id LIKE 'fc-%';
DELETE FROM stores WHERE id LIKE 'store-fc-%';

-- ═══════ Stores ════════════════════════════════════════════════════════════════
INSERT INTO stores (id, code, name, address, is_active, created_at) VALUES
  ('store-fc-gg', 'fc-gg', '光谷全覆盖店', '光谷步行街100号', 1, ${ts(90)}),
  ('store-fc-jdk', 'fc-jdk', '街道口全覆盖店', '街道口地铁C口', 1, ${ts(80)});

-- ═══════ Users: 13 customers + 3 staff ════════════════════════════════════════
INSERT INTO "user" (id, name, email, role) VALUES
  -- Staff
  ('fc-staff-001', '赵店长', 'fc-staff-001@test.local', 'staff'),
  ('fc-staff-002', '钱店员', 'fc-staff-002@test.local', 'staff'),
  ('fc-staff-003', '孙管理员', 'fc-staff-003@test.local', 'admin'),
  -- Customers
  ('fc-cust-001', '张三', 'fc-cust-001@test.local', 'customer'),
  ('fc-cust-002', '李四', 'fc-cust-002@test.local', 'customer'),
  ('fc-cust-003', '王五', 'fc-cust-003@test.local', 'customer'),
  ('fc-cust-004', '赵六', 'fc-cust-004@test.local', 'customer'),
  ('fc-cust-005', '刘七', 'fc-cust-005@test.local', 'customer'),
  ('fc-cust-006', '陈八', 'fc-cust-006@test.local', 'customer'),
  ('fc-cust-007', '周九', 'fc-cust-007@test.local', 'customer'),
  ('fc-cust-008', '吴十', 'fc-cust-008@test.local', 'customer'),
  ('fc-cust-009', '郑十一', 'fc-cust-009@test.local', 'customer'),
  ('fc-cust-010', '冯十二', 'fc-cust-010@test.local', 'customer'),
  ('fc-cust-011', '韩十三', 'fc-cust-011@test.local', 'customer'),
  ('fc-cust-012', '曹十四', 'fc-cust-012@test.local', 'customer'),
  ('fc-cust-013', '杨十五', 'fc-cust-013@test.local', 'customer');

INSERT INTO user_info (id, uid, create_at, nickname, phone, points, meta, preferred_store_id) VALUES
  ('fc-staff-001', 'fcstf001', ${ts(70)}, '赵店长', '13900001001', 0, '{"preferredStoreId":"store-fc-gg"}', 'store-fc-gg'),
  ('fc-staff-002', 'fcstf002', ${ts(65)}, '钱店员', '13900001002', 0, '{"preferredStoreId":"store-fc-jdk"}', 'store-fc-jdk'),
  ('fc-staff-003', 'fcadm003', ${ts(75)}, '孙管理员', '13900001003', 0, '{"preferredStoreId":"store-fc-gg"}', 'store-fc-gg'),
  ('fc-cust-001', 'fc001', ${ts(60)}, '张三', '13700001001', 100, NULL, NULL),
  ('fc-cust-002', 'fc002', ${ts(58)}, '李四', '13700001002', 50, NULL, NULL),
  ('fc-cust-003', 'fc003', ${ts(55)}, '王五', '13700001003', 200, NULL, NULL),
  ('fc-cust-004', 'fc004', ${ts(50)}, '赵六', '13700001004', 0, NULL, NULL),
  ('fc-cust-005', 'fc005', ${ts(48)}, '刘七', '13700001005', 300, NULL, NULL),
  ('fc-cust-006', 'fc006', ${ts(45)}, '陈八', '13700001006', 25, NULL, NULL),
  ('fc-cust-007', 'fc007', ${ts(40)}, '周九', '13700001007', 150, NULL, NULL),
  ('fc-cust-008', 'fc008', ${ts(35)}, '吴十', '13700001008', 80, NULL, NULL),
  ('fc-cust-009', 'fc009', ${ts(30)}, '郑十一', '13700001009', 0, NULL, NULL),
  ('fc-cust-010', 'fc010', ${ts(25)}, '冯十二', '13700001010', 120, NULL, NULL),
  ('fc-cust-011', 'fc011', ${ts(20)}, '韩十三', '13700001011', 60, NULL, NULL),
  ('fc-cust-012', 'fc012', ${ts(15)}, '曹十四', '13700001012', 0, NULL, NULL),
  ('fc-cust-013', 'fc013', ${ts(10)}, '杨十五', '13700001013', 90, NULL, NULL);

-- ═══════ Membership Plans ══════════════════════════════════════════════════════
INSERT INTO membership_plans (id, user_id, plan_type, amount, note, start_date, end_date, create_at) VALUES
  ('fc-mem-001', 'fc-cust-001', 'MONTHLY', NULL, '月卡会员', '${new Date(ts(30)).toISOString().split('T')[0]}', '${new Date(ts(-30)).toISOString().split('T')[0]}', ${ts(30)}),
  ('fc-mem-002', 'fc-cust-002', 'STORED_VALUE', 50000, '储值会员', '${new Date(ts(20)).toISOString().split('T')[0]}', NULL, ${ts(20)}),
  ('fc-mem-003', 'fc-cust-005', 'YEARLY', NULL, '年卡会员', '${new Date(ts(100)).toISOString().split('T')[0]}', '${new Date(ts(-200)).toISOString().split('T')[0]}', ${ts(100)});

-- ═══════ Tables ════════════════════════════════════════════════════════════════
INSERT INTO tables (id, name, type, scope, status, capacity, code, store_id, create_at, update_at) VALUES
  ('fc-tbl-001', 'A1桌游桌', 'fixed', 'boardgame', 'active', 6, 'FCA1', 'store-fc-gg', ${ts(80)}, ${ts(80)}),
  ('fc-tbl-002', 'A2桌游桌', 'fixed', 'boardgame', 'active', 4, 'FCA2', 'store-fc-gg', ${ts(80)}, ${ts(80)}),
  ('fc-tbl-003', 'A3桌游桌', 'fixed', 'boardgame', 'inactive', 6, 'FCA3', 'store-fc-gg', ${ts(75)}, ${ts(10)}),
  ('fc-tbl-004', 'B1包厢', 'solo', 'boardgame', 'active', 10, 'FCB1', 'store-fc-gg', ${ts(70)}, ${ts(70)}),
  ('fc-tbl-005', 'M1麻将桌', 'fixed', 'mahjong', 'active', 4, 'FCM1', 'store-fc-gg', ${ts(65)}, ${ts(65)}),
  ('fc-tbl-006', 'M2麻将桌', 'fixed', 'mahjong', 'active', 4, 'FCM2', 'store-fc-jdk', ${ts(60)}, ${ts(60)}),
  ('fc-tbl-007', 'C1桌', 'fixed', 'boardgame', 'active', 8, 'FCC1', 'store-fc-jdk', ${ts(55)}, ${ts(55)});

-- ═══════ Orders (table_occupancy) ══════════════════════════════════════════════
INSERT INTO table_occupancy (id, table_id, user_id, seats, status, start_at, end_at, final_price) VALUES
  ('fc-ord-001', 'fc-tbl-001', 'fc-cust-001', 4, 'active', ${ts(0, -2)}, NULL, NULL),
  ('fc-ord-002', 'fc-tbl-002', 'fc-cust-002', 3, 'active', ${ts(0, -1)}, NULL, NULL),
  ('fc-ord-003', 'fc-tbl-004', 'fc-cust-003', 6, 'paused', ${ts(1)}, NULL, NULL),
  ('fc-ord-004', 'fc-tbl-005', 'fc-cust-004', 4, 'active', ${ts(0, -3)}, NULL, NULL),
  ('fc-ord-005', 'fc-tbl-007', 'fc-cust-005', 5, 'ended', ${ts(5)}, ${ts(5, 2)}, 8000),
  ('fc-ord-006', 'fc-tbl-001', 'fc-cust-006', 2, 'ended', ${ts(10)}, ${ts(10, 3)}, 5000),
  ('fc-ord-007', 'fc-tbl-002', 'fc-cust-007', 4, 'ended', ${ts(15)}, ${ts(14)}, 12000),
  ('fc-ord-008', 'fc-tbl-004', 'fc-cust-008', 8, 'settled', ${ts(20)}, ${ts(19)}, 15000);

-- ═══════ Actives (约局) ════════════════════════════════════════════════════════
INSERT INTO actives (id, creator_id, title, board_game_id, store_id, date, time, max_players, content, is_game, is_system_recommended, create_at, update_at) VALUES
  ('fc-act-001', 'fc-cust-001', '周末狼人杀', NULL, 'store-fc-gg', '2027-08-15', '14:00', 8, '{"desc":"新手友好"}', 1, 1, ${ts(5)}, ${ts(5)}),
  ('fc-act-002', 'fc-cust-003', '阿瓦隆高手局', NULL, 'store-fc-gg', '2027-08-20', '19:00', 10, '{"desc":"高手对决"}', 1, 0, ${ts(8)}, ${ts(8)}),
  ('fc-act-003', 'fc-cust-005', '卡坦岛体验', NULL, 'store-fc-jdk', '2027-08-10', '15:00', 4, '{"desc":"入门局"}', 1, 1, ${ts(3)}, ${ts(3)}),
  ('fc-act-004', 'fc-cust-007', '过期活动', NULL, 'store-fc-gg', '2027-06-01', '10:00', 6, '{"desc":"已过期"}', 1, 0, ${ts(60)}, ${ts(60)}),
  ('fc-act-005', 'fc-cust-009', '读书会', NULL, 'store-fc-jdk', '2027-09-01', '13:00', 12, '{"desc":"非游戏"}', 0, 0, ${ts(2)}, ${ts(2)});

INSERT INTO active_registrations (id, active_id, user_id, is_watching, create_at) VALUES
  ('fc-areg-001', 'fc-act-001', 'fc-cust-002', 0, ${ts(4)}),
  ('fc-areg-002', 'fc-act-001', 'fc-cust-004', 0, ${ts(3)}),
  ('fc-areg-003', 'fc-act-002', 'fc-cust-006', 1, ${ts(7)}),
  ('fc-areg-004', 'fc-act-003', 'fc-cust-008', 0, ${ts(2)});

-- ═══════ Events (活动) ═════════════════════════════════════════════════════════
INSERT INTO events (id, title, description, cover_image_url, content, is_published, store_id, create_at, update_at) VALUES
  ('fc-evt-001', '夏季桌游节', '年度盛会', NULL, '{"blocks":[]}', 1, 'store-fc-gg', ${ts(10)}, ${ts(10)}),
  ('fc-evt-002', '新人优惠月', '新用户首单免费', NULL, '{"blocks":[]}', 1, 'store-fc-jdk', ${ts(15)}, ${ts(12)}),
  ('fc-evt-003', '麻将大赛', '三麻四麻通吃', NULL, '{"blocks":[]}', 1, 'store-fc-gg', ${ts(20)}, ${ts(18)}),
  ('fc-evt-004', '草稿活动', '未发布', NULL, '{"blocks":[]}', 0, 'store-fc-gg', ${ts(2)}, ${ts(2)});

-- ═══════ Mahjong Matches ═══════════════════════════════════════════════════════
INSERT INTO mahjong_matches (id, table_id, match_type, gsz_record_id, mode, format, started_at, ended_at, termination_reason, players, round_history, config, gsz_synced, gsz_error, gsz_synced_at, created_at, store_id) VALUES
  ('fc-mj-001', 'fc-tbl-005', 'store', NULL, '4p', 'hanchan', ${ts(1)}, ${ts(1, 3)}, 'score_complete', '[{"userId":"fc-cust-001","nickname":"张三","seat":"east","finalScore":42000}]', '[]', '{"mode":"4p","format":"hanchan"}', 0, NULL, NULL, ${ts(1)}, 'store-fc-gg'),
  ('fc-mj-002', 'fc-tbl-005', 'store', NULL, '4p', 'tonpuu', ${ts(3)}, ${ts(3, 2)}, 'score_complete', '[{"userId":"fc-cust-002","nickname":"李四","seat":"south","finalScore":35000}]', '[]', '{"mode":"4p","format":"tonpuu"}', 0, NULL, NULL, ${ts(3)}, 'store-fc-gg'),
  ('fc-mj-003', 'fc-tbl-006', 'store', NULL, '4p', 'hanchan', ${ts(5)}, ${ts(5, 3)}, 'score_complete', '[{"userId":"fc-cust-003","nickname":"王五","seat":"west","finalScore":38000}]', '[]', '{"mode":"4p","format":"hanchan"}', 0, NULL, NULL, ${ts(5)}, 'store-fc-jdk'),
  ('fc-mj-004', 'fc-tbl-005', 'tournament', 6001, '4p', 'hanchan', ${ts(10)}, ${ts(10, 4)}, 'score_complete', '[{"userId":"fc-cust-005","nickname":"刘七","seat":"north","finalScore":48000}]', '[]', '{"mode":"4p","format":"hanchan","type":"tournament"}', 1, NULL, ${ts(10, 4)}, ${ts(10)}, 'store-fc-gg');

COMMIT;
`;

const tmpDir = await mkdtemp(join(tmpdir(), "fullcoverage-e2e-seed-"));
const sqlFile = join(tmpDir, "seed.sql");

try {
  await writeFile(sqlFile, sql);
  const commandCwd = new URL("..", import.meta.url).pathname;

  await addColumnIfMissing(commandCwd, "tables", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "events", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "user_info", "preferred_store_id TEXT");
  await addColumnIfMissing(commandCwd, "user_info", "preferred_theme TEXT");
  await addColumnIfMissing(commandCwd, '"user"', "is_active INTEGER DEFAULT 1");

  const { stdout, stderr } = await runWrangler(commandCwd, [
    "d1",
    "execute",
    "diceshock",
    "--local",
    "--file",
    sqlFile,
  ]);
  process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  console.log("\n✅ Full-coverage E2E seed data inserted successfully.");
} finally {
  await rm(tmpDir, { force: true, recursive: true });
}
