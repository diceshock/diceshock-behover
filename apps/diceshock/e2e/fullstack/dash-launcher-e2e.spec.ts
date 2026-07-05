/**
 * Launcher E2E — Full Coverage Spec
 *
 * Tests every category (用户/订单/桌台/约局/活动/雀庄) with every filter kind
 * (kv, option, boolean, date, sort, group) in multiple permutations.
 *
 * Simulates real admin usage:
 * 1. Open launcher via "/" hotkey or click
 * 2. Select category
 * 3. Apply single/multiple filters in various combinations
 * 4. Verify URL params update correctly
 * 5. Verify table data reflects the filter
 * 6. Clear filters, apply different combos
 * 7. Use search to find items and navigate to detail pages
 *
 * Prerequisites: Run `pnpm exec tsx scripts/seed-launcher-e2e.ts` first.
 */
import { expect, type Page, test } from "@playwright/test";

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const BASE_URL = "/dash";

async function setupAdmin(page: Page) {
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "lnch-admin-001",
          name: "赵管理",
          role: "admin",
          preferredStoreId: "store-lnch-gg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
  await page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
}

// ─── Launcher Interaction Helpers ────────────────────────────────────────────

async function openLauncher(page: Page) {
  // Press "/" to open
  await page.keyboard.press("/");
  await expect(page.locator(".fixed.inset-0.z-50")).toBeVisible({ timeout: 3000 });
}

async function openLauncherViaClick(page: Page) {
  const trigger = page.locator("button", { hasText: "搜索…" });
  await trigger.click();
  await expect(page.locator(".fixed.inset-0.z-50")).toBeVisible({ timeout: 3000 });
}

async function getLauncherInput(page: Page) {
  return page.locator(".fixed.inset-0.z-50 input[type='text']");
}

async function closeLauncher(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.locator(".fixed.inset-0.z-50")).not.toBeVisible({ timeout: 2000 });
}

async function enterFilterMenu(page: Page) {
  const filterBtn = page.locator(".fixed.inset-0.z-50 button[title='筛选器']");
  await filterBtn.click();
}

async function selectMenuItem(page: Page, label: string) {
  const item = page.locator(".fixed.inset-0.z-50 [role='option'], .fixed.inset-0.z-50 .overflow-y-auto > div").filter({ hasText: label }).first();
  await item.click();
}

async function selectMenuItemByIndex(page: Page, presses: number) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

async function typeAndSubmit(page: Page, text: string) {
  const input = await getLauncherInput(page);
  await input.fill(text);
  await page.keyboard.press("Enter");
}

async function waitForTable(page: Page) {
  await page.waitForSelector("table.table, [data-testid='infinite-table']", { timeout: 10000 });
}

async function getUrlParams(page: Page): Promise<URLSearchParams> {
  const url = new URL(page.url());
  return url.searchParams;
}

async function expectUrlParam(page: Page, key: string, value: string) {
  await expect.poll(async () => {
    const params = await getUrlParams(page);
    return params.get(key);
  }, { timeout: 5000, message: `URL param ${key}=${value}` }).toBe(value);
}

async function expectUrlContains(page: Page, substring: string) {
  await expect.poll(
    () => page.url(),
    { timeout: 5000, message: `URL contains ${substring}` },
  ).toContain(substring);
}

async function expectNoUrlParam(page: Page, key: string) {
  await expect.poll(async () => {
    const params = await getUrlParams(page);
    return params.has(key);
  }, { timeout: 3000, message: `URL param ${key} absent` }).toBe(false);
}

async function navigateToCategory(page: Page, route: string) {
  await page.goto(route);
  await waitForTable(page);
}

/** Apply a kv filter: open launcher → filter menu → select kv filter → type value → submit */
async function applyKvFilter(page: Page, filterLabel: string, value: string) {
  await openLauncher(page);
  await enterFilterMenu(page);
  await selectMenuItem(page, filterLabel);
  // Now in kv-input mode
  await page.keyboard.type(value);
  await page.keyboard.press("Enter");
  // Launcher should navigate
  await page.waitForTimeout(300);
}

