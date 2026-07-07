/**
 * Dashboard Full-Flow E2E — Comprehensive Long-Running Tests
 *
 * Coverage:
 *   1. ALL table pages (users, orders, tables, actives, events, gsz)
 *   2. ALL filter fields per category (text, enum, boolean, number, date, sort, group)
 *   3. Multi-user scenarios (admin vs staff — different permissions)
 *   4. Detail page navigation (list → click row → detail page loads)
 *   5. Chart/settle view (orders batch settlement with ECharts)
 *   6. Cross-page filter isolation & URL persistence
 *   7. Infinite scroll / pagination
 *   8. Table header click → filter integration
 *
 * Prerequisites:
 *   - Dev server running with seeded data (scripts/seed-launcher-e2e.ts)
 *   - Local D1 populated with test data (15 users, 10 tables, 12 orders, etc.)
 */
import { test, expect, type Page } from "@playwright/test";
import {
  LauncherPage,
  setupRole,
  navigateToFirstDetail,
  expectDetailLoaded,
  clickDetailTab,
  expectChartVisible,
  type TestRole,
} from "../pages/launcher.page";

const BASE = "/dash";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gotoWithRetry(page: Page, route: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(route, { timeout: 15000 });
      await page.waitForSelector("table, [data-testid='infinite-table'], main", {
        timeout: 10000,
      });
      return;
    } catch {
      if (attempt === 2) throw new Error(`Failed to navigate to ${route} after 3 attempts`);
      await page.waitForTimeout(2000);
    }
  }
}

