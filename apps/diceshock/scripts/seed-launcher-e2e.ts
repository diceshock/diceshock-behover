/**
 * Seed script for launcher e2e tests.
 * Creates diverse data across ALL categories to exercise every filter kind,
 * option value, date range, sort field, and search key combination.
 *
 * Data dimensions:
 * - 2 stores (gg, jdk)
 * - 3 roles (admin, staff, customer) × multiple users per role
 * - Users with varied: nicknames, UIDs, phones, created_at, disabled states, stored_value
 * - Tables: fixed/solo × active/inactive × boardgame/mahjong × both stores
 * - Orders: active/paused/ended × multiple users × tables × date ranges
 * - Actives: game/non-game × future/past (expired) × recommended/not
 * - Events: published/draft × active/ended/upcoming × date ranges
 * - Mahjong: 4p/3p × hanchan/tonpuu × completed/incomplete × both stores
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

// ─── Timestamps ─────────────────────────────────────────────────────────────

const NOW = Date.now();
/** daysAgo → epoch ms */
function ts(daysAgo: number, hoursExtra = 0): number {
  return NOW - daysAgo * 86_400_000 + hoursExtra * 3_600_000;
}

const sql = String.raw`
BEGIN TRANSACTION;

-- ═══════ Schema (ensure tables exist) ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, address TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER);
CREATE TABLE IF NOT EXISTS actives (id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, title TEXT NOT NULL, board_game_id TEXT, store_id TEXT, date TEXT NOT NULL, time TEXT, max_players INTEGER NOT NULL, content TEXT, is_game INTEGER DEFAULT 1, is_system_recommended INTEGER DEFAULT 0, create_at INTEGER, update_at INTEGER);
CREATE TABLE IF NOT EXISTS active_registrations (id TEXT PRIMARY KEY, active_id TEXT NOT NULL, user_id TEXT NOT NULL, is_watching INTEGER DEFAULT 0, create_at INTEGER);

-- ═══════ Cleanup ═════════════════════════════════════════════════════════════
DELETE FROM mahjong_matches WHERE id LIKE 'lnch-%';
DELETE FROM table_occupancy WHERE id LIKE 'lnch-%';
DELETE FROM tables WHERE id LIKE 'lnch-%';
DELETE FROM active_registrations WHERE active_id LIKE 'lnch-%' OR user_id LIKE 'lnch-%';
DELETE FROM actives WHERE id LIKE 'lnch-%';
DELETE FROM events WHERE id LIKE 'lnch-%';
DELETE FROM user_info WHERE id LIKE 'lnch-%';
DELETE FROM "user" WHERE id LIKE 'lnch-%';
DELETE FROM stores WHERE id LIKE 'store-lnch-%';

-- ═══════ Stores ══════════════════════════════════════════════════════════════
INSERT INTO stores (id, code, name, address, is_active, created_at) VALUES
  ('store-lnch-gg', 'lnch-gg', '光谷E2E店', '光谷步行街88号', 1, ${ts(90)}),
  ('store-lnch-jdk', 'lnch-jdk', '街道口E2E店', '街道口地铁站旁', 1, ${ts(60)});

-- ═══════ Users ═══════════════════════════════════════════════════════════════
-- 2 admins, 3 staff, 10 customers = 15 users
INSERT INTO "user" (id, name, email, role) VALUES
  ('lnch-admin-001', '赵管理', 'lnch-admin-001@test.local', 'admin'),
  ('lnch-admin-002', '钱总监', 'lnch-admin-002@test.local', 'admin'),
  ('lnch-staff-001', '孙店员', 'lnch-staff-001@test.local', 'staff'),
  ('lnch-staff-002', '周前台', 'lnch-staff-002@test.local', 'staff'),
  ('lnch-staff-003', '吴清洁', 'lnch-staff-003@test.local', 'staff'),
  ('lnch-cust-001', '张三丰', 'lnch-cust-001@test.local', 'customer'),
  ('lnch-cust-002', '李白', 'lnch-cust-002@test.local', 'customer'),
  ('lnch-cust-003', '王维', 'lnch-cust-003@test.local', 'customer'),
  ('lnch-cust-004', '杜甫', 'lnch-cust-004@test.local', 'customer'),
  ('lnch-cust-005', '白居易', 'lnch-cust-005@test.local', 'customer'),
  ('lnch-cust-006', '苏轼', 'lnch-cust-006@test.local', 'customer'),
  ('lnch-cust-007', '辛弃疾', 'lnch-cust-007@test.local', 'customer'),
  ('lnch-cust-008', '陆游', 'lnch-cust-008@test.local', 'customer'),
  ('lnch-cust-009', '柳永', 'lnch-cust-009@test.local', 'customer'),
  ('lnch-cust-010', '欧阳修', 'lnch-cust-010@test.local', 'customer');

INSERT INTO user_info (id, uid, create_at, nickname, phone, meta) VALUES
  ('lnch-admin-001', 'adm001', ${ts(85)}, '赵管理', '13900000001', '{"preferredStoreId":"store-lnch-gg"}'),
  ('lnch-admin-002', 'adm002', ${ts(80)}, '钱总监', '13900000002', '{"preferredStoreId":"store-lnch-jdk"}'),
  ('lnch-staff-001', 'stf001', ${ts(70)}, '孙店员', '13800001001', '{"preferredStoreId":"store-lnch-gg"}'),
  ('lnch-staff-002', 'stf002', ${ts(65)}, '周前台', '13800001002', '{"preferredStoreId":"store-lnch-jdk"}'),
  ('lnch-staff-003', 'stf003', ${ts(60)}, '吴清洁', '13800001003', '{"preferredStoreId":"store-lnch-gg"}'),
  ('lnch-cust-001', 'thx1138', ${ts(50)}, '张三丰', '13700001001', NULL),
  ('lnch-cust-002', 'cst002', ${ts(48)}, '李白', '13700001002', NULL),
  ('lnch-cust-003', 'cst003', ${ts(45)}, '王维', '13700001003', NULL),
  ('lnch-cust-004', 'cst004', ${ts(40)}, '杜甫', '13700001004', NULL),
  ('lnch-cust-005', 'cst005', ${ts(35)}, '白居易', '13700001005', NULL),
  ('lnch-cust-006', 'cst006', ${ts(30)}, '苏轼', '13700001006', NULL),
  ('lnch-cust-007', 'cst007', ${ts(25)}, '辛弃疾', '13700001007', NULL),
  ('lnch-cust-008', 'cst008', ${ts(20)}, '陆游', '13700001008', NULL),
  ('lnch-cust-009', 'cst009', ${ts(15)}, '柳永', '13700001009', NULL),
  ('lnch-cust-010', 'cst010', ${ts(10)}, '欧阳修', '13700001010', NULL);

-- ═══════ Tables (桌台) ═══════════════════════════════════════════════════════
-- 10 tables: fixed/solo × active/inactive × boardgame/mahjong
INSERT INTO tables (id, name, type, scope, status, capacity, code, create_at, update_at) VALUES
  ('lnch-tbl-001', 'A1桌', 'fixed', 'boardgame', 'active', 6, 'LA1', ${ts(80)}, ${ts(80)}),
  ('lnch-tbl-002', 'A2桌', 'fixed', 'boardgame', 'active', 4, 'LA2', ${ts(80)}, ${ts(80)}),
  ('lnch-tbl-003', 'A3桌', 'fixed', 'boardgame', 'inactive', 6, 'LA3', ${ts(75)}, ${ts(10)}),
  ('lnch-tbl-004', 'B1桌', 'solo', 'boardgame', 'active', 2, 'LB1', ${ts(70)}, ${ts(70)}),
  ('lnch-tbl-005', 'M1麻将桌', 'fixed', 'mahjong', 'active', 4, 'LM1', ${ts(65)}, ${ts(65)}),
  ('lnch-tbl-006', 'M2麻将桌', 'fixed', 'mahjong', 'active', 4, 'LM2', ${ts(60)}, ${ts(60)}),
  ('lnch-tbl-007', 'M3麻将桌', 'fixed', 'mahjong', 'inactive', 4, 'LM3', ${ts(55)}, ${ts(5)}),
  ('lnch-tbl-008', 'C1包间', 'solo', 'boardgame', 'active', 10, 'LC1', ${ts(50)}, ${ts(50)}),
  ('lnch-tbl-009', 'M4麻将桌', 'fixed', 'mahjong', 'active', 3, 'LM4', ${ts(45)}, ${ts(45)}),
  ('lnch-tbl-010', 'D1桌', 'fixed', 'boardgame', 'active', 8, 'LD1', ${ts(40)}, ${ts(40)});

-- ═══════ Orders (table_occupancy) ════════════════════════════════════════════
-- 12 orders: active/paused/ended spread over 60 days
INSERT INTO table_occupancy (id, table_id, user_id, seats, status, start_at, end_at) VALUES
  ('lnch-ord-001', 'lnch-tbl-001', 'lnch-cust-001', 4, 'active', ${ts(0, -2)}, NULL),
  ('lnch-ord-002', 'lnch-tbl-002', 'lnch-cust-002', 3, 'active', ${ts(0, -1)}, NULL),
  ('lnch-ord-003', 'lnch-tbl-004', 'lnch-cust-003', 2, 'active', ${ts(1)}, NULL),
  ('lnch-ord-004', 'lnch-tbl-005', 'lnch-cust-004', 4, 'paused', ${ts(2)}, NULL),
  ('lnch-ord-005', 'lnch-tbl-006', 'lnch-cust-005', 4, 'paused', ${ts(3)}, NULL),
  ('lnch-ord-006', 'lnch-tbl-001', 'lnch-cust-006', 3, 'paused', ${ts(5)}, NULL),
  ('lnch-ord-007', 'lnch-tbl-002', 'lnch-cust-007', 2, 'ended', ${ts(10)}, ${ts(9)}),
  ('lnch-ord-008', 'lnch-tbl-003', 'lnch-cust-008', 4, 'ended', ${ts(15)}, ${ts(14)}),
  ('lnch-ord-009', 'lnch-tbl-008', 'lnch-cust-009', 6, 'ended', ${ts(20)}, ${ts(19)}),
  ('lnch-ord-010', 'lnch-tbl-010', 'lnch-cust-010', 5, 'ended', ${ts(30)}, ${ts(29)}),
  ('lnch-ord-011', 'lnch-tbl-001', 'lnch-cust-001', 4, 'ended', ${ts(45)}, ${ts(44)}),
  ('lnch-ord-012', 'lnch-tbl-005', 'lnch-cust-002', 4, 'ended', ${ts(55)}, ${ts(54)});

-- ═══════ Actives (约局) ══════════════════════════════════════════════════════
-- 7 actives: game/non-game, future/past, recommended/not
INSERT INTO actives (id, creator_id, title, board_game_id, store_id, date, time, max_players, content, is_game, is_system_recommended, create_at, update_at) VALUES
  ('lnch-act-001', 'lnch-cust-001', '周末四麻', NULL, 'store-lnch-gg', '2027-08-01', '14:00', 4, '{"desc":"凑一桌四麻"}', 1, 1, ${ts(5)}, ${ts(5)}),
  ('lnch-act-002', 'lnch-cust-003', '三麻练习赛', NULL, 'store-lnch-jdk', '2027-07-28', '19:00', 3, '{"desc":"新手友好"}', 1, 0, ${ts(8)}, ${ts(8)}),
  ('lnch-act-003', 'lnch-staff-001', '桌游之夜', NULL, 'store-lnch-gg', '2027-08-05', '18:30', 8, '{"desc":"阿瓦隆+狼人杀"}', 1, 1, ${ts(3)}, ${ts(3)}),
  ('lnch-act-004', 'lnch-cust-005', '卡坦岛锦标赛', NULL, 'store-lnch-gg', '2027-07-20', '10:00', 6, '{"desc":"已过期"}', 1, 0, ${ts(30)}, ${ts(30)}),
  ('lnch-act-005', 'lnch-cust-002', '跑团DND', NULL, 'store-lnch-jdk', '2027-08-10', '13:00', 5, '{"desc":"新开团"}', 1, 0, ${ts(2)}, ${ts(2)}),
  ('lnch-act-006', 'lnch-cust-006', '读书会', NULL, 'store-lnch-gg', '2027-09-01', '14:00', 10, '{"desc":"非游戏"}', 0, 0, ${ts(2)}, ${ts(2)}),
  ('lnch-act-007', 'lnch-staff-002', '新人培训', NULL, 'store-lnch-jdk', '2027-07-25', '10:00', 5, '{}', 0, 0, ${ts(3)}, ${ts(3)});

-- Registrations
INSERT INTO active_registrations (id, active_id, user_id, is_watching, create_at) VALUES
  ('lnch-areg-001', 'lnch-act-001', 'lnch-cust-002', 0, ${ts(4)}),
  ('lnch-areg-002', 'lnch-act-001', 'lnch-cust-003', 0, ${ts(3)}),
  ('lnch-areg-003', 'lnch-act-002', 'lnch-cust-004', 0, ${ts(9)}),
  ('lnch-areg-004', 'lnch-act-003', 'lnch-cust-005', 1, ${ts(7)});

-- ═══════ Events (活动) ═══════════════════════════════════════════════════════
-- Mix: published/draft, various dates
INSERT INTO events (id, title, description, cover_image_url, content, is_published, create_at, update_at) VALUES
  ('lnch-evt-001', '夏季桌游节', '年度桌游盛会', NULL, '{"blocks":[]}', 1, ${ts(5)}, ${ts(5)}),
  ('lnch-evt-002', '麻将挑战赛', '三麻四麻混合赛', NULL, '{"blocks":[]}', 1, ${ts(20)}, ${ts(15)}),
  ('lnch-evt-003', '新人优惠周', '新注册首单免费', NULL, '{"blocks":[]}', 1, ${ts(10)}, ${ts(8)}),
  ('lnch-evt-004', '跨年派对', '12月31日通宵', NULL, '{"blocks":[]}', 1, ${ts(60)}, ${ts(55)}),
  ('lnch-evt-005', '草稿活动A', '未发布测试', NULL, '{"blocks":[]}', 0, ${ts(2)}, ${ts(2)}),
  ('lnch-evt-006', '草稿活动B', '街道口未发布', NULL, '{"blocks":[]}', 0, ${ts(1)}, ${ts(1)});

-- ═══════ Mahjong Matches (雀庄) ══════════════════════════════════════════════
-- 4p/3p × hanchan/tonpuu × completed/incomplete
INSERT INTO mahjong_matches (id, table_id, match_type, gsz_record_id, mode, format, started_at, ended_at, termination_reason, players, round_history, config, gsz_synced, gsz_error, gsz_synced_at, created_at) VALUES
  ('lnch-mj-001', 'lnch-tbl-005', 'store', NULL, '4p', 'hanchan', ${ts(1)}, ${ts(1, 3)}, 'score_complete', '[{"userId":"lnch-cust-001","nickname":"张三丰","seat":"east","finalScore":42000}]', '[]', '{"mode":"4p","format":"hanchan"}', 0, NULL, NULL, ${ts(1)}),
  ('lnch-mj-002', 'lnch-tbl-005', 'store', NULL, '4p', 'tonpuu', ${ts(3)}, ${ts(3, 2)}, 'score_complete', '[{"userId":"lnch-cust-002","nickname":"李白","seat":"south","finalScore":35000}]', '[]', '{"mode":"4p","format":"tonpuu"}', 0, NULL, NULL, ${ts(3)}),
  ('lnch-mj-003', 'lnch-tbl-009', 'store', NULL, '3p', 'hanchan', ${ts(5)}, ${ts(5, 2)}, 'score_complete', '[{"userId":"lnch-cust-003","nickname":"王维","seat":"west","finalScore":28000}]', '[]', '{"mode":"3p","format":"hanchan"}', 0, NULL, NULL, ${ts(5)}),
  ('lnch-mj-004', 'lnch-tbl-009', 'store', NULL, '3p', 'tonpuu', ${ts(10)}, ${ts(10, 1)}, 'vote', '[{"userId":"lnch-cust-004","nickname":"杜甫","seat":"north","finalScore":22000}]', '[]', '{"mode":"3p","format":"tonpuu"}', 0, NULL, NULL, ${ts(10)}),
  ('lnch-mj-005', 'lnch-tbl-005', 'tournament', 5001, '4p', 'hanchan', ${ts(15)}, ${ts(15, 4)}, 'score_complete', '[{"userId":"lnch-cust-005","nickname":"白居易","seat":"east","finalScore":50000}]', '[]', '{"mode":"4p","format":"hanchan","type":"tournament"}', 1, NULL, ${ts(15, 4)}, ${ts(15)}),
  ('lnch-mj-006', 'lnch-tbl-005', 'store', NULL, '4p', 'hanchan', ${ts(2)}, ${ts(2, 1)}, 'admin_abort', '[{"userId":"lnch-cust-006","nickname":"苏轼","seat":"south","finalScore":15000}]', '[]', '{"mode":"4p","format":"hanchan"}', 0, 'aborted by admin', NULL, ${ts(2)}),
  ('lnch-mj-007', 'lnch-tbl-009', 'store', NULL, '3p', 'hanchan', ${ts(7)}, ${ts(7, 2)}, 'order_invalid', '[{"userId":"lnch-cust-007","nickname":"辛弃疾","seat":"west","finalScore":19000}]', '[]', '{"mode":"3p","format":"hanchan"}', 0, 'invalid order ref', NULL, ${ts(7)});

COMMIT;
`;

const tmpDir = await mkdtemp(join(tmpdir(), "launcher-e2e-seed-"));
const sqlFile = join(tmpDir, "seed.sql");

try {
  await writeFile(sqlFile, sql);
  const commandCwd = new URL("..", import.meta.url).pathname;

  // Ensure columns exist that may have been added by migrations
  await addColumnIfMissing(commandCwd, "tables", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "events", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "mahjong_matches", "store_id TEXT");
  await addColumnIfMissing(commandCwd, "user_info", "preferred_store_id TEXT");
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
  console.log("\n✅ Launcher E2E seed data inserted successfully.");
} finally {
  await rm(tmpDir, { force: true, recursive: true });
}
