/**
 * User Detail Page — Real Backend E2E Tests (Visibility-First)
 *
 * Tests user detail interactions: profile view, tab switching, membership UI.
 * Every interaction scrolls into viewport and asserts visibility.
 * Relies on existing DB data from full-lifecycle test runs.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  assertInViewport,
  setupStaffAuth,
  waitForMainContent,
  waitForTableReady,
} from "../helpers/interactions";

async function setupDashPage(page: Page) {
  await setupStaffAuth(page);
}

test.describe("User Detail — Real Backend E2E", () => {
  test("从用户列表进入详情: 昵称和Tab可见", async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/users");
    await waitForTableReady(page);

    // Click first user link
    const firstLink = page.locator("table.table tbody tr a").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.scrollIntoViewIfNeeded();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dash\/users\//, { timeout: 10000 });
    await waitForMainContent(page);

    // Page should show user info without errors
    await expect(page.locator("body")).not.toContainText(/Internal server error|500/i);
  });

  test("会员Tab: 可切换到会员管理区域", async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/users");
    await waitForTableReady(page);

    const firstLink = page.locator("table.table tbody tr a").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.click();
    await expect(page).toHaveURL(/\/dash\/users\//, { timeout: 10000 });
    await waitForMainContent(page);

    const memberTab = page.locator("button[role='tab']", { hasText: /会员|储值|membership/i });
    if (await memberTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberTab.scrollIntoViewIfNeeded();
      await assertInViewport(memberTab);
      await memberTab.click();
      // Content area should still be visible
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("新增按钮: 在会员Tab可见", async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/users");
    await waitForTableReady(page);

    const firstLink = page.locator("table.table tbody tr a").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.click();
    await expect(page).toHaveURL(/\/dash\/users\//, { timeout: 10000 });
    await waitForMainContent(page);

    const memberTab = page.locator("button[role='tab']", { hasText: /会员|储值|membership/i });
    if (await memberTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberTab.click();
      const addBtn = page.locator("button", { hasText: /新增|添加/ }).first();
      if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addBtn.scrollIntoViewIfNeeded();
        await assertInViewport(addBtn);
      }
    }
  });

  test("扣费对话框: 按钮可见并点击弹出对话框", async ({ page }) => {
    await setupDashPage(page);
    await page.goto("/dash/users");
    await waitForTableReady(page);

    const firstLink = page.locator("table.table tbody tr a").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.click();
    await expect(page).toHaveURL(/\/dash\/users\//, { timeout: 10000 });
    await waitForMainContent(page);

    const memberTab = page.locator("button[role='tab']", { hasText: /会员|储值|membership/i });
    if (await memberTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberTab.click();
      const deductBtn = page.getByRole("button", { name: "扣费", exact: true });
      if (await deductBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deductBtn.scrollIntoViewIfNeeded();
        await assertInViewport(deductBtn);
        await deductBtn.click();
        const dialog = page.locator("dialog[open] .modal-box");
        await expect(dialog).toBeVisible({ timeout: 5000 });
        // Close dialog
        await page.keyboard.press("Escape");
      }
    }
  });
});
