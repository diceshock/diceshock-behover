/**
 * Full Lifecycle Browser E2E Test — Multi-Person Rounds
 *
 * TRUE browser-driven test using Playwright page interactions:
 *   - Staff operates the dashboard (clicks, forms, navigation)
 *   - Each person registered in DB, staff adds occupancy via "添加使用" (simulates QR scan)
 *   - Staff terminates orders via "终止" button → settle page → "确认结算"
 *   - Staff manages stored value in user detail page
 *
 * 3 rounds: 4人BOARDGAME / 6人TRPG / 8人CONSOLE
 */
import { expect, type Page, test } from "@playwright/test";
import { clickVisible, fillVisible, selectVisible, waitForDialog, submitDialog, waitForGql, clickTab, setupStaffAuth } from "../helpers/interactions";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ─── Types & Data ─────────────────────────────────────────────────────────────

interface RegisteredUser {
  id: string;
  nickname: string;
  phone: string;
}

interface RoundParams {
  roundIndex: number;
  tableNameA: string;
  tableNameB: string;
  tableScope: "boardgame" | "trpg" | "console";
  tableScopeLabel: string;
  capacity: number;
  personCount: number;
  storedValueAmount: number;
  deductAmount: number;
}

const ROUNDS: RoundParams[] = [
  {
    roundIndex: 0,
    tableNameA: "E2E浏览器R1桌A",
    tableNameB: "E2E浏览器R1桌B",
    tableScope: "boardgame",
    tableScopeLabel: "桌游",
    capacity: 6,
    personCount: 4,
    storedValueAmount: 10000,
    deductAmount: 3000,
  },
  {
    roundIndex: 1,
    tableNameA: "E2E浏览器R2桌A",
    tableNameB: "E2E浏览器R2桌B",
    tableScope: "trpg",
    tableScopeLabel: "跑团",
    capacity: 8,
    personCount: 6,
    storedValueAmount: 20000,
    deductAmount: 5000,
  },
  {
    roundIndex: 2,
    tableNameA: "E2E浏览器R3桌A",
    tableNameB: "E2E浏览器R3桌B",
    tableScope: "console",
    tableScopeLabel: "电玩",
    capacity: 10,
    personCount: 8,
    storedValueAmount: 15000,
    deductAmount: 8000,
  },
];

const NICKNAMES = [
  "赵一", "钱二", "孙三", "李四", "周五", "吴六", "郑七", "王八",
  "冯九", "陈十", "褚十一", "卫十二", "蒋十三", "沈十四", "韩十五", "杨十六",
  "朱十七", "秦十八", "尤十九", "许二十",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUsers(roundIndex: number, count: number): RegisteredUser[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = roundIndex * 10 + i;
    return {
      id: `e2e-br-r${roundIndex + 1}-p${i + 1}`,
      nickname: NICKNAMES[idx % NICKNAMES.length],
      phone: `1390000${String(300 + idx).padStart(4, "0")}`,
    };
  });
}

async function ensureUsersInD1(users: RegisteredUser[]): Promise<void> {
  const stmts = users.flatMap((u) => [
    `INSERT OR REPLACE INTO "user" (id, name, email, role) VALUES ('${u.id}', '${u.nickname}', '${u.id}@e2e.local', 'customer');`,
    `INSERT OR REPLACE INTO user_info (id, uid, create_at, nickname, phone, points, preferred_store_id, preferred_locale) VALUES ('${u.id}', 'uid-${u.id}', ${Date.now()}, '${u.nickname}', '${u.phone}', 0, 'store-e2e-gg', 'zh');`,
  ]);
  await execFileAsync("pnpm", [
    "exec", "wrangler", "d1", "execute", "diceshock", "--local",
    "--command", stmts.join("\n"),
  ], { cwd: process.cwd() });
}

async function setupStaffPage(page: Page): Promise<void> {
  await setupStaffAuth(page);
}

