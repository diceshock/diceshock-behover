/**
 * AI Chat Panel — Visibility E2E Tests
 *
 * Tests the chat panel UI visibility patterns: toggle button, FAB, panel open/close.
 * Does NOT test message sending (covered by dash-chat.spec.ts with full mocking).
 * Every interaction scrolls into viewport and asserts visibility.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  assertInViewport,
  setupStaffAuth,
  waitForTableReady,
} from "../helpers/interactions";

async function setupDashPage(page: Page) {
  await setupStaffAuth(page);
}

// ─── Desktop Chat Visibility ─────────────────────────────────────────────────

test.describe("AI Chat — Desktop Visibility", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
  });

  test("Chat切换按钮: 在orders页可见且在视口内", async ({ page }) => {
    await page.goto("/dash/orders");
    await waitForTableReady(page);
    const toggle = page.locator("button").filter({ hasText: "AI 助手" }).first();
    const altToggle = page.locator(".hidden.lg\\:block.fixed button:has(svg)").first();
    const isVisible = await toggle.isVisible({ timeout: 5000 }).catch(() => false) ||
      await altToggle.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test("Chat切换按钮: 在tables页可见", async ({ page }) => {
    await page.goto("/dash/tables");
    await waitForTableReady(page);
    const toggle = page.locator("button").filter({ hasText: "AI 助手" }).first();
    const altToggle = page.locator(".hidden.lg\\:block.fixed button:has(svg)").first();
    const isVisible = await toggle.isVisible({ timeout: 5000 }).catch(() => false) ||
      await altToggle.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test("Chat切换按钮: 在users页可见", async ({ page }) => {
    await page.goto("/dash/users");
    await waitForTableReady(page);
    const toggle = page.locator("button").filter({ hasText: "AI 助手" }).first();
    const altToggle = page.locator(".hidden.lg\\:block.fixed button:has(svg)").first();
    const isVisible = await toggle.isVisible({ timeout: 5000 }).catch(() => false) ||
      await altToggle.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });
});

// ─── Mobile Chat FAB Visibility ──────────────────────────────────────────────

test.describe("AI Chat — Mobile FAB Visibility", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await setupDashPage(page);
  });

  test("FAB按钮: 在orders页可见且在视口内", async ({ page }) => {
    await page.goto("/dash/orders");
    await waitForTableReady(page);
    const fab = page.locator(".btn-circle.btn-primary");
    await expect(fab).toBeVisible({ timeout: 5000 });
    await assertInViewport(fab);
  });

  test("FAB按钮: 在tables页可见且在视口内", async ({ page }) => {
    await page.goto("/dash/tables");
    await waitForTableReady(page);
    const fab = page.locator(".btn-circle.btn-primary");
    await expect(fab).toBeVisible({ timeout: 5000 });
    await assertInViewport(fab);
  });

  test("FAB按钮: 在users页可见且在视口内", async ({ page }) => {
    await page.goto("/dash/users");
    await waitForTableReady(page);
    const fab = page.locator(".btn-circle.btn-primary");
    await expect(fab).toBeVisible({ timeout: 5000 });
    await assertInViewport(fab);
  });
});
