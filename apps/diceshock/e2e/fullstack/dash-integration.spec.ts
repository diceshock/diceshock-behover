import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";
import { mockChatConfirm, mockChatStream } from "../fixtures/chat.fixture";
import { mockGraphQL, type GraphQLMocks } from "../fixtures/graphql.fixture";

test.describe("AI ↔ Dash tables integration full flow", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => setupIntegration(page));

  test("AI search chip filters orders table", async ({ page }) => {
    await mockChatStream(page, searchResponse("status:active table:A1"));
    await openChat(page, "/dash/orders");
    await sendChat(page, "帮我找活跃的A1桌订单");
    await applyChip(page, "status:active table:A1");
    await expect(page.locator('input[type="search"]')).toHaveValue("status:active table:A1");
    await expect(page.getByText("张三").first()).toBeVisible();
  });

  test("AI search chip filters tables page with page-specific grammar", async ({ page }) => {
    await mockChatStream(page, searchResponse("type:fixed status:active"));
    await openChat(page, "/dash/tables");
    await sendChat(page, "找启用固定桌");
    await applyChip(page, "type:fixed status:active");
    await expect(page.getByText("A1 主桌").first()).toBeVisible();
  });

  test("AI search chip filters users page", async ({ page }) => {
    await mockChatStream(page, searchResponse("role:admin"));
    await openChat(page, "/dash/users");
    await sendChat(page, "找管理员");
    await applyChip(page, "role:admin");
    await expect(page.getByText("Alice Admin").first()).toBeVisible();
  });

  test("AI search chip filters GSZ page", async ({ page }) => {
    await mockChatStream(page, searchResponse("mode:4p sync:unsynced"));
    await openChat(page, "/dash/gsz");
    await sendChat(page, "找未同步四人局");
    await applyChip(page, "mode:4p sync:unsynced");
    await expect(page.getByText("match").first()).toBeVisible();
  });

  test("manual quick filter then AI chip preserves deterministic URL flow", async ({ page }) => {
    await mockChatStream(page, searchResponse("table:A1"));
    await openChat(page, "/dash/orders");
    await page.locator("button.btn-xs", { hasText: /Active|活跃|进行中/ }).first().click();
    await sendChat(page, "只看A1桌");
    await applyChip(page, "table:A1");
    await expect(page).toHaveURL(/q=table/);
  });

  test("agent mutation confirmation refetches filtered orders", async ({ page }) => {
    const calls: string[] = [];
    await setupIntegration(page, calls);
    await mockChatStream(page, mutationResponse("mut-101"));
    await mockChatConfirm(page);
    await openChat(page, "/dash/orders?q=status%3Aactive");
    await sendChat(page, "暂停订单ABC");
    await page.getByRole("button", { name: /确认执行/ }).click();
    await expect(page.getByText("已执行")).toBeVisible();
    await expect.poll(() => calls.filter((name) => name === "Orders").length).toBeGreaterThan(1);
  });

  test("agent mutation rejection does not call confirm endpoint", async ({ page }) => {
    let confirmCalled = false;
    await mockChatStream(page, mutationResponse("mut-102"));
    await page.route("**/api/chat/confirm", async (route) => {
      confirmCalled = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await openChat(page, "/dash/orders");
    await sendChat(page, "暂停订单ABC");
    await page.getByRole("button", { name: /取消/ }).click();
    expect(confirmCalled).toBe(false);
    await expect(page.getByText(/已取消|已拒绝/)).toBeVisible();
  });

  test("query tool can coexist with active table filters", async ({ page }) => {
    await mockChatStream(page, queryResponse());
    await openChat(page, "/dash/orders?q=status%3Aactive&page=1");
    await sendChat(page, "展示当前结果");
    await expect(page.getByText("查询结果")).toBeVisible();
    await expect(page.locator('input[type="search"]')).toHaveValue("status:active");
  });

  test("chat state survives navigation between two dash pages", async ({ page }) => {
    await mockChatStream(page, { text: "导航前回复" });
    await openChat(page, "/dash/orders");
    await sendChat(page, "hello");
    await expect(page.getByText("导航前回复")).toBeVisible();
    await page.goto("/dash/tables");
    await expect(page.locator("table.table")).toBeVisible();
    await expect(page.getByText("AI 助手")).toBeVisible();
  });

  test("context page changes after navigation", async ({ page }) => {
    const pages: string[] = [];
    await mockChatStream(page, ({ body }) => {
      pages.push(getChatContextPage(body));
      return { text: `page:${pages.at(-1)}` };
    });
    await openChat(page, "/dash/orders");
    await sendChat(page, "页面?");
    await page.goto("/dash/users");
    await expect(page.locator("table.table")).toBeVisible();
    await sendChat(page, "页面?");
    await expect.poll(() => pages).toContain("/dash/users");
  });

  test("TOTP tool renders inside chat without disturbing table", async ({ page }) => {
    await mockChatStream(page, { text: "签到码", toolCalls: [{ id: "totp", name: "generate_totp", result: { code: "112233", remaining_seconds: 22 } }] });
    await openChat(page, "/dash/orders");
    await sendChat(page, "生成签到码");
    await expect(page.getByText("112233")).toBeVisible();
    await expect(page.locator("table.table")).toBeVisible();
  });

  test("rules tool renders collapsible card while table remains filtered", async ({ page }) => {
    await mockChatStream(page, { text: "规则", toolCalls: [{ id: "rules", name: "search_rules", result: { results: [{ source: "PHB", text: "规则内容" }] } }] });
    await openChat(page, "/dash/orders?q=status%3Aactive");
    await sendChat(page, "规则搜索");
    await expect(page.getByText(/规则搜索/)).toBeVisible();
    await expect(page.locator('input[type="search"]')).toHaveValue("status:active");
  });

  test("stream error does not break existing table data", async ({ page }) => {
    await mockChatStream(page, { status: 500, error: "integration error" });
    await openChat(page, "/dash/orders");
    await sendChat(page, "错误");
    await expect(page.getByRole("button", { name: "重试" })).toBeVisible();
    await expect(page.getByText("张三").first()).toBeVisible();
  });

  test("mobile search chip bridges from sheet to orders table", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockChatStream(page, searchResponse("status:active"));
    await page.goto("/dash/orders");
    await expect(page.locator("table.table")).toBeVisible();
    await page.locator(".btn-circle.btn-primary").click();
    await sendChat(page, "找活跃订单");
    await applyChip(page, "status:active");
    await expect(page.locator('input[type="search"]')).toHaveValue("status:active");
  });

  test("mobile mutation confirmation executes and refreshes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockChatStream(page, mutationResponse("mut-mobile"));
    await mockChatConfirm(page);
    await page.goto("/dash/orders");
    await expect(page.locator("table.table")).toBeVisible();
    await page.locator(".btn-circle.btn-primary").click();
    await sendChat(page, "暂停订单ABC");
    await page.getByRole("button", { name: /确认执行/ }).click();
    await expect(page.getByText("已执行")).toBeVisible();
  });

  test("direct URL filter plus AI query result validates URL-state integration", async ({ page }) => {
    await mockChatStream(page, queryResponse());
    await openChat(page, "/dash/gsz?q=sync%3Aunsynced&page=1");
    await sendChat(page, "查当前麻将列表");
    await expect(page.getByText("查询结果")).toBeVisible();
    await expect(page.locator('input[type="search"]')).toHaveValue("sync:unsynced");
  });
});

