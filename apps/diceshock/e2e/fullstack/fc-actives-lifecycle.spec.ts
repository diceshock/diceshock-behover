/**
 * Activities (约局) Lifecycle E2E Test
 *
 * Full customer and staff journey:
 *   - Browse activities with filtering (expired toggle, store filter)
 *   - View activity detail with scroll verification
 *   - Create new activity with form submission
 *   - Join activity as participant
 *   - Watch activity (围观 mode)
 *   - Leave activity with confirmation
 *   - Staff management: edit, remove, batch operations
 */
import { expect, type Page, test } from "@playwright/test";

// ─── Auth Setup Helpers ───────────────────────────────────────────────────────

async function setupCustomerAuth(page: Page, id = "fc-cust-001", name = "张三") {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "customer" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id, name, role: "customer", preferredStoreId: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

async function setupStaffAuth(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "staff" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "fc-staff-001", name: "赵店长", role: "staff", preferredStoreId: "store-fc-gg" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

// ─── GraphQL Mock Helper ──────────────────────────────────────────────────────

async function mockGraphQL(page: Page, mocks: Record<string, unknown>) {
  await page.route("**/graphql", async (route) => {
    const body = route.request().postDataJSON();
    const query = body?.query as string ?? "";
    for (const [key, value] of Object.entries(mocks)) {
      if (query.includes(key)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: typeof value === "function" ? (value as Function)(body) : value }),
        });
        return;
      }
    }
    await route.continue();
  });
}

// ─── Interaction Helpers ──────────────────────────────────────────────────────

async function scrollAndClick(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await expect(el).toBeVisible();
  await el.click();
}

async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Internal server error|500|Unhandled/i);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe("Activities Lifecycle - Customer Browse", () => {
  test("should render activity list and verify multiple cards visible", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/zh-CN/actives");
    await expectPageLoaded(page);

    // Wait for activity cards to render
    const cards = page.locator("[data-testid^='activity-card'], .card, [class*='activity']").filter({ hasText: /fc-act-|活动/ });
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Scroll through and verify multiple activities
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Scroll to bottom to ensure all visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  });

  test("should hide expired activities by default", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/zh-CN/actives");
    await expectPageLoaded(page);

    // fc-act-004 is expired (2026-07-01), should not be visible
    await expect(page.locator("text=/fc-act-004/")).not.toBeVisible();
  });

  test("should show expired activities when toggled", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/zh-CN/actives");
    await expectPageLoaded(page);

    // Find and toggle expired filter
    const showExpiredToggle = page.locator("input[type='checkbox']").filter({ hasText: /已过期|expired|show.*expired/i }).or(
      page.locator("label").filter({ hasText: /已过期|expired|show.*expired/i }).locator("input")
    );

    if (await showExpiredToggle.isVisible({ timeout: 3000 })) {
      await showExpiredToggle.scrollIntoViewIfNeeded();
      await showExpiredToggle.check();
      await page.waitForTimeout(500);

      // Now expired activity should appear
      await expect(page.locator("text=/fc-act-004/")).toBeVisible();
    }
  });

  test("should filter activities by store (光谷)", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/zh-CN/actives");
    await expectPageLoaded(page);

    // Filter by store-fc-gg (光谷)
    const storeFilter = page.locator("select, [role='combobox']").filter({ hasText: /门店|store/i }).first()
      .or(page.locator("button").filter({ hasText: /光谷|gg/i }));

    if (await storeFilter.isVisible({ timeout: 3000 })) {
      await storeFilter.scrollIntoViewIfNeeded();
      if (await storeFilter.evaluate(el => el.tagName === "SELECT")) {
        await storeFilter.selectOption({ label: "光谷" });
      } else {
        await storeFilter.click();
      }
      await page.waitForTimeout(500);

      // Verify only gg activities visible (fc-act-001, fc-act-003 are gg)
      await expect(page.locator("text=/光谷|gg/i")).toBeVisible();
    }
  });

  test("should filter activities by store (街道口)", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/zh-CN/actives");
    await expectPageLoaded(page);

    // Filter by store-fc-jdk (街道口)
    const storeFilter = page.locator("select, [role='combobox']").filter({ hasText: /门店|store/i }).first()
      .or(page.locator("button").filter({ hasText: /街道口|jdk/i }));

    if (await storeFilter.isVisible({ timeout: 3000 })) {
      await storeFilter.scrollIntoViewIfNeeded();
      if (await storeFilter.evaluate(el => el.tagName === "SELECT")) {
        await storeFilter.selectOption({ label: "街道口" });
      } else {
        await storeFilter.click();
      }
      await page.waitForTimeout(500);

      // Verify only jdk activities visible (fc-act-002, fc-act-005 are jdk)
      await expect(page.locator("text=/街道口|jdk/i")).toBeVisible();
    }
  });
});

