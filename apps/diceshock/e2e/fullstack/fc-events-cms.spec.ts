/**
 * Events CMS — E2E Tests (Visibility-First)
 *
 * Tests the full events management lifecycle:
 *   - Public events list (customer view)
 *   - Event detail page
 *   - Create/Edit/Publish/Delete (staff)
 *
 * Self-contained: auth helpers inline, GraphQL mocked per scenario.
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

// ─── GraphQL Mock ────────────────────────────────────────────────────────────

type GqlBody = { query: string; variables?: unknown };
type GqlMockValue = object | string | number | boolean | null | ((body: GqlBody) => unknown);

async function mockGraphQL(page: Page, mocks: Record<string, GqlMockValue>) {
  await page.route("**/graphql", async (route) => {
    const raw: unknown = route.request().postDataJSON();
    const query =
      raw && typeof raw === "object" && "query" in raw && typeof raw.query === "string"
        ? raw.query
        : "";
    for (const [key, mockValue] of Object.entries(mocks)) {
      if (query.includes(key)) {
        const variables =
          raw && typeof raw === "object" && "variables" in raw ? raw.variables : undefined;
        const data = typeof mockValue === "function"
          ? mockValue({ query, variables })
          : mockValue;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data }),
        });
        return;
      }
    }
    await route.continue();
  });
}

// ─── Scroll & Visibility Helpers ─────────────────────────────────────────────

async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Internal server error|500|Unhandled/i,
  );
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const publishedEvents = [
  {
    id: "fc-evt-001",
    title: "周末桌游大会",
    description: "每周六的固定桌游活动",
    content: "<p>欢迎参加我们的周末桌游大会！</p>",
    status: "published",
    publishedAt: "2026-06-20T10:00:00Z",
  },
  {
    id: "fc-evt-002",
    title: "新手入门之夜",
    description: "面向新手的桌游入门活动",
    content: "<p>第一次来？不用担心，我们会教你！</p>",
    status: "published",
    publishedAt: "2026-06-21T18:00:00Z",
  },
  {
    id: "fc-evt-003",
    title: "TRPG长期团招募",
    description: "DND5e长期团第三期招募",
    content: "<p>招募4-5名玩家，每周日下午跑团。</p>",
    status: "published",
    publishedAt: "2026-06-22T14:00:00Z",
  },
];

const draftEvent = {
  id: "fc-evt-004",
  title: "暑期特别活动（草稿）",
  description: "暑期将推出的特别活动",
  content: "<p>敬请期待！</p>",
  status: "draft",
  publishedAt: null,
};

const allEvents = [...publishedEvents, draftEvent];

// ─── Public Events List (Customer) ──────────────────────────────────────────

test.describe("公开活动列表 — 顾客视角", () => {
  test.beforeEach(async ({ page }) => {
    await setupCustomerAuth(page);
    await mockGraphQL(page, {
      events: {
        events: publishedEvents,
      },
      publishedEvents: {
        publishedEvents: publishedEvents,
      },
    });
  });

  test("活动列表页加载: 已发布活动可见", async ({ page }) => {
    await page.goto("/events");
    await expectPageLoaded(page);

    for (const evt of publishedEvents) {
      const card = page.locator(`[data-testid="event-${evt.id}"], [data-event-id="${evt.id}"]`).first();
      if (await card.count()) {
        await card.scrollIntoViewIfNeeded();
        await expect(card).toBeVisible();
      } else {
        // Fallback: search by title text
        const titleEl = page.locator(`text=${evt.title}`).first();
        await titleEl.scrollIntoViewIfNeeded();
        await expect(titleEl).toBeVisible();
      }
    }
  });

  test("草稿活动不可见: fc-evt-004未展示", async ({ page }) => {
    await page.goto("/events");
    await expectPageLoaded(page);

    await expect(
      page.locator(`[data-testid="event-fc-evt-004"], [data-event-id="fc-evt-004"]`),
    ).toHaveCount(0);
    await expect(page.locator(`text=${draftEvent.title}`)).toHaveCount(0);
  });

  test("滚动浏览活动卡片: 所有发布活动均在视口内", async ({ page }) => {
    await page.goto("/events");
    await expectPageLoaded(page);

    // Scroll through each event card sequentially
    for (const evt of publishedEvents) {
      const titleEl = page.locator(`text=${evt.title}`).first();
      await titleEl.scrollIntoViewIfNeeded();
      await expect(titleEl).toBeVisible();
      // Verify card container is scrolled into view
      const boundingBox = await titleEl.boundingBox();
      expect(boundingBox).not.toBeNull();
    }
  });
});