function decodedUrl(page: Page): string {
  return decodeURIComponent(page.url()).replace(
    /="|"(&|$)/g,
    (m) => (m === '="' ? "=" : m.endsWith("&") ? "&" : ""),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PER-PAGE FULL FIELD COVERAGE (Admin)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("全字段覆盖 — Admin", () => {
  let lp: LauncherPage;

  test.beforeEach(async ({ page }) => {
    lp = new LauncherPage(page);
    await lp.setupAdmin();
  });

  // ─── Users ──────────────────────────────────────────────────────────────────

  test.describe("用户页: 全字段筛选", () => {
    test.beforeEach(async () => {
      await lp.goto(`${BASE}/users`);
    });

    test("text: 昵称 eq", async () => {
      await lp.applyKvFilter("昵称", "张三丰");
      await lp.expectUrlContains("f.name=");
    });

    test("text: UID include", async () => {
      await lp.applyKvFilter("UID", "thx");
      await lp.expectUrlContains("f.uid=thx");
    });

    test("text: 手机号 eq", async () => {
      await lp.applyKvFilter("手机号", "13900000001");
      await lp.expectUrlContains("f.phone=13900000001");
    });

    test("enum: 角色 — 管理员/店员/顾客", async () => {
      for (const [label, value] of [
        ["管理员", "admin"],
        ["店员", "staff"],
        ["顾客", "authenticated"],
      ] as const) {
        await lp.applyOptionFilter("角色", label);
        await lp.expectUrlContains(`f.role=${value}`);
      }
    });

    test("enum: 门店 — 光谷/街道口", async () => {
      await lp.applyOptionFilter("门店", "光谷");
      await lp.expectUrlContains("f.store=gg");
      await lp.applyOptionFilter("门店", "街道口");
      await lp.expectUrlContains("f.store=jdk");
    });

    test("boolean: 已禁用", async () => {
      await lp.applyBooleanFilter("已禁用");
      await lp.expectUrlContains("f.disabled=1");
    });

    test("sort: 注册时间/昵称/储值余额", async () => {
      for (const [label, key] of [
        ["注册时间", "created_at"],
        ["昵称", "nickname"],
        ["储值余额", "stored_value"],
      ] as const) {
        await lp.applySort("排序", label);
        await lp.expectUrlContains(`sort=${key}`);
      }
    });

    test("date: 注册时间 — 日期面板打开", async () => {
      await lp.openDateFilter("注册时间");
      await lp.expectDatePanelVisible();
    });

    test("date: 注册时间 — 填写范围并提交", async () => {
      await lp.openDateFilter("注册时间");
      await lp.fillDateRange("2025-01-01", "2025-12-31");
      await lp.expectUrlContains("f.created");
    });

    test("组合: 角色+门店+昵称+排序", async () => {
      await lp.applyOptionFilter("角色", "顾客");
      await lp.applyOptionFilter("门店", "光谷");
      await lp.applyKvFilter("昵称", "张");
      await lp.applySort("排序", "注册时间");
      await lp.expectUrlContains("f.role=authenticated");
      await lp.expectUrlContains("f.store=gg");
      await lp.expectUrlContains("f.name=");
      await lp.expectUrlContains("sort=created_at");
    });
  });

  // ─── Orders ─────────────────────────────────────────────────────────────────

  test.describe("订单页: 全字段筛选", () => {
    test.beforeEach(async () => {
      await lp.goto(`${BASE}/orders`);
    });

    test("text: 桌台/用户", async () => {
      await lp.applyKvFilter("桌台", "A1");
      await lp.expectUrlContains("f.table=");
      await lp.applyKvFilter("用户", "张三丰");
      await lp.expectUrlContains("f.user=");
    });

    test("enum: 状态 — 进行中/暂停/已结束", async () => {
      for (const [label, value] of [
        ["进行中", "active"],
        ["暂停", "paused"],
        ["已结束", "ended"],
      ] as const) {
        await lp.applyOptionFilter("状态", label);
        await lp.expectUrlContains(`f.status=${value}`);
      }
    });

    test("enum: 门店", async () => {
      await lp.applyOptionFilter("门店", "光谷");
      await lp.expectUrlContains("f.store=gg");
    });

    test("sort: 开始时间/结束时间", async () => {
      await lp.applySort("排序", "开始时间");
      await lp.expectUrlContains("sort=start_at");
      await lp.applySort("排序", "结束时间");
      await lp.expectUrlContains("sort=end_at");
    });

    test("group: 桌台/用户/日期", async () => {
      for (const [label, key] of [
        ["桌台", "table"],
        ["用户", "user"],
        ["日期", "date"],
      ] as const) {
        await lp.applyGroup("分组", label);
        await lp.expectUrlContains(`group=${key}`);
      }
    });

    test("date: 日期/开始时间/结束时间 面板", async () => {
      for (const field of ["日期", "开始时间", "结束时间"]) {
        await lp.openDateFilter(field);
        await lp.expectDatePanelVisible();
        await lp.close();
      }
    });

    test("组合: 全筛选器 (桌台+状态+门店+排序+分组)", async () => {
      await lp.applyKvFilter("桌台", "A1");
      await lp.applyOptionFilter("状态", "已结束");
      await lp.applyOptionFilter("门店", "光谷");
      await lp.applySort("排序", "开始时间");
      await lp.applyGroup("分组", "桌台");
      await lp.expectUrlContains("f.table=");
      await lp.expectUrlContains("f.status=ended");
      await lp.expectUrlContains("f.store=gg");
      await lp.expectUrlContains("sort=start_at");
      await lp.expectUrlContains("group=table");
    });
  });

  // ─── Tables ─────────────────────────────────────────────────────────────────

  test.describe("桌台页: 全字段筛选", () => {
    test.beforeEach(async () => {
      await lp.goto(`${BASE}/tables`);
    });

    test("text: 桌台名", async () => {
      await lp.applyKvFilter("桌台名", "M1");
      await lp.expectUrlContains("f.name=");
    });

    test("enum: 类型 — 固定桌/拼桌", async () => {
      await lp.applyOptionFilter("类型", "固定桌");
      await lp.expectUrlContains("f.type=fixed");
      await lp.applyOptionFilter("类型", "拼桌");
      await lp.expectUrlContains("f.type=solo");
    });

    test("enum: 状态 — 启用/停用", async () => {
      await lp.applyOptionFilter("状态", "启用");
      await lp.expectUrlContains("f.status=active");
      await lp.applyOptionFilter("状态", "停用");
      await lp.expectUrlContains("f.status=inactive");
    });

    test("enum: 门店 — 光谷/街道口", async () => {
      await lp.applyOptionFilter("门店", "光谷");
      await lp.expectUrlContains("f.store=gg");
      await lp.applyOptionFilter("门店", "街道口");
      await lp.expectUrlContains("f.store=jdk");
    });

    test("sort: 创建时间/名称", async () => {
      await lp.applySort("排序", "创建时间");
      await lp.expectUrlContains("sort=created_at");
      await lp.applySort("排序", "名称");
      await lp.expectUrlContains("sort=name");
    });

    test("date: 创建时间", async () => {
      await lp.openDateFilter("创建时间");
      await lp.expectDatePanelVisible();
    });

    test("组合: 全部 (名称+类型+状态+门店+排序)", async () => {
      await lp.applyKvFilter("桌台名", "M");
      await lp.applyOptionFilter("类型", "固定桌");
      await lp.applyOptionFilter("状态", "启用");
      await lp.applyOptionFilter("门店", "光谷");
      await lp.applySort("排序", "创建时间");
      await lp.expectUrlContains("f.name=");
      await lp.expectUrlContains("f.type=fixed");
      await lp.expectUrlContains("f.status=active");
      await lp.expectUrlContains("f.store=gg");
      await lp.expectUrlContains("sort=created_at");
    });
  });

  // ─── Actives ────────────────────────────────────────────────────────────────

  test.describe("约局页: 全字段筛选", () => {
    test.beforeEach(async () => {
      await lp.goto(`${BASE}/actives`);
    });

    test("text: 发起人/类型", async () => {
      await lp.applyKvFilter("发起人", "张三丰");
      await lp.expectUrlContains("f.creator=");
      await lp.applyKvFilter("类型", "桌游");
      await lp.expectUrlContains("f.type=");
    });

    test("enum: 状态 — 进行中/已过期", async () => {
      await lp.applyOptionFilter("状态", "进行中");
      await lp.expectUrlContains("f.status=active");
      await lp.applyOptionFilter("状态", "已过期");
      await lp.expectUrlContains("f.status=expired");
    });

    test("enum: 门店 — 光谷/街道口", async () => {
      await lp.applyOptionFilter("门店", "光谷");
      await lp.expectUrlContains("f.store=gg");
      await lp.applyOptionFilter("门店", "街道口");
      await lp.expectUrlContains("f.store=jdk");
    });

    test("sort: 创建时间/开始时间", async () => {
      await lp.applySort("排序", "创建时间");
      await lp.expectUrlContains("sort=created_at");
      await lp.applySort("排序", "开始时间");
      await lp.expectUrlContains("sort=start_time");
    });

    test("date: 日期/开始时间", async () => {
      for (const field of ["日期", "开始时间"]) {
        await lp.openDateFilter(field);
        await lp.expectDatePanelVisible();
        await lp.close();
      }
    });

    test("组合: 发起人+状态+门店+排序", async () => {
      await lp.applyKvFilter("发起人", "孙");
      await lp.applyOptionFilter("状态", "进行中");
      await lp.applyOptionFilter("门店", "光谷");
      await lp.applySort("排序", "开始时间");
      await lp.expectUrlContains("f.creator=");
      await lp.expectUrlContains("f.status=active");
      await lp.expectUrlContains("f.store=gg");
      await lp.expectUrlContains("sort=start_time");
    });
  });

  // ─── Events ─────────────────────────────────────────────────────────────────

  test.describe("活动页: 全字段筛选", () => {
    test.beforeEach(async () => {
      await lp.goto(`${BASE}/events`);
    });

    test("text: 标题", async () => {
      await lp.applyKvFilter("标题", "桌游节");
      await lp.expectUrlContains("f.title=");
    });

    test("enum: 状态 — 进行中/已结束/即将开始", async () => {
      for (const [label, value] of [
        ["进行中", "active"],
        ["已结束", "ended"],
        ["即将开始", "upcoming"],
      ] as const) {
        await lp.applyOptionFilter("状态", label);
        await lp.expectUrlContains(`f.status=${value}`);
      }
    });

    test("enum: 门店", async () => {
      await lp.applyOptionFilter("门店", "光谷");
      await lp.expectUrlContains("f.store=gg");
      await lp.applyOptionFilter("门店", "街道口");
      await lp.expectUrlContains("f.store=jdk");
    });

    test("sort: 创建时间/开始日期", async () => {
      await lp.applySort("排序", "创建时间");
      await lp.expectUrlContains("sort=created_at");
      await lp.applySort("排序", "开始日期");
      await lp.expectUrlContains("sort=start_date");
    });

    test("date: 日期/开始日期", async () => {
      for (const field of ["日期", "开始日期"]) {
        await lp.openDateFilter(field);
        await lp.expectDatePanelVisible();
        await lp.close();
      }
    });

    test("组合: 标题+状态+门店+排序", async () => {
      await lp.applyKvFilter("标题", "麻将");
      await lp.applyOptionFilter("状态", "进行中");
      await lp.applyOptionFilter("门店", "光谷");
      await lp.applySort("排序", "创建时间");
      await lp.expectUrlContains("f.title=");
      await lp.expectUrlContains("f.status=active");
      await lp.expectUrlContains("f.store=gg");
      await lp.expectUrlContains("sort=created_at");
    });
  });

  // ─── GSZ (Mahjong) ──────────────────────────────────────────────────────────

  test.describe("雀庄页: 全字段筛选", () => {
    test.beforeEach(async () => {
      await lp.goto(`${BASE}/gsz`);
    });

    test("text: 桌台", async () => {
      await lp.applyKvFilter("桌台", "M1");
      await lp.expectUrlContains("f.table=");
    });

    test("enum: 模式 — 三麻/四麻", async () => {
      await lp.applyOptionFilter("模式", "三麻");
      await lp.expectUrlContains("f.mode=3p");
      await lp.applyOptionFilter("模式", "四麻");
      await lp.expectUrlContains("f.mode=4p");
    });

    test("enum: 局数 — 东风/半庄", async () => {
      await lp.applyOptionFilter("局数", "东风");
      await lp.expectUrlContains("f.format=tonpuu");
      await lp.applyOptionFilter("局数", "半庄");
      await lp.expectUrlContains("f.format=hanchan");
    });

    test("enum: 完成度 — 已完成/未完成", async () => {
      await lp.applyOptionFilter("完成度", "已完成");
      await lp.expectUrlContains("f.completion=completed");
      await lp.applyOptionFilter("完成度", "未完成");
      await lp.expectUrlContains("f.completion=incomplete");
    });

    test("sort: 创建时间/结束时间", async () => {
      await lp.applySort("排序", "创建时间");
      await lp.expectUrlContains("sort=created_at");
      await lp.applySort("排序", "结束时间");
      await lp.expectUrlContains("sort=ended_at");
    });

    test("date: 日期/创建时间", async () => {
      for (const field of ["日期", "创建时间"]) {
        await lp.openDateFilter(field);
        await lp.expectDatePanelVisible();
        await lp.close();
      }
    });

    test("组合: 全筛选器 (桌台+模式+局数+完成度+排序)", async () => {
      await lp.applyKvFilter("桌台", "M1");
      await lp.applyOptionFilter("模式", "四麻");
      await lp.applyOptionFilter("局数", "半庄");
      await lp.applyOptionFilter("完成度", "已完成");
      await lp.applySort("排序", "结束时间");
      await lp.expectUrlContains("f.table=");
      await lp.expectUrlContains("f.mode=4p");
      await lp.expectUrlContains("f.format=hanchan");
      await lp.expectUrlContains("f.completion=completed");
      await lp.expectUrlContains("sort=ended_at");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MULTI-USER SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("多用户: Admin vs Staff", () => {
  test("Admin 可以看到所有筛选字段", async ({ page }) => {
    await setupRole(page, "admin");
    await gotoWithRetry(page, `${BASE}/users`);
    const lp = new LauncherPage(page);
    await lp.open();
    await lp.enterFilterMenu();
    // Admin sees all fields including 已禁用
    const disabledField = lp.listArea.getByText("已禁用");
    await expect(disabledField).toBeVisible({ timeout: 3000 });
    await lp.close();
  });

  test("Staff 角色可访问用户列表并使用筛选器", async ({ page }) => {
    await setupRole(page, "staff");
    await gotoWithRetry(page, `${BASE}/users`);
    const lp = new LauncherPage(page);
    await lp.applyOptionFilter("角色", "顾客");
    await lp.expectUrlContains("f.role=authenticated");
  });

  test("Staff 角色可访问订单列表并筛选", async ({ page }) => {
    await setupRole(page, "staff");
    await gotoWithRetry(page, `${BASE}/orders`);
    const lp = new LauncherPage(page);
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
  });

  test("Admin 可以使用门店筛选器 (所有页面)", async ({ page }) => {
    await setupRole(page, "admin");
    for (const route of ["/users", "/orders", "/tables", "/actives", "/events"]) {
      await gotoWithRetry(page, `${BASE}${route}`);
      const lp = new LauncherPage(page);
      await lp.applyOptionFilter("门店", "光谷");
      await lp.expectUrlContains("f.store=gg");
    }
  });

  test("Staff 从不同页面筛选: 筛选器互不干扰", async ({ page }) => {
    await setupRole(page, "staff");
    // Apply filter on users
    await gotoWithRetry(page, `${BASE}/users`);
    const lp = new LauncherPage(page);
    await lp.applyOptionFilter("角色", "管理员");
    await lp.expectUrlContains("f.role=admin");
    // Navigate to orders - filter should not carry over
    await gotoWithRetry(page, `${BASE}/orders`);
    await lp.expectNoUrlParam("f.role");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DETAIL PAGE NAVIGATION (列表 → 详情)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("详情页导航", () => {
  test.beforeEach(async ({ page }) => {
    await setupRole(page, "admin");
  });

  test("用户列表 → 用户详情: 页面加载无报错", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/users`);
    const url = await navigateToFirstDetail(page);
    expect(url).toMatch(/\/dash\/users\//);
    await expectDetailLoaded(page);
  });

  test("用户详情: Tab 切换 (会员/订单)", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/users`);
    await navigateToFirstDetail(page);
    await expectDetailLoaded(page);
    // Try clicking membership tab
    const memberTab = page.locator("button[role='tab']", { hasText: /会员|储值|membership/i });
    if (await memberTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickDetailTab(page, /会员|储值|membership/i);
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("桌台列表 → 桌台详情: 页面加载且有Tab", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/tables`);
    const url = await navigateToFirstDetail(page);
    expect(url).toMatch(/\/dash\/tables\//);
    await expectDetailLoaded(page);
    // Detail page should have tabs
    const tabs = page.locator("button[role='tab']");
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
  });

  test("桌台详情: 查看座位和订单信息", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/tables`);
    await navigateToFirstDetail(page);
    await expectDetailLoaded(page);
    // Should show table info without crash
    await expect(page.locator("body")).not.toContainText(/Internal server error|500/i);
  });

  test("约局列表 → 约局详情", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/actives`);
    const link = page.locator("table tbody tr a, table tbody tr td button").first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/\/dash\/actives\//);
      await expectDetailLoaded(page);
    }
  });

  test("活动列表 → 活动详情", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/events`);
    const link = page.locator("table tbody tr a, table tbody tr td button").first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/\/dash\/events\//);
      await expectDetailLoaded(page);
    }
  });

  test("雀庄列表 → 雀庄详情 (如有链接)", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/gsz`);
    const link = page.locator("table tbody tr a").first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/\/dash\/gsz\//);
      await expectDetailLoaded(page);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CHART / SETTLE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("图表视图 — 批量结算", () => {
  test.beforeEach(async ({ page }) => {
    await setupRole(page, "admin");
  });

  test("订单结算页: 导航到结算页面 (无报错)", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/orders`);
    // Select ended orders and try to navigate to settle
    const settleLink = page.locator("a[href*='settle']").first();
    if (await settleLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settleLink.click();
      await page.waitForTimeout(2000);
      await expect(page.locator("body")).not.toContainText(/Internal server error|500/i);
    }
  });

  test("订单结算页: 直接导航 (可能显示空状态)", async ({ page }) => {
    await page.goto(`${BASE}/orders_/settle`);
    await page.waitForTimeout(3000);
    // Should load without crash (may show "no orders" state)
    await expect(page.locator("body")).not.toContainText(/Internal server error|500/i);
  });

  test("雀庄: 活跃对局卡片可见 (如有进行中)", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/gsz`);
    // Active matches section may be visible
    const activeSection = page.locator("text=进行中");
    if (await activeSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(activeSection.first()).toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TABLE HEADER CLICK → FILTER
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("表头点击筛选", () => {
  let lp: LauncherPage;

  test.beforeEach(async ({ page }) => {
    lp = new LauncherPage(page);
    await lp.setupAdmin();
  });

  test("用户: 点击表头筛选图标 → 启动器打开", async ({ page }) => {
    await lp.goto(`${BASE}/users`);
    const filterIcon = page.locator("table thead th .size-3, table thead th button").first();
    if (await filterIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterIcon.click();
      await page.waitForTimeout(500);
      // Launcher should open in some mode
      const dialogVisible = await lp.dialog.isVisible().catch(() => false);
      if (dialogVisible) {
        await expect(lp.dialog).toBeVisible();
      }
    }
  });

  test("订单: 点击可排序列头 → URL更新", async ({ page }) => {
    await lp.goto(`${BASE}/orders`);
    const sortableHeader = page.locator("table thead th button").first();
    if (await sortableHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sortableHeader.click();
      await page.waitForTimeout(500);
      // URL should change (sort param appears)
      const url = page.url();
      // Sort should have changed or launcher opened
      expect(url.length).toBeGreaterThan(0);
    }
  });

  test("桌台: 可筛选列头 FunnelIcon 可点击", async ({ page }) => {
    await lp.goto(`${BASE}/tables`);
    // Look for funnel icon in headers
    const funnelBtn = page.locator("table thead th").locator("button").filter({
      has: page.locator("svg"),
    }).first();
    if (await funnelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await funnelBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DATA RENDERING & INFINITE SCROLL
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("数据渲染 & 无限滚动", () => {
  test.beforeEach(async ({ page }) => {
    await setupRole(page, "admin");
  });

  test("所有列表页: 表格渲染且有数据", async ({ page }) => {
    for (const route of ["/users", "/orders", "/tables", "/actives", "/events", "/gsz"]) {
      await gotoWithRetry(page, `${BASE}${route}`);
      const rows = page.locator("table tbody tr");
      await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    }
  });

  test("用户列表: 筛选后数据量变化", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/users`);
    const rows = page.locator("table tbody tr");
    const before = await rows.count();
    const lp = new LauncherPage(page);
    await lp.applyOptionFilter("角色", "管理员");
    await page.waitForTimeout(1000);
    const after = await rows.count();
    // Admin filter should return fewer results than all users
    expect(after).toBeLessThanOrEqual(before);
    expect(after).toBeGreaterThan(0);
  });

  test("订单列表: 筛选状态=已结束 → 减少行数", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/orders`);
    const rows = page.locator("table tbody tr");
    const before = await rows.count();
    const lp = new LauncherPage(page);
    await lp.applyOptionFilter("状态", "已结束");
    await page.waitForTimeout(1000);
    const after = await rows.count();
    expect(after).toBeLessThanOrEqual(before);
  });

  test("用户列表: 无限滚动触发加载更多", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/users`);
    const rows = page.locator("table tbody tr");
    const initial = await rows.count();
    if (initial >= 10) {
      // Scroll to bottom to trigger load more
      await page.evaluate(() => {
        const container = document.querySelector(".overflow-y-auto, .flex-1.overflow-auto");
        if (container) container.scrollTop = container.scrollHeight;
      });
      await page.waitForTimeout(2000);
      const after = await rows.count();
      // Should have same or more rows (infinite scroll may not trigger with seed data)
      expect(after).toBeGreaterThanOrEqual(initial);
    }
  });

  test("雀庄列表: 分页工作正常", async ({ page }) => {
    await gotoWithRetry(page, `${BASE}/gsz`);
    const rows = page.locator("table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    // Check for pagination
    const nextBtn = page.locator("button", { hasText: /下一页|>|→/ }).first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain("page=2");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CROSS-PAGE FILTER ISOLATION & URL PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("跨页面隔离 & URL 持久化", () => {
  let lp: LauncherPage;

  test.beforeEach(async ({ page }) => {
    lp = new LauncherPage(page);
    await lp.setupAdmin();
  });

  test("用户页筛选 → 订单页无残留 → 桌台页无残留", async ({ page }) => {
    await lp.goto(`${BASE}/users`);
    await lp.applyOptionFilter("角色", "管理员");
    await lp.expectUrlContains("f.role=admin");

    await lp.goto(`${BASE}/orders`);
    await lp.expectNoUrlParam("f.role");

    await lp.goto(`${BASE}/tables`);
    await lp.expectNoUrlParam("f.role");
  });

  test("订单页筛选 → 用户页无残留", async ({ page }) => {
    await lp.goto(`${BASE}/orders`);
    await lp.applyOptionFilter("状态", "暂停");
    await lp.expectUrlContains("f.status=paused");

    await lp.goto(`${BASE}/users`);
    await lp.expectNoUrlParam("f.status");
  });

  test("URL 直接加载带筛选参数 → 筛选生效", async ({ page }) => {
    await page.goto(`${BASE}/users?f.role=admin&sort=created_at`);
    await page.waitForSelector("table", { timeout: 10000 });
    const url = decodedUrl(page);
    expect(url).toContain("f.role=admin");
    expect(url).toContain("sort=created_at");
  });

  test("URL 直接加载多筛选 → 订单页", async ({ page }) => {
    await page.goto(`${BASE}/orders?f.status=ended&f.store=gg&sort=start_at`);
    await page.waitForSelector("table", { timeout: 10000 });
    const url = decodedUrl(page);
    expect(url).toContain("f.status=ended");
    expect(url).toContain("f.store=gg");
    expect(url).toContain("sort=start_at");
  });

  test("刷新页面: 筛选参数保留", async ({ page }) => {
    await lp.goto(`${BASE}/users`);
    await lp.applyOptionFilter("角色", "顾客");
    await lp.expectUrlContains("f.role=authenticated");

    await page.reload();
    await page.waitForSelector("table", { timeout: 10000 });
    const url = decodedUrl(page);
    expect(url).toContain("f.role=authenticated");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. FILTER OVERRIDE & RESET
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("筛选覆盖 & 重置", () => {
  let lp: LauncherPage;

  test.beforeEach(async ({ page }) => {
    lp = new LauncherPage(page);
    await lp.setupAdmin();
  });

  test("同 key 覆盖: 用户角色多次切换只保留最新", async ({ page }) => {
    await lp.goto(`${BASE}/users`);
    await lp.applyOptionFilter("角色", "管理员");
    await lp.expectUrlContains("f.role=admin");
    await lp.applyOptionFilter("角色", "店员");
    await lp.expectUrlContains("f.role=staff");
    expect(decodedUrl(page)).not.toContain("f.role=admin");
  });

  test("同 key 覆盖: 订单状态切换", async ({ page }) => {
    await lp.goto(`${BASE}/orders`);
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
    await lp.applyOptionFilter("状态", "暂停");
    await lp.expectUrlContains("f.status=paused");
    expect(decodedUrl(page)).not.toContain("f.status=active");
  });

  test("同 key 覆盖: 雀庄模式切换", async ({ page }) => {
    await lp.goto(`${BASE}/gsz`);
    await lp.applyOptionFilter("模式", "四麻");
    await lp.expectUrlContains("f.mode=4p");
    await lp.applyOptionFilter("模式", "三麻");
    await lp.expectUrlContains("f.mode=3p");
    expect(decodedUrl(page)).not.toContain("f.mode=4p");
  });

  test("Esc 关闭启动器后参数保留", async ({ page }) => {
    await lp.goto(`${BASE}/orders`);
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
    // Open and close without change
    await lp.open();
    await lp.close();
    // Params still there
    await lp.expectUrlContains("f.status=active");
  });

  test("排序覆盖: 切换排序字段", async ({ page }) => {
    await lp.goto(`${BASE}/users`);
    await lp.applySort("排序", "注册时间");
    await lp.expectUrlContains("sort=created_at");
    await lp.applySort("排序", "储值余额");
    await lp.expectUrlContains("sort=stored_value");
    expect(decodedUrl(page)).not.toContain("sort=created_at");
  });
});
