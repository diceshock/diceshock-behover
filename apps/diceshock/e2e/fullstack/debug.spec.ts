import { test, expect } from "../fixtures/auth.fixture";

test("orders page renders DashTable", async ({ page, mockStaffSession }) => {
  await page.goto("/dash/orders");
  await expect(page.locator("table.table")).toBeVisible({ timeout: 15000 });
  const rowCount = await page.locator("table.table tbody tr").count();
  console.log("TABLE ROWS:", rowCount);
  const headers = await page.locator("table.table thead th").allTextContents();
  console.log("HEADERS:", headers.join(" | "));
});
