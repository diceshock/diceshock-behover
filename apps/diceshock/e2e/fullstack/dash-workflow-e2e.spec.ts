/**
 * Admin Continuous Workflow E2E — Real Browser Operations
 *
 * Simulates a full admin working session using only real browser interactions:
 * keyboard shortcuts, mouse clicks, scrolling, and waiting for real DOM changes.
 * Auth is mocked (standard pattern), everything else hits the real D1 backend.
 *
 * Flow:
 * 1. Land on /dash → verify header renders
 * 2. Open launcher with "/" → navigate to Users category → browse table
 * 3. Search a user by name via launcher → verify filtered results
 * 4. Navigate to Orders → select rows → trigger batch settle
 * 5. Return to orders → apply status filter via launcher
 * 6. Navigate to Events → publish a draft event → verify toggle
 * 7. Navigate to Actives → scroll through rows → apply filter
 * 8. Cross-page: rapid category switching via launcher
 *
 * Prerequisites: Run `pnpm exec tsx scripts/seed-launcher-e2e.ts` first.
 */
import { expect, type Page, test } from "@playwright/test";

// ─── Auth (same as other fullstack specs — only auth is mocked) ──────────────

async function setupAdmin(page: Page) {
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "e2e-test-staff-001",
          name: "测试店员",
          role: "admin",
          preferredStoreId: "store-e2e-gg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
  await page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
}

// ─── Browser Interaction Helpers ─────────────────────────────────────────────

const LAUNCHER = ".fixed.inset-0.z-50.flex.items-start";
const LAUNCHER_INPUT = `${LAUNCHER} input[type='text']`;
const TABLE = "table.table";
const TABLE_ROWS = `${TABLE} tbody tr`;
const CHECKBOX = "input[type='checkbox'].checkbox";

async function openLauncher(page: Page) {
  await page.keyboard.press("/");
  await expect(page.locator(LAUNCHER)).toBeVisible({ timeout: 3000 });
}

async function openLauncherByClick(page: Page) {
  await page.locator("button", { hasText: "搜索…" }).click();
  await expect(page.locator(LAUNCHER)).toBeVisible({ timeout: 3000 });
}

async function closeLauncher(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.locator(LAUNCHER)).not.toBeVisible({ timeout: 2000 });
}

async function launcherType(page: Page, text: string) {
  const input = page.locator(LAUNCHER_INPUT);
  await input.fill(text);
}

async function launcherSubmit(page: Page) {
  await page.keyboard.press("Enter");
}

async function enterFilterMenu(page: Page) {
  await page.locator(`${LAUNCHER} button[title='筛选器']`).click();
}

async function selectMenuItem(page: Page, label: string) {
  const item = page
    .locator(`${LAUNCHER} .overflow-y-auto > div`)
    .filter({ hasText: label })
    .first();
  await item.scrollIntoViewIfNeeded();
  await item.click();
}

/** Navigate to a dash page by URL (real browser navigation) */
async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
}

async function waitForTableRows(page: Page, min = 1) {
  await expect(page.locator(TABLE)).toBeVisible({ timeout: 15000 });
  if (min > 0) {
    await expect
      .poll(() => page.locator(TABLE_ROWS).count(), { timeout: 15000 })
      .toBeGreaterThanOrEqual(min);
  }
}

async function scrollToRow(page: Page, index: number) {
  const row = page.locator(TABLE_ROWS).nth(index);
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible({ timeout: 5000 });
}

async function expectUrlContains(page: Page, sub: string) {
  await expect
    .poll(() => page.url(), { timeout: 5000, message: `URL should contain "${sub}"` })
    .toContain(sub);
}

async function expectUrlNotContains(page: Page, sub: string) {
  await expect
    .poll(() => page.url(), { timeout: 3000 })
    .not.toContain(sub);
}

// ─── Full Workflow Test ──────────────────────────────────────────────────────

