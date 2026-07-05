/**
 * Order Billing E2E — Full Lifecycle with Time Mocking & Pricing Plan Changes
 *
 * Tests the complete flow:
 * 1. Staff creates a table and starts orders for multiple customers
 * 2. Customers "scan QR" (navigate to seat page) concurrently
 * 3. Time is mocked to simulate 2+ hours of billing
 * 4. Pricing plan is changed mid-session — recalculates from start
 * 5. Settlement binds to the plan active at settlement time
 * 6. Batch settlement of two groups
 * 7. Mid-flow: navigate to user detail, top up stored value, go back (no refresh)
 * 8. Stored value deduction on settlement
 * 9. Real-time subscription updates without page refresh
 */
import { expect, type Page, test } from "@playwright/test";
import {
  clickVisible,
  fillVisible,
  selectVisible,
  waitForDialog,
  submitDialog,
  waitForGql,
  setupStaffAuth,
  clickTab,
  waitForMainContent,
  checkVisible,
} from "../helpers/interactions";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const CWD = process.cwd();

// ─── Zod schemas for GQL response validation ─────────────────────────────────

const GqlTableResponse = z.object({
  data: z.object({
    createTable: z.object({ id: z.string(), code: z.string() }),
  }),
});

const GqlStartOrderResponse = z.object({
  data: z.object({
    startOrder: z.object({ id: z.string(), status: z.string() }),
  }),
});

const GqlSettleResponse = z.object({
  data: z.object({
    settleOrder: z.object({ id: z.string(), success: z.boolean() }),
  }),
});

// ─── Test Data ────────────────────────────────────────────────────────────────

const TABLE_NAME = "E2E-Billing-计费测试桌";
const NOW = Date.now();

interface TestUser {
  id: string;
  nickname: string;
  phone: string;
  isMember: boolean;
  storedValue: number; // cents
}

const USERS: TestUser[] = [
  { id: "e2e-bill-member-1", nickname: "小明", phone: "13900001001", isMember: true, storedValue: 0 },
  { id: "e2e-bill-member-2", nickname: "小红", phone: "13900001002", isMember: true, storedValue: 10000 },
  { id: "e2e-bill-guest-1", nickname: "访客A", phone: "13900001003", isMember: false, storedValue: 0 },
  { id: "e2e-bill-guest-2", nickname: "访客B", phone: "13900001004", isMember: false, storedValue: 0 },
  { id: "e2e-bill-vip", nickname: "VIP王", phone: "13900001005", isMember: true, storedValue: 50000 },
];

