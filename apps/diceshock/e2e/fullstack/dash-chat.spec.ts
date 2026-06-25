import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";
import { mockChatConfirm, mockChatStream } from "../fixtures/chat.fixture";
import { mockGraphQL, type GraphQLMocks } from "../fixtures/graphql.fixture";

test.describe("Dash AI agent full flows", () => {
  test.describe("Agent Query Tool", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    test("sends order query and renders assistant text", async ({ page }) => {
      await mockChatStream(page, queryResponse("已查询所有活跃订单"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "显示所有活跃订单");
      await expect(page.getByText("已查询所有活跃订单")).toBeVisible();
      await expect(page.getByText("查询结果")).toBeVisible();
    });

    test("query result expands JSON", async ({ page }) => {
      await mockChatStream(page, queryResponse("订单数据如下"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "查订单");
      await page.getByRole("button", { name: "展开" }).click();
      await expect(page.locator("pre")).toContainText("orders");
    });

    test("query result can collapse", async ({ page }) => {
      await mockChatStream(page, queryResponse("订单数据如下"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "查订单");
      await page.getByRole("button", { name: "展开" }).click();
      await page.getByRole("button", { name: "收起" }).click();
      await expect(page.locator("pre")).not.toBeVisible();
    });

    test("query respects orders page context", async ({ page }) => {
      let contextPage = "";
      await mockChatStream(page, ({ body }) => {
        contextPage = getChatContextPage(body);
        return queryResponse(`当前页面是 ${contextPage}`);
      });
      await openDesktopChat(page, "/dash/orders?q=status%3Aactive");
      await sendChat(page, "当前页面是什么");
      await expect.poll(() => contextPage).toContain("/dash/orders");
      await expect(page.getByText(/当前页面是/)).toBeVisible();
    });

    test("query renders user bubble and assistant bubble", async ({ page }) => {
      await mockChatStream(page, queryResponse("收到"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "显示所有活跃订单");
      await expect(page.locator(".chat.chat-end")).toContainText("显示所有活跃订单");
      await expect(page.locator(".chat.chat-start").last()).toContainText("收到");
    });
  });

  test.describe("Agent Mutation Tool", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    test("mutation preview renders confirmation card", async ({ page }) => {
      await mockChatStream(page, mutationResponse("mut-001", "暂停订单 ABC"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "暂停订单 ABC");
      await expect(page.getByText("暂停订单 ABC")).toBeVisible();
      await expect(page.getByRole("button", { name: /确认执行/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /取消/ })).toBeVisible();
    });

    test("confirmation card displays GraphQL query", async ({ page }) => {
      await mockChatStream(page, mutationResponse("mut-002", "暂停订单 ABC"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "暂停订单 ABC");
      await page.getByRole("button", { name: "查看 GraphQL" }).click();
      await expect(page.locator("pre")).toContainText("mutation");
    });

    test("confirm posts to confirm endpoint and shows executed", async ({ page }) => {
      const mutationIds: string[] = [];
      await mockChatStream(page, mutationResponse("mut-003", "暂停订单 ABC"));
      await page.route("**/api/chat/confirm", async (route) => {
        const payload = route.request().postDataJSON();
        if (hasStringProperty(payload, "mutationId")) mutationIds.push(payload.mutationId);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
      });
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "暂停订单 ABC");
      await page.getByRole("button", { name: /确认执行/ }).click();
      await expect(page.getByText("已执行")).toBeVisible();
      expect(mutationIds).toContain("mut-003");
    });

    test("reject flow shows rejected state", async ({ page }) => {
      await mockChatStream(page, mutationResponse("mut-004", "暂停订单 ABC"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "暂停订单 ABC");
      await page.getByRole("button", { name: /取消/ }).click();
      await expect(page.getByText(/已取消|已拒绝/)).toBeVisible();
    });

    test("expired mutation shows expired badge", async ({ page }) => {
      await mockChatStream(page, mutationResponse("mut-expired", "暂停过期订单"));
      await mockChatConfirm(page, { status: 404, body: { error: "Mutation preview not found or expired" } });
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "暂停订单");
      await page.getByRole("button", { name: /确认执行/ }).click();
      await expect(page.getByText("已过期")).toBeVisible();
    });

    test("confirm refreshes active Apollo queries", async ({ page }) => {
      const gqlCalls: string[] = [];
      await setupChatDash(page, gqlCalls);
      await mockChatStream(page, mutationResponse("mut-refresh", "暂停订单 ABC"));
      await mockChatConfirm(page);
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "暂停订单 ABC");
      await page.getByRole("button", { name: /确认执行/ }).click();
      await expect.poll(() => gqlCalls.filter((name) => name === "Orders").length).toBeGreaterThan(1);
    });
  });

  test.describe("Agent Search Bridge", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    for (const [path, phrase, syntax] of [
      ["/dash/orders", "帮我找活跃的A1桌订单", "status:active table:A1"],
      ["/dash/tables", "帮我找启用固定桌", "type:fixed status:active"],
      ["/dash/users", "找管理员", "role:admin"],
      ["/dash/gsz", "找未同步半庄", "format:hanchan sync:unsynced"],
    ] as const) {
      test(`search chip applies syntax on ${path}`, async ({ page }) => {
        await mockChatStream(page, searchResponse(syntax));
        await openDesktopChat(page, path);
        await sendChat(page, phrase);
        const chip = page.locator("button.badge-primary", { hasText: syntax });
        await expect(chip).toBeVisible();
        await chip.click();
        await expect(page.locator('input[type="search"]')).toHaveValue(syntax);
        await expect(page).toHaveURL(/q=/);
      });
    }

    test("search chip text matches generated syntax", async ({ page }) => {
      await mockChatStream(page, searchResponse("table:A1 status:active"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "搜索A1活跃订单");
      await expect(page.locator("button.badge-primary")).toHaveText(/table:A1 status:active/);
    });
  });

  test.describe("Agent TOTP", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    test("renders generated TOTP code", async ({ page }) => {
      await mockChatStream(page, totpResponse("123456"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "生成签到码");
      await expect(page.getByText("123456")).toBeVisible();
    });

    test("TOTP has copy button and remaining seconds", async ({ page }) => {
      await mockChatStream(page, totpResponse("654321"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "生成签到码");
      await expect(page.getByText("30s")).toBeVisible();
      await expect(page.locator("button.btn-square").last()).toBeVisible();
    });
  });

  test.describe("Agent Search Rules", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    test("renders rules card", async ({ page }) => {
      await mockChatStream(page, rulesResponse());
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "法师的施法能力是什么");
      await expect(page.getByText(/规则搜索/)).toBeVisible();
    });

    test("rules card expands markdown content", async ({ page }) => {
      await mockChatStream(page, rulesResponse());
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "法师规则");
      await page.getByRole("button", { name: "展开" }).click();
      await expect(page.getByText(/法师可以准备法术/)).toBeVisible();
    });
  });

  test.describe("Agent Context Awareness", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    for (const path of ["/dash/orders", "/dash/users", "/dash/tables", "/dash/actives", "/dash/events", "/dash/gsz"] as const) {
      test(`knows current page ${path}`, async ({ page }) => {
        await mockChatStream(page, ({ body }) => ({ text: `当前页面 ${getChatContextPage(body)}` }));
        await openDesktopChat(page, `${path}?q=status%3Aactive`);
        await sendChat(page, "当前页面是什么");
        await expect(page.getByText(path)).toBeVisible();
      });
    }

    test("context request is sent with chat stream", async ({ page }) => {
      let bodySnapshot: Record<string, unknown> = {};
      await mockChatStream(page, ({ body }) => {
        bodySnapshot = body;
        return { text: "上下文已收到" };
      });
      await openDesktopChat(page, "/dash/orders?q=status%3Aactive");
      await sendChat(page, "上下文是什么");
      await expect.poll(() => JSON.stringify(bodySnapshot)).toContain("/dash/orders");
    });
  });

  test.describe("Agent Error Handling", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    for (const [status, expected] of [[500, /server|500|error|错误/i], [429, /429|rate|limit|限制/i]] as const) {
      test(`stream ${status} shows error and retry`, async ({ page }) => {
        await mockChatStream(page, { status, error: `${status} mocked` });
        await openDesktopChat(page, "/dash/orders");
        await sendChat(page, "触发错误");
        await expect(page.getByText(expected)).toBeVisible();
        await expect(page.getByRole("button", { name: "重试" })).toBeVisible();
      });
    }

    test("network disconnect during stream is graceful", async ({ page }) => {
      await page.route("**/api/chat/stream", async (route) => route.abort("failed"));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "断网");
      await expect(page.getByRole("button", { name: "重试" })).toBeVisible();
    });
  });

  test.describe("Agent Mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });
    test.beforeEach(async ({ page, mockStaffSession }) => setupChatDash(page));

    test("FAB opens bottom sheet", async ({ page }) => {
      await page.goto("/dash/orders");
      await expect(page.locator("table.table")).toBeVisible();
      await page.locator(".btn-circle.btn-primary").click();
      await expect(page.getByText("AI 助手").last()).toBeVisible();
    });

    test("mobile sends and receives message", async ({ page }) => {
      await mockChatStream(page, { text: "移动端回复" });
      await openMobileChat(page, "/dash/orders");
      await sendChat(page, "移动端消息");
      await expect(page.getByText("移动端回复")).toBeVisible();
    });

    test("mobile renders tool result", async ({ page }) => {
      await mockChatStream(page, queryResponse("移动端查询"));
      await openMobileChat(page, "/dash/orders");
      await sendChat(page, "查订单");
      await expect(page.getByText("查询结果")).toBeVisible();
    });

    test("mobile search chip applies to table", async ({ page }) => {
      await mockChatStream(page, searchResponse("status:active"));
      await openMobileChat(page, "/dash/orders");
      await sendChat(page, "找活跃订单");
      await page.locator("button.badge-primary", { hasText: "status:active" }).click();
      await expect(page.locator('input[type="search"]')).toHaveValue("status:active");
    });

    test("mobile sheet can be dismissed", async ({ page }) => {
      await openMobileChat(page, "/dash/orders");
      await page.locator("button.btn-square").first().click();
      await expect(page.getByText("AI 助手").last()).not.toBeVisible();
    });
  });
});