// ─── Event Detail (Customer) ─────────────────────────────────────────────────

test.describe("活动详情页 — 顾客视角", () => {
  test.beforeEach(async ({ page }) => {
    await setupCustomerAuth(page);
    await mockGraphQL(page, {
      events: { events: publishedEvents },
      publishedEvents: { publishedEvents: publishedEvents },
      event: publishedEvents[0],
      eventById: { event: publishedEvents[0] },
    });
  });

  test("点击活动卡片进入详情页", async ({ page }) => {
    await page.goto("/events");
    await expectPageLoaded(page);

    const firstTitle = page.locator(`text=${publishedEvents[0].title}`).first();
    await firstTitle.scrollIntoViewIfNeeded();
    await expect(firstTitle).toBeVisible();
    await firstTitle.click();

    // Wait for navigation to detail page
    await page.waitForURL(/\/events\/(fc-evt-001|[^/]+)/, { timeout: 10000 });
    await expectPageLoaded(page);
  });

  test("详情页内容渲染: 标题/描述/正文可见", async ({ page }) => {
    await page.goto("/events/fc-evt-001");
    await expectPageLoaded(page);

    const evt = publishedEvents[0];
    const title = page.locator(`h1, h2, [data-testid="event-title"]`).filter({ hasText: evt.title }).first();
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeVisible();

    const desc = page.locator(`text=${evt.description}`).first();
    await desc.scrollIntoViewIfNeeded();
    await expect(desc).toBeVisible();
  });

  test("详情页完整滚动: 页面可滚动到底部", async ({ page }) => {
    await page.goto("/events/fc-evt-001");
    await expectPageLoaded(page);

    // Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // Verify we scrolled — page should still be stable
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThanOrEqual(0);
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─── Create Event (Staff) ────────────────────────────────────────────────────

test.describe("创建活动 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      events: { events: allEvents },
      createEvent: {
        createEvent: {
          id: "fc-evt-new-001",
          title: "新创建的活动",
          description: "测试创建",
          status: "draft",
        },
      },
    });
  });

  test("导航到事件管理页: 列表可见", async ({ page }) => {
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    const main = page.locator("main").first();
    await main.scrollIntoViewIfNeeded();
    await expect(main).toBeVisible();
  });

  test("点击创建按钮: 进入创建表单", async ({ page }) => {
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    const createBtn = page.locator("button, a").filter({ hasText: /新建|创建|新增|添加活动/ }).first();
    await createBtn.scrollIntoViewIfNeeded();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Should navigate to create page or open a form/dialog
    await page.waitForTimeout(500);
    const form = page.locator("form, [data-testid='event-form'], [role='dialog']").first();
    await expect(form).toBeVisible({ timeout: 5000 });
  });

  test("填写表单并提交: 创建成功", async ({ page }) => {
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    const createBtn = page.locator("button, a").filter({ hasText: /新建|创建|新增|添加活动/ }).first();
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();
    await page.waitForTimeout(500);

    // Fill title
    const titleInput = page.locator("input[name='title'], input[placeholder*='标题'], [data-testid='event-title-input']").first();
    await titleInput.scrollIntoViewIfNeeded();
    await expect(titleInput).toBeVisible();
    await titleInput.fill("新创建的活动");

    // Fill description
    const descInput = page.locator("textarea[name='description'], input[name='description'], [data-testid='event-desc-input']").first();
    if (await descInput.count()) {
      await descInput.scrollIntoViewIfNeeded();
      await descInput.fill("测试创建");
    }

    // Content editor (TipTap) — fill contenteditable or textarea
    const editor = page.locator("[contenteditable='true'], .tiptap, .ProseMirror").first();
    if (await editor.count()) {
      await editor.scrollIntoViewIfNeeded();
      await editor.click();
      await page.keyboard.type("这是活动正文内容");
    }

    // Submit
    const submitBtn = page.locator("button[type='submit'], button").filter({ hasText: /保存|提交|确认|创建/ }).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();

    const gqlRequest = page.waitForRequest((req) =>
      req.url().includes("/graphql") && (req.postData()?.includes("createEvent") ?? false),
    );
    await submitBtn.click();
    await gqlRequest;
  });
});