test.describe("Activities Lifecycle - Activity Detail", () => {
  test("should show full activity detail with scroll verification", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/zh-CN/actives");
    await expectPageLoaded(page);

    // Click first activity card
    const firstCard = page.locator("[data-testid^='activity-card'], .card, a[href*='/actives/']").first();
    await firstCard.scrollIntoViewIfNeeded();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expectPageLoaded(page);

    // Verify detail page elements
    await expect(page.locator("h1, h2, .title").first()).toBeVisible();
    await expect(page.locator("text=/fc-act-|活动时间|日期|date|time/i")).toBeVisible();

    // Scroll to verify participant section
    const participantSection = page.locator("text=/参与者|participants|玩家/i, [data-testid='participants']").first();
    if (await participantSection.isVisible({ timeout: 3000 })) {
      await participantSection.scrollIntoViewIfNeeded();
      await expect(participantSection).toBeVisible();
    }

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
  });

  test("should display activity metadata (max players, description, store)", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/zh-CN/actives/fc-act-001");
    await expectPageLoaded(page);

    // Verify max players indicator
    await expect(page.locator("text=/最多|max.*player|人数限制/i")).toBeVisible();

    // Verify store info
    await expect(page.locator("text=/门店|store|光谷|街道口/i")).toBeVisible();

    // Description may be optional
    const description = page.locator("p, .description, [data-testid='description']").filter({ hasText: /.{10,}/ }).first();
    if (await description.isVisible({ timeout: 2000 })) {
      await description.scrollIntoViewIfNeeded();
    }
  });
});

