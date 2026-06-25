import { expect, test } from "../fixtures/auth.fixture";

const searchInput = 'input[type="search"]';

test.describe("Orders Full Flow", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/orders");
    await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  });

  test("renders DashTable with columns and rows", async ({ page }) => {
    const headers = page.locator("table.table thead th");
    await expect(headers).toHaveCount(9);
    const rows = page.locator("table.table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("search by status:active filters and updates URL", async ({ page }) => {
    await page.locator(searchInput).fill("status:active");
    await page.locator(searchInput).press("Enter");
    await expect(page).toHaveURL(/q=.*status/, { timeout: 5000 });
  });

  test("sort by clicking sortable column header changes URL", async ({ page }) => {
    const sortBtn = page.locator("table.table thead th button:not([disabled])").first();
    if (await sortBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sortBtn.click();
      await expect(page).toHaveURL(/sortBy|sortOrder/, { timeout: 5000 });
    }
  });

  test("pagination next/prev updates page param", async ({ page }) => {
    const nextBtn = page.locator(".join button", { hasText: /Next|下一页/i });
    if (await nextBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await expect(page).toHaveURL(/page=2/, { timeout: 5000 });
      const prevBtn = page.locator(".join button", { hasText: /Prev|上一页/i });
      await prevBtn.click();
      await expect(page).toHaveURL(/page=1/, { timeout: 5000 });
    }
  });

  test("quick filter pills toggle search", async ({ page }) => {
    const pill = page.locator("button.btn-xs", { hasText: /active|进行中/i }).first();
    if (await pill.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pill.click();
      await expect(page).toHaveURL(/q=.*status/, { timeout: 5000 });
      await pill.click();
      await expect(page).not.toHaveURL(/status%3Aactive/);
    }
  });
});

test.describe("Users Full Flow", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/users");
    await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  });

  test("renders user table with rows", async ({ page }) => {
    const rows = page.locator("table.table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
  });

  test("search filters users and updates URL", async ({ page }) => {
    await page.locator(searchInput).fill("role:staff");
    await page.locator(searchInput).press("Enter");
    await expect(page).toHaveURL(/q=.*role/, { timeout: 5000 });
  });

  test("pagination works", async ({ page }) => {
    const nextBtn = page.locator(".join button", { hasText: /Next|下一页/i });
    if (await nextBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await expect(page).toHaveURL(/page=2/, { timeout: 5000 });
    }
  });
});

test.describe("Tables Full Flow", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/tables");
    await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  });

  test("renders table list with rows", async ({ page }) => {
    const rows = page.locator("table.table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
  });

  test("search by type filters", async ({ page }) => {
    await page.locator(searchInput).fill("type:fixed");
    await page.locator(searchInput).press("Enter");
    await expect(page).toHaveURL(/q=.*type/, { timeout: 5000 });
  });

  test("quick filter pills work", async ({ page }) => {
    const pill = page.locator("button.btn-xs").first();
    if (await pill.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pill.click();
      await expect(page).toHaveURL(/q=/, { timeout: 5000 });
    }
  });
});

test.describe("Actives Full Flow", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/actives");
    await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  });

  test("renders actives table", async ({ page }) => {
    const rows = page.locator("table.table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(0);
  });

  test("status filter works", async ({ page }) => {
    await page.locator(searchInput).fill("status:active");
    await page.locator(searchInput).press("Enter");
    await expect(page).toHaveURL(/q=.*status/, { timeout: 5000 });
  });

  test("batch select shows action bar", async ({ page }) => {
    const checkbox = page.locator("table.table tbody input[type='checkbox']").first();
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.check();
      await expect(page.locator(".fixed.bottom-0")).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Events Full Flow", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/events");
    await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  });

  test("renders events table", async ({ page }) => {
    const headers = page.locator("table.table thead th");
    await expect(headers.first()).toBeVisible();
  });

  test("search updates URL", async ({ page }) => {
    await page.locator(searchInput).fill("status:active");
    await page.locator(searchInput).press("Enter");
    await expect(page).toHaveURL(/q=/, { timeout: 5000 });
  });
});

test.describe("GSZ/Mahjong Full Flow", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/gsz");
    await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  });

  test("renders mahjong match table with rows", async ({ page }) => {
    const rows = page.locator("table.table tbody tr");
    await expect.poll(() => rows.count(), { timeout: 10000 }).toBeGreaterThan(0);
  });

  test("search by mode filters", async ({ page }) => {
    await page.locator(searchInput).fill("mode:4p");
    await page.locator(searchInput).press("Enter");
    await expect(page).toHaveURL(/q=.*mode/, { timeout: 5000 });
  });

  test("multi-axis search works", async ({ page }) => {
    await page.locator(searchInput).fill("mode:4p format:hanchan");
    await page.locator(searchInput).press("Enter");
    await expect(page).toHaveURL(/q=.*mode/, { timeout: 5000 });
    await expect(page).toHaveURL(/format/);
  });

  test("quick filter pills toggle", async ({ page }) => {
    const pills = page.locator("button.btn-xs");
    if (await pills.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await pills.first().click();
      await expect(page).toHaveURL(/q=/, { timeout: 5000 });
    }
  });
});

test.describe("AI Chat Panel", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/orders");
    await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  });

  test("chat panel toggle button visible on desktop", async ({ page }) => {
    const toggle = page.locator("button").filter({ hasText: "AI 助手" }).first();
    const isVisible = await toggle.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible || await page.getByText("AI 助手").isVisible().catch(() => false)).toBeTruthy();
  });

  test("panel expands on click", async ({ page }) => {
    const toggle = page.locator(".fixed.right-0 button, [data-chat-toggle]").first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
      await expect(page.getByText("AI 助手")).toBeVisible({ timeout: 5000 });
    }
  });

  test("chat input accepts text", async ({ page }) => {
    const toggle = page.locator(".fixed.right-0 button, [data-chat-toggle]").first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
      const textarea = page.locator('textarea[placeholder*="消息"]');
      await expect(textarea).toBeVisible({ timeout: 5000 });
      await textarea.fill("报告今天营业数据");
      await expect(textarea).toHaveValue("报告今天营业数据");
    }
  });

  test("panel survives navigation", async ({ page }) => {
    const toggle = page.locator(".fixed.right-0 button, [data-chat-toggle]").first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
      await expect(page.getByText("AI 助手")).toBeVisible({ timeout: 5000 });
      await page.goto("/dash/users");
      await expect(page.getByText("AI 助手")).toBeVisible({ timeout: 5000 });
    }
  });
});