function getChatContextPage(body: Record<string, unknown>) {
  const context = body.context;
  if (!context || typeof context !== "object") return "";
  const page = (context as Record<string, unknown>).page;
  return typeof page === "string" ? page : "";
}

async function setupIntegration(page: Page, calls: string[] = []) {
  const mocks: GraphQLMocks = {
    Orders: () => {
      calls.push("Orders");
      return { orders: { items: [order("order-001", "A1", "张三", "ACTIVE"), order("order-002", "B1", "李四", "PAUSED")], pageInfo: { offset: 0, limit: 50, total: 2, nextCursor: null, hasMore: false } } };
    },
    PublishedPricing: { publishedPricing: null },
    Users: () => ({ managedUsers: { items: [user("user-001", "Alice Admin", "ADMIN"), user("user-002", "Sally Staff", "STAFF")], pageInfo: { offset: 0, limit: 30, total: 2, nextCursor: null, hasMore: false } } }),
    ManagedTables: { managedTables: [{ id: "table-001", name: "A1 主桌", type: "FIXED", scope: "boardgame", status: "ACTIVE", capacity: 6, code: "A1", description: null, storeId: "demo", occupancies: [], createdAt: "2024-06-01T00:00:00.000Z", updatedAt: "2024-06-01T00:00:00.000Z" }] },
    ManagedActives: { managedActives: [] },
    ManagedEvents: { managedEvents: [] },
    ManagedMahjongMatches: { managedMahjongMatches: { items: [{ id: "match-001", tableId: "table-A1", table: { id: "table-A1", name: "A1 麻将桌", code: "A1", scope: "mahjong" }, matchType: "tournament", gszRecordId: null, gszSynced: false, gszError: null, gszSyncedAt: null, mode: "4p", format: "hanchan", startedAt: "2024-06-01T00:00:00.000Z", endedAt: "2024-06-01T01:00:00.000Z", terminationReason: "score_complete", players: [], playersJson: "[]", unsyncableReasons: [] }], pageInfo: { offset: 0, limit: 50, total: 1, nextCursor: null, hasMore: false } } },
    ActiveMahjongMatches: { activeMahjongMatches: [] },
    MahjongTables: { mahjongTables: [{ id: "table-A1", name: "A1 麻将桌", code: "A1" }] },
  };
  await mockGraphQL(page, mocks);
}

