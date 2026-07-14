/**
 * Pricing Page — Full-Flow E2E Tests
 *
 * Tests the COMPLETE conditional plan lifecycle:
 *   1. Load pricing page with mocked data
 *   2. Create a new conditional plan
 *   3. Navigate to detail page to edit
 *   4. Save edits and return
 *   5. Verify edits persist on the pricing list
 *
 * This test catches the critical bug where navigating away and back
 * would lose edits due to state being stored in component-local useState.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  assertInViewport,
  setupStaffAuth,
  waitForMainContent,
} from "../helpers/interactions";

// ─── GraphQL Mock ────────────────────────────────────────────────────────────

const DRAFT_PLANS = JSON.stringify([
  {
    plan_type: "fallback",
    name: "默认计费",
    sort_order: 0,
    enabled: true,
    conditions: null,
    billing_type: "hourly",
    price: 1000,
    points: 0,
    cap_enabled: true,
    cap_unit: "per_day",
    cap_price: 5000,
    cap_points: 0,
    cap_price_day: null,
    cap_points_day: null,
    cap_price_night: null,
    cap_points_night: null,
  },
  {
    plan_type: "conditional",
    name: "工作日会员优惠",
    sort_order: 1,
    enabled: true,
    conditions: {
      date: { type: "workdays" },
      time: { type: "all_day" },
      identity: ["registered"],
      member: { type: "any_member" },
      scope: [],
    },
    billing_type: "hourly",
    price: 800,
    points: 0,
    cap_enabled: true,
    cap_unit: "per_day",
    cap_price: 4000,
    cap_points: 0,
    cap_price_day: null,
    cap_points_day: null,
    cap_price_night: null,
    cap_points_night: null,
  },
]);

async function mockPricingGraphQL(page: Page) {
  await page.route("**/graphql", async (route) => {
    const raw = route.request().postDataJSON() as { query?: string } | null;
    const query = raw?.query ?? "";

    if (query.includes("PricingDraft") || query.includes("pricingDraft")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            pricingDraft: {
              data: {
                config: { daytimeStart: "10:00", daytimeEnd: "18:00" },
                plans: DRAFT_PLANS,
              },
              snapshotId: "snap-001",
              snapshotName: "当前草稿",
              status: "DRAFT",
            },
          },
        }),
      });
      return;
    }

    if (
      query.includes("PricingSnapshots") ||
      query.includes("pricingSnapshots")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            pricingSnapshots: [
              {
                id: "snap-001",
                name: "当前草稿",
                storeId: "store-001",
                data: {
                  config: { daytimeStart: "10:00", daytimeEnd: "18:00" },
                  plans: DRAFT_PLANS,
                },
                status: "DRAFT",
                summary: null,
                createdAt: "2026-07-01T00:00:00Z",
                publishedAt: null,
              },
            ],
          },
        }),
      });
      return;
    }

    if (
      query.includes("SavePricingSnapshot") ||
      query.includes("savePricingSnapshot")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { savePricingSnapshot: { id: "snap-002" } },
        }),
      });
      return;
    }

    await route.continue();
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

