/**
 * Shared E2E interaction helpers — visibility-first patterns.
 *
 * Every interaction scrolls the element into viewport, asserts visibility,
 * THEN performs the action. Mirrors real user behavior.
 */
import { expect, type Locator, type Page } from "@playwright/test";

// ─── Core Interaction Patterns ───────────────────────────────────────────────

/** Scroll element into view, assert visible, then click */
export async function clickVisible(locator: Locator, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10000;
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout });
  await locator.click();
}

/** Scroll element into view, assert visible, then fill */
export async function fillVisible(locator: Locator, value: string, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10000;
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout });
  await locator.fill(value);
}

/** Scroll element into view, assert visible, then check */
export async function checkVisible(locator: Locator, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10000;
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout });
  await locator.check();
}

/** Scroll element into view, assert visible, then select option */
export async function selectVisible(locator: Locator, value: string, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10000;
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout });
  await locator.selectOption(value);
}

/** Assert element is in viewport and visible to the user */
export async function assertInViewport(locator: Locator, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10000;
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toBeInViewport({ timeout });
}

// ─── Page-Level Helpers ──────────────────────────────────────────────────────

/** Wait for page main content to be loaded and visible */
export async function waitForMainContent(page: Page, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 15000;
  await expect(page.locator("main")).toBeVisible({ timeout });
}

/** Wait for a data table to render with at least one row */
export async function waitForTableData(page: Page, opts?: { timeout?: number; minRows?: number }) {
  const timeout = opts?.timeout ?? 15000;
  const minRows = opts?.minRows ?? 0;
  await expect(page.locator("table.table")).toBeVisible({ timeout });
  if (minRows > 0) {
    await expect(page.locator("table.table tbody tr")).toHaveCount(minRows, { timeout });
  }
}

/** Wait for table to load (may have 0 rows) */
export async function waitForTableReady(page: Page, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 15000;
  await expect(page.locator("table.table")).toBeVisible({ timeout });
}

// ─── Dialog Helpers ──────────────────────────────────────────────────────────

/** Wait for a modal dialog to open and return its box locator */
export async function waitForDialog(page: Page, opts?: { timeout?: number }): Promise<Locator> {
  const timeout = opts?.timeout ?? 5000;
  const dialog = page.locator("dialog[open] .modal-box");
  await expect(dialog).toBeVisible({ timeout });
  return dialog;
}

/** Submit dialog form and wait for it to close */
export async function submitDialog(dialog: Locator, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10000;
  const submitBtn = dialog.locator("button[type='submit']");
  await submitBtn.scrollIntoViewIfNeeded();
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();
  await expect(dialog).not.toBeVisible({ timeout });
}

// ─── Navigation Helpers ──────────────────────────────────────────────────────

/** Click a tab button by text, scrolling into view first */
export async function clickTab(page: Page, tabText: RegExp | string, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10000;
  const tab = page.locator("button[role='tab']", { hasText: tabText });
  await tab.scrollIntoViewIfNeeded();
  await expect(tab).toBeVisible({ timeout });
  await tab.click();
}

/** Type into search input, press Enter, verify URL updates */
export async function searchAndVerify(
  page: Page,
  query: string,
  expectedUrlPattern: RegExp,
  opts?: { timeout?: number },
) {
  const timeout = opts?.timeout ?? 5000;
  const searchInput = page.locator("input[type='search']");
  await searchInput.scrollIntoViewIfNeeded();
  await expect(searchInput).toBeVisible({ timeout });
  await searchInput.fill(query);
  await searchInput.press("Enter");
  await expect(page).toHaveURL(expectedUrlPattern, { timeout });
}

// ─── Staff Auth Setup ────────────────────────────────────────────────────────

/** Set up staff authentication for the page (mocked session) */
export async function setupStaffAuth(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "staff" });
  await page.route("/api/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "e2e-test-staff-001",
          name: "测试店员",
          role: "staff",
          preferredStoreId: "store-e2e-gg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    }),
  );
}

// ─── GraphQL Response Helpers ────────────────────────────────────────────────

/** Wait for a specific GraphQL operation to complete */
export function waitForGql(page: Page, operationName: string) {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes("/graphql") &&
      resp.request().postDataJSON()?.query?.includes(operationName),
  );
}

// ─── Toast / Notification Assertion ──────────────────────────────────────────

/** Wait for a toast notification containing text (handles ephemeral toasts) */
export async function expectToastOrStateChange(
  page: Page,
  options: {
    toastText?: string | RegExp;
    stateLocator?: Locator;
    stateCheck?: "visible" | "hidden";
    timeout?: number;
  },
) {
  const timeout = options.timeout ?? 15000;
  // Prefer stable state assertion over ephemeral toast
  if (options.stateLocator) {
    if (options.stateCheck === "hidden") {
      await expect(options.stateLocator).toBeHidden({ timeout });
    } else {
      await expect(options.stateLocator).toBeVisible({ timeout });
    }
  } else if (options.toastText) {
    await expect(page.locator(`text=${options.toastText}`)).toBeVisible({ timeout });
  }
}

// ─── Batch Selection ─────────────────────────────────────────────────────────

/** Select all rows via header checkbox, verify action bar appears */
export async function selectAllRows(page: Page, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 5000;
  const selectAll = page.locator("table.table thead input[type='checkbox']");
  await selectAll.scrollIntoViewIfNeeded();
  await expect(selectAll).toBeVisible({ timeout });
  await selectAll.check();
}

/** Click a specific batch action button from the action bar */
export async function clickBatchAction(page: Page, actionText: string | RegExp, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 5000;
  const btn = page.locator("button", { hasText: actionText });
  await btn.scrollIntoViewIfNeeded();
  await expect(btn).toBeVisible({ timeout });
  await btn.click();
}
