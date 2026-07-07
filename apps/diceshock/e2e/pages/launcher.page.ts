/**
 * Launcher Page Object — encapsulates all launcher dialog interactions.
 *
 * Responsibilities:
 * - Multi-user auth setup (admin, staff, customer)
 * - Opening/closing the launcher (hotkey, click, Esc, backdrop)
 * - Mode transitions (search → field-select → operator-select → value-input)
 * - Applying filters (kv, option, boolean, sort, group, date)
 * - Detail page navigation (click-through from table rows)
 * - Chart/view assertions (settle page ECharts)
 * - URL assertion helpers
 * - Navigation with retry
 */
import { expect, type Locator, type Page } from "@playwright/test";

export class LauncherPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly input: Locator;
  readonly listArea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator("[data-testid='launcher-dialog']");
    this.input = this.dialog.locator("input[type='text']");
    this.listArea = this.dialog.locator(".overflow-y-auto");
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async setupAdmin() {
    await this.page.route("/api/auth/session", async (route) => {
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
    await this.page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  /** Navigate to a dash route with retry (handles workerd restarts). */
  async goto(route: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.page.goto(route, { timeout: 15000 });
        await this.waitForTable();
        return;
      } catch {
        if (attempt === 2)
          throw new Error(`Failed to navigate to ${route} after 3 attempts`);
        await this.page.waitForTimeout(2000);
      }
    }
  }

  async waitForTable() {
    await this.page.waitForSelector(
      "table, [data-testid='infinite-table']",
      { timeout: 10000 },
    );
  }

  // ─── Open / Close ──────────────────────────────────────────────────────────

  async open() {
    await this.page.keyboard.press("Control+k");
    await expect(this.dialog).toBeVisible({ timeout: 3000 });
  }

  async openViaClick() {
    const trigger = this.page.locator("button", { hasText: "搜索…" });
    await trigger.click();
    await expect(this.dialog).toBeVisible({ timeout: 3000 });
  }

  async close() {
    await this.page.keyboard.press("Escape");
    await expect(this.dialog).not.toBeVisible({ timeout: 2000 });
  }

  async closeViaBackdrop() {
    await this.dialog.click({ position: { x: 10, y: 10 } });
    await expect(this.dialog.locator(".max-w-lg")).not.toBeVisible({
      timeout: 2000,
    });
  }

  // ─── Mode Transitions ──────────────────────────────────────────────────────

  /** Enter field-select mode (filter menu). */
  async enterFilterMenu() {
    const filterBtn = this.dialog.locator("button[title='筛选器']");
    await filterBtn.click();
  }

  /** Return to search mode from field-select. */
  async exitFilterMenu() {
    const backBtn = this.dialog.locator("button[title='返回搜索']");
    await backBtn.click();
  }

  // ─── Item Selection ────────────────────────────────────────────────────────

  /** Click a menu item by visible label text. */
  async selectItem(label: string) {
    const item = this.listArea
      .locator("[role='option'], div")
      .filter({ hasText: label })
      .first();
    await item.click();
  }

  /** Navigate items with arrow keys and select. */
  async selectByArrows(presses: number) {
    for (let i = 0; i < presses; i++) {
      await this.page.keyboard.press("ArrowDown");
    }
    await this.page.keyboard.press("Enter");
  }

  // ─── Filter Application ────────────────────────────────────────────────────

  /**
   * Apply a text (kv) filter:
   * open → field-select → pick field → pick operator → type value → submit → navigate.
   */
  async applyKvFilter(fieldLabel: string, value: string, operator?: string) {
    await this.open();
    await this.enterFilterMenu();
    await this.selectItem(fieldLabel);
    // Now in operator-select mode: click the operator item
    await this.page.waitForTimeout(200);
    if (operator) {
      await this.selectItem(operator);
    } else {
      // Click first operator in the list (usually "等于" or "包含")
      await this.listArea.locator("[role='option'], div[class*='cursor-pointer']").first().click();
    }
    await this.page.waitForTimeout(200);
    // Now in value-input mode — input is editable
    await this.input.fill(value);
    await this.page.keyboard.press("Enter"); // add filter
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter"); // navigate
    await this.page.waitForTimeout(300);
  }

  /**
   * Apply an option/enum filter:
   * open → field-select → pick field → pick operator (Enter) → pick option → navigate.
   */
  async applyOptionFilter(fieldLabel: string, optionLabel: string) {
    await this.open();
    await this.enterFilterMenu();
    await this.selectItem(fieldLabel);
    // operator-select: click first operator
    await this.page.waitForTimeout(200);
    await this.listArea.locator("[role='option'], div[class*='cursor-pointer']").first().click();
    await this.page.waitForTimeout(200);
    // Now in value-input mode with options listed
    await this.selectItem(optionLabel);
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter"); // navigate
    await this.page.waitForTimeout(300);
  }

  /** Apply a boolean filter (direct toggle). */
  async applyBooleanFilter(fieldLabel: string) {
    await this.open();
    await this.enterFilterMenu();
    await this.selectItem(fieldLabel);
    // Boolean skips operator-select, goes to value-input with "是"/"否"
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter"); // select "是" → adds filter
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter"); // navigate
    await this.page.waitForTimeout(300);
  }

  /**
   * Apply a sort filter:
   * open → field-select → pick "排序" → pick sort field → navigate.
   */
  async applySort(sortLabel: string, fieldLabel: string) {
    await this.open();
    await this.enterFilterMenu();
    await this.selectItem(sortLabel);
    await this.selectItem(fieldLabel);
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter"); // navigate
    await this.page.waitForTimeout(300);
  }

  /**
   * Apply a group filter:
   * open → field-select → pick "分组" → pick group field → navigate.
   */
  async applyGroup(groupLabel: string, fieldLabel: string) {
    await this.open();
    await this.enterFilterMenu();
    await this.selectItem(groupLabel);
    await this.selectItem(fieldLabel);
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter"); // navigate
    await this.page.waitForTimeout(300);
  }

  /** Open date filter panel: open → field-select → pick date field → pick "range" operator. */
  async openDateFilter(fieldLabel: string) {
    await this.open();
    await this.enterFilterMenu();
    await this.selectItem(fieldLabel);
    // Date fields go to operator-select; pick "区间" (range) to show date picker
    await this.page.waitForTimeout(200);
    await this.selectItem("区间");
  }

  /** Fill date range and submit. */
  async fillDateRange(from: string, to: string) {
    const dateInputs = this.dialog.locator("input[type='date']");
    await dateInputs.nth(0).fill(from);
    await dateInputs.nth(1).fill(to);
    const confirmBtn = this.dialog.locator("button", {
      hasText: /确|应用|确认/,
    });
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    } else {
      await this.page.keyboard.press("Enter");
    }
    // After confirm, filter is added and mode returns to search → navigate
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press("Enter"); // navigate
    await this.page.waitForTimeout(300);
  }

  // ─── Assertions ────────────────────────────────────────────────────────────

  /** Assert URL contains a substring (decoded, TanStack JSON-quote-stripped). */
  async expectUrlContains(substring: string) {
    await expect
      .poll(
        () => {
          const decoded = decodeURIComponent(this.page.url()).replace(
            /="|"(&|$)/g,
            (m) => (m === '="' ? "=" : m.endsWith("&") ? "&" : ""),
          );
          return decoded;
        },
        { timeout: 5000, message: `URL contains "${substring}"` },
      )
      .toContain(substring);
  }

  /** Assert a URL search param equals a value. */
  async expectUrlParam(key: string, value: string) {
    await expect
      .poll(
        () => new URL(this.page.url()).searchParams.get(key),
        { timeout: 5000, message: `URL param ${key}=${value}` },
      )
      .toBe(value);
  }

  /** Assert a URL search param does NOT exist. */
  async expectNoUrlParam(key: string) {
    await expect
      .poll(
        () => new URL(this.page.url()).searchParams.has(key),
        { timeout: 3000, message: `URL param ${key} absent` },
      )
      .toBe(false);
  }

  /** Assert a filter chip is visible in the launcher. */
  async expectFilterChip(text: string) {
    await this.open();
    const chip = this.dialog.getByText(text, { exact: false });
    await expect(chip).toBeVisible({ timeout: 3000 });
    await this.close();
  }

  /** Assert date panel is visible. */
  async expectDatePanelVisible() {
    const datePanel = this.dialog.locator("input[type='date']");
    await expect(datePanel.first()).toBeVisible({ timeout: 3000 });
  }

  /** Assert table rows exist. */
  async expectTableRows(opts?: { min?: number }) {
    const rows = this.page.locator(
      "table tbody tr, [data-testid='infinite-table'] tbody tr",
    );
    await expect
      .poll(() => rows.count(), { timeout: 10000 })
      .toBeGreaterThan((opts?.min ?? 1) - 1);
  }

  /** Assert the input placeholder matches a pattern. */
  async expectPlaceholder(pattern: RegExp) {
    await expect(this.input).toHaveAttribute("placeholder", pattern);
  }
}

