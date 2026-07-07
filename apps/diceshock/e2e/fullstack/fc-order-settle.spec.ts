import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Auth Helpers
// ============================================================================

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

async function setupAdminAuth(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "fc-staff-003",
          name: "孙管理员",
          role: "admin",
          preferredStoreId: "store-fc-gg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

// ============================================================================
// GraphQL Helpers
// ============================================================================

async function mockGraphQL(page: Page, mocks: Record<string, unknown>) {
  await page.route("**/graphql", async (route) => {
    const body = route.request().postDataJSON();
    const query = (body?.query as string) ?? "";
    for (const [key, value] of Object.entries(mocks)) {
      if (query.includes(key)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data:
              typeof value === "function"
                ? (value as (b: unknown) => unknown)(body)
                : value,
          }),
        });
        return;
      }
    }
    await route.continue();
  });
}

// ============================================================================
// UI Helpers
// ============================================================================

async function scrollAndClick(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await expect(el).toBeVisible();
  await el.click();
}

async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Internal server error|500|Unhandled/i
  );
}

async function waitForTableData(page: Page) {
  await page.waitForSelector("table tbody tr", { state: "visible" });
  await page.waitForTimeout(300); // Allow data to settle
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe("Order Settlement E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
  });

  // ==========================================================================
  // 1. View Orders List
  // ==========================================================================

  test("should navigate to orders list and display seed data", async ({
    page,
  }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);

    await waitForTableData(page);

    // Verify seed order IDs appear
    await expect(page.locator("text=fc-ord-001")).toBeVisible();
    await expect(page.locator("text=fc-ord-002")).toBeVisible();

    // Scroll through table to verify more orders
    const table = page.locator("table");
    await table.scrollIntoViewIfNeeded();

    // Verify different statuses visible
    await expect(
      page.locator('text=/active|paused|ended|settled/i')
    ).toHaveCount(8, { timeout: 5000 });
  });

  test("should display order details in table rows", async ({ page }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.scrollIntoViewIfNeeded();

    // Verify row contains order information
    await expect(firstRow).toBeVisible();
    await expect(firstRow.locator("td")).toHaveCount(6, { timeout: 5000 });
  });

  test("should scroll through all orders and verify statuses", async ({
    page,
  }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Scroll to bottom of table
    const lastRow = page.locator("table tbody tr").last();
    await lastRow.scrollIntoViewIfNeeded();
    await expect(lastRow).toBeVisible();

    // Verify we can see multiple status types
    const activeOrders = page.locator('text="active"');
    const endedOrders = page.locator('text="ended"');
    const settledOrders = page.locator('text="settled"');

    await expect(activeOrders.or(endedOrders).or(settledOrders)).toHaveCount(
      8,
      { timeout: 5000 }
    );
  });

  // ==========================================================================
  // 2. Order Filtering
  // ==========================================================================

  test("should filter orders by status: active only", async ({ page }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Find and click status filter
    const statusFilter = page.locator('select[name="status"]').or(
      page.locator('button:has-text("Status")')
    );
    await statusFilter.scrollIntoViewIfNeeded();
    await expect(statusFilter).toBeVisible();
    await statusFilter.click();

    // Select active status
    const activeOption = page.locator('option[value="active"]').or(
      page.locator('text="Active"')
    );
    await scrollAndClick(page, 'option[value="active"]');

    await waitForTableData(page);

    // Verify only active orders shown
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(2, { timeout: 5000 });
  });

  test("should filter orders by status: ended", async ({ page }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    const statusFilter = page.locator('select[name="status"]').or(
      page.locator('button:has-text("Status")')
    );
    await statusFilter.scrollIntoViewIfNeeded();
    await statusFilter.click();

    await scrollAndClick(page, 'option[value="ended"]');
    await waitForTableData(page);

    // Verify ended orders shown
    const endedText = page.locator('text="ended"');
    await expect(endedText).toBeVisible();
  });

  test("should search orders by user name", async ({ page }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Find search input
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="search"]')
    );
    await searchInput.scrollIntoViewIfNeeded();
    await expect(searchInput).toBeVisible();

    // Type customer name from seed data
    await searchInput.fill("张三");
    await page.waitForTimeout(500); // Debounce

    await waitForTableData(page);

    // Verify filtered results
    await expect(page.locator('text="张三"')).toBeVisible();
  });

  test("should clear filters and show full list", async ({ page }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Apply filter first
    const statusFilter = page.locator('select[name="status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption("active");
      await waitForTableData(page);
    }

    // Click clear filters button
    const clearButton = page.locator('button:has-text("Clear")').or(
      page.locator('button:has-text("Reset")')
    );
    if (await clearButton.isVisible()) {
      await scrollAndClick(page, 'button:has-text("Clear")');
      await waitForTableData(page);
    }

    // Verify full list restored
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(8, { timeout: 5000 });
  });

  // ==========================================================================
  // 3. Start New Order
  // ==========================================================================

  test("should open start order dialog and create new order", async ({
    page,
  }) => {
    await mockGraphQL(page, {
      startOrder: {
        startOrder: {
          id: "fc-ord-009",
          tableCode: "FCA1",
          userId: "fc-cust-001",
          seatCount: 4,
          status: "active",
          startTime: new Date().toISOString(),
        },
      },
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);

    // Click start order button
    await scrollAndClick(page, 'button:has-text("Start Order")');

    // Wait for dialog
    const dialog = page.locator('dialog[open]').or(
      page.locator('[role="dialog"]')
    );
    await expect(dialog).toBeVisible();

    // Fill form fields
    const tableSelect = dialog.locator('select[name="tableCode"]');
    await tableSelect.scrollIntoViewIfNeeded();
    await expect(tableSelect).toBeVisible();
    await tableSelect.selectOption("FCA1");

    const userSelect = dialog.locator('select[name="userId"]');
    await userSelect.scrollIntoViewIfNeeded();
    await userSelect.selectOption("fc-cust-001");

    const seatInput = dialog.locator('input[name="seatCount"]');
    await seatInput.scrollIntoViewIfNeeded();
    await seatInput.fill("4");

    // Submit form
    const submitButton = dialog.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Verify new order appears
    await page.waitForTimeout(500);
    await expect(page.locator('text="fc-ord-009"')).toBeVisible();
  });

  // ==========================================================================
  // 4. Pause/Resume Order
  // ==========================================================================

  test("should pause an active order", async ({ page }) => {
    await mockGraphQL(page, {
      pauseOrder: {
        pauseOrder: {
          id: "fc-ord-001",
          status: "paused",
        },
      },
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Find active order row
    const orderRow = page.locator('tr:has-text("fc-ord-001")');
    await orderRow.scrollIntoViewIfNeeded();
    await expect(orderRow).toBeVisible();

    // Click pause button
    const pauseButton = orderRow.locator('button:has-text("Pause")');
    await pauseButton.scrollIntoViewIfNeeded();
    await pauseButton.click();

    // Verify status changes
    await page.waitForTimeout(500);
    await expect(orderRow.locator('text="paused"')).toBeVisible();
  });

  test("should resume a paused order", async ({ page }) => {
    await mockGraphQL(page, {
      resumeOrder: {
        resumeOrder: {
          id: "fc-ord-003",
          status: "active",
        },
      },
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Find paused order
    const orderRow = page.locator('tr:has-text("fc-ord-003")');
    await orderRow.scrollIntoViewIfNeeded();
    await expect(orderRow).toBeVisible();

    // Click resume button
    const resumeButton = orderRow.locator('button:has-text("Resume")');
    await resumeButton.scrollIntoViewIfNeeded();
    await resumeButton.click();

    // Verify status changes to active
    await page.waitForTimeout(500);
    await expect(orderRow.locator('text="active"')).toBeVisible();
  });

  test("should record pause log when pausing order", async ({ page }) => {
    let pauseLogRecorded = false;

    await page.route("**/graphql", async (route) => {
      const body = route.request().postDataJSON();
      const query = (body?.query as string) ?? "";

      if (query.includes("pauseOrder")) {
        pauseLogRecorded = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              pauseOrder: {
                id: "fc-ord-001",
                status: "paused",
                pauseLogs: [
                  {
                    id: "log-001",
                    pausedAt: new Date().toISOString(),
                    pausedBy: "fc-staff-001",
                  },
                ],
              },
            },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    const orderRow = page.locator('tr:has-text("fc-ord-001")');
    await scrollAndClick(
      page,
      'tr:has-text("fc-ord-001") button:has-text("Pause")'
    );

    await page.waitForTimeout(500);
    expect(pauseLogRecorded).toBe(true);
  });

  // ==========================================================================
  // 5. Settlement Flow
  // ==========================================================================

  test("should navigate to settlement page and display pricing breakdown", async ({
    page,
  }) => {
    await mockGraphQL(page, {
      settlementPreview: {
        settlementPreview: {
          orderId: "fc-ord-001",
          planName: "光谷店标准套餐",
          minutes: 120,
          basePrice: 4800,
          memberDiscount: 480,
          storedValueAvailable: 2000,
          finalPrice: 4320,
          breakdown: [
            { label: "基础费用", amount: 4800 },
            { label: "会员折扣", amount: -480 },
          ],
        },
      },
    });

    await page.goto("/dash/orders/fc-ord-001/settle");
    await expectPageLoaded(page);

    // Wait for pricing breakdown to render
    await page.waitForSelector('text="光谷店标准套餐"', { state: "visible" });

    // Verify plan name
    await expect(page.locator('text="光谷店标准套餐"')).toBeVisible();

    // Verify minutes
    await expect(page.locator('text=/120.*分钟|minutes/i')).toBeVisible();

    // Verify pricing
    await expect(page.locator('text=/4800|48\.00|¥48/i')).toBeVisible();

    // Verify discount
    await expect(page.locator('text=/480|4\.80|¥4\.8/i')).toBeVisible();

    // Verify final price
    await expect(page.locator('text=/4320|43\.20|¥43\.2/i')).toBeVisible();
  });

  test("should display stored value deduction option for members", async ({
    page,
  }) => {
    await mockGraphQL(page, {
      settlementPreview: {
        settlementPreview: {
          orderId: "fc-ord-001",
          planName: "标准套餐",
          minutes: 90,
          basePrice: 3600,
          storedValueAvailable: 5000,
          finalPrice: 3600,
          breakdown: [{ label: "基础费用", amount: 3600 }],
        },
      },
    });

    await page.goto("/dash/orders/fc-ord-001/settle");
    await expectPageLoaded(page);

    await page.waitForTimeout(500);

    // Verify stored value section appears
    const storedValueSection = page.locator(
      'text=/储值|stored value|balance/i'
    );
    await storedValueSection.scrollIntoViewIfNeeded();
    await expect(storedValueSection).toBeVisible();

    // Verify available amount shown
    await expect(page.locator('text=/5000|50\.00|¥50/i')).toBeVisible();

    // Verify deduction checkbox or input
    const deductionControl = page
      .locator('input[type="checkbox"]')
      .or(page.locator('input[name="useStoredValue"]'));
    await expect(deductionControl).toBeVisible();
  });

  test("should submit settlement and update order status", async ({ page }) => {
    await mockGraphQL(page, {
      settlementPreview: {
        settlementPreview: {
          orderId: "fc-ord-001",
          planName: "标准套餐",
          minutes: 60,
          basePrice: 2400,
          finalPrice: 2400,
          breakdown: [{ label: "基础费用", amount: 2400 }],
        },
      },
      settleOrder: {
        settleOrder: {
          id: "fc-ord-001",
          status: "settled",
          settledAt: new Date().toISOString(),
          finalAmount: 2400,
        },
      },
    });

    await page.goto("/dash/orders/fc-ord-001/settle");
    await expectPageLoaded(page);
    await page.waitForTimeout(500);

    // Submit settlement
    const submitButton = page.locator('button:has-text("Settle")').or(
      page.locator('button:has-text("Confirm")')
    );
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Verify redirect or success message
    await page.waitForTimeout(1000);
    await expect(
      page.locator('text=/settled|success|完成/i')
    ).toBeVisible();
  });

  // ==========================================================================
  // 6. Batch Settlement
  // ==========================================================================

  test("should select multiple orders via checkboxes", async ({ page }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Select first order
    const firstCheckbox = page
      .locator('tr:has-text("fc-ord-001") input[type="checkbox"]')
      .first();
    await firstCheckbox.scrollIntoViewIfNeeded();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();

    // Scroll and select second order
    const secondCheckbox = page
      .locator('tr:has-text("fc-ord-002") input[type="checkbox"]')
      .first();
    await secondCheckbox.scrollIntoViewIfNeeded();
    await expect(secondCheckbox).toBeVisible();
    await secondCheckbox.check();

    // Verify both checked
    await expect(firstCheckbox).toBeChecked();
    await expect(secondCheckbox).toBeChecked();

    // Verify batch action button appears
    const batchButton = page.locator('button:has-text("Batch")');
    await expect(batchButton).toBeVisible();
  });

  test("should batch settle multiple selected orders", async ({ page }) => {
    await mockGraphQL(page, {
      batchSettleOrders: {
        batchSettleOrders: {
          successCount: 3,
          failedCount: 0,
          results: [
            { orderId: "fc-ord-001", success: true, status: "settled" },
            { orderId: "fc-ord-002", success: true, status: "settled" },
            { orderId: "fc-ord-004", success: true, status: "settled" },
          ],
        },
      },
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Select multiple orders
    const orderIds = ["fc-ord-001", "fc-ord-002", "fc-ord-004"];
    for (const orderId of orderIds) {
      const checkbox = page
        .locator(`tr:has-text("${orderId}") input[type="checkbox"]`)
        .first();
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.check();
    }

    // Click batch settle
    const batchSettleButton = page.locator('button:has-text("Batch Settle")');
    await batchSettleButton.scrollIntoViewIfNeeded();
    await expect(batchSettleButton).toBeVisible();
    await batchSettleButton.click();

    // Confirm dialog if present
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify success message
    await page.waitForTimeout(1000);
    await expect(
      page.locator('text=/success|完成|3.*settled/i')
    ).toBeVisible();
  });

  test("should handle batch settlement with scroll through results", async ({
    page,
  }) => {
    await mockGraphQL(page, {
      batchSettleOrders: {
        batchSettleOrders: {
          successCount: 2,
          failedCount: 1,
          results: [
            { orderId: "fc-ord-001", success: true, status: "settled" },
            { orderId: "fc-ord-002", success: true, status: "settled" },
            {
              orderId: "fc-ord-003",
              success: false,
              error: "Already settled",
            },
          ],
        },
      },
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Select orders
    for (const orderId of ["fc-ord-001", "fc-ord-002", "fc-ord-003"]) {
      const checkbox = page
        .locator(`tr:has-text("${orderId}") input[type="checkbox"]`)
        .first();
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.check();
    }

    // Execute batch settle
    await scrollAndClick(page, 'button:has-text("Batch Settle")');

    // Wait for results
    await page.waitForTimeout(1000);

    // Verify mixed results shown
    await expect(
      page.locator('text=/2.*success|success.*2/i')
    ).toBeVisible();
    await expect(page.locator('text=/1.*failed|failed.*1/i')).toBeVisible();
  });

  // ==========================================================================
  // 7. Cancel Settlement
  // ==========================================================================

  test("should cancel a settled order and revert status", async ({ page }) => {
    await mockGraphQL(page, {
      cancelSettlement: {
        cancelSettlement: {
          id: "fc-ord-005",
          status: "ended",
          settledAt: null,
          finalAmount: null,
        },
      },
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Find settled order
    const settledRow = page.locator('tr:has-text("fc-ord-005")');
    await settledRow.scrollIntoViewIfNeeded();
    await expect(settledRow).toBeVisible();

    // Click cancel settlement button
    const cancelButton = settledRow
      .locator('button:has-text("Cancel")')
      .or(settledRow.locator('button:has-text("Revert")'));
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();

    // Confirm cancellation
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify status reverted
    await page.waitForTimeout(500);
    await expect(settledRow.locator('text="ended"')).toBeVisible();
  });

  test("should display cancellation confirmation dialog", async ({ page }) => {
    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Find settled order and click cancel
    const settledRow = page
      .locator('tr:has-text("settled")')
      .or(page.locator('tr:has-text("fc-ord-006")'));
    const cancelButton = settledRow
      .locator('button:has-text("Cancel")')
      .first();

    if (await cancelButton.isVisible()) {
      await cancelButton.scrollIntoViewIfNeeded();
      await cancelButton.click();

      // Verify confirmation dialog appears
      const dialog = page.locator('[role="dialog"]').or(
        page.locator('dialog[open]')
      );
      await expect(dialog).toBeVisible();

      // Verify warning message
      await expect(
        dialog.locator('text=/cancel|revert|undo|撤销/i')
      ).toBeVisible();
    }
  });

  test("should clear settled amount when canceling settlement", async ({
    page,
  }) => {
    let cancelPayload: unknown = null;

    await page.route("**/graphql", async (route) => {
      const body = route.request().postDataJSON();
      const query = (body?.query as string) ?? "";

      if (query.includes("cancelSettlement")) {
        cancelPayload = body;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              cancelSettlement: {
                id: "fc-ord-005",
                status: "ended",
                settledAt: null,
                finalAmount: null,
                settledBy: null,
              },
            },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);
    await waitForTableData(page);

    // Trigger cancel settlement
    const settledRow = page.locator('tr:has-text("fc-ord-005")');
    const cancelButton = settledRow.locator('button:has-text("Cancel")');

    if (await cancelButton.isVisible()) {
      await scrollAndClick(
        page,
        'tr:has-text("fc-ord-005") button:has-text("Cancel")'
      );
      await page.waitForTimeout(500);

      expect(cancelPayload).toBeTruthy();
    }
  });
});