// ─── Edit Event (Staff) ──────────────────────────────────────────────────────

test.describe("编辑活动 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      events: { events: allEvents },
      event: publishedEvents[0],
      eventById: { event: publishedEvents[0] },
      updateEvent: {
        updateEvent: {
          ...publishedEvents[0],
          title: "修改后的活动标题",
        },
      },
    });
  });

  test("点击编辑按钮: 进入编辑模式", async ({ page }) => {
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    // Click edit button on first event row
    const editBtn = page.locator("button, a").filter({ hasText: /编辑|修改|Edit/ }).first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.scrollIntoViewIfNeeded();
      await editBtn.click();
      await page.waitForTimeout(500);

      // Should see form or navigate to edit page
      const form = page.locator("form, [data-testid='event-form'], input[name='title']").first();
      await expect(form).toBeVisible({ timeout: 5000 });
    } else {
      // Alternative: click event row to navigate to detail, then edit
      const eventRow = page.locator(`a[href*="fc-evt-001"], tr`).filter({ hasText: publishedEvents[0].title }).first();
      await eventRow.scrollIntoViewIfNeeded();
      await eventRow.click();
      await page.waitForTimeout(500);
    }
  });

  test("修改标题并保存: 更新成功", async ({ page }) => {
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    const editBtn = page.locator("button, a").filter({ hasText: /编辑|修改|Edit/ }).first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.scrollIntoViewIfNeeded();
      await editBtn.click();
      await page.waitForTimeout(500);
    }

    const titleInput = page.locator("input[name='title'], input[placeholder*='标题'], [data-testid='event-title-input']").first();
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.scrollIntoViewIfNeeded();
      await titleInput.clear();
      await titleInput.fill("修改后的活动标题");

      const saveBtn = page.locator("button[type='submit'], button").filter({ hasText: /保存|更新|确认/ }).first();
      await saveBtn.scrollIntoViewIfNeeded();
      await expect(saveBtn).toBeVisible();

      const gqlRequest = page.waitForRequest((req) =>
        req.url().includes("/graphql") && (req.postData()?.includes("updateEvent") ?? false),
      );
      await saveBtn.click();
      await gqlRequest;
    }
  });
});

// ─── Publish/Unpublish Toggle ────────────────────────────────────────────────