async function openChat(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("table.table")).toBeVisible();
  const toggle = page.locator(".hidden.lg\\:block.fixed button:has(svg)").first();
  if (await toggle.isVisible()) await toggle.click();
  await expect(page.getByText("AI 助手").last()).toBeVisible();
}

async function sendChat(page: Page, message: string) {
  await page.locator('textarea[placeholder="输入消息..."]').fill(message);
  await page.locator("form button.btn-primary.btn-square").last().click();
}

async function applyChip(page: Page, syntax: string) {
  const chip = page.locator("button.badge-primary", { hasText: syntax });
  await expect(chip).toBeVisible();
  await chip.click();
}

function searchResponse(syntax: string) {
  return { text: "已生成筛选", toolCalls: [{ id: "search", name: "format_search_query", result: syntax }] };
}

function queryResponse() {
  return { text: "查询完成", toolCalls: [{ id: "query", name: "query_gql", result: { items: [{ id: "order-001" }] } }] };
}

function mutationResponse(id: string) {
  return { text: "请确认", toolCalls: [{ id, name: "mutate_gql", result: { mutationId: id, query: "mutation { pauseOrder(id: \"ABC\") { id } }", variables: { id: "ABC" }, description: "暂停订单ABC" } }] };
}

function order(id: string, tableCode: string, nickname: string, status: string) {
  return { id, tableId: `table-${tableCode}`, userId: "user-001", tempId: null, nickname, uid: id, phone: "13800000000", seats: 2, status, startAt: "2024-06-01T00:00:00.000Z", endAt: null, finalPrice: null, pricingSnapshotId: null, table: { id: `table-${tableCode}`, name: `${tableCode} 桌`, code: tableCode, scope: "boardgame" } };
}

function user(id: string, name: string, role: string) {
  return { id, uid: id, name, email: `${id}@test.local`, image: null, role, nickname: name, phone: "13800000000", points: 100, preferredLocale: "zh-CN", preferredStoreId: "demo", meta: null, createdAt: "2024-06-01T00:00:00.000Z", membershipPlans: [] };
}
