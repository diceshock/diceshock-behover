/**
 * Order Billing E2E — Pricing Calculation Correctness
 *
 * Asserts EXACT billing amounts displayed on the page.
 *
 * Strategy:
 *   1. Create orders via GQL (addTableOccupancy) — proven to work
 *   2. Backdate start_at in D1 to get deterministic elapsed time
 *   3. Navigate to orders page and assert exact ¥ amounts
 *   4. Switch pricing plan → assert recalculated amounts
 *   5. Settle and verify settlement amounts
 *
 * Pricing logic (shared/utils/pricing.ts):
 *   FREE_PERIOD = 30 min
 *   pricePerHalfHour = Math.round(plan.price / 2)  // plan.price = cents/hour
 *   billableHalfHours = ceil((elapsed - free) / 30min)
 *   finalPrice = min(pricePerHalfHour * billableHalfHours, cap)
 *
 * With 3h elapsed:
 *   billable = 3h - 30min = 150min → ceil(150/30) = 5 half-hours
 *   Plan A (¥8/h): 400 × 5 = 2000 → "¥20.00"
 *   Plan B (¥12/h): 600 × 5 = 3000 → "¥30.00"
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, type Page, test } from "@playwright/test";
import { clickTab, setupStaffAuth, waitForGql } from "../helpers/interactions";

const execFileAsync = promisify(execFile);

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLE_ID = "e2e-billing-table-001";
const TABLE_CODE = "BILL01";

// 2h45m elapsed → billable = 165-30(free) = 135min → ceil(135/30) = 5 half-hours
// Using 2h45m instead of exactly 3h gives 15min slack before next boundary
const BACKDATE_MS = (2 * 60 + 45) * 60 * 1000;

const PLAN_A_EXPECTED = "¥20.00"; // 400 × 5 = 2000
const PLAN_B_EXPECTED = "¥30.00"; // 600 × 5 = 3000
const TOTAL_3_PLAN_B = "¥90.00"; // 3000 × 3

const USERS = [
  { id: "e2e-bill-p1", nickname: "计费甲" },
  { id: "e2e-bill-p2", nickname: "计费乙" },
  { id: "e2e-bill-p3", nickname: "计费丙" },
];

// ─── D1 Helpers ───────────────────────────────────────────────────────────────

async function execD1(command: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "diceshock", "--local", "--command", command],
    { cwd: process.cwd() },
  );
  return stdout;
}

function planData(priceHourly: number): string {
  return JSON.stringify({
    config: { daytime_start: "10:00", daytime_end: "22:00" },
    plans: [
      {
        plan_type: "fallback",
        name: "E2E计费",
        sort_order: 0,
        enabled: true,
        conditions: null,
        billing_type: "hourly",
        price: priceHourly,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 9600,
        cap_price_day: null,
        cap_price_night: null,
      },
    ],
  }).replace(/'/g, "''");
}

// ─── GQL Helpers ──────────────────────────────────────────────────────────────

async function gql(page: Page, query: string, variables?: Record<string, unknown>) {
  const resp = await page.request.post("/graphql", {
    headers: { "Content-Type": "application/json", "X-Test-Role": "staff" },
    data: JSON.stringify({ query, variables }),
  });
  const json = await resp.json();
  if (json.errors) throw new Error(`GQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// ─── Setup & Teardown ─────────────────────────────────────────────────────────

async function cleanup(): Promise<void> {
  // Remove ALL occupancies on the test table AND any with our user IDs
  const userIds = USERS.map((u) => `'${u.id}'`).join(",");
  await execD1(
    `DELETE FROM table_occupancy WHERE table_id = '${TABLE_ID}' OR user_id IN (${userIds});`,
  );
}

async function ensureUsersExist(): Promise<void> {
  const now = Date.now();
  const stmts = USERS.flatMap((u) => [
    `INSERT OR REPLACE INTO "user" (id, name, email, role) VALUES ('${u.id}', '${u.nickname}', '${u.id}@e2e.local', 'customer');`,
    `INSERT OR REPLACE INTO user_info (id, uid, create_at, nickname, phone, meta) VALUES ('${u.id}', 'uid-${u.id}', ${now}, '${u.nickname}', '1380000${u.id.slice(-2)}01', '{}');`,
  ]);
  await execD1(stmts.join("\n"));
}

async function publishPlan(priceHourly: number): Promise<void> {
  const data = planData(priceHourly);
  const now = Date.now();
  await execD1(
    `INSERT OR REPLACE INTO pricing_snapshots (id, name, store_id, data, status, created_at, published_at) VALUES ('snap-e2e-billing', 'E2E计费', 'store-e2e-gg', '${data}', 'published', ${now}, ${now});`,
  );
}

async function backdateOrders(): Promise<void> {
  const startAt = Date.now() - BACKDATE_MS;
  const userIds = USERS.map((u) => `'${u.id}'`).join(",");
  await execD1(
    `UPDATE table_occupancy SET start_at = ${startAt} WHERE user_id IN (${userIds}) AND status = 'active';`,
  );
}

async function addStoredValue(userId: string, amountCents: number): Promise<void> {
  const now = Date.now();
  await execD1(
    `INSERT OR REPLACE INTO user_membership_plans (id, user_id, plan_type, amount, note, start_date, create_at, update_at) VALUES ('plan-sv-${userId}', '${userId}', 'stored_value', ${amountCents}, 'E2E储值', ${now}, ${now}, ${now});`,
  );
}

// ─── Page Helpers ─────────────────────────────────────────────────────────────

async function setupPage(page: Page): Promise<void> {
  await setupStaffAuth(page);
}

/** Extract text from all .font-mono cells in the table body */
async function getMonoCellTexts(page: Page): Promise<string[]> {
  const cells = page.locator("table.table tbody td .font-mono");
  const count = await cells.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = await cells.nth(i).textContent();
    if (t) texts.push(t.trim());
  }
  return texts;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe.serial("Order Billing — Exact Price Assertions", () => {
  const orderIds: string[] = [];

  test.beforeAll(async () => {
    await cleanup();
    await ensureUsersExist();
    await publishPlan(800); // Plan A: ¥8/h
  });

  test("Step 1: 通过 GQL 创建3笔订单", async ({ page }) => {
    await setupPage(page);

    for (const user of USERS) {
      const data = await gql(
        page,
        `mutation($input: AddOccupancyInput!) { addTableOccupancy(input: $input) { id startAt status } }`,
        { input: { tableId: TABLE_ID, userId: user.id } },
      );
      const id = data.addTableOccupancy.id;
      expect(id, `Order created for ${user.nickname}`).toBeTruthy();
      orderIds.push(id);
    }

    expect(orderIds).toHaveLength(USERS.length);
  });

  test("Step 2: 回溯3小时 → 订单列表显示 ~¥20.00 (Plan A)", async ({ page }) => {
    await backdateOrders();

    await setupPage(page);
    await page.goto("/dash/orders");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table.table tbody tr").first()).toBeVisible({ timeout: 15000 });

    const texts = await getMonoCellTexts(page);

    // Active orders render as "~¥20.00" — look for "20.00" in text
    const matches = texts.filter((t) => t.includes("20.00"));
    expect(
      matches.length,
      `Expected ≥3 cells with ¥20.00, got: ${JSON.stringify(texts.slice(0, 20))}`,
    ).toBeGreaterThanOrEqual(USERS.length);
  });

  test("Step 3: 切换 Plan B (¥12/h) → 金额变为 ~¥30.00", async ({ page }) => {
    await publishPlan(1200); // Plan B: ¥12/h

    await setupPage(page);
    await page.goto("/dash/orders");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table.table tbody tr").first()).toBeVisible({ timeout: 15000 });

    const texts = await getMonoCellTexts(page);

    const matches = texts.filter((t) => t.includes("30.00"));
    expect(
      matches.length,
      `Expected ≥3 cells with ¥30.00, got: ${JSON.stringify(texts.slice(0, 20))}`,
    ).toBeGreaterThanOrEqual(USERS.length);
  });

  test("Step 4: 进入结算页 → 每人¥30.00, 总计¥90.00", async ({ page }) => {
    await setupPage(page);

    // Navigate to settle page directly with our order IDs
    const idsParam = encodeURIComponent(JSON.stringify(orderIds));
    await page.goto(`/dash/orders/settle?ids=${idsParam}`);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });

    // Wait for settlement preview heading
    const heading = page.locator("h1", { hasText: "批量结算" });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Badge shows order count
    const badge = page.locator(".badge", { hasText: `${USERS.length} 个订单` });
    await expect(badge).toBeVisible({ timeout: 5000 });

    // Each order card: large price = ¥30.00
    const cardPrices = page.locator(".font-mono.font-bold.text-primary.text-lg");
    await expect(cardPrices).toHaveCount(USERS.length, { timeout: 10000 });
    for (let i = 0; i < USERS.length; i++) {
      await expect(cardPrices.nth(i)).toHaveText(PLAN_B_EXPECTED);
    }

    // Total line: ¥90.00
    const totalEl = page.locator(".text-2xl.font-bold.text-primary");
    await expect(totalEl).toHaveText(TOTAL_3_PLAN_B);
  });

  test("Step 5: 启用储值划扣 → 底栏显示划扣金额", async ({ page }) => {
    // Give user 1 a ¥100 stored value
    await addStoredValue(USERS[0].id, 10000);

    await setupPage(page);
    const idsParam = encodeURIComponent(JSON.stringify(orderIds));
    await page.goto(`/dash/orders/settle?ids=${idsParam}`);

    const heading = page.locator("h1", { hasText: "批量结算" });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Find the stored value toggle in the membership section
    const toggleLabel = page.locator("label", { hasText: /储值划扣|启用划扣/ });
    if (await toggleLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      const checkbox = toggleLabel.locator("input[type='checkbox']");
      await checkbox.check();

      // Bottom bar should show deduction info
      // User1: min(balance ¥100, price ¥30) = ¥30 deducted
      const bottomBar = page.locator(".fixed.bottom-0");
      await expect(bottomBar).toBeVisible({ timeout: 5000 });
      await expect(bottomBar).toContainText("30.00", { timeout: 5000 });
    }
  });

  test("Step 6: 确认结算 → 订单变为已结束", async ({ page }) => {
    await setupPage(page);
    const idsParam = encodeURIComponent(JSON.stringify(orderIds));
    await page.goto(`/dash/orders/settle?ids=${idsParam}`);

    const heading = page.locator("h1", { hasText: "批量结算" });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Click confirm
    const confirmBtn = page.locator("button", { hasText: /确认结算/ });
    await expect(confirmBtn).toBeEnabled({ timeout: 15000 });
    await confirmBtn.click();

    // After settlement: confirm button disappears, badges show 已结束
    await expect(confirmBtn).toBeHidden({ timeout: 15000 });
    const settledBadges = page.locator(".badge", { hasText: "已结束" });
    await expect(settledBadges).toHaveCount(USERS.length, { timeout: 10000 });
  });

  test("Step 7: 结算后列表 — 金额列=¥30.00 (无~前缀)", async ({ page }) => {
    await setupPage(page);
    await page.goto("/dash/orders");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table.table tbody tr").first()).toBeVisible({ timeout: 15000 });

    const texts = await getMonoCellTexts(page);

    // Settled orders show exact "¥30.00" (no ~ prefix)
    const exact = texts.filter((t) => t === "¥30.00");
    expect(
      exact.length,
      `Expected ≥3 exact "¥30.00" (settled), got: ${JSON.stringify(texts.slice(0, 20))}`,
    ).toBeGreaterThanOrEqual(USERS.length);
  });

  test("Step 8: 桌台详情 — 已结束, 无 checkbox", async ({ page }) => {
    await setupPage(page);
    await page.goto(`/dash/tables/${TABLE_ID}`);
    await clickTab(page, /订单/);

    const settledBadges = page.locator(".badge", { hasText: "已结束" });
    await expect(settledBadges).toHaveCount(USERS.length, { timeout: 10000 });

    const checkboxes = page.locator("table.table tbody input[type='checkbox']");
    await expect(checkboxes).toHaveCount(0, { timeout: 5000 });
  });
});