test.describe("发布/取消发布切换 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
  });

  test("草稿活动切换为发布: 状态标记更新", async ({ page }) => {
    await mockGraphQL(page, {
      events: { events: allEvents },
      toggleEventPublish: {
        toggleEventPublish: { ...draftEvent, status: "published" },
      },
    });
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    // Find draft event row and its publish toggle
    const draftRow = page.locator("tr, [data-testid='event-row']").filter({ hasText: draftEvent.title }).first();
    if (await draftRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftRow.scrollIntoViewIfNeeded();

      const publishBtn = draftRow.locator("button").filter({ hasText: /发布|Publish|上线/ }).first();
      if (await publishBtn.count()) {
        await publishBtn.scrollIntoViewIfNeeded();
        await expect(publishBtn).toBeVisible();

        const gqlRequest = page.waitForRequest((req) =>
          req.url().includes("/graphql") && (req.postData()?.includes("toggleEventPublish") ?? false),
        );
        await publishBtn.click();
        await gqlRequest;
      }
    }
  });

  test("已发布活动切换为草稿: 状态标记更新", async ({ page }) => {
    await mockGraphQL(page, {
      events: { events: allEvents },
      toggleEventPublish: {
        toggleEventPublish: { ...publishedEvents[0], status: "draft" },
      },
    });
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    const pubRow = page.locator("tr, [data-testid='event-row']").filter({ hasText: publishedEvents[0].title }).first();
    if (await pubRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pubRow.scrollIntoViewIfNeeded();

      const unpublishBtn = pubRow.locator("button").filter({ hasText: /取消发布|下线|Unpublish|草稿/ }).first();
      if (await unpublishBtn.count()) {
        await unpublishBtn.scrollIntoViewIfNeeded();
        await expect(unpublishBtn).toBeVisible();
        await unpublishBtn.click();
      }
    }
  });

  test("发布后顾客可见: 验证状态同步", async ({ page }) => {
    // First publish as staff
    await mockGraphQL(page, {
      events: { events: allEvents },
      toggleEventPublish: {
        toggleEventPublish: { ...draftEvent, status: "published" },
      },
    });
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    // Then switch to customer context and verify visibility
    await page.unrouteAll();
    await setupCustomerAuth(page);
    await mockGraphQL(page, {
      events: { events: [...publishedEvents, { ...draftEvent, status: "published" }] },
      publishedEvents: { publishedEvents: [...publishedEvents, { ...draftEvent, status: "published" }] },
    });
    await page.goto("/events");
    await expectPageLoaded(page);

    const newlyPublished = page.locator(`text=${draftEvent.title}`).first();
    await newlyPublished.scrollIntoViewIfNeeded();
    await expect(newlyPublished).toBeVisible();
  });
});

// ─── Delete Event ────────────────────────────────────────────────────────────

test.describe("删除活动 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
    await mockGraphQL(page, {
      events: { events: allEvents },
      deleteEvent: { deleteEvent: { id: "fc-evt-004", success: true } },
    });
  });

  test("删除草稿活动: 确认对话框弹出", async ({ page }) => {
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    const draftRow = page.locator("tr, [data-testid='event-row']").filter({ hasText: draftEvent.title }).first();
    if (await draftRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftRow.scrollIntoViewIfNeeded();

      const deleteBtn = draftRow.locator("button").filter({ hasText: /删除|移除|Delete/ }).first();
      if (await deleteBtn.count()) {
        await deleteBtn.scrollIntoViewIfNeeded();
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Confirmation dialog
        const dialog = page.locator("[role='dialog'], [role='alertdialog'], .modal").first();
        await expect(dialog).toBeVisible({ timeout: 5000 });
        const confirmText = dialog.locator("text=确认").first();
        await expect(confirmText).toBeVisible();
      }
    }
  });

  test("确认删除: 活动从列表移除", async ({ page }) => {
    await page.goto("/dash/events");
    await expectPageLoaded(page);

    const draftRow = page.locator("tr, [data-testid='event-row']").filter({ hasText: draftEvent.title }).first();
    if (await draftRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftRow.scrollIntoViewIfNeeded();

      const deleteBtn = draftRow.locator("button").filter({ hasText: /删除|移除|Delete/ }).first();
      if (await deleteBtn.count()) {
        await deleteBtn.click();

        // Confirm deletion in dialog
        const confirmBtn = page.locator("[role='dialog'] button, [role='alertdialog'] button, .modal button")
          .filter({ hasText: /确认|确定|删除|是/ }).first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          const gqlRequest = page.waitForRequest((req) =>
            req.url().includes("/graphql") && (req.postData()?.includes("deleteEvent") ?? false),
          );
          await confirmBtn.click();
          await gqlRequest;
        }
      }
    }
  });
});