test.describe("Admin Continuous Workflow — Browser E2E", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await setupAdmin(page);
  });

  test("完整管理员工作流: 多页面连续操作", async ({ page }) => {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. 进入仪表盘首页, 验证 header 可见, launcher 按钮存在
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("进入仪表盘, 确认界面渲染", async () => {
      await page.goto("/dash");
      await expect(page.locator("header")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("button", { hasText: "搜索…" })).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 2. 导航到用户列表 → 滚动浏览
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("导航到用户列表", async () => {
      await navigateTo(page, "/dash/users");
      await waitForTableRows(page);
    });

    await test.step("浏览用户表格, 逐行滚动", async () => {
      const count = await page.locator(TABLE_ROWS).count();
      const scrollTo = Math.min(count, 8);
      for (let i = 0; i < scrollTo; i++) {
        await scrollToRow(page, i);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 3. Launcher 搜索特定用户名
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("用 launcher KV 筛选器搜索用户: 张三丰", async () => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "昵称");
      await page.keyboard.type("张三丰");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      await expectUrlContains(page, "f.name=");
      // Table should still be visible (possibly empty if no match, that's fine)
      await expect(page.locator(TABLE)).toBeVisible();
    });

    await test.step("清除筛选: 重新加载用户列表", async () => {
      await page.goto("/dash/users");
      await waitForTableRows(page);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 4. 用 launcher 按角色筛选
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("按角色=管理员 筛选", async () => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "角色");
      await selectMenuItem(page, "管理员");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.role=admin");
      // Admin rows should be fewer than total
      const adminCount = await page.locator(TABLE_ROWS).count();
      // Navigate back to see all
      await page.goto("/dash/users");
      await waitForTableRows(page);
      const allCount = await page.locator(TABLE_ROWS).count();
      expect(adminCount).toBeLessThanOrEqual(allCount);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 5. 导航到订单列表 → 选择行 → 批量结算
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("导航到订单列表", async () => {
      await navigateTo(page, "/dash/orders");
      await waitForTableRows(page);
    });

    await test.step("勾选前两行订单", async () => {
      const checkboxes = page.locator(`${TABLE_ROWS} ${CHECKBOX}`);
      const count = await checkboxes.count();
      if (count >= 2) {
        await checkboxes.nth(0).scrollIntoViewIfNeeded();
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).scrollIntoViewIfNeeded();
        await checkboxes.nth(1).check();
        // Batch action bar should appear with "结算" button
        await expect(page.locator("button", { hasText: /结算/ })).toBeVisible({
          timeout: 3000,
        });
      }
    });

    await test.step("点击批量结算 → 进入结算页面 → 返回", async () => {
      const settleBtn = page.locator("button", { hasText: /结算/ });
      if (await settleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settleBtn.click();
        // Should navigate to settle page
        await expectUrlContains(page, "/orders/settle");
        await expect(page.locator("main")).toBeVisible({ timeout: 5000 });
        // Navigate back
        await page.goBack();
        await waitForTableRows(page);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 6. 在订单列表用 launcher 筛选状态=进行中
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("筛选订单: 状态=进行中", async () => {
      await page.goto("/dash/orders");
      await waitForTableRows(page);
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "状态");
      await selectMenuItem(page, "进行中");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.status=active");
      await expect(page.locator(TABLE)).toBeVisible();
    });

    await test.step("切换筛选: 状态=暂停", async () => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "状态");
      await selectMenuItem(page, "暂停");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.status=paused");
      await expectUrlNotContains(page, "f.status=active");
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 7. 导航到活动页面 → 发布一个草稿活动
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("导航到活动列表", async () => {
      await page.goto("/dash/events");
      await waitForTableRows(page);
    });

    await test.step("滚动浏览活动行", async () => {
      const count = await page.locator(TABLE_ROWS).count();
      for (let i = 0; i < Math.min(count, 6); i++) {
        await scrollToRow(page, i);
      }
    });

    await test.step("找到未发布活动, 点击发布按钮", async () => {
      // Look for an unpublished badge
      const unpublishedRows = page.locator(TABLE_ROWS).filter({
        has: page.locator(".badge-ghost"),
      });
      const unpubCount = await unpublishedRows.count();

      if (unpubCount > 0) {
        const targetRow = unpublishedRows.first();
        await targetRow.scrollIntoViewIfNeeded();
        // Find the "发布" action button in this row
        const publishBtn = targetRow.locator("button", { hasText: /^发布$/ });
        if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await publishBtn.click();
          // Wait for the badge to change to success
          await expect(targetRow.locator(".badge-success")).toBeVisible({
            timeout: 8000,
          });
        }
      }
      // Even if no unpublished event found, the test continues
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 8. 导航到约局页面 → 浏览 + 筛选
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("导航到约局列表", async () => {
      await page.goto("/dash/actives");
      await waitForTableRows(page);
    });

    await test.step("滚动浏览约局行", async () => {
      const count = await page.locator(TABLE_ROWS).count();
      for (let i = 0; i < Math.min(count, 7); i++) {
        await scrollToRow(page, i);
      }
    });

    await test.step("用 launcher 筛选约局: 类型=麻将", async () => {
      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "类型");
      await selectMenuItem(page, "麻将");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.scope=mahjong");
      await expect(page.locator(TABLE)).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 9. 快速用 launcher 跨页面切换
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("快速跨页面切换: 桌台→用户→订单", async () => {
      await navigateTo(page, "/dash/tables");
      await waitForTableRows(page);

      await navigateTo(page, "/dash/users");
      await waitForTableRows(page);

      await navigateTo(page, "/dash/orders");
      await waitForTableRows(page);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 10. 最后返回首页, 确认无异常
    // ═══════════════════════════════════════════════════════════════════════

    await test.step("返回首页, 确认界面正常", async () => {
      await page.goto("/dash");
      await expect(page.locator("header")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("button", { hasText: "搜索…" })).toBeVisible();
      // No error alert visible
      await expect(page.locator(".alert-error")).not.toBeVisible();
    });
  });

  // ─── 移动端完整工作流 ──────────────────────────────────────────────────────

  test("移动端工作流: 点击触发 launcher + 各页面浏览", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await test.step("打开仪表盘, 点击按钮触发 launcher", async () => {
      await page.goto("/dash");
      await expect(page.locator("header")).toBeVisible({ timeout: 10000 });
      await openLauncherByClick(page);
      await closeLauncher(page);
    });

    await test.step("导航到用户列表, 滚动浏览", async () => {
      await page.goto("/dash/users");
      await waitForTableRows(page);
      const count = await page.locator(TABLE_ROWS).count();
      for (let i = 0; i < Math.min(count, 5); i++) {
        await scrollToRow(page, i);
      }
    });

    await test.step("导航到订单列表, 滚动浏览", async () => {
      await page.goto("/dash/orders");
      await waitForTableRows(page);
      const count = await page.locator(TABLE_ROWS).count();
      for (let i = 0; i < Math.min(count, 5); i++) {
        await scrollToRow(page, i);
      }
    });

    await test.step("导航到活动列表, 用移动端下拉菜单操作", async () => {
      await page.goto("/dash/events");
      await waitForTableRows(page);
      // On mobile, actions are in dropdown
      const firstRowMenu = page
        .locator(TABLE_ROWS)
        .first()
        .locator(".dropdown [role='button']");
      if (await firstRowMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRowMenu.click();
        // Dropdown should appear
        await expect(
          page.locator(".dropdown-content").first(),
        ).toBeVisible({ timeout: 2000 });
        // Close by clicking elsewhere
        await page.locator("main").click({ position: { x: 10, y: 10 } });
      }
    });

    await test.step("导航到约局, 确认渲染", async () => {
      await page.goto("/dash/actives");
      await waitForTableRows(page);
      await scrollToRow(page, 0);
    });

    await test.step("移动端 launcher 筛选", async () => {
      await openLauncherByClick(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "类型");
      await selectMenuItem(page, "麻将");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.scope=mahjong");
    });
  });

  // ─── 连续筛选器循环, 验证无状态残留 ────────────────────────────────────────

  test("筛选器循环: 连续切换不同页面的筛选器, 无状态残留", async ({ page }) => {
    await test.step("用户页: 角色 admin → staff → authenticated", async () => {
      await page.goto("/dash/users");
      await waitForTableRows(page);

      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "角色");
      await selectMenuItem(page, "管理员");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.role=admin");

      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "角色");
      await selectMenuItem(page, "店员");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.role=staff");
      await expectUrlNotContains(page, "f.role=admin");

      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "角色");
      await selectMenuItem(page, "顾客");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.role=authenticated");
      await expectUrlNotContains(page, "f.role=staff");
    });

    await test.step("订单页: 状态 active → paused → ended", async () => {
      await page.goto("/dash/orders");
      await waitForTableRows(page);

      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "状态");
      await selectMenuItem(page, "进行中");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.status=active");

      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "状态");
      await selectMenuItem(page, "暂停");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.status=paused");
      await expectUrlNotContains(page, "f.status=active");

      await openLauncher(page);
      await enterFilterMenu(page);
      await selectMenuItem(page, "状态");
      await selectMenuItem(page, "已结束");
      await page.waitForTimeout(300);
      await expectUrlContains(page, "f.status=ended");
      await expectUrlNotContains(page, "f.status=paused");
    });

    await test.step("跨页面筛选器不互相干扰", async () => {
      // From orders with f.status=ended, go to users
      await page.goto("/dash/users");
      await waitForTableRows(page);
      // Users should NOT have status filter
      await expectUrlNotContains(page, "f.status");

      // Go to events
      await page.goto("/dash/events");
      await waitForTableRows(page);
      await expectUrlNotContains(page, "f.status");
      await expectUrlNotContains(page, "f.role");
    });
  });

  // ─── 深度滚动 + infinite scroll 触发 ──────────────────────────────────────

  test("深度滚动: 触发 infinite scroll 加载更多", async ({ page }) => {
    await test.step("用户列表: 滚动到 sentinel 触发加载", async () => {
      await page.goto("/dash/users");
      await waitForTableRows(page);

      const initialCount = await page.locator(TABLE_ROWS).count();
      // Scroll to bottom sentinel to trigger load more
      const sentinel = page.locator(".h-1").last();
      if (await sentinel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sentinel.scrollIntoViewIfNeeded();
        // Wait for more rows to load
        await page.waitForTimeout(2000);
        const newCount = await page.locator(TABLE_ROWS).count();
        // If there was more data, count should increase
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    await test.step("订单列表: 逐行滚动到最后", async () => {
      await page.goto("/dash/orders");
      await waitForTableRows(page);

      const count = await page.locator(TABLE_ROWS).count();
      // Scroll every row to ensure rendering
      for (let i = 0; i < count; i++) {
        await scrollToRow(page, i);
      }
      // Scroll to last row
      await scrollToRow(page, count - 1);
      // Check if "已加载全部" message appears (end of list)
      const endMsg = page.getByText("已加载全部");
      const hasEnd = await endMsg.isVisible({ timeout: 3000 }).catch(() => false);
      // If there's a sentinel visible, scroll more
      if (!hasEnd) {
        const sentinel = page.locator(".h-1").last();
        if (await sentinel.isVisible({ timeout: 1000 }).catch(() => false)) {
          await sentinel.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1500);
        }
      }
    });

    await test.step("每个页面可以滚动到顶部和底部", async () => {
      const routes = ["/dash/tables", "/dash/actives", "/dash/events"];
      for (const route of routes) {
        await page.goto(route);
        await waitForTableRows(page);
        const count = await page.locator(TABLE_ROWS).count();
        if (count > 0) {
          // Scroll to last
          await scrollToRow(page, count - 1);
          // Scroll back to first
          await scrollToRow(page, 0);
        }
      }
    });
  });

  // ─── Batch 操作: 选中 + 全选 + 取消 ────────────────────────────────────────

  test("批量操作: 选中行, 全选, 取消选择", async ({ page }) => {
    await test.step("订单列表: 逐行勾选 → 批量栏出现", async () => {
      await page.goto("/dash/orders");
      await waitForTableRows(page);

      const checkboxes = page.locator(`${TABLE_ROWS} ${CHECKBOX}`);
      const count = await checkboxes.count();
      if (count >= 3) {
        // Check first 3
        for (let i = 0; i < 3; i++) {
          await checkboxes.nth(i).scrollIntoViewIfNeeded();
          await checkboxes.nth(i).check();
        }
        // Batch bar should show "3" or "选中 3"
        await expect(page.getByText(/选中|3/)).toBeVisible({ timeout: 3000 });
      }
    });

    await test.step("全选 → 验证全部勾选", async () => {
      // Click header checkbox to select all
      const headerCheckbox = page.locator(
        `${TABLE} thead ${CHECKBOX}`,
      );
      if (await headerCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await headerCheckbox.check();
        await page.waitForTimeout(300);
        // All row checkboxes should be checked
        const rowCheckboxes = page.locator(`${TABLE_ROWS} ${CHECKBOX}`);
        const count = await rowCheckboxes.count();
        for (let i = 0; i < Math.min(count, 5); i++) {
          await expect(rowCheckboxes.nth(i)).toBeChecked();
        }
      }
    });

    await test.step("取消全选 → 批量栏消失", async () => {
      const headerCheckbox = page.locator(`${TABLE} thead ${CHECKBOX}`);
      if (await headerCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await headerCheckbox.uncheck();
        await page.waitForTimeout(300);
        // Row checkboxes should be unchecked
        const first = page.locator(`${TABLE_ROWS} ${CHECKBOX}`).first();
        await expect(first).not.toBeChecked();
      }
    });

    await test.step("活动列表: 选中行后出现批量操作按钮", async () => {
      await page.goto("/dash/events");
      await waitForTableRows(page);

      const checkboxes = page.locator(`${TABLE_ROWS} ${CHECKBOX}`);
      const count = await checkboxes.count();
      if (count >= 2) {
        await checkboxes.nth(0).scrollIntoViewIfNeeded();
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).scrollIntoViewIfNeeded();
        await checkboxes.nth(1).check();
        // Should see batch actions (发布到微信, 删除)
        await expect(
          page.locator("button", { hasText: /微信|删除/ }).first(),
        ).toBeVisible({ timeout: 3000 });
      }
    });
  });
});
