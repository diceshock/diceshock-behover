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

// ─── Timestamps ─────────────────────────────────────────────────────────────

const NOW = Date.now();
const DAY = 86400000;
const HOUR = 3600000;

// Spread dates across 90 days for range testing
const ts = (daysAgo: number, hoursOffset = 0) =>
  NOW - daysAgo * DAY + hoursOffset * HOUR;

// ─── SQL ────────────────────────────────────────────────────────────────────

const sql = String.raw`
BEGIN TRANSACTION;

-- ═══════ Cleanup ═════════════════════════════════════════════════════════════
DELETE FROM mahjong_matches WHERE id LIKE 'lnch-%';
DELETE FROM order_pause_logs WHERE occupancy_id LIKE 'lnch-%';
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
  ('store-lnch-gg', 'gg', '光谷E2E店', '光谷步行街88号', 1, ${ts(90)}),
  ('store-lnch-jdk', 'jdk', '街道口E2E店', '街道口地铁站旁', 1, ${ts(60)});

-- ═══════ Users ═══════════════════════════════════════════════════════════════
-- Diverse roles, stores, created_at dates, disabled states, phones, nicknames
INSERT INTO "user" (id, name, email, role) VALUES
  -- Admins
  ('lnch-admin-001', '赵管理', 'lnch-admin-001@test.local', 'admin'),
  ('lnch-admin-002', '钱超管', 'lnch-admin-002@test.local', 'admin'),
  -- Staff
  ('lnch-staff-001', '孙店员', 'lnch-staff-001@test.local', 'staff'),
  ('lnch-staff-002', '李店员', 'lnch-staff-002@test.local', 'staff'),
  ('lnch-staff-003', '周店员', 'lnch-staff-003@test.local', 'staff'),
  -- Customers (diverse)
  ('lnch-cust-001', '张三丰', 'lnch-c001@test.local', 'customer'),
  ('lnch-cust-002', '李白', 'lnch-c002@test.local', 'customer'),
  ('lnch-cust-003', '王维', 'lnch-c003@test.local', 'customer'),
  ('lnch-cust-004', '杜甫', 'lnch-c004@test.local', 'customer'),
  ('lnch-cust-005', '白居易', 'lnch-c005@test.local', 'customer'),
  ('lnch-cust-006', '苏轼', 'lnch-c006@test.local', 'customer'),
  ('lnch-cust-007', '辛弃疾', 'lnch-c007@test.local', 'customer'),
  ('lnch-cust-008', '李清照', 'lnch-c008@test.local', 'customer'),
  ('lnch-cust-009', 'Alice Chen', 'lnch-c009@test.local', 'customer'),
  ('lnch-cust-010', 'Bob王', 'lnch-c010@test.local', 'customer');

INSERT INTO user_info (id, uid, create_at, nickname, phone, points, avatar_url, preferred_store_id, preferred_locale) VALUES
  ('lnch-admin-001', 'adm001', ${ts(85)}, '赵管理', '13900000001', 0, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-admin-002', 'adm002', ${ts(70)}, '钱超管', '13900000002', 0, NULL, 'store-lnch-jdk', 'zh'),
  ('lnch-staff-001', 'stf001', ${ts(80)}, '孙店员', '13900000011', 50, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-staff-002', 'stf002', ${ts(50)}, '李店员', '13900000012', 30, NULL, 'store-lnch-jdk', 'zh'),
  ('lnch-staff-003', 'stf003', ${ts(30)}, '周店员', '13900000013', 10, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-cust-001', 'thx1138', ${ts(75)}, '张三丰', '13800001001', 200, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-cust-002', 'uid2002', ${ts(60)}, '李白', '13800001002', 150, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-cust-003', 'uid3003', ${ts(45)}, '王维', '13800001003', 80, NULL, 'store-lnch-jdk', 'zh'),
  ('lnch-cust-004', 'uid4004', ${ts(30)}, '杜甫', '13800001004', 0, NULL, 'store-lnch-jdk', 'zh'),
  ('lnch-cust-005', 'uid5005', ${ts(20)}, '白居易', '13800001005', 500, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-cust-006', 'uid6006', ${ts(10)}, '苏轼', '13800001006', 320, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-cust-007', 'uid7007', ${ts(5)}, '辛弃疾', '13800001007', 100, NULL, 'store-lnch-jdk', 'zh'),
  ('lnch-cust-008', 'uid8008', ${ts(3)}, '李清照', '13800001008', 450, NULL, 'store-lnch-gg', 'zh'),
  ('lnch-cust-009', 'uid9009', ${ts(1)}, 'Alice Chen', '13800001009', 60, NULL, 'store-lnch-jdk', 'en'),
  ('lnch-cust-010', 'uid0010', ${ts(0)}, 'Bob王', '13800001010', 25, NULL, 'store-lnch-gg', 'zh');

-- ═══════ Tables ══════════════════════════════════════════════════════════════
-- Mix of types (fixed/solo), status (active/inactive), scopes, stores, capacities
INSERT INTO tables (id, name, type, scope, status, capacity, description, code, store_id, create_at, update_at) VALUES
  ('lnch-tbl-001', '大厅A1', 'fixed', 'boardgame', 'active', 6, '光谷大厅固定桌', 'GG-A1', 'store-lnch-gg', ${ts(80)}, ${ts(2)}),
  ('lnch-tbl-002', '大厅A2', 'fixed', 'boardgame', 'active', 8, '光谷大厅8人桌', 'GG-A2', 'store-lnch-gg', ${ts(80)}, ${ts(5)}),
  ('lnch-tbl-003', '包间B1', 'fixed', 'boardgame', 'active', 4, '光谷包间', 'GG-B1', 'store-lnch-gg', ${ts(60)}, ${ts(3)}),
  ('lnch-tbl-004', '拼桌C1', 'solo', 'boardgame', 'active', 4, '光谷拼桌区', 'GG-C1', 'store-lnch-gg', ${ts(45)}, ${ts(1)}),
  ('lnch-tbl-005', '雀桌M1', 'fixed', 'mahjong', 'active', 4, '光谷麻将专桌', 'GG-M1', 'store-lnch-gg', ${ts(40)}, ${ts(0)}),
  ('lnch-tbl-006', '停用桌X1', 'fixed', 'boardgame', 'inactive', 4, '已停用', 'GG-X1', 'store-lnch-gg', ${ts(90)}, ${ts(20)}),
  ('lnch-tbl-007', '街道口A1', 'fixed', 'boardgame', 'active', 6, '街道口大厅', 'JDK-A1', 'store-lnch-jdk', ${ts(55)}, ${ts(4)}),
  ('lnch-tbl-008', '街道口B1', 'solo', 'boardgame', 'active', 4, '街道口拼桌', 'JDK-B1', 'store-lnch-jdk', ${ts(50)}, ${ts(2)}),
  ('lnch-tbl-009', '街道口M1', 'fixed', 'mahjong', 'active', 4, '街道口麻将桌', 'JDK-M1', 'store-lnch-jdk', ${ts(40)}, ${ts(1)}),
  ('lnch-tbl-010', '街道口停用', 'fixed', 'boardgame', 'inactive', 6, '已停用桌', 'JDK-X1', 'store-lnch-jdk', ${ts(70)}, ${ts(30)});

-- ═══════ Orders (table_occupancy) ════════════════════════════════════════════
-- Diverse: active/paused/ended × tables × users × date spread
INSERT INTO table_occupancy (id, table_id, user_id, seats, status, start_at, end_at, final_price, pricing_snapshot_id) VALUES
  -- Active orders (recent)
  ('lnch-ord-001', 'lnch-tbl-001', 'lnch-cust-001', 3, 'active', ${ts(0, -2)}, NULL, NULL, NULL),
  ('lnch-ord-002', 'lnch-tbl-004', 'lnch-cust-002', 1, 'active', ${ts(0, -1)}, NULL, NULL, NULL),
  ('lnch-ord-003', 'lnch-tbl-007', 'lnch-cust-009', 2, 'active', ${ts(0, -3)}, NULL, NULL, NULL),
  -- Paused orders
  ('lnch-ord-004', 'lnch-tbl-002', 'lnch-cust-003', 4, 'paused', ${ts(1)}, NULL, NULL, NULL),
  ('lnch-ord-005', 'lnch-tbl-008', 'lnch-cust-004', 2, 'paused', ${ts(2)}, NULL, NULL, NULL),
  -- Ended orders (various dates for range testing)
  ('lnch-ord-006', 'lnch-tbl-001', 'lnch-cust-005', 2, 'ended', ${ts(3)}, ${ts(3, 3)}, 4500, NULL),
  ('lnch-ord-007', 'lnch-tbl-003', 'lnch-cust-006', 1, 'ended', ${ts(7)}, ${ts(7, 2)}, 2000, NULL),
  ('lnch-ord-008', 'lnch-tbl-005', 'lnch-cust-007', 4, 'ended', ${ts(14)}, ${ts(14, 4)}, 8000, NULL),
  ('lnch-ord-009', 'lnch-tbl-007', 'lnch-cust-001', 2, 'ended', ${ts(21)}, ${ts(21, 2)}, 3500, NULL),
  ('lnch-ord-010', 'lnch-tbl-009', 'lnch-cust-002', 4, 'ended', ${ts(30)}, ${ts(30, 5)}, 10000, NULL),
  ('lnch-ord-011', 'lnch-tbl-002', 'lnch-cust-008', 3, 'ended', ${ts(45)}, ${ts(45, 3)}, 5500, NULL),
  ('lnch-ord-012', 'lnch-tbl-004', 'lnch-cust-010', 1, 'ended', ${ts(60)}, ${ts(60, 1)}, 1500, NULL);

-- Pause logs for paused orders
INSERT INTO order_pause_logs (id, occupancy_id, paused_at, resumed_at, pause_reason) VALUES
  ('lnch-pl-001', 'lnch-ord-004', ${ts(1, -2)}, NULL, 'manual'),
  ('lnch-pl-002', 'lnch-ord-005', ${ts(2, -1)}, NULL, 'toilet');

-- ═══════ Actives (约局) ══════════════════════════════════════════════════════
-- Mix: active/expired, game/non-game, recommended/not, both stores
INSERT INTO actives (id, creator_id, title, board_game_id, store_id, date, time, max_players, content, is_game, is_system_recommended, create_at, update_at) VALUES
  ('lnch-act-001', 'lnch-cust-001', '周末卡坦岛', NULL, 'store-lnch-gg', '2027-08-01', '14:00', 4, '{"desc":"新手友好"}', 1, 1, ${ts(5)}, ${ts(5)}),
  ('lnch-act-002', 'lnch-staff-001', '工作日跑团', NULL, 'store-lnch-gg', '2027-07-15', '19:00', 6, '{"desc":"DND五版"}', 1, 0, ${ts(10)}, ${ts(10)}),
  ('lnch-act-003', 'lnch-cust-003', '街道口三国杀', NULL, 'store-lnch-jdk', '2027-07-20', '15:00', 8, '{"desc":"全扩"}', 1, 1, ${ts(8)}, ${ts(8)}),
  ('lnch-act-004', 'lnch-cust-005', '已过期桌游局', NULL, 'store-lnch-gg', '2024-06-01', '10:00', 4, '{}', 1, 0, ${ts(60)}, ${ts(60)}),
  ('lnch-act-005', 'lnch-cust-002', '已过期拼桌', NULL, 'store-lnch-jdk', '2024-05-15', '18:00', 3, '{}', 1, 0, ${ts(70)}, ${ts(70)}),
  ('lnch-act-006', 'lnch-cust-006', '读书会', NULL, 'store-lnch-gg', '2027-09-01', '14:00', 10, '{"desc":"非游戏"}', 0, 0, ${ts(2)}, ${ts(2)}),
  ('lnch-act-007', 'lnch-staff-002', '新人培训', NULL, 'store-lnch-jdk', '2027-07-25', '10:00', 5, '{}', 0, 0, ${ts(3)}, ${ts(3)});

-- Registrations
INSERT INTO active_registrations (id, active_id, user_id, is_watching, create_at) VALUES
  ('lnch-areg-001', 'lnch-act-001', 'lnch-cust-002', 0, ${ts(4)}),
  ('lnch-areg-002', 'lnch-act-001', 'lnch-cust-003', 0, ${ts(3)}),
  ('lnch-areg-003', 'lnch-act-002', 'lnch-cust-004', 0, ${ts(9)}),
  ('lnch-areg-004', 'lnch-act-003', 'lnch-cust-005', 1, ${ts(7)});

-- ═══════ Events (活动) ═══════════════════════════════════════════════════════
-- Mix: published/draft, various dates, both stores
INSERT INTO events (id, title, description, cover_image_url, content, store_id, is_published, create_at, update_at) VALUES
  ('lnch-evt-001', '夏季桌游节', '年度桌游盛会', NULL, '{"blocks":[]}', 'store-lnch-gg', 1, ${ts(5)}, ${ts(5)}),
  ('lnch-evt-002', '麻将挑战赛', '三麻四麻混合赛', NULL, '{"blocks":[]}', 'store-lnch-gg', 1, ${ts(20)}, ${ts(15)}),
  ('lnch-evt-003', '新人优惠周', '新注册首单免费', NULL, '{"blocks":[]}', 'store-lnch-jdk', 1, ${ts(10)}, ${ts(8)}),
  ('lnch-evt-004', '跨年派对', '12月31日通宵', NULL, '{"blocks":[]}', 'store-lnch-gg', 1, ${ts(60)}, ${ts(55)}),
  ('lnch-evt-005', '草稿活动A', '未发布测试', NULL, '{"blocks":[]}', 'store-lnch-gg', 0, ${ts(2)}, ${ts(2)}),
  ('lnch-evt-006', '草稿活动B', '街道口未发布', NULL, '{"blocks":[]}', 'store-lnch-jdk', 0, ${ts(1)}, ${ts(1)});

-- ═══════ Mahjong Matches (雀庄) ══════════════════════════════════════════════
-- 4p/3p × hanchan/tonpuu × completed/incomplete × stores
INSERT INTO mahjong_matches (id, table_id, store_id, match_type, gsz_record_id, mode, format, started_at, ended_at, termination_reason, players, round_history, config, gsz_synced, gsz_error, gsz_synced_at, created_at) VALUES
  ('lnch-mj-001', 'lnch-tbl-005', 'store-lnch-gg', 'store', NULL, '4p', 'hanchan', ${ts(1)}, ${ts(1, 3)}, 'score_complete', '[{"userId":"lnch-cust-001","nickname":"张三丰","seat":"east","finalScore":42000}]', '[]', '{"mode":"4p","format":"hanchan"}', 0, NULL, NULL, ${ts(1)}),
  ('lnch-mj-002', 'lnch-tbl-005', 'store-lnch-gg', 'store', NULL, '4p', 'tonpuu', ${ts(3)}, ${ts(3, 2)}, 'score_complete', '[{"userId":"lnch-cust-002","nickname":"李白","seat":"south","finalScore":35000}]', '[]', '{"mode":"4p","format":"tonpuu"}', 0, NULL, NULL, ${ts(3)}),
  ('lnch-mj-003', 'lnch-tbl-009', 'store-lnch-jdk', 'store', NULL, '3p', 'hanchan', ${ts(5)}, ${ts(5, 2)}, 'score_complete', '[{"userId":"lnch-cust-003","nickname":"王维","seat":"west","finalScore":28000}]', '[]', '{"mode":"3p","format":"hanchan"}', 0, NULL, NULL, ${ts(5)}),
  ('lnch-mj-004', 'lnch-tbl-009', 'store-lnch-jdk', 'store', NULL, '3p', 'tonpuu', ${ts(10)}, ${ts(10, 1)}, 'vote', '[{"userId":"lnch-cust-004","nickname":"杜甫","seat":"north","finalScore":22000}]', '[]', '{"mode":"3p","format":"tonpuu"}', 0, NULL, NULL, ${ts(10)}),
  ('lnch-mj-005', 'lnch-tbl-005', 'store-lnch-gg', 'tournament', 5001, '4p', 'hanchan', ${ts(15)}, ${ts(15, 4)}, 'score_complete', '[{"userId":"lnch-cust-005","nickname":"白居易","seat":"east","finalScore":50000}]', '[]', '{"mode":"4p","format":"hanchan","type":"tournament"}', 1, NULL, ${ts(15, 4)}, ${ts(15)}),
  ('lnch-mj-006', 'lnch-tbl-005', 'store-lnch-gg', 'store', NULL, '4p', 'hanchan', ${ts(2)}, ${ts(2, 1)}, 'admin_abort', '[{"userId":"lnch-cust-006","nickname":"苏轼","seat":"south","finalScore":15000}]', '[]', '{"mode":"4p","format":"hanchan"}', 0, 'aborted by admin', NULL, ${ts(2)}),
  ('lnch-mj-007', 'lnch-tbl-009', 'store-lnch-jdk', 'store', NULL, '3p', 'hanchan', ${ts(7)}, ${ts(7, 2)}, 'order_invalid', '[{"userId":"lnch-cust-007","nickname":"辛弃疾","seat":"west","finalScore":19000}]', '[]', '{"mode":"3p","format":"hanchan"}', 0, 'invalid order ref', NULL, ${ts(7)});

COMMIT;
`;

const tmpDir = await mkdtemp(join(tmpdir(), "launcher-e2e-seed-"));
const sqlFile = join(tmpDir, "seed.sql");

try {
  await writeFile(sqlFile, sql);
  const commandCwd = new URL("..", import.meta.url).pathname;
  const { stdout, stderr } = await runWrangler(commandCwd, [
    "d1",
    "execute",
    "diceshock-db",
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
