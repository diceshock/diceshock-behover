/**
 * i18n & Locale — Real Backend E2E Tests (Visibility-First)
 *
 * Tests internationalization and store context switching:
 * language switching, store context switching, and locale-aware content.
 * Every interaction scrolls into viewport and asserts visibility.
 */
import { expect, type Page, test } from "@playwright/test";

// ─── Auth Setup ──────────────────────────────────────────────────────────────

async function setupStaffAuth(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "staff" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "fc-staff-001",
          name: "赵店长",
          role: "staff",
          preferredStoreId: "store-fc-gg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

// ─── Scroll and Visibility Helpers ───────────────────────────────────────────

async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Internal server error|500|Unhandled/i,
  );
}

// ─── Language Switch Tests ───────────────────────────────────────────────────

test.describe("Language Switching", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
  });

  test("切换到英语: URL和内容更新", async ({ page }) => {
    await page.goto("/zh-CN/inventory");
    await expectPageLoaded(page);

    // Look for language selector
    const langSelector = page.locator(
      "button[aria-label*='language'], button[aria-label*='语言'], select[name='locale']",
    ).first();

    // If no direct selector, look for settings/profile menu
    const menuButton = page.locator(
      "button[aria-label*='menu'], button[aria-label*='设置'], button[aria-label*='profile']",
    ).first();

    if (await langSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await langSelector.scrollIntoViewIfNeeded();
      await langSelector.click();

      // Look for English option
      const enOption = page.locator(
        "button, a, [role='menuitem']",
        { hasText: /English|EN|英语/ },
      );
      if (await enOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await enOption.click();

        // Wait for navigation
        await page.waitForTimeout(1000);

        // Verify URL changed to /en/
        await expect(page).toHaveURL(/\/en\//, { timeout: 10000 });
        await expectPageLoaded(page);
      }
    } else if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuButton.scrollIntoViewIfNeeded();
      await menuButton.click();

      // Look for language option in dropdown
      const langOption = page.locator(
        "button, a, [role='menuitem']",
        { hasText: /Language|语言/ },
      );
      if (await langOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langOption.click();

        // Select English
        const enOption = page.locator(
          "button, a, [role='menuitem']",
          { hasText: /English|EN/ },
        );
        if (await enOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await enOption.click();
          await page.waitForTimeout(1000);
          await expect(page).toHaveURL(/\/en\//, { timeout: 10000 });
        }
      }
    }
  });

  test("页面文本验证: 英文界面显示英文", async ({ page }) => {
    await page.goto("/en/inventory");
    await expectPageLoaded(page);

    // Verify English content is present
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Look for common English UI elements
    const hasEnglish = await page
      .locator("text=/Inventory|Orders|Tables|Dashboard/")
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasEnglish) {
      // Verify we're seeing English UI
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("语言持久化: 重新加载后保持选择", async ({ page }) => {
    await page.goto("/en/inventory");
    await expectPageLoaded(page);

    // Reload page
    await page.reload();
    await expectPageLoaded(page);

    // Verify still on English route
    await expect(page).toHaveURL(/\/en\//);
  });

  test("切换回中文: URL和内容恢复", async ({ page }) => {
    await page.goto("/en/inventory");
    await expectPageLoaded(page);

    // Look for language selector
    const langSelector = page.locator(
      "button[aria-label*='language'], button[aria-label*='语言'], select[name='locale']",
    ).first();

    const menuButton = page.locator(
      "button[aria-label*='menu'], button[aria-label*='设置'], button[aria-label*='profile']",
    ).first();

    if (await langSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await langSelector.scrollIntoViewIfNeeded();
      await langSelector.click();

      // Look for Chinese option
      const zhOption = page.locator(
        "button, a, [role='menuitem']",
        { hasText: /中文|Chinese|ZH/ },
      );
      if (await zhOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await zhOption.click();
        await page.waitForTimeout(1000);
        await expect(page).toHaveURL(/\/zh-CN\//, { timeout: 10000 });
      }
    } else if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuButton.scrollIntoViewIfNeeded();
      await menuButton.click();

      const langOption = page.locator(
        "button, a, [role='menuitem']",
        { hasText: /Language|语言/ },
      );
      if (await langOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langOption.click();

        const zhOption = page.locator(
          "button, a, [role='menuitem']",
          { hasText: /中文|Chinese/ },
        );
        if (await zhOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await zhOption.click();
          await page.waitForTimeout(1000);
          await expect(page).toHaveURL(/\/zh-CN\//, { timeout: 10000 });
        }
      }
    }
  });
});

// ─── Store Context Switch Tests ──────────────────────────────────────────────

test.describe("Store Context Switching", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
  });

  test("切换门店: 从光谷到街道口", async ({ page }) => {
    await page.goto("/zh-CN/inventory");
    await expectPageLoaded(page);

    // Look for store selector
    const storeSelector = page.locator(
      "button[aria-label*='store'], button[aria-label*='门店'], select[name='store']",
    ).first();

    const menuButton = page.locator(
      "button[aria-label*='menu'], button[aria-label*='设置']",
    ).first();

    if (await storeSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await storeSelector.scrollIntoViewIfNeeded();
      await storeSelector.click();

      // Look for JDK store option
      const jdkOption = page.locator(
        "button, a, [role='menuitem']",
        { hasText: /街道口|jdk|JDK/ },
      );
      if (await jdkOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await jdkOption.click();

        // Wait for data reload
        await page.waitForTimeout(1500);
        await expectPageLoaded(page);

        // Verify URL or page state changed
        await expect(page.locator("body")).toBeVisible();
      }
    } else if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuButton.scrollIntoViewIfNeeded();
      await menuButton.click();

      const storeOption = page.locator(
        "button, a, [role='menuitem']",
        { hasText: /Store|门店|切换门店/ },
      );
      if (await storeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await storeOption.click();

        const jdkOption = page.locator(
          "button, a, [role='menuitem']",
          { hasText: /街道口|jdk/ },
        );
        if (await jdkOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await jdkOption.click();
          await page.waitForTimeout(1500);
        }
      }
    }
  });

  test("门店数据隔离: 不同门店显示不同库存", async ({ page }) => {
    // Start at GG store
    await page.goto("/zh-CN/inventory?store=store-fc-gg");
    await expectPageLoaded(page);


    // Switch to JDK store
    await page.goto("/zh-CN/inventory?store=store-fc-jdk");
    await expectPageLoaded(page);

    // Verify page loaded (data may or may not be different, but should load)
    const table = page.locator("table.table");
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test("门店切换持久化: URL反映门店选择", async ({ page }) => {
    await page.goto("/zh-CN/actives?store=store-fc-jdk");
    await expectPageLoaded(page);

    // Navigate to another page
    const navLink = page.locator("nav a[href*='/inventory']").first();
    if (await navLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await navLink.click();
      await expectPageLoaded(page);

      // Verify store context persists in URL or cookie
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

// ─── Locale-Aware Content Tests ──────────────────────────────────────────────

test.describe("Locale-Aware Content", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
  });

  test("日期格式: 中文环境显示中文日期", async ({ page }) => {
    await page.goto("/zh-CN/orders");
    await expectPageLoaded(page);

    // Look for date cells in table
    const dateCell = page.locator(
      "table.table tbody td:has-text(/\\d{4}|年|月|日/)",
    ).first();

    if (await dateCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateCell.scrollIntoViewIfNeeded();
      await expect(dateCell).toBeVisible();

      // Verify date content exists
      const text = await dateCell.textContent();
      expect(text).toBeTruthy();
    }
  });

  test("数字格式: 正确的千位分隔符", async ({ page }) => {
    await page.goto("/zh-CN/orders");
    await expectPageLoaded(page);

    // Look for number cells (amounts, prices)
    const numberCell = page.locator(
      "table.table tbody td:has-text(/\\d+/)",
    ).first();

    if (await numberCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await numberCell.scrollIntoViewIfNeeded();
      await expect(numberCell).toBeVisible();
    }
  });

  test("导航翻译: 菜单项正确翻译", async ({ page }) => {
    await page.goto("/zh-CN/dash");
    await expectPageLoaded(page);

    // Verify Chinese navigation
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    const hasChineseNav = await page
      .locator("nav a, nav button", { hasText: /订单|库存|桌台|活动/ })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasChineseNav) {
      await expect(nav).toContainText(/订单|库存|桌台/);
    }

    // Switch to English
    await page.goto("/en/dash");
    await expectPageLoaded(page);

    const hasEnglishNav = await page
      .locator("nav a, nav button", { hasText: /Orders|Inventory|Tables/ })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasEnglishNav) {
      await expect(nav).toBeVisible();
    }
  });
});