function getChatContextPage(body: Record<string, unknown>) {
  const context = body.context;
  if (!context || typeof context !== "object") return "";
  const page = (context as Record<string, unknown>).page;
  return typeof page === "string" ? page : "";
}

function hasStringProperty(value: unknown, key: string): value is Record<typeof key, string> {
  return !!value && typeof value === "object" && typeof (value as Record<string, unknown>)[key] === "string";
}

async function setupChatDash(page: Page, calls: string[] = []) {
  const mocks: GraphQLMocks = {
    Orders: () => {
      calls.push("Orders");
      return { orders: { items: [order("order-001", "A1", "张三", "ACTIVE")], pageInfo: { offset: 0, limit: 50, total: 1, nextCursor: null, hasMore: false } } };
    },
    PublishedPricing: { publishedPricing: null },
    Users: () => ({ managedUsers: { items: [user("user-001", "Alice Admin", "ADMIN")], pageInfo: { offset: 0, limit: 30, total: 1, nextCursor: null, hasMore: false } } }),
    ManagedTables: { managedTables: [{ id: "table-001", name: "A1 主桌", type: "FIXED", scope: "boardgame", status: "ACTIVE", capacity: 6, code: "A1", description: null, storeId: "demo", occupancies: [], createdAt: "2024-06-01T00:00:00.000Z", updatedAt: "2024-06-01T00:00:00.000Z" }] },
    ManagedActives: { managedActives: [{ id: "active-001", creatorId: "user-001", creator: { id: "user-001", name: "Alice" }, title: "活跃跑团", boardGameId: null, boardGame: null, storeId: "demo", date: "2026-07-01", time: "19:00", maxPlayers: 5, content: "mock", isGame: true, registrations: [], createdAt: "2024-06-01T00:00:00.000Z", updatedAt: "2024-06-01T00:00:00.000Z" }] },
    ManagedEvents: { managedEvents: [{ id: "event-001", title: "Game Night", description: "mock", coverImageUrl: null, content: "mock", isPublished: true, createdAt: "2024-06-01T00:00:00.000Z", updatedAt: "2024-06-01T00:00:00.000Z" }] },
    ManagedMahjongMatches: { managedMahjongMatches: { items: [{ id: "match-001", tableId: "table-A1", table: { id: "table-A1", name: "A1 麻将桌", code: "A1", scope: "mahjong" }, matchType: "tournament", gszRecordId: null, gszSynced: false, gszError: null, gszSyncedAt: null, mode: "4p", format: "hanchan", startedAt: "2024-06-01T00:00:00.000Z", endedAt: "2024-06-01T01:00:00.000Z", terminationReason: "score_complete", players: [], playersJson: "[]", unsyncableReasons: [] }], pageInfo: { offset: 0, limit: 50, total: 1, nextCursor: null, hasMore: false } } },
    ActiveMahjongMatches: { activeMahjongMatches: [] },
    MahjongTables: { mahjongTables: [{ id: "table-A1", name: "A1 麻将桌", code: "A1" }] },
  };
  await mockGraphQL(page, mocks);
}