/** Create a table via the dashboard dialog; returns { id, code } from GQL response */
async function createTableViaDash(
  page: Page,
  name: string,
  scope: string,
  capacity: number,
): Promise<{ id: string; code: string }> {
  const responsePromise = waitForGql(page, "createTable");

  const createBtn = page.getByRole("button", { name: "新建桌台" });
  await clickVisible(createBtn);

  const dialog = await waitForDialog(page);

  await fillVisible(dialog.locator("input[type='text']"), name);
  await selectVisible(dialog.locator("select").first(), "fixed");
  await selectVisible(dialog.locator("select").nth(1), scope);
  const capInput = dialog.locator("input[type='number']");
  if (await capInput.isVisible()) await fillVisible(capInput, String(capacity));

  await submitDialog(dialog);
  const resp = await responsePromise;
  const json = await resp.json();

  return { id: json.data.createTable.id, code: json.data.createTable.code };
}

/** Add a user occupancy via the table detail "添加使用" dialog */
async function addOccupancyViaDash(page: Page, userId: string): Promise<void> {
  const addBtn = page.locator("button.btn-primary", { hasText: "添加使用" });
  await addBtn.scrollIntoViewIfNeeded();
  await expect(addBtn).toBeVisible({ timeout: 5000 });

  const gqlResp = waitForGql(page, "AddTableOccupancy");

  await clickVisible(addBtn);
  const dialog = await waitForDialog(page);
  await fillVisible(dialog.locator("input[type='text']"), userId);
  await submitDialog(dialog);

  const resp = await gqlResp;
  const json = await resp.json();
  expect(json.data?.addTableOccupancy?.id, `Add occupancy for ${userId}`).toBeTruthy();
}