// ─── Multi-User Auth Helpers ────────────────────────────────────────────────

export type TestRole = "admin" | "staff" | "customer";

const TEST_USERS: Record<TestRole, { id: string; name: string; role: string; preferredStoreId: string }> = {
  admin: { id: "lnch-admin-001", name: "赵管理", role: "admin", preferredStoreId: "store-lnch-gg" },
  staff: { id: "lnch-staff-001", name: "孙店员", role: "staff", preferredStoreId: "store-lnch-gg" },
  customer: { id: "lnch-cust-001", name: "张三丰", role: "customer", preferredStoreId: "store-lnch-gg" },
};

/** Setup mock auth for a specific role. Use in test setup for multi-user scenarios. */
export async function setupRole(page: Page, role: TestRole) {
  const user = TEST_USERS[role];
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user,
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
  await page.setExtraHTTPHeaders({ "X-Test-Role": user.role });
}

// ─── Detail Page Navigation Helpers ─────────────────────────────────────────

/**
 * From a table list page, click the first row link to navigate to a detail page.
 * Returns the detail page URL.
 */
export async function navigateToFirstDetail(page: Page): Promise<string> {
  const firstLink = page.locator("table tbody tr a, table tbody tr td button").first();
  await expect(firstLink).toBeVisible({ timeout: 10000 });
  await firstLink.scrollIntoViewIfNeeded();
  await firstLink.click();
  await page.waitForTimeout(1000);
  return page.url();
}

/**
 * Assert that a detail page loaded successfully (no error states).
 */
export async function expectDetailLoaded(page: Page) {
  await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("body")).not.toContainText(/Internal server error|500|404/i);
}

/**
 * Click a tab on a detail page.
 */
export async function clickDetailTab(page: Page, tabText: RegExp | string) {
  const tab = page.locator("button[role='tab']", { hasText: tabText });
  await expect(tab).toBeVisible({ timeout: 5000 });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await page.waitForTimeout(300);
}

// ─── Chart / Settle View Helpers ────────────────────────────────────────────

/**
 * Assert that an ECharts canvas is rendered on the page.
 */
export async function expectChartVisible(page: Page) {
  const chart = page.locator("canvas, [_echarts_instance_], .echarts-for-react, svg[xmlns]");
  await expect(chart.first()).toBeVisible({ timeout: 10000 });
}