async function openDesktopChat(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("table.table")).toBeVisible();
  await page.locator(".hidden.lg\\:block.fixed button:has(svg)").first().click();
  await expect(page.getByText("AI 助手")).toBeVisible();
}

async function openMobileChat(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("table.table")).toBeVisible();
  await page.locator(".btn-circle.btn-primary").click();
  await expect(page.getByText("AI 助手").last()).toBeVisible();
}

async function sendChat(page: Page, message: string) {
  await page.locator('textarea[placeholder="输入消息..."]').fill(message);
  await page.locator("form button.btn-primary.btn-square").last().click();
}

function queryResponse(text: string) {
  return { text, toolCalls: [{ id: "query-001", name: "query_gql", args: { query: "query { orders { items { id } } }" }, result: { orders: [{ id: "order-001", status: "ACTIVE" }] } }] };
}

function mutationResponse(id: string, description: string) {
  return { text: "我准备执行以下操作", toolCalls: [{ id, name: "mutate_gql", args: { query: "mutation PauseOrder($id: ID!) { pauseOrder(id: $id) { id } }" }, result: { mutationId: id, query: "mutation PauseOrder($id: ID!) { pauseOrder(id: $id) { id status } }", variables: { id: "ABC" }, description } }] };
}

function searchResponse(syntax: string) {
  return { text: "已生成筛选", toolCalls: [{ id: "search-001", name: "format_search_query", args: { description: syntax }, result: syntax }] };
}

function totpResponse(code: string) {
  return { text: "签到码如下", toolCalls: [{ id: "totp-001", name: "generate_totp", result: { code, remaining_seconds: 30 } }] };
}

function rulesResponse() {
  return { text: "找到规则", toolCalls: [{ id: "rules-001", name: "search_rules", args: { query: "法师施法" }, result: { results: [{ source: "PHB", text: "法师可以准备法术，并使用法术位施放。" }] } }] };
}

function order(id: string, tableCode: string, nickname: string, status: string) {
  return { id, tableId: `table-${tableCode}`, userId: "user-001", tempId: null, nickname, uid: id, phone: "13800000000", seats: 2, status, startAt: "2024-06-01T00:00:00.000Z", endAt: null, finalPrice: null, pricingSnapshotId: null, table: { id: `table-${tableCode}`, name: `${tableCode} 桌`, code: tableCode, scope: "boardgame" } };
}

function user(id: string, name: string, role: string) {
  return { id, uid: id, name, email: `${id}@test.local`, image: null, role, nickname: name, phone: "13800000000", points: 100, preferredLocale: "zh-CN", preferredStoreId: "demo", meta: null, createdAt: "2024-06-01T00:00:00.000Z", membershipPlans: [] };
}