/** Click "终止" on the first active order, navigate to settle, confirm */
async function terminateAndSettleFirst(page: Page): Promise<boolean> {
  const terminateBtn = page.locator("button", { hasText: "终止" }).first();
  if (!(await terminateBtn.isVisible({ timeout: 3000 }).catch(() => false))) return false;

  await terminateBtn.scrollIntoViewIfNeeded();
  await clickVisible(terminateBtn);

  await expect(page).toHaveURL(/\/dash\/orders\/settle/, { timeout: 10000 });
  await page.waitForLoadState("networkidle");

  const heading = page.locator("h1", { hasText: "批量结算" });
  if (await heading.isVisible({ timeout: 10000 }).catch(() => false)) {
    const confirmBtn = page.locator("button", { hasText: /确认结算/ });
    await confirmBtn.scrollIntoViewIfNeeded();
    await expect(confirmBtn).toBeEnabled({ timeout: 15000 });
    await confirmBtn.click();
    // Wait for confirm button to disappear (settlement succeeded, page re-renders)
    await expect(confirmBtn).toBeHidden({ timeout: 15000 });
    return true;
  }
  return false;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial("Full Lifecycle — Browser E2E (Multi-Person)", () => {
  for (const round of ROUNDS) {
    test(`Round ${round.roundIndex + 1}: ${round.personCount}人${round.tableScopeLabel}局`, async ({
      page,
    }) => {
      // Pre-create users in D1
      const people = generateUsers(round.roundIndex, round.personCount);
      await ensureUsersInD1(people);
      await setupStaffPage(page);

      // ─── Step 1: Create tables ──────────────────────────────────────
      let tableA: { id: string; code: string };
      let tableB: { id: string; code: string };

      await test.step("店员创建两张桌台 (浏览器)", async () => {
        await page.goto("/dash/tables");
        await expect(page.locator("main")).toBeVisible({ timeout: 15000 });

        tableA = await createTableViaDash(page, round.tableNameA, round.tableScope, round.capacity);
        tableB = await createTableViaDash(page, round.tableNameB, round.tableScope, round.capacity);

        expect(tableA.id).toBeTruthy();
        expect(tableB.id).toBeTruthy();
      });

      // ─── Step 2: Add each person to table A ─────────────────────────
      await test.step(
        `店员为${round.personCount}人添加使用 — 桌A (模拟扫码注册入座)`,
        async () => {
          await page.goto(`/dash/tables/${tableA!.id}`);
          const occTab = page.locator("button[role='tab']", { hasText: /订单/ });
          await occTab.click();

          for (const person of people) {
            await addOccupancyViaDash(page, person.id);
          }

          // Reload and verify count
          await page.reload();
          await page.locator("button[role='tab']", { hasText: /订单/ }).click();
          await expect(page.locator("table.table tbody tr")).toHaveCount(round.personCount, { timeout: 10000 });
        },
      );

      // ─── Step 3: Settle all on table A (transfer prep) ──────────────
      await test.step("店员逐一终止并结算桌A订单 (浏览器)", async () => {
        for (let i = 0; i < round.personCount; i++) {
          await page.goto(`/dash/tables/${tableA!.id}`);
          await page.locator("button[role='tab']", { hasText: /订单/ }).click();
          await expect(page.locator("table.table tbody tr").first()).toBeVisible({ timeout: 10000 });

          const settled = await terminateAndSettleFirst(page);
          if (!settled) break;
        }
      });

      // ─── Step 4: Add everyone to table B (transfer complete) ────────
      await test.step(
        `全员换桌: 添加${round.personCount}人到桌B (浏览器)`,
        async () => {
          await page.goto(`/dash/tables/${tableB!.id}`);
          await page.locator("button[role='tab']", { hasText: /订单/ }).click();

          for (const person of people) {
            await addOccupancyViaDash(page, person.id);
          }

          await page.reload();
          await page.locator("button[role='tab']", { hasText: /订单/ }).click();
          await expect(page.locator("table.table tbody tr")).toHaveCount(round.personCount, { timeout: 10000 });
        },
      );

      // ─── Step 5: Settle all on table B ──────────────────────────────
      await test.step("店员逐一终止并结算桌B订单 (浏览器)", async () => {
        for (let i = 0; i < round.personCount; i++) {
          await page.goto(`/dash/tables/${tableB!.id}`);
          await page.locator("button[role='tab']", { hasText: /订单/ }).click();
          await expect(page.locator("table.table tbody tr").first()).toBeVisible({ timeout: 10000 });

          const settled = await terminateAndSettleFirst(page);
          if (!settled) break;
        }
      });

      // ─── Step 6: Top up stored value ────────────────────────────────
      const firstPerson = people[0];

      await test.step(
        `店员为${firstPerson.nickname}充值储值 (浏览器)`,
        async () => {
          await page.goto(`/dash/users/${firstPerson.id}`);

          // Switch to membership tab
          const memberTab = page.locator("button[role='tab']", { hasText: /会员|储值|membership/i });
          await expect(memberTab).toBeVisible({ timeout: 15000 });
          await memberTab.click();

          // Click add plan button
          const addBtn = page.locator("button", { hasText: /新增|添加/ }).first();
          await expect(addBtn).toBeVisible({ timeout: 10000 });
          await addBtn.click();

          // Dialog
          const dialog = page.locator("dialog[open] .modal-box");
          await expect(dialog).toBeVisible({ timeout: 5000 });

          // Select stored_value plan type
          await dialog.locator("select").first().selectOption("stored_value");

          // Fill amount
          const amountInput = dialog.locator("input[type='number']").first();
          await amountInput.fill(String(round.storedValueAmount));

          // Submit
          await dialog.locator("button[type='submit']").click();
          await expect(dialog).not.toBeVisible({ timeout: 10000 });
        },
      );

      // ─── Step 7: Deduct stored value ────────────────────────────────
      await test.step(
        `店员划扣储值 ¥${round.deductAmount / 100} (浏览器)`,
        async () => {
          // Click deduct button
          const deductBtn = page.getByRole("button", { name: "扣费", exact: true });
          await expect(deductBtn).toBeVisible({ timeout: 10000 });
          await deductBtn.click();

          // Dialog
          const dialog = page.locator("dialog[open] .modal-box");
          await expect(dialog).toBeVisible({ timeout: 5000 });

          // Fill deduct amount (in 元, not fen)
          const amountInput = dialog.locator("input[type='number']").first();
          await amountInput.fill(String(round.deductAmount / 100));

          // Fill required note field
          const noteInput = dialog.locator("input[type='text']");
          await noteInput.fill(`E2E R${round.roundIndex + 1} 消费划扣`);

          // Submit (enabled once note is filled)
          const submitBtn = dialog.locator("button[type='submit']");
          await expect(submitBtn).toBeEnabled({ timeout: 5000 });
          await submitBtn.click();
          await expect(dialog).not.toBeVisible({ timeout: 10000 });
        },
      );
    });
  }
});

// ─── Batch Settlement Flow ────────────────────────────────────────────────────

test.describe.serial("Batch Settlement — Checkbox + Note (部分会员)", () => {
  const TABLE_NAME = "E2E批量结算桌";
  const PEOPLE_COUNT = 6;

  // First 3 are members (have stored_value plan), last 3 are not
  const MEMBER_COUNT = 3;

  function batchUsers(): RegisteredUser[] {
    return Array.from({ length: PEOPLE_COUNT }, (_, i) => ({
      id: `e2e-batch-p${i + 1}`,
      nickname: NICKNAMES[i % NICKNAMES.length],
      phone: `1380000${String(500 + i).padStart(4, "0")}`,
    }));
  }

  async function ensureBatchUsersWithMembership(
    users: RegisteredUser[],
    memberCount: number,
  ): Promise<void> {
    const now = Date.now();
    const stmts: string[] = [];
    for (const u of users) {
      stmts.push(
        `INSERT OR REPLACE INTO "user" (id, name, email, role) VALUES ('${u.id}', '${u.nickname}', '${u.id}@e2e.local', 'customer');`,
        `INSERT OR REPLACE INTO user_info (id, uid, create_at, nickname, phone, points, preferred_store_id, preferred_locale) VALUES ('${u.id}', 'uid-${u.id}', ${now}, '${u.nickname}', '${u.phone}', 0, 'store-e2e-gg', 'zh');`,
      );
    }
    // Add stored_value membership plans for the first N members
    for (let i = 0; i < memberCount; i++) {
      const u = users[i];
      stmts.push(
        `INSERT OR REPLACE INTO user_membership_plans (id, user_id, plan_type, amount, note, start_date) VALUES ('plan-${u.id}', '${u.id}', 'stored_value', 50000, 'E2E储值', ${now});`,
      );
    }
    // Ensure a published pricing snapshot exists (required for settlement preview)
    const snapshotData = JSON.stringify({
      config: { daytime_start: "10:00", daytime_end: "22:00" },
      plans: [{
        plan_type: "fallback",
        name: "E2E默认计费",
        sort_order: 0,
        enabled: true,
        conditions: null,
        billing_type: "hourly",
        price: 800,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 4800,
        cap_price_day: null,
        cap_price_night: null,
      }],
    }).replace(/'/g, "''");
    stmts.push(
      `INSERT OR REPLACE INTO pricing_snapshots (id, name, store_id, data, status, created_at, published_at) VALUES ('snap-e2e-batch', 'E2E批量计费', NULL, '${snapshotData}', 'published', ${now}, ${now});`,
    );
    await execFileAsync("pnpm", [
      "exec", "wrangler", "d1", "execute", "diceshock", "--local",
      "--command", stmts.join("\n"),
    ], { cwd: process.cwd() });
  }

  test("6人混合局: 3会员+3非会员, checkbox批量结算+备注", async ({ page }) => {
    const people = batchUsers();
    await ensureBatchUsersWithMembership(people, MEMBER_COUNT);
    await setupStaffPage(page);

    let tableId: string;

    // ─── Step 1: 创建桌台 ─────────────────────────────────────────
    await test.step("店员创建桌台 (浏览器)", async () => {
      await page.goto("/dash/tables");
      await expect(page.locator("main")).toBeVisible({ timeout: 15000 });

      const result = await createTableViaDash(page, TABLE_NAME, "boardgame", 8);
      tableId = result.id;
      expect(tableId).toBeTruthy();
    });

    // ─── Step 2: 添加6人 ──────────────────────────────────────────
    await test.step("店员为6人添加使用 (3会员+3非会员)", async () => {
      await page.goto(`/dash/tables/${tableId!}`);
      await page.locator("button[role='tab']", { hasText: /订单/ }).click();

      for (const person of people) {
        await addOccupancyViaDash(page, person.id);
      }

      // Verify count
      await page.reload();
      await page.locator("button[role='tab']", { hasText: /订单/ }).click();
      await expect(page.locator("table.table tbody tr")).toHaveCount(
        PEOPLE_COUNT,
        { timeout: 10000 },
      );
    });

    // ─── Step 3: Checkbox全选 → 批量结算 ──────────────────────────
    await test.step("全选checkbox → 点击批量结算按钮", async () => {
      await page.goto(`/dash/tables/${tableId!}`);
      await page.locator("button[role='tab']", { hasText: /订单/ }).click();
      await expect(page.locator("table.table tbody tr").first()).toBeVisible({
        timeout: 10000,
      });

      // Click the "select all" checkbox in the table header
      const selectAll = page.locator("table.table thead input[type='checkbox']");
      await expect(selectAll).toBeVisible({ timeout: 5000 });
      await selectAll.check();

      // BatchActionBar should appear with "批量结算" button
      const batchSettleBtn = page.locator("button", { hasText: "批量结算" });
      await expect(batchSettleBtn).toBeVisible({ timeout: 5000 });
      await batchSettleBtn.click();

      // Should navigate to /dash/orders/settle?ids=[...]
      await expect(page).toHaveURL(/\/dash\/orders\/settle/, { timeout: 10000 });
    });

    // ─── Step 4: 结算页 — 写备注 → 确认 ──────────────────────────
    await test.step("结算页: 验证订单数、写备注、确认结算", async () => {
      await page.waitForLoadState("networkidle");

      // Verify "批量结算" heading visible
      const heading = page.locator("h1", { hasText: "批量结算" });
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Verify badge shows correct order count
      const badge = page.locator(".badge", { hasText: `${PEOPLE_COUNT} 个订单` });
      await expect(badge).toBeVisible({ timeout: 5000 });

      // Fill the settlement note (备注)
      const noteTextarea = page.locator("textarea[placeholder='填写结算备注（可选）']");
      await expect(noteTextarea).toBeVisible({ timeout: 5000 });
      await noteTextarea.fill("E2E批量结算测试 — 3会员3普通客人 周六桌游日");

      // Click 确认结算 button
      const confirmBtn = page.locator("button", { hasText: /确认结算/ });
      await expect(confirmBtn).toBeEnabled({ timeout: 15000 });
      await confirmBtn.click();

      // After successful settlement, the page re-fetches and all orders show "已结束"
      // and the confirm button disappears (allEnded becomes true)
      await expect(confirmBtn).toBeHidden({ timeout: 15000 });
      const settledBadge = page.locator(".badge", { hasText: "已结束" });
      await expect(settledBadge).toHaveCount(PEOPLE_COUNT, { timeout: 10000 });
    });

    // ─── Step 5: 验证已结算状态 ───────────────────────────────────
    await test.step("回到桌台详情, 验证全部已结算", async () => {
      await page.goto(`/dash/tables/${tableId!}`);
      await page.locator("button[role='tab']", { hasText: /订单/ }).click();

      // All orders should show "已结束" badge (settled state)
      const settledBadges = page.locator(".badge", { hasText: "已结束" });
      await expect(settledBadges).toHaveCount(PEOPLE_COUNT, { timeout: 10000 });

      // No more checkboxes visible (settled orders don't have checkboxes)
      const checkboxes = page.locator("table.table tbody input[type='checkbox']");
      await expect(checkboxes).toHaveCount(0, { timeout: 5000 });
    });
  });
});