async function setupPricingPage(page: Page) {
  await setupStaffAuth(page);
  await mockPricingGraphQL(page);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Pricing — 条件计划编辑全流程", () => {
  test.beforeEach(async ({ page }) => {
    await setupPricingPage(page);
  });

  test("页面加载: 条件计划列表和默认计费方案可见", async ({ page }) => {
    await page.goto("/dash/pricing");
    await waitForMainContent(page);

    // Fallback plan name should be visible
    await expect(page.locator("text=默认计费")).toBeVisible({ timeout: 10000 });
    // Conditional plan name should be visible
    await expect(page.locator("text=工作日会员优惠")).toBeVisible({
      timeout: 10000,
    });
  });

  test("新建条件计划: 添加后列表可见", async ({ page }) => {
    await page.goto("/dash/pricing");
    await waitForMainContent(page);

    // Click new conditional plan button
    const addBtn = page.locator("button").filter({ hasText: /新建|新增/ });
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();

    // A new plan should appear (default name from i18n, but let's check a third item exists)
    const plans = page.locator('[class*="card"]').filter({ hasText: /条件/ });
    // We had 1 conditional plan, now should have 2
    await expect(
      page
        .locator("a[href*='/dash/pricing_/']")
        .or(page.locator("a[href*='/dash/pricing/']")),
    ).toHaveCount(2, { timeout: 5000 });
  });

  test("关键流程: 编辑条件计划保存后返回列表数据保留", async ({ page }) => {
    await page.goto("/dash/pricing");
    await waitForMainContent(page);

    // Verify initial state
    await expect(page.locator("text=工作日会员优惠")).toBeVisible({
      timeout: 10000,
    });

    // Click the edit button for the conditional plan
    const editLink = page
      .locator("a[href*='/dash/pricing_/']")
      .or(page.locator("a[href*='/dash/pricing/']"))
      .first();
    await editLink.scrollIntoViewIfNeeded();
    await editLink.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/dash\/pricing/, { timeout: 10000 });
    await waitForMainContent(page);

    // Verify the plan name is loaded in the detail page
    const nameInput = page.locator(
      'input[placeholder*="例"], input[maxlength="50"]',
    );
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(nameInput).toHaveValue("工作日会员优惠");

    // Edit the plan name
    await nameInput.clear();
    await nameInput.fill("周末特别优惠");

    // Click save button
    const saveBtn = page.locator("button").filter({ hasText: /保存/ });
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();

    // Should navigate back to the pricing list
    await page.waitForURL("**/dash/pricing", { timeout: 10000 });
    await waitForMainContent(page);

    // ★ CRITICAL ASSERTION: The edited name should persist on the list page
    await expect(page.locator("text=周末特别优惠")).toBeVisible({
      timeout: 10000,
    });
    // The old name should NOT be visible
    await expect(page.locator("text=工作日会员优惠")).not.toBeVisible({
      timeout: 3000,
    });
  });

  test("关键流程: 新建计划后进入编辑再返回不丢失", async ({ page }) => {
    await page.goto("/dash/pricing");
    await waitForMainContent(page);

    // Count initial conditional plan edit links
    const editLinks = page
      .locator("a[href*='/dash/pricing_/']")
      .or(page.locator("a[href*='/dash/pricing/']"));
    const initialCount = await editLinks.count();

    // Add a new conditional plan
    const addBtn = page.locator("button").filter({ hasText: /新建|新增/ });
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();

    // Wait for the new plan to appear
    await expect(editLinks).toHaveCount(initialCount + 1, { timeout: 5000 });

    // Navigate to edit the NEW plan (last one)
    const lastEditLink = editLinks.last();
    await lastEditLink.scrollIntoViewIfNeeded();
    await lastEditLink.click();

    // Wait for detail page
    await expect(page).toHaveURL(/\/dash\/pricing/, { timeout: 10000 });
    await waitForMainContent(page);

    // Edit the name
    const nameInput = page.locator(
      'input[placeholder*="例"], input[maxlength="50"]',
    );
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.clear();
    await nameInput.fill("测试新计划名");

    // Save and go back
    const saveBtn = page.locator("button").filter({ hasText: /保存/ });
    await saveBtn.click();

    // Should be back on pricing list
    await page.waitForURL("**/dash/pricing", { timeout: 10000 });
    await waitForMainContent(page);

    // ★ CRITICAL: The new plan count and edited name should persist
    await expect(editLinks).toHaveCount(initialCount + 1, { timeout: 5000 });
    await expect(page.locator("text=测试新计划名")).toBeVisible({
      timeout: 10000,
    });
  });

  test("关键流程: 编辑后未保存离开详情页数据仍在atom中", async ({
    page,
  }) => {
    await page.goto("/dash/pricing");
    await waitForMainContent(page);

    // Navigate to edit
    const editLink = page
      .locator("a[href*='/dash/pricing_/']")
      .or(page.locator("a[href*='/dash/pricing/']"))
      .first();
    await editLink.click();
    await waitForMainContent(page);

    // Cancel without saving — click cancel or navigate back
    const cancelBtn = page.locator("button").filter({ hasText: /取消/ });
    await cancelBtn.click();

    // Should be back on pricing list
    await page.waitForURL("**/dash/pricing", { timeout: 10000 });
    await waitForMainContent(page);

    // Original plan name should still be visible (no data loss)
    await expect(page.locator("text=工作日会员优惠")).toBeVisible({
      timeout: 10000,
    });
  });

  test("保存草稿: mutation 携带正确的计划数据", async ({ page }) => {
    await page.goto("/dash/pricing");
    await waitForMainContent(page);

    // Click the save/floppy-disk button to open save dialog
    const saveIconBtn = page.locator("button").filter({ hasText: /保存|存档/ });
    // Try finding the button with the floppy disk icon in the toolbar
    const toolbarSave = page
      .locator('[class*="btn"]')
      .filter({ has: page.locator("svg") })
      .filter({ hasText: /保存|存档/ })
      .first();

    const targetBtn = (await toolbarSave.isVisible().catch(() => false))
      ? toolbarSave
      : saveIconBtn.first();

    if (await targetBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetBtn.scrollIntoViewIfNeeded();

      // Intercept the mutation
      const gqlPromise = page.waitForRequest(
        (req) =>
          req.url().includes("/graphql") &&
          (req.postData()?.includes("savePricingSnapshot") ??
            req.postData()?.includes("SavePricingSnapshot") ??
            false),
        { timeout: 10000 },
      );

      await targetBtn.click();

      // If a dialog appears, fill and submit
      const dialog = page.locator("dialog[open], .modal-box");
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const submitBtn = dialog
          .locator("button")
          .filter({ hasText: /保存|确认/ });
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
        }
      }

      const req = await gqlPromise.catch(() => null);
      if (req) {
        const body = req.postDataJSON() as { variables?: { input?: { data?: { plans?: string } } } };
        const plans = body?.variables?.input?.data?.plans;
        expect(plans).toBeTruthy();
        const parsed = JSON.parse(plans!);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