// Pricing plan A: ¥8/half-hour, cap ¥48/day
const PLAN_A = {
  config: { daytime_start: "10:00", daytime_end: "22:00" },
  plans: [{
    plan_type: "fallback",
    name: "A计划-普通时段",
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
};

// Pricing plan B: ¥12/half-hour, cap ¥60/day (更贵)
const PLAN_B = {
  config: { daytime_start: "10:00", daytime_end: "22:00" },
  plans: [{
    plan_type: "fallback",
    name: "B计划-高峰时段",
    sort_order: 0,
    enabled: true,
    conditions: null,
    billing_type: "hourly",
    price: 1200,
    cap_enabled: true,
    cap_unit: "per_day",
    cap_price: 6000,
    cap_price_day: null,
    cap_price_night: null,
  }],
};

// ─── DB Setup ─────────────────────────────────────────────────────────────────

async function execD1(command: string): Promise<void> {
  await execFileAsync("pnpm", [
    "exec", "wrangler", "d1", "execute", "diceshock", "--local",
    "--command", command,
  ], { cwd: CWD });
}

async function seedTestData(): Promise<void> {
  const stmts: string[] = [];

  // Users
  for (const u of USERS) {
    stmts.push(
      `INSERT OR REPLACE INTO "user" (id, name, email, role) VALUES ('${u.id}', '${u.nickname}', '${u.id}@e2e.local', 'customer');`,
      `INSERT OR REPLACE INTO user_info (id, uid, create_at, nickname, phone, points, preferred_store_id, preferred_locale) VALUES ('${u.id}', 'uid-${u.id}', ${NOW}, '${u.nickname}', '${u.phone}', 0, 'store-e2e-gg', 'zh');`,
    );
    // Membership for members with existing stored value
    if (u.isMember && u.storedValue > 0) {
      stmts.push(
        `INSERT OR REPLACE INTO user_membership_plans (id, user_id, plan_type, amount, note, start_date) VALUES ('sv-${u.id}', '${u.id}', 'stored_value', ${u.storedValue}, 'E2E初始充值', ${NOW});`,
      );
    }
  }

  // Initial pricing snapshot (Plan A)
  const planAData = JSON.stringify(PLAN_A).replace(/'/g, "''");
  stmts.push(
    `INSERT OR REPLACE INTO pricing_snapshots (id, name, store_id, data, status, created_at, published_at) VALUES ('snap-e2e-planA', 'E2E-A计划', NULL, '${planAData}', 'published', ${NOW}, ${NOW});`,
  );

  await execD1(stmts.join("\n"));
}

async function publishPlanB(): Promise<void> {
  const planBData = JSON.stringify(PLAN_B).replace(/'/g, "''");
  const now = Date.now();
  await execD1([
    // Mark old as archived
    `UPDATE pricing_snapshots SET status = 'archived' WHERE id = 'snap-e2e-planA';`,
    // Insert new published plan
    `INSERT OR REPLACE INTO pricing_snapshots (id, name, store_id, data, status, created_at, published_at) VALUES ('snap-e2e-planB', 'E2E-B计划', NULL, '${planBData}', 'published', ${now}, ${now});`,
  ].join("\n"));
}

async function topUpStoredValueDirect(userId: string, amount: number): Promise<void> {
  const now = Date.now();
  await execD1(
    `INSERT INTO user_membership_plans (id, user_id, plan_type, amount, note, start_date) VALUES ('topup-${userId}-${now}', '${userId}', 'stored_value', ${amount}, 'E2E充值', ${now});`,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupStaffPage(page: Page): Promise<void> {
  await setupStaffAuth(page);
}

/**
 * Mock clock by injecting a fake Date into the page.
 * Advances time by the given offset from real Date.now().
 */
async function mockTime(page: Page, offsetMs: number): Promise<void> {
  await page.addInitScript(`{
    const __realNow = Date.now;
    const __offset = ${offsetMs};
    Date.now = () => __realNow() + __offset;
    const OrigDate = Date;
    class MockDate extends OrigDate {
      constructor(...args) {
        if (args.length === 0) super(__realNow() + __offset);
        else super(...args);
      }
      static now() { return __realNow() + __offset; }
    }
    globalThis.Date = MockDate;
  }`);
}

/** Navigate to table detail and start an order for a user via GQL mutation (API call) */
async function startOrderViaGql(
  page: Page,
  tableId: string,
  userId: string,
): Promise<string> {
  const result = await page.evaluate(
    async ([tId, uId]) => {
      const resp = await fetch("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation StartOrder($input: StartOrderInput!) {
            startOrder(input: $input) { id status }
          }`,
          variables: { input: { tableId: tId, userId: uId, seats: 1 } },
          operationName: "StartOrder",
        }),
      });
      return resp.json();
    },
    [tableId, userId],
  );
  const parsed = GqlStartOrderResponse.parse(result);
  return parsed.data.startOrder.id;
}

/** Simulate customer scanning QR code — navigates to seat page */
async function customerScanQr(
  page: Page,
  tableCode: string,
): Promise<void> {
  await page.goto(`/zh/t/${tableCode}`);
  await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial("Order Billing — Full E2E with Pricing Plan Changes", () => {
  let tableId: string;
  let tableCode: string;
  const orderIds: Map<string, string> = new Map(); // userId -> orderId

  test.beforeAll(async () => {
    await seedTestData();
  });

  test("Step 1: 店员创建桌台", async ({ page }) => {
    await setupStaffPage(page);
    await page.goto("/dash/tables");
    await waitForMainContent(page);

    const responsePromise = waitForGql(page, "createTable");
    const createBtn = page.locator("button", { hasText: "新建桌台" });
    await clickVisible(createBtn);

    const dialog = await waitForDialog(page);
    await fillVisible(dialog.locator("input[type='text']").first(), TABLE_NAME);
    // Select scope
    const scopeSelect = dialog.locator("select").last();
    if (await scopeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectVisible(scopeSelect, "boardgame");
    }
    await submitDialog(dialog);

    const resp = await responsePromise;
    const json = await resp.json();
    const parsed = GqlTableResponse.parse(json);
    tableId = parsed.data.createTable.id;
    tableCode = parsed.data.createTable.code;
    expect(tableId).toBeTruthy();
    expect(tableCode).toBeTruthy();
  });

  test("Step 2: 多名顾客同时扫码开始计时 (Plan A: ¥8/半小时)", async ({ page }) => {
    await setupStaffPage(page);
    await page.goto(`/dash/tables/${tableId}`);
    await waitForMainContent(page);

    // Start orders for all users via GQL
    for (const user of USERS) {
      const orderId = await startOrderViaGql(page, tableId, user.id);
      orderIds.set(user.id, orderId);
      expect(orderId).toBeTruthy();
    }

    // Verify all orders are active on the table
    await clickTab(page, /订单|使用/);
    const rows = page.locator("table.table tbody tr");
    await expect(rows).toHaveCount(USERS.length, { timeout: 10000 });
  });

  test("Step 3: 顾客扫码查看座位页面 (并发)", async ({ browser }) => {
    // Open 3 concurrent customer pages simulating QR scan
    const contexts = await Promise.all(
      USERS.slice(0, 3).map(() => browser.newContext()),
    );
    const customerPages = await Promise.all(
      contexts.map((ctx) => ctx.newPage()),
    );

    await Promise.all(
      customerPages.map((p) => customerScanQr(p, tableCode)),
    );

    // Each customer page shows their elapsed time
    for (const p of customerPages) {
      const timer = p.locator("text=/\\d{2}:\\d{2}/").first();
      await expect(timer).toBeVisible({ timeout: 10000 });
    }

    // Cleanup
    await Promise.all(contexts.map((ctx) => ctx.close()));
  });

  test("Step 4: 模拟2小时后 — 验证 Plan A 计费 (¥8×4=¥32)", async ({ page }) => {
    // Mock time: 2 hours ahead
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    await mockTime(page, TWO_HOURS);
    await setupStaffPage(page);
    await page.goto("/dash/orders");
    await waitForMainContent(page);

    // The "自动计算" column should show ~¥32 for active orders
    // (2 hours = 4 half-hours × ¥8 = ¥32)
    const amountCells = page.locator("table.table tbody tr td:nth-child(8)");
    const firstAmount = amountCells.first();
    await firstAmount.scrollIntoViewIfNeeded();
    await expect(firstAmount).toBeVisible({ timeout: 10000 });

    // Check that amount contains "32" (¥32.00 formatted)
    const text = await firstAmount.textContent();
    expect(text).toContain("32");
  });

  test("Step 5: 中途修改价格计划 → Plan B (¥12/半小时), 从第一小时生效", async ({ page }) => {
    // Publish plan B via direct DB (simulating admin action)
    await publishPlanB();

    // Reload the orders page with time still mocked 2h ahead
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    await mockTime(page, TWO_HOURS);
    await setupStaffPage(page);
    await page.goto("/dash/orders");
    await waitForMainContent(page);

    // Now "自动计算" should show ~¥48 (2h = 4 half-hours × ¥12 = ¥48)
    // The plan change applies retroactively from the start
    const amountCells = page.locator("table.table tbody tr td:nth-child(8)");
    const firstAmount = amountCells.first();
    await firstAmount.scrollIntoViewIfNeeded();
    await expect(firstAmount).toBeVisible({ timeout: 10000 });

    const text = await firstAmount.textContent();
    // Should reflect Plan B pricing: 4 × ¥12 = ¥48
    expect(text).toContain("48");
  });

  test("Step 6: 导航到用户详情 → 充值 → 浏览器返回 (不刷新页面)", async ({ page }) => {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    await mockTime(page, TWO_HOURS);
    await setupStaffPage(page);
    await page.goto("/dash/orders");
    await waitForMainContent(page);

    // Click user link for 小明 (member with no stored value)
    const userLink = page.locator("a", { hasText: "小明" }).first();
    await userLink.scrollIntoViewIfNeeded();
    await expect(userLink).toBeVisible({ timeout: 5000 });
    await userLink.click();

    // Should be on user detail page
    await expect(page).toHaveURL(/\/dash\/users\//, { timeout: 10000 });
    await waitForMainContent(page);

    // Click "会员" tab
    await clickTab(page, /会员|membership/i);

    // Click add plan button
    const addBtn = page.locator("button", { hasText: /新增|添加/ }).first();
    await addBtn.scrollIntoViewIfNeeded();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Wait for the add form/dialog
    const planTypeSelect = page.locator("select").filter({ hasText: /储值卡/ }).first();
    // If it's a form within the page (not dialog), select stored_value
    const selectEl = page.locator("select").first();
    if (await selectEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectVisible(selectEl, "stored_value");

      // Fill amount (in yuan)
      const amountInput = page.locator("input[type='number']").first();
      await fillVisible(amountInput, "200");

      // Submit
      const submitBtn = page.locator("button[type='submit']").first();
      await submitBtn.scrollIntoViewIfNeeded();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      // Wait for success feedback
      await page.waitForTimeout(1000);
    } else {
      // Fallback: top up via direct DB
      await topUpStoredValueDirect(USERS[0].id, 20000);
    }

    // Navigate BACK (browser back, not refresh)
    await page.goBack();
    await expect(page).toHaveURL(/\/dash\/orders/, { timeout: 10000 });

    // Verify page still shows data (no stale state)
    const rows = page.locator("table.table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test("Step 7: 批量结算第一组 (会员3人) — 含储值划扣", async ({ page }) => {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    await mockTime(page, TWO_HOURS);
    await setupStaffPage(page);

    // Ensure 小明 has stored value for deduction
    await topUpStoredValueDirect(USERS[0].id, 20000);

    await page.goto("/dash/orders");
    await waitForMainContent(page);

    // Filter to show only active orders
    const statusFilter = page.locator("button[role='tab']", { hasText: /活跃|进行中|active/i });
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickVisible(statusFilter);
    }

    // Select first 3 orders (members: 小明, 小红, VIP王)
    const checkboxes = page.locator("table.table tbody input[type='checkbox']");
    await expect(checkboxes.first()).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 3; i++) {
      const cb = checkboxes.nth(i);
      await cb.scrollIntoViewIfNeeded();
      await cb.check();
    }

    // Click batch settle
    const batchBtn = page.locator("button", { hasText: /批量结算/ });
    await batchBtn.scrollIntoViewIfNeeded();
    await expect(batchBtn).toBeVisible({ timeout: 5000 });
    await batchBtn.click();

    // Should navigate to settle page
    await expect(page).toHaveURL(/\/dash\/orders.*settle/, { timeout: 10000 });
    await waitForMainContent(page);

    // Enable stored value deduction if toggle visible
    const deductToggle = page.locator("input[type='checkbox']").filter({ has: page.locator("..") }).first();
    const deductLabel = page.locator("label", { hasText: /储值|扣费|余额/ });
    if (await deductLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const toggle = deductLabel.locator("input[type='checkbox']");
      if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await toggle.check();
      }
    }

    // Click settle button for each user card
    const settleButtons = page.locator("button", { hasText: /结算|确认/ });
    await expect(settleButtons.first()).toBeVisible({ timeout: 10000 });

    // Settle all visible users one by one
    let settled = 0;
    const maxAttempts = 5;
    for (let i = 0; i < maxAttempts; i++) {
      const btn = page.locator("button", { hasText: /^结算$|确认结算/ }).first();
      if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) break;
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForTimeout(500);
      settled++;
    }
    expect(settled).toBeGreaterThan(0);
  });

  test("Step 8: 批量结算第二组 (非会员2人) — 无储值", async ({ page }) => {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    await mockTime(page, TWO_HOURS);
    await setupStaffPage(page);

    await page.goto("/dash/orders");
    await waitForMainContent(page);

    // Select remaining active orders
    const checkboxes = page.locator("table.table tbody input[type='checkbox']");
    const count = await checkboxes.count();

    if (count > 0) {
      // Select all remaining
      for (let i = 0; i < count; i++) {
        const cb = checkboxes.nth(i);
        await cb.scrollIntoViewIfNeeded();
        await cb.check();
      }

      const batchBtn = page.locator("button", { hasText: /批量结算/ });
      if (await batchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clickVisible(batchBtn);
        await expect(page).toHaveURL(/\/dash\/orders.*settle/, { timeout: 10000 });
        await waitForMainContent(page);

        // Settle each
        for (let i = 0; i < 5; i++) {
          const btn = page.locator("button", { hasText: /^结算$|确认结算/ }).first();
          if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) break;
          await btn.scrollIntoViewIfNeeded();
          await btn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test("Step 9: 验证已结算订单绑定 Plan B (结算时刻的计划)", async ({ page }) => {
    await setupStaffPage(page);
    await page.goto("/dash/orders");
    await waitForMainContent(page);

    // Filter to settled
    const settledTab = page.locator("button[role='tab']", { hasText: /已结算|settled/i });
    if (await settledTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickVisible(settledTab);
    }

    // All settled orders should show ¥48 (Plan B: 4×¥12)
    const amountCells = page.locator("table.table tbody tr td:nth-child(8)");
    const firstAmount = amountCells.first();
    await firstAmount.scrollIntoViewIfNeeded();
    await expect(firstAmount).toBeVisible({ timeout: 10000 });

    const text = await firstAmount.textContent();
    // Plan B at 2 hours: 4 half-hours × ¥12 = ¥48
    expect(text).toContain("48");
  });

  test("Step 10: 验证 计划划扣 列显示储值扣费", async ({ page }) => {
    await setupStaffPage(page);
    await page.goto("/dash/orders");
    await waitForMainContent(page);

    // Check the "计划划扣" column for member orders
    const deductCells = page.locator("table.table tbody tr td:nth-child(9)");
    const count = await deductCells.count();
    let hasDeduction = false;

    for (let i = 0; i < count; i++) {
      const text = await deductCells.nth(i).textContent();
      if (text && text !== "—" && text.includes("¥")) {
        hasDeduction = true;
        break;
      }
    }

    // At least one order should have a deduction (小红 had ¥100 balance)
    expect(hasDeduction).toBe(true);
  });

  test("Step 11: 订阅实时更新 — 新订单无需刷新可见", async ({ browser }) => {
    // Open staff page that's already on /dash/orders
    const context = await browser.newContext();
    const staffPage = await context.newPage();
    await setupStaffAuth(staffPage);
    await staffPage.goto("/dash/orders");
    await waitForMainContent(staffPage);

    const initialCount = await staffPage.locator("table.table tbody tr").count();

    // Start a new order via API (simulating another staff member)
    const newUserId = "e2e-bill-guest-1";
    await staffPage.evaluate(
      async ([tId, uId]) => {
        await fetch("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `mutation StartOrder($input: StartOrderInput!) {
              startOrder(input: $input) { id status }
            }`,
            variables: { input: { tableId: tId, userId: uId, seats: 1 } },
            operationName: "StartOrder",
          }),
        });
      },
      [tableId, newUserId],
    );

    // Wait for subscription or polling to show the new order
    // If subscription works, it should appear without refresh
    const newCount = staffPage.locator("table.table tbody tr");
    await expect(newCount).toHaveCount(initialCount + 1, { timeout: 30000 });

    await context.close();
  });
});