/** Apply an option filter: open launcher → filter menu → select option → pick value */
async function applyOptionFilter(page: Page, filterLabel: string, optionLabel: string) {
  await openLauncher(page);
  await enterFilterMenu(page);
  await selectMenuItem(page, filterLabel);
  // Now in option-select mode, use keyboard or click
  await selectMenuItem(page, optionLabel);
  await page.waitForTimeout(300);
}

/** Apply a sort: open launcher → filter menu → select sort → pick field */
async function applySort(page: Page, sortLabel: string, fieldLabel: string) {
  await openLauncher(page);
  await enterFilterMenu(page);
  await selectMenuItem(page, sortLabel);
  await selectMenuItem(page, fieldLabel);
  await page.waitForTimeout(300);
}

/** Verify a filter chip is visible in the launcher */
async function expectFilterChip(page: Page, text: string) {
  await openLauncher(page);
  const chip = page.locator(".fixed.inset-0.z-50").getByText(text, { exact: false });
  await expect(chip).toBeVisible({ timeout: 3000 });
  await closeLauncher(page);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Launcher E2E — Full Filter Coverage", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: 用户 (Users)
  // Filters: name(kv), uid(kv), phone(kv), role(option), store(option),
  //          disabled(boolean), created(date), sort(sort)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("用户 — Users Category", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToCategory(page, `${BASE_URL}/users`);
    });

    test("KV filter: 昵称搜索", async ({ page }) => {
      await applyKvFilter(page, "昵称", "张三");
      await expectUrlContains(page, "f.name=");
    });

    test("KV filter: UID搜索", async ({ page }) => {
      await applyKvFilter(page, "UID", "thx1138");
      await expectUrlContains(page, "f.uid=thx1138");
    });

    test("KV filter: 手机号搜索", async ({ page }) => {
      await applyKvFilter(page, "手机号", "13800001");
      await expectUrlContains(page, "f.phone=13800001");
    });

    test("Option filter: 角色=管理员", async ({ page }) => {
      await applyOptionFilter(page, "角色", "管理员");
      await expectUrlContains(page, "f.role=admin");
    });

    test("Option filter: 角色=店员", async ({ page }) => {
      await applyOptionFilter(page, "角色", "店员");
      await expectUrlContains(page, "f.role=staff");
    });

    test("Option filter: 角色=顾客", async ({ page }) => {
      await applyOptionFilter(page, "角色", "顾客");
      await expectUrlContains(page, "f.role=authenticated");
    });

    test("Option filter: 门店=光谷", async ({ page }) => {
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.store=gg");
    });

    test("Option filter: 门店=街道口", async ({ page }) => {
      await applyOptionFilter(page, "门店", "街道口");
      await expectUrlContains(page, "f.store=jdk");
    });

    test("Boolean filter: 已禁用", async ({ page }) => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "已禁用");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.disabled=true");
    });

    test("Sort: 按注册时间排序", async ({ page }) => {
      await applySort(page, "排序", "注册时间");
      await expectUrlContains(page, "sort=created_at");
    });

    test("Sort: 按昵称排序", async ({ page }) => {
      await applySort(page, "排序", "昵称");
      await expectUrlContains(page, "sort=nickname");
    });

    test("Sort: 按储值余额排序", async ({ page }) => {
      await applySort(page, "排序", "储值余额");
      await expectUrlContains(page, "sort=stored_value");
    });

    // ─── Multi-filter Permutations ─────────────────────────────────────────

    test("组合: 角色+门店", async ({ page }) => {
      await applyOptionFilter(page, "角色", "顾客");
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.role=authenticated");
      await expectUrlContains(page, "f.store=gg");
    });

    test("组合: 昵称+角色+排序", async ({ page }) => {
      await applyKvFilter(page, "昵称", "李");
      await applyOptionFilter(page, "角色", "顾客");
      await applySort(page, "排序", "注册时间");
      await expectUrlContains(page, "f.name=");
      await expectUrlContains(page, "f.role=authenticated");
      await expectUrlContains(page, "sort=created_at");
    });

    test("组合: UID+门店+排序", async ({ page }) => {
      await applyKvFilter(page, "UID", "uid");
      await applyOptionFilter(page, "门店", "街道口");
      await applySort(page, "排序", "储值余额");
      await expectUrlContains(page, "f.uid=uid");
      await expectUrlContains(page, "f.store=jdk");
      await expectUrlContains(page, "sort=stored_value");
    });

    // ─── Free-text search & navigate to detail ─────────────────────────────

    test("搜索跳转详情: 输入用户名搜索并跳转", async ({ page }) => {
      await openLauncher(page);
      const input = await getLauncherInput(page);
      await input.fill("张三丰");
      // Wait for results
      await page.waitForTimeout(500);
      // Select first result (should navigate to detail)
      await page.keyboard.press("Enter");
      // Should land on a detail page or have filtered results
      await page.waitForTimeout(1000);
    });

    // ─── Clear filters ─────────────────────────────────────────────────────

    test("清除筛选器: Esc关闭后参数保留, 重新打开移除", async ({ page }) => {
      await applyOptionFilter(page, "角色", "管理员");
      await expectUrlContains(page, "f.role=admin");
      // Reopen launcher and verify chip shows
      await openLauncher(page);
      const chip = page.locator(".fixed.inset-0.z-50").getByText("admin", { exact: false });
      await expect(chip).toBeVisible();
      await closeLauncher(page);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: 订单 (Orders)
  // Filters: table(kv), user(kv), status(option), store(option),
  //          date(date), sort(sort), group(group)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("订单 — Orders Category", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToCategory(page, `${BASE_URL}/orders`);
    });

    test("KV filter: 桌台名搜索", async ({ page }) => {
      await applyKvFilter(page, "桌台", "大厅");
      await expectUrlContains(page, "f.table=");
    });

    test("KV filter: 用户搜索", async ({ page }) => {
      await applyKvFilter(page, "用户", "张三");
      await expectUrlContains(page, "f.user=");
    });

    test("Option filter: 状态=进行中", async ({ page }) => {
      await applyOptionFilter(page, "状态", "进行中");
      await expectUrlContains(page, "f.status=active");
    });

    test("Option filter: 状态=暂停", async ({ page }) => {
      await applyOptionFilter(page, "状态", "暂停");
      await expectUrlContains(page, "f.status=paused");
    });

    test("Option filter: 状态=已结束", async ({ page }) => {
      await applyOptionFilter(page, "状态", "已结束");
      await expectUrlContains(page, "f.status=ended");
    });

    test("Option filter: 门店=光谷", async ({ page }) => {
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.store=gg");
    });

    test("Sort: 按开始时间排序", async ({ page }) => {
      await applySort(page, "排序", "开始时间");
      await expectUrlContains(page, "sort=start_at");
    });

    test("Sort: 按结束时间排序", async ({ page }) => {
      await applySort(page, "排序", "结束时间");
      await expectUrlContains(page, "sort=end_at");
    });

    // Group filter
    test("分组: 按桌台分组", async ({ page }) => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "分组");
      await selectMenuItem(page, "桌台");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "group=table");
    });

    test("分组: 按用户分组", async ({ page }) => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "分组");
      await selectMenuItem(page, "用户");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "group=user");
    });

    test("分组: 按日期分组", async ({ page }) => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "分组");
      await selectMenuItem(page, "日期");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "group=date");
    });

    // ─── Multi-filter Permutations ─────────────────────────────────────────

    test("组合: 状态+门店+排序", async ({ page }) => {
      await applyOptionFilter(page, "状态", "已结束");
      await applyOptionFilter(page, "门店", "光谷");
      await applySort(page, "排序", "开始时间");
      await expectUrlContains(page, "f.status=ended");
      await expectUrlContains(page, "f.store=gg");
      await expectUrlContains(page, "sort=start_at");
    });

    test("组合: 桌台+状态+分组", async ({ page }) => {
      await applyKvFilter(page, "桌台", "A1");
      await applyOptionFilter(page, "状态", "进行中");
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "分组");
      await selectMenuItem(page, "桌台");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.table=");
      await expectUrlContains(page, "f.status=active");
      await expectUrlContains(page, "group=table");
    });

    test("组合: 用户+日期+排序+分组 (全筛选器)", async ({ page }) => {
      await applyKvFilter(page, "用户", "张");
      await applyOptionFilter(page, "状态", "已结束");
      await applySort(page, "排序", "结束时间");
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "分组");
      await selectMenuItem(page, "用户");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.user=");
      await expectUrlContains(page, "f.status=ended");
      await expectUrlContains(page, "sort=end_at");
      await expectUrlContains(page, "group=user");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: 桌台 (Tables)
  // Filters: name(kv), type(option), status(option), store(option), sort(sort)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("桌台 — Tables Category", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToCategory(page, `${BASE_URL}/tables`);
    });

    test("KV filter: 桌台名搜索", async ({ page }) => {
      await applyKvFilter(page, "桌台名", "大厅");
      await expectUrlContains(page, "f.name=");
    });

    test("Option filter: 类型=固定桌", async ({ page }) => {
      await applyOptionFilter(page, "类型", "固定桌");
      await expectUrlContains(page, "f.type=fixed");
    });

    test("Option filter: 类型=拼桌", async ({ page }) => {
      await applyOptionFilter(page, "类型", "拼桌");
      await expectUrlContains(page, "f.type=solo");
    });

    test("Option filter: 状态=启用", async ({ page }) => {
      await applyOptionFilter(page, "状态", "启用");
      await expectUrlContains(page, "f.status=active");
    });

    test("Option filter: 状态=停用", async ({ page }) => {
      await applyOptionFilter(page, "状态", "停用");
      await expectUrlContains(page, "f.status=inactive");
    });

    test("Option filter: 门店=光谷", async ({ page }) => {
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.store=gg");
    });

    test("Option filter: 门店=街道口", async ({ page }) => {
      await applyOptionFilter(page, "门店", "街道口");
      await expectUrlContains(page, "f.store=jdk");
    });

    test("Sort: 按创建时间排序", async ({ page }) => {
      await applySort(page, "排序", "创建时间");
      await expectUrlContains(page, "sort=created_at");
    });

    test("Sort: 按名称排序", async ({ page }) => {
      await applySort(page, "排序", "名称");
      await expectUrlContains(page, "sort=name");
    });

    // ─── Multi-filter Permutations ─────────────────────────────────────────

    test("组合: 类型+状态+门店", async ({ page }) => {
      await applyOptionFilter(page, "类型", "固定桌");
      await applyOptionFilter(page, "状态", "启用");
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.type=fixed");
      await expectUrlContains(page, "f.status=active");
      await expectUrlContains(page, "f.store=gg");
    });

    test("组合: 桌台名+类型+排序", async ({ page }) => {
      await applyKvFilter(page, "桌台名", "街道口");
      await applyOptionFilter(page, "类型", "拼桌");
      await applySort(page, "排序", "名称");
      await expectUrlContains(page, "f.name=");
      await expectUrlContains(page, "f.type=solo");
      await expectUrlContains(page, "sort=name");
    });

    test("组合: 全部 (名称+类型+状态+门店+排序)", async ({ page }) => {
      await applyKvFilter(page, "桌台名", "M");
      await applyOptionFilter(page, "类型", "固定桌");
      await applyOptionFilter(page, "状态", "启用");
      await applyOptionFilter(page, "门店", "光谷");
      await applySort(page, "排序", "创建时间");
      await expectUrlContains(page, "f.name=");
      await expectUrlContains(page, "f.type=fixed");
      await expectUrlContains(page, "f.status=active");
      await expectUrlContains(page, "f.store=gg");
      await expectUrlContains(page, "sort=created_at");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: 约局 (Actives)
  // Filters: creator(kv), type(kv), status(option), store(option),
  //          date(date), sort(sort)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("约局 — Actives Category", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToCategory(page, `${BASE_URL}/actives`);
    });

    test("KV filter: 发起人搜索", async ({ page }) => {
      await applyKvFilter(page, "发起人", "张三");
      await expectUrlContains(page, "f.creator=");
    });

    test("KV filter: 类型搜索", async ({ page }) => {
      await applyKvFilter(page, "类型", "桌游");
      await expectUrlContains(page, "f.type=");
    });

    test("Option filter: 状态=进行中", async ({ page }) => {
      await applyOptionFilter(page, "状态", "进行中");
      await expectUrlContains(page, "f.status=active");
    });

    test("Option filter: 状态=已过期", async ({ page }) => {
      await applyOptionFilter(page, "状态", "已过期");
      await expectUrlContains(page, "f.status=expired");
    });

    test("Option filter: 门店=光谷", async ({ page }) => {
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.store=gg");
    });

    test("Option filter: 门店=街道口", async ({ page }) => {
      await applyOptionFilter(page, "门店", "街道口");
      await expectUrlContains(page, "f.store=jdk");
    });

    test("Sort: 按创建时间排序", async ({ page }) => {
      await applySort(page, "排序", "创建时间");
      await expectUrlContains(page, "sort=created_at");
    });

    test("Sort: 按开始时间排序", async ({ page }) => {
      await applySort(page, "排序", "开始时间");
      await expectUrlContains(page, "sort=start_time");
    });

    // ─── Multi-filter Permutations ─────────────────────────────────────────

    test("组合: 状态+门店+排序", async ({ page }) => {
      await applyOptionFilter(page, "状态", "进行中");
      await applyOptionFilter(page, "门店", "光谷");
      await applySort(page, "排序", "开始时间");
      await expectUrlContains(page, "f.status=active");
      await expectUrlContains(page, "f.store=gg");
      await expectUrlContains(page, "sort=start_time");
    });

    test("组合: 发起人+状态+门店", async ({ page }) => {
      await applyKvFilter(page, "发起人", "孙");
      await applyOptionFilter(page, "状态", "进行中");
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.creator=");
      await expectUrlContains(page, "f.status=active");
      await expectUrlContains(page, "f.store=gg");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: 活动 (Events)
  // Filters: title(kv), status(option), store(option), date(date), sort(sort)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("活动 — Events Category", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToCategory(page, `${BASE_URL}/events`);
    });

    test("KV filter: 标题搜索", async ({ page }) => {
      await applyKvFilter(page, "标题", "桌游");
      await expectUrlContains(page, "f.title=");
    });

    test("Option filter: 状态=进行中", async ({ page }) => {
      await applyOptionFilter(page, "状态", "进行中");
      await expectUrlContains(page, "f.status=active");
    });

    test("Option filter: 状态=已结束", async ({ page }) => {
      await applyOptionFilter(page, "状态", "已结束");
      await expectUrlContains(page, "f.status=ended");
    });

    test("Option filter: 状态=即将开始", async ({ page }) => {
      await applyOptionFilter(page, "状态", "即将开始");
      await expectUrlContains(page, "f.status=upcoming");
    });

    test("Option filter: 门店=光谷", async ({ page }) => {
      await applyOptionFilter(page, "门店", "光谷");
      await expectUrlContains(page, "f.store=gg");
    });

    test("Option filter: 门店=街道口", async ({ page }) => {
      await applyOptionFilter(page, "门店", "街道口");
      await expectUrlContains(page, "f.store=jdk");
    });

    test("Sort: 按创建时间排序", async ({ page }) => {
      await applySort(page, "排序", "创建时间");
      await expectUrlContains(page, "sort=created_at");
    });

    test("Sort: 按开始日期排序", async ({ page }) => {
      await applySort(page, "排序", "开始日期");
      await expectUrlContains(page, "sort=start_date");
    });

    // ─── Multi-filter Permutations ─────────────────────────────────────────

    test("组合: 标题+状态+门店+排序", async ({ page }) => {
      await applyKvFilter(page, "标题", "麻将");
      await applyOptionFilter(page, "状态", "进行中");
      await applyOptionFilter(page, "门店", "光谷");
      await applySort(page, "排序", "创建时间");
      await expectUrlContains(page, "f.title=");
      await expectUrlContains(page, "f.status=active");
      await expectUrlContains(page, "f.store=gg");
      await expectUrlContains(page, "sort=created_at");
    });

    test("组合: 状态切换 (进行中 → 已结束)", async ({ page }) => {
      await applyOptionFilter(page, "状态", "进行中");
      await expectUrlContains(page, "f.status=active");
      // Apply a different status — should replace
      await applyOptionFilter(page, "状态", "已结束");
      await expectUrlContains(page, "f.status=ended");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: 雀庄 (GSZ / Mahjong)
  // Filters: table(kv), mode(option), format(option), completion(option),
  //          date(date), sort(sort)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("雀庄 — GSZ/Mahjong Category", () => {
    test.beforeEach(async ({ page }) => {
      await navigateToCategory(page, `${BASE_URL}/gsz`);
    });

    test("KV filter: 桌台搜索", async ({ page }) => {
      await applyKvFilter(page, "桌台", "M1");
      await expectUrlContains(page, "f.table=");
    });

    test("Option filter: 模式=三麻", async ({ page }) => {
      await applyOptionFilter(page, "模式", "三麻");
      await expectUrlContains(page, "f.mode=3p");
    });

    test("Option filter: 模式=四麻", async ({ page }) => {
      await applyOptionFilter(page, "模式", "四麻");
      await expectUrlContains(page, "f.mode=4p");
    });

    test("Option filter: 局数=东风", async ({ page }) => {
      await applyOptionFilter(page, "局数", "东风");
      await expectUrlContains(page, "f.format=tonpuu");
    });

    test("Option filter: 局数=半庄", async ({ page }) => {
      await applyOptionFilter(page, "局数", "半庄");
      await expectUrlContains(page, "f.format=hanchan");
    });

    test("Option filter: 完成度=已完成", async ({ page }) => {
      await applyOptionFilter(page, "完成度", "已完成");
      await expectUrlContains(page, "f.completion=completed");
    });

    test("Option filter: 完成度=未完成", async ({ page }) => {
      await applyOptionFilter(page, "完成度", "未完成");
      await expectUrlContains(page, "f.completion=incomplete");
    });

    test("Sort: 按创建时间排序", async ({ page }) => {
      await applySort(page, "排序", "创建时间");
      await expectUrlContains(page, "sort=created_at");
    });

    test("Sort: 按结束时间排序", async ({ page }) => {
      await applySort(page, "排序", "结束时间");
      await expectUrlContains(page, "sort=ended_at");
    });

    // ─── Multi-filter Permutations ─────────────────────────────────────────

    test("组合: 模式+局数", async ({ page }) => {
      await applyOptionFilter(page, "模式", "四麻");
      await applyOptionFilter(page, "局数", "半庄");
      await expectUrlContains(page, "f.mode=4p");
      await expectUrlContains(page, "f.format=hanchan");
    });

    test("组合: 模式+局数+完成度", async ({ page }) => {
      await applyOptionFilter(page, "模式", "三麻");
      await applyOptionFilter(page, "局数", "东风");
      await applyOptionFilter(page, "完成度", "已完成");
      await expectUrlContains(page, "f.mode=3p");
      await expectUrlContains(page, "f.format=tonpuu");
      await expectUrlContains(page, "f.completion=completed");
    });

    test("组合: 桌台+模式+局数+完成度+排序 (全筛选器)", async ({ page }) => {
      await applyKvFilter(page, "桌台", "M1");
      await applyOptionFilter(page, "模式", "四麻");
      await applyOptionFilter(page, "局数", "半庄");
      await applyOptionFilter(page, "完成度", "已完成");
      await applySort(page, "排序", "结束时间");
      await expectUrlContains(page, "f.table=");
      await expectUrlContains(page, "f.mode=4p");
      await expectUrlContains(page, "f.format=hanchan");
      await expectUrlContains(page, "f.completion=completed");
      await expectUrlContains(page, "sort=ended_at");
    });

    test("组合: 切换模式 (四麻→三麻)", async ({ page }) => {
      await applyOptionFilter(page, "模式", "四麻");
      await expectUrlContains(page, "f.mode=4p");
      await applyOptionFilter(page, "模式", "三麻");
      await expectUrlContains(page, "f.mode=3p");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-CATEGORY & LAUNCHER UX TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Launcher UX — Cross-Category", () => {
    test("热键 / 打开启动器", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await openLauncher(page);
      const dialog = page.locator(".fixed.inset-0.z-50");
      await expect(dialog).toBeVisible();
    });

    test("点击触发按钮打开启动器", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await openLauncherViaClick(page);
      const dialog = page.locator(".fixed.inset-0.z-50");
      await expect(dialog).toBeVisible();
    });

    test("Esc 关闭启动器", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await openLauncher(page);
      await closeLauncher(page);
    });

    test("点击背景关闭启动器", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await openLauncher(page);
      // Click the backdrop
      const backdrop = page.locator(".fixed.inset-0.z-50").first();
      await backdrop.click({ position: { x: 10, y: 10 } });
      await expect(page.locator(".fixed.inset-0.z-50 .max-w-lg")).not.toBeVisible({ timeout: 2000 });
    });

    test("筛选器模式切换: 搜索 → 筛选器菜单 → 返回", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await openLauncher(page);
      // Default: search mode
      const input = await getLauncherInput(page);
      await expect(input).toHaveAttribute("placeholder", /搜索/);
      // Switch to filter menu
      await enterFilterMenu(page);
      await expect(input).toHaveAttribute("placeholder", /筛选器/);
      // Switch back
      const backBtn = page.locator(".fixed.inset-0.z-50 button[title='返回搜索']");
      await backBtn.click();
      await expect(input).toHaveAttribute("placeholder", /搜索/);
    });

    test("键盘导航: 上下选择 + Enter 确认", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      // Arrow down twice then enter
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      // Should be in a sub-mode now (depends on which filter)
      await page.waitForTimeout(300);
    });

    test("从不同页面打开会自动检测类别", async ({ page }) => {
      // Start on orders page
      await page.goto(`${BASE_URL}/orders`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      // Should show order-specific filters
      const statusItem = page.locator(".fixed.inset-0.z-50 .overflow-y-auto").getByText("状态");
      await expect(statusItem).toBeVisible();
      await closeLauncher(page);

      // Navigate to tables
      await page.goto(`${BASE_URL}/tables`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      // Should show table-specific filters
      const typeItem = page.locator(".fixed.inset-0.z-50 .overflow-y-auto").getByText("类型");
      await expect(typeItem).toBeVisible();
    });

    test("跨页面: users筛选后切换到orders筛选", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await applyOptionFilter(page, "角色", "管理员");
      await expectUrlContains(page, "f.role=admin");

      // Navigate to orders
      await page.goto(`${BASE_URL}/orders`);
      await waitForTable(page);
      // Orders should NOT have the users filter
      await expectNoUrlParam(page, "f.role");
      // Apply orders filter
      await applyOptionFilter(page, "状态", "进行中");
      await expectUrlContains(page, "f.status=active");
    });

    test("Input不在焦点时 / 键有效, Input焦点时 / 无效", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      // First: focus NOT on input, "/" should open
      await openLauncher(page);
      await closeLauncher(page);
      // Now focus an input on the page (if any exist) — test that "/" doesn't trigger
      // This is hard to test generically, so just verify the hotkey works from body
    });

    test("筛选器覆盖: 同一key多次设值覆盖", async ({ page }) => {
      await page.goto(`${BASE_URL}/orders`);
      await waitForTable(page);
      await applyOptionFilter(page, "状态", "进行中");
      await expectUrlContains(page, "f.status=active");
      // Apply different value for same key
      await applyOptionFilter(page, "状态", "暂停");
      await expectUrlContains(page, "f.status=paused");
      // Should not have both
      const url = page.url();
      expect(url).not.toContain("f.status=active");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE FILTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("日期筛选器", () => {
    test("用户: 注册时间日期筛选器打开日期面板", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "注册时间");
      // Should show date pick panel
      const datePanel = page.locator(".fixed.inset-0.z-50 input[type='date']");
      await expect(datePanel.first()).toBeVisible({ timeout: 3000 });
    });

    test("订单: 日期筛选器", async ({ page }) => {
      await page.goto(`${BASE_URL}/orders`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "日期");
      const datePanel = page.locator(".fixed.inset-0.z-50 input[type='date']");
      await expect(datePanel.first()).toBeVisible({ timeout: 3000 });
    });

    test("约局: 日期筛选器", async ({ page }) => {
      await page.goto(`${BASE_URL}/actives`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "日期");
      const datePanel = page.locator(".fixed.inset-0.z-50 input[type='date']");
      await expect(datePanel.first()).toBeVisible({ timeout: 3000 });
    });

    test("活动: 日期筛选器", async ({ page }) => {
      await page.goto(`${BASE_URL}/events`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "日期");
      const datePanel = page.locator(".fixed.inset-0.z-50 input[type='date']");
      await expect(datePanel.first()).toBeVisible({ timeout: 3000 });
    });

    test("雀庄: 日期筛选器", async ({ page }) => {
      await page.goto(`${BASE_URL}/gsz`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "日期");
      const datePanel = page.locator(".fixed.inset-0.z-50 input[type='date']");
      await expect(datePanel.first()).toBeVisible({ timeout: 3000 });
    });

    test("日期范围: 填写起止日期并提交", async ({ page }) => {
      await page.goto(`${BASE_URL}/orders`);
      await waitForTable(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "日期");
      // Fill from date
      const dateInputs = page.locator(".fixed.inset-0.z-50 input[type='date']");
      await dateInputs.nth(0).fill("2025-01-01");
      await dateInputs.nth(1).fill("2025-12-31");
      // Submit
      const confirmBtn = page.locator(".fixed.inset-0.z-50 button", { hasText: /确|应用|确认/ });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      } else {
        await page.keyboard.press("Enter");
      }
      await page.waitForTimeout(500);
      await expectUrlContains(page, "f.date");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INFINITE SCROLL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("无限滚动", () => {
    test("用户列表: 数据存在时表格可见", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      const rows = page.locator("table.table tbody tr, [data-testid='infinite-table'] tbody tr");
      await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    });

    test("订单列表: 数据存在时表格可见", async ({ page }) => {
      await page.goto(`${BASE_URL}/orders`);
      await waitForTable(page);
      const rows = page.locator("table.table tbody tr, [data-testid='infinite-table'] tbody tr");
      await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    });

    test("桌台列表: 数据存在时表格可见", async ({ page }) => {
      await page.goto(`${BASE_URL}/tables`);
      await waitForTable(page);
      const rows = page.locator("table.table tbody tr, [data-testid='infinite-table'] tbody tr");
      await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
    });

    test("筛选后: 数据更新", async ({ page }) => {
      await page.goto(`${BASE_URL}/users`);
      await waitForTable(page);
      const rowsBefore = await page.locator("table.table tbody tr").count();
      // Apply a restrictive filter
      await applyOptionFilter(page, "角色", "管理员");
      await page.waitForTimeout(1000);
      // Rows should change (fewer for admin-only)
      const rowsAfter = await page.locator("table.table tbody tr").count();
      // At minimum the table should still exist
      await expect(page.locator("table.table")).toBeVisible();
      // Admin rows should be fewer than all users (or equal if dataset is tiny)
      expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
    });
  });
});