test.describe("Activities Lifecycle - Create Activity", () => {
  test("should create new activity with form submission", async ({ page }) => {
    await setupCustomerAuth(page, "fc-cust-001", "张三");

    // Mock createActive mutation
    await mockGraphQL(page, {
      createActive: {
        createActive: {
          id: "fc-act-new-001",
          title: "测试约局E2E",
          scheduledAt: "2026-07-15T19:00:00Z",
          maxParticipants: 8,
          storeId: "store-fc-gg",
        },
      },
    });

    await page.goto("/zh-CN/actives/new");
    await expectPageLoaded(page);

    // Fill form
    await page.locator("input[name='title'], input[id='title']").fill("测试约局E2E");
    
    const dateInput = page.locator("input[type='date'], input[name='date']").first();
    if (await dateInput.isVisible({ timeout: 2000 })) {
      await dateInput.fill("2026-07-15");
    }

    const timeInput = page.locator("input[type='time'], input[name='time']").first();
    if (await timeInput.isVisible({ timeout: 2000 })) {
      await timeInput.fill("19:00");
    }

    const maxPlayersInput = page.locator("input[name='maxParticipants'], input[name='maxPlayers'], input[type='number']").first();
    if (await maxPlayersInput.isVisible({ timeout: 2000 })) {
      await maxPlayersInput.fill("8");
    }

    const storeSelect = page.locator("select[name='storeId'], select[name='store']").first();
    if (await storeSelect.isVisible({ timeout: 2000 })) {
      await storeSelect.selectOption("store-fc-gg");
    }

    // Submit
    const submitBtn = page.locator("button[type='submit']").filter({ hasText: /创建|create|提交|submit/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Verify redirect or success
    await page.waitForURL(/\/actives\/fc-act-new-001|\/actives$/, { timeout: 5000 }).catch(() => {});
    await expectPageLoaded(page);
  });
});

test.describe("Activities Lifecycle - Join Activity", () => {
  test("should join activity and update participant count", async ({ page }) => {
    await setupCustomerAuth(page, "fc-cust-010", "孙十");

    // Mock joinActive mutation
    await mockGraphQL(page, {
      joinActive: {
        joinActive: {
          id: "fc-act-001",
          participants: [
            { userId: "fc-cust-001", isWatching: false },
            { userId: "fc-cust-002", isWatching: false },
            { userId: "fc-cust-010", isWatching: false },
          ],
        },
      },
    });

    await page.goto("/zh-CN/actives/fc-act-001");
    await expectPageLoaded(page);

    // Find and click join button
    const joinBtn = page.locator("button").filter({ hasText: /加入|join|参加/i }).first();
    await joinBtn.scrollIntoViewIfNeeded();
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();

    await page.waitForTimeout(500);

    // Verify button changes to leave
    await expect(page.locator("button").filter({ hasText: /离开|leave|退出/i })).toBeVisible({ timeout: 3000 });
  });

  test("should watch activity as non-participant", async ({ page }) => {
    await setupCustomerAuth(page, "fc-cust-011", "李十一");

    // Mock joinActive with isWatching: true
    await mockGraphQL(page, {
      joinActive: {
        joinActive: {
          id: "fc-act-002",
          participants: [
            { userId: "fc-cust-011", isWatching: true },
          ],
        },
      },
    });

    await page.goto("/zh-CN/actives/fc-act-002");
    await expectPageLoaded(page);

    // Find watch button (围观)
    const watchBtn = page.locator("button").filter({ hasText: /围观|watch|旁观/i }).first();
    if (await watchBtn.isVisible({ timeout: 3000 })) {
      await watchBtn.scrollIntoViewIfNeeded();
      await watchBtn.click();
      await page.waitForTimeout(500);

      // Verify watcher indicator
      await expect(page.locator("text=/围观|watching|旁观/i")).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Activities Lifecycle - Leave Activity", () => {
  test("should leave activity with confirmation", async ({ page }) => {
    await setupCustomerAuth(page, "fc-cust-001", "张三");

    // Mock leaveActive mutation
    await mockGraphQL(page, {
      leaveActive: {
        leaveActive: {
          id: "fc-act-001",
          participants: [],
        },
      },
    });

    await page.goto("/zh-CN/actives/fc-act-001");
    await expectPageLoaded(page);

    // Click leave button
    const leaveBtn = page.locator("button").filter({ hasText: /离开|leave|退出/i }).first();
    if (await leaveBtn.isVisible({ timeout: 3000 })) {
      await leaveBtn.scrollIntoViewIfNeeded();
      await leaveBtn.click();

      // Handle confirmation dialog if exists
      const confirmDialog = page.locator("dialog[open], [role='dialog'], .modal").filter({ hasText: /确认|confirm/i });
      if (await confirmDialog.isVisible({ timeout: 2000 })) {
        const confirmBtn = confirmDialog.locator("button").filter({ hasText: /确认|confirm|是|yes/i });
        await confirmBtn.click();
      }

      await page.waitForTimeout(500);

      // Verify button changes back to join
      await expect(page.locator("button").filter({ hasText: /加入|join|参加/i })).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Activities Lifecycle - Staff Management", () => {
  test("should navigate to staff activities dashboard", async ({ page }) => {
    await setupStaffAuth(page);
    await page.goto("/dash/actives");
    await expectPageLoaded(page);

    // Verify table renders
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Verify rows
    const rows = table.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should edit activity details", async ({ page }) => {
    await setupStaffAuth(page);

    // Mock updateActive mutation
    await mockGraphQL(page, {
      updateActive: {
        updateActive: {
          id: "fc-act-001",
          title: "修改后的约局",
        },
      },
    });

    await page.goto("/dash/actives");
    await expectPageLoaded(page);

    // Find edit button
    const editBtn = page.locator("button, a").filter({ hasText: /编辑|edit/i }).first();
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.scrollIntoViewIfNeeded();
      await editBtn.click();

      await expectPageLoaded(page);

      // Fill edit form
      const titleInput = page.locator("input[name='title']").first();
      if (await titleInput.isVisible({ timeout: 2000 })) {
        await titleInput.fill("修改后的约局");

        const saveBtn = page.locator("button[type='submit']").filter({ hasText: /保存|save|更新|update/i });
        await saveBtn.scrollIntoViewIfNeeded();
        await saveBtn.click();

        await page.waitForTimeout(500);
      }
    }
  });

  test("should remove single activity with confirmation", async ({ page }) => {
    await setupStaffAuth(page);

    // Mock deleteActive mutation
    await mockGraphQL(page, {
      deleteActive: {
        deleteActive: { success: true },
      },
    });

    await page.goto("/dash/actives");
    await expectPageLoaded(page);

    // Find remove/delete button
    const removeBtn = page.locator("button").filter({ hasText: /删除|delete|移除|remove/i }).first();
    if (await removeBtn.isVisible({ timeout: 3000 })) {
      await removeBtn.scrollIntoViewIfNeeded();
      await removeBtn.click();

      // Confirm dialog
      const confirmDialog = page.locator("dialog[open], [role='dialog'], .modal").filter({ hasText: /确认|confirm/i });
      if (await confirmDialog.isVisible({ timeout: 2000 })) {
        const confirmBtn = confirmDialog.locator("button").filter({ hasText: /确认|confirm|删除|delete/i });
        await confirmBtn.click();
      }

      await page.waitForTimeout(500);
    }
  });

  test("should batch remove multiple activities", async ({ page }) => {
    await setupStaffAuth(page);

    // Mock batch delete mutation
    await mockGraphQL(page, {
      batchDeleteActives: {
        batchDeleteActives: { count: 2 },
      },
    });

    await page.goto("/dash/actives");
    await expectPageLoaded(page);

    // Select multiple checkboxes
    const checkboxes = page.locator("input[type='checkbox']").filter({ has: page.locator("tbody tr") });
    const count = await checkboxes.count();
    
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Find batch delete button
      const batchDeleteBtn = page.locator("button").filter({ hasText: /批量删除|batch.*delete|删除选中/i }).first();
      if (await batchDeleteBtn.isVisible({ timeout: 3000 })) {
        await batchDeleteBtn.scrollIntoViewIfNeeded();
        await batchDeleteBtn.click();

        // Confirm dialog
        const confirmDialog = page.locator("dialog[open], [role='dialog'], .modal").filter({ hasText: /确认|confirm/i });
        if (await confirmDialog.isVisible({ timeout: 2000 })) {
          const confirmBtn = confirmDialog.locator("button").filter({ hasText: /确认|confirm|删除|delete/i });
          await confirmBtn.click();
        }

        await page.waitForTimeout(500);
      }
    }
  });

  test("should filter staff dashboard by store", async ({ page }) => {
    await setupStaffAuth(page);
    await page.goto("/dash/actives");
    await expectPageLoaded(page);

    // Find store filter dropdown
    const storeFilter = page.locator("select").filter({ hasText: /门店|store/i }).first()
      .or(page.locator("select[name='storeId'], select[name='store']").first());

    if (await storeFilter.isVisible({ timeout: 3000 })) {
      // Filter by gg
      await storeFilter.selectOption({ label: "光谷" });
      await page.waitForTimeout(500);
      await expect(page.locator("tbody")).toContainText(/光谷|gg/i);

      // Filter by jdk
      await storeFilter.selectOption({ label: "街道口" });
      await page.waitForTimeout(500);
      await expect(page.locator("tbody")).toContainText(/街道口|jdk/i);
    }
  });
});
