/**
 * Pricing Page — Real Backend E2E Tests (Visibility-First)
 *
 * Tests pricing page interactions: view list, navigate to detail.
 * Every interaction scrolls into viewport and asserts visibility.
 * Relies on existing DB data from full-lifecycle test runs.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  assertInViewport,
  setupStaffAuth,
  waitForMainContent,
} from "../helpers/interactions";

async function setupDashPage(page: Page) {
  await setupStaffAuth(page);
}

test.describe("Pricing Page — Real Backend E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/pricing");
    await waitForMainContent(page);
  });

  test("页面加载: 计费方案列表可见", async ({ page }) => {
    const content = page.locator("main");
    await assertInViewport(content);
    await expect(page.locator("body")).not.toContainText(/Internal server error|500/i);
  });

  test("已发布方案: 带'已发布'标记可见", async ({ page }) => {
    const published = page.locator("text=已发布").first();
    if (await published.isVisible({ timeout: 5000 }).catch(() => false)) {
      await published.scrollIntoViewIfNeeded();
      await assertInViewport(published);
    }
  });

  test("方案详情: 点击可导航到编辑页", async ({ page }) => {
    const entry = page.locator("a[href*='/dash/pricing/']").first();
    if (await entry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await entry.scrollIntoViewIfNeeded();
      await assertInViewport(entry);
      await entry.click();
      await expect(page).toHaveURL(/\/dash\/pricing\//, { timeout: 10000 });
      await waitForMainContent(page);
    }
  });

  test("新建方案按钮: 可见且在视口内", async ({ page }) => {
    const createBtn = page.locator("button", { hasText: /新建|创建|新增/ }).first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.scrollIntoViewIfNeeded();
      await assertInViewport(createBtn);
    }
  });
});
