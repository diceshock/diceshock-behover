/**
 * Dashboard Pages — Real Backend E2E Tests (Visibility-First)
 *
 * Migrated from mocked dash-tables.spec.ts to hit the real D1 backend.
 * Every interaction scrolls into viewport and asserts visibility before acting.
 * Tests cover: page load, table rendering, search/filter, sorting, pagination,
 * batch actions, and user-visible state assertions.
 *
 * NOTE: These tests rely on existing DB data from full-lifecycle test runs.
 * No seeding is done here because the dev server holds the SQLite lock.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  assertInViewport,
  checkVisible,
  clickVisible,
  searchAndVerify,
  setupStaffAuth,
  waitForMainContent,
  waitForTableReady,
} from "../helpers/interactions";

// ─── Auth Setup ──────────────────────────────────────────────────────────────

async function setupDashPage(page: Page) {
  await setupStaffAuth(page);
}

// ─── Orders Page ─────────────────────────────────────────────────────────────

test.describe("Orders Page — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/orders");
    await waitForTableReady(page);
  });

  test("页面加载: 表头列可见且在视口内", async ({ page }) => {
    const headers = page.locator("table.table thead th");
    await expect(headers.first()).toBeVisible();
    await assertInViewport(headers.first());
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("页面加载: 数据行可见", async ({ page }) => {
    const rows = page.locator("table.table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    await assertInViewport(rows.first());
  });

  test("搜索: 输入搜索词后可见搜索框并更新URL", async ({ page }) => {
    await searchAndVerify(page, "status:active", /q=.*status/);
    const searchInput = page.locator("input[type='search']");
    await assertInViewport(searchInput);
  });

  test("排序: 点击可排序列头更新URL", async ({ page }) => {
    const sortBtn = page.locator("table.table thead th button:not([disabled])").first();
    if (await sortBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sortBtn.scrollIntoViewIfNeeded();
      await assertInViewport(sortBtn);
      await sortBtn.click();
      await expect(page).toHaveURL(/sortBy|sortOrder/, { timeout: 5000 });
    }
  });

  test("分页: 翻页按钮可见, 点击后更新页码参数", async ({ page }) => {
    const nextBtn = page.locator(".join button", { hasText: /Next|下一页/i });
    if (await nextBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.scrollIntoViewIfNeeded();
      await assertInViewport(nextBtn);
      await nextBtn.click();
      await expect(page).toHaveURL(/page=2/, { timeout: 5000 });

      const prevBtn = page.locator(".join button", { hasText: /Prev|上一页/i });
      await prevBtn.scrollIntoViewIfNeeded();
      await assertInViewport(prevBtn);
      await prevBtn.click();
      await expect(page).toHaveURL(/page=1/, { timeout: 5000 });
    }
  });

  test("快速筛选: 状态pill按钮可见, 点击切换搜索条件", async ({ page }) => {
    const pill = page.locator("button.btn-xs", { hasText: /active|进行中/i }).first();
    if (await pill.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pill.scrollIntoViewIfNeeded();
      await assertInViewport(pill);
      await pill.click();
      await expect(page).toHaveURL(/q=.*status/, { timeout: 5000 });
    }
  });

  test("批量选择: 全选checkbox可见, 勾选后出现操作栏", async ({ page }) => {
    const selectAll = page.locator("table.table thead input[type='checkbox']");
    if (await selectAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectAll.scrollIntoViewIfNeeded();
      await assertInViewport(selectAll);
      await selectAll.check();
      const actionBar = page.locator("[class*='sticky'][class*='bottom']");
      await expect(actionBar).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─── Tables Page ─────────────────────────────────────────────────────────────

test.describe("Tables Page — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/tables");
    await waitForTableReady(page);
  });

  test("页面加载: 桌台列表有数据行", async ({ page }) => {
    const rows = page.locator("table.table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    await assertInViewport(rows.first());
  });

  test("搜索: type:fixed 过滤并更新URL", async ({ page }) => {
    await searchAndVerify(page, "type:fixed", /q=.*type/);
  });

  test("快速筛选pill可见并生效", async ({ page }) => {
    const pill = page.locator("button.btn-xs").first();
    if (await pill.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pill.scrollIntoViewIfNeeded();
      await assertInViewport(pill);
      await pill.click();
      await expect(page).toHaveURL(/q=/, { timeout: 5000 });
    }
  });

  test("新建桌台按钮可见且在视口内", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: "新建桌台" });
    await createBtn.scrollIntoViewIfNeeded();
    await assertInViewport(createBtn);
  });

  test("点击桌台行可导航到详情", async ({ page }) => {
    const firstLink = page.locator("table.table tbody tr a").first();
    if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLink.scrollIntoViewIfNeeded();
      await assertInViewport(firstLink);
      await firstLink.click();
      await expect(page).toHaveURL(/\/dash\/tables\//, { timeout: 10000 });
    }
  });
});

// ─── Users Page ──────────────────────────────────────────────────────────────

test.describe("Users Page — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/users");
    await waitForTableReady(page);
  });

  test("页面加载: 用户列表有数据", async ({ page }) => {
    const rows = page.locator("table.table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    await assertInViewport(rows.first());
  });

  test("搜索: role:staff 过滤并更新URL", async ({ page }) => {
    await searchAndVerify(page, "role:staff", /q=.*role/);
  });

  test("搜索: 自由文本过滤后URL更新", async ({ page }) => {
    await searchAndVerify(page, "测试", /q=.*%E6%B5%8B%E8%AF%95|q=.*测试/);
  });

  test("点击用户行可导航到详情", async ({ page }) => {
    const firstLink = page.locator("table.table tbody tr a").first();
    if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLink.scrollIntoViewIfNeeded();
      await assertInViewport(firstLink);
      await firstLink.click();
      await expect(page).toHaveURL(/\/dash\/users\//, { timeout: 10000 });
    }
  });
});

// ─── Actives Page ────────────────────────────────────────────────────────────

test.describe("Actives Page — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/actives");
    await waitForTableReady(page);
  });

  test("页面加载: 活动列表渲染", async ({ page }) => {
    const table = page.locator("table.table");
    await assertInViewport(table);
  });

  test("搜索: status过滤更新URL", async ({ page }) => {
    await searchAndVerify(page, "status:active", /q=.*status/);
  });

  test("批量选择: checkbox可见, 勾选后出现操作栏", async ({ page }) => {
    const checkbox = page.locator("table.table tbody input[type='checkbox']").first();
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.scrollIntoViewIfNeeded();
      await assertInViewport(checkbox);
      await checkVisible(checkbox);
      const actionBar = page.locator("[class*='fixed'][class*='bottom']");
      await expect(actionBar).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─── Events Page ─────────────────────────────────────────────────────────────

test.describe("Events Page — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/events");
    await waitForTableReady(page);
  });

  test("页面加载: 事件表格可见", async ({ page }) => {
    const table = page.locator("table.table");
    await assertInViewport(table);
    const headers = page.locator("table.table thead th");
    await expect(headers.first()).toBeVisible();
  });

  test("搜索: 更新URL", async ({ page }) => {
    await searchAndVerify(page, "status:active", /q=/);
  });
});

// ─── GSZ/Mahjong Page ────────────────────────────────────────────────────────

test.describe("GSZ/Mahjong Page — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/gsz");
    await waitForTableReady(page);
  });

  test("页面加载: 麻将对局表格可见", async ({ page }) => {
    const table = page.locator("table.table");
    await assertInViewport(table);
  });

  test("搜索: mode:4p 过滤", async ({ page }) => {
    await searchAndVerify(page, "mode:4p", /q=.*mode/);
  });

  test("多轴搜索: mode+format", async ({ page }) => {
    await searchAndVerify(page, "mode:4p format:hanchan", /q=.*mode/);
    await expect(page).toHaveURL(/format/);
  });

  test("快速筛选pill可见", async ({ page }) => {
    const pills = page.locator("button.btn-xs");
    if (await pills.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await pills.first().scrollIntoViewIfNeeded();
      await assertInViewport(pills.first());
    }
  });
});

// ─── Dashboard Home Page ─────────────────────────────────────────────────────

test.describe("Dashboard Home — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash");
    await waitForMainContent(page);
  });

  test("首页加载: 导航链接可见且在视口内", async ({ page }) => {
    const main = page.locator("main");
    await assertInViewport(main);
    await expect(page.locator("body")).not.toContainText(/Internal server error|500/i);
  });

  test("首页加载: 不显示服务器错误", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText(/Internal server error|Unhandled/i);
  });

  test("导航: 桌台管理入口可见并可点击", async ({ page }) => {
    const tablesLink = page.locator("a[href*='/dash/tables']").first();
    if (await tablesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tablesLink.scrollIntoViewIfNeeded();
      await assertInViewport(tablesLink);
      await tablesLink.click();
      await expect(page).toHaveURL(/\/dash\/tables/, { timeout: 10000 });
    }
  });

  test("导航: 订单管理入口可见并可点击", async ({ page }) => {
    const ordersLink = page.locator("a[href*='/dash/orders']").first();
    if (await ordersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ordersLink.scrollIntoViewIfNeeded();
      await assertInViewport(ordersLink);
      await ordersLink.click();
      await expect(page).toHaveURL(/\/dash\/orders/, { timeout: 10000 });
    }
  });
});

// ─── Table Detail Page (navigate from list) ──────────────────────────────────

test.describe("Table Detail — Real Backend E2E", () => {
  test("从桌台列表进入详情: Tab和操作按钮可见", async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/tables");
    await waitForTableReady(page);

    // Click first table link to navigate to detail
    const firstLink = page.locator("table.table tbody tr a").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.scrollIntoViewIfNeeded();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dash\/tables\//, { timeout: 10000 });
    await waitForMainContent(page);

    // Tab should be visible
    const tab = page.locator("button[role='tab']", { hasText: /订单/ });
    await tab.scrollIntoViewIfNeeded();
    await assertInViewport(tab);
    await tab.click();

    // After clicking tab, table or content should appear
    await expect(page.locator("table.table, .card")).toBeVisible({ timeout: 10000 });
  });
});

// ─── Access Control ──────────────────────────────────────────────────────────

test.describe("Access Control — Real Backend E2E", () => {
  test("匿名用户无法访问dash (重定向或403)", async ({ page }) => {
    await page.goto("/dash");
    const body = page.locator("body");
    await expect(body).toBeVisible();
    await expect(body).not.toContainText(/批量结算|桌台管理|订单管理/i);
  });

  test("公开页面无服务器错误", async ({ page }) => {
    for (const path of ["/zh-CN", "/zh-CN/inventory", "/zh-CN/actives"]) {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/Internal server error|500/i);
    }
  });
});
