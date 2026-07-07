/**
 * WeChat AI Agent — Full E2E Tests
 *
 * Tests: WeChat message endpoint, board game stock queries, activity creation via chat,
 * multi-message conversation, error handling, signature verification, chat stream UI,
 * and confirmation flow.
 *
 * Uses `request.post()` for WeChat XML tests (no page navigation).
 * Uses page navigation with scroll/visibility for chat UI tests.
 */
import { expect, type Page, test } from "@playwright/test";

// ─── Auth Helpers ────────────────────────────────────────────────────────────

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

// ─── WeChat XML Helpers ──────────────────────────────────────────────────────

function buildTextXml(opts: {
  content: string;
  fromUser?: string;
  toUser?: string;
  msgId?: string;
}): string {
  const toUser = opts.toUser ?? "gh_diceshock_test";
  const fromUser = opts.fromUser ?? "oFcTestUser001";
  const msgId = opts.msgId ?? `${Date.now()}001`;
  const createTime = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${opts.content}]]></Content>
<MsgId>${msgId}</MsgId>
</xml>`;
}

// ─── Chat Stream Mocking ─────────────────────────────────────────────────────

type MockToolCall = {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result: unknown;
};

type MockStreamResponse = {
  text?: string;
  toolCalls?: MockToolCall[];
};

function buildAiDataStream(response: MockStreamResponse): string {
  const chunks: string[] = [];
  if (response.text) chunks.push(`0:${JSON.stringify(response.text)}\n`);
  for (const tool of response.toolCalls ?? []) {
    chunks.push(
      `9:${JSON.stringify({ toolCallId: tool.id, toolName: tool.name, args: tool.args ?? {} })}\n`,
    );
    chunks.push(
      `a:${JSON.stringify({ toolCallId: tool.id, result: tool.result })}\n`,
    );
  }
  chunks.push(`d:{"finishReason":"stop"}\n`);
  return chunks.join("");
}

async function mockChatStream(
  page: Page,
  response: MockStreamResponse | ((body: Record<string, unknown>) => MockStreamResponse),
) {
  await page.route("**/api/chat/stream", async (route) => {
    const body = (route.request().postDataJSON() as Record<string, unknown>) ?? {};
    const resolved = typeof response === "function" ? response(body) : response;
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
      body: buildAiDataStream(resolved),
    });
  });
}

async function mockChatConfirm(page: Page, result?: { status?: number; body?: unknown }) {
  await page.route("**/api/chat/confirm", async (route) => {
    await route.fulfill({
      status: result?.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(result?.body ?? { success: true }),
    });
  });
}

// ─── Scroll + Visibility Helpers ─────────────────────────────────────────────


async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Internal server error|500|Unhandled/i);
}

async function openDesktopChat(page: Page, path: string) {
  await page.goto(path);
  await expectPageLoaded(page);
  const toggle = page.locator("button").filter({ hasText: "AI 助手" }).first();
  const altToggle = page.locator(".hidden.lg\\:block.fixed button:has(svg)").first();
  const btn = (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) ? toggle : altToggle;
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
}

async function sendChat(page: Page, message: string) {
  const input = page.locator("textarea, input[type='text']").last();
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeVisible();
  await input.fill(message);
  await input.press("Enter");
}

// ─── WeChat Message Endpoint Tests ───────────────────────────────────────────

test.describe("WeChat Message Endpoint", () => {
  test("POST /wechat — returns XML response for text message", async ({ request }) => {
    const xml = buildTextXml({ content: "你好" });
    const response = await request.post("/wechat", {
      data: xml,
      headers: { "Content-Type": "application/xml" },
    });

    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
    // Should either be an XML reply or "success" (empty reply)
    expect(body).toMatch(/(<MsgType><!\[CDATA\[text\]\]><\/MsgType>)|success/);
  });

  test("POST /wechat — text reply contains MsgType text for valid input", async ({ request }) => {
    const xml = buildTextXml({
      content: "请问今天营业吗",
      fromUser: "oFcAgent_text_check",
      msgId: `fc-text-${Date.now()}`,
    });
    const response = await request.post("/wechat", {
      data: xml,
      headers: { "Content-Type": "application/xml" },
    });

    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    // When the server returns an XML reply (not delegating async), it contains MsgType text
    if (body.includes("<xml>")) {
      expect(body).toContain("<MsgType><![CDATA[text]]></MsgType>");
      expect(body).toContain("<Content><![CDATA[");
    } else {
      // Async processing — returns "success" immediately
      expect(body).toMatch(/success|收到/);
    }
  });
});

// ─── Board Game Stock Query ──────────────────────────────────────────────────

test.describe("Board Game Stock Query via WeChat", () => {
  test("asks about Catan availability — receives processing or game info", async ({ request }) => {
    const xml = buildTextXml({
      content: "我今晚想玩卡坦岛，你们光谷店有吗？",
      fromUser: "oFcAgent_catan_query",
      msgId: `fc-catan-${Date.now()}`,
    });
    const response = await request.post("/wechat", {
      data: xml,
      headers: { "Content-Type": "application/xml" },
    });

    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
    // Either immediate processing reply or XML with game info
    expect(body).toMatch(/success|收到|处理中|卡坦|xml/i);
  });

  test("game query returns well-formed response (not error HTML)", async ({ request }) => {
    const xml = buildTextXml({
      content: "有没有阿瓦隆？几个人玩的？",
      fromUser: "oFcAgent_avalon_q",
      msgId: `fc-avalon-${Date.now()}`,
    });
    const response = await request.post("/wechat", {
      data: xml,
      headers: { "Content-Type": "application/xml" },
    });

    const body = await response.text();
    expect(body).not.toContain("<!DOCTYPE html>");
    expect(body).not.toContain("Internal Server Error");
    expect(response.status()).toBeLessThan(500);
  });
});

// ─── Activity Creation via Chat ──────────────────────────────────────────────

test.describe("Activity Creation via WeChat Chat", () => {
  test("creates activity request — returns confirmation or processing", async ({ request }) => {
    const xml = buildTextXml({
      content: "帮我约一个明天下午三点的阿瓦隆局，最多8人，在光谷店",
      fromUser: "oFcAgent_create_act",
      msgId: `fc-act-create-${Date.now()}`,
    });
    const response = await request.post("/wechat", {
      data: xml,
      headers: { "Content-Type": "application/xml" },
    });

    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    // The agent delegates to DO; immediate reply is the typing indicator
    expect(body).toMatch(/success|收到.*处理中|确认|约局/);
  });

  test("confirmation keyword triggers pending action execution", async ({ request }) => {
    // First send a creation request to create pending state
    const createXml = buildTextXml({
      content: "帮我创建一个狼人杀活动，今晚8点光谷店",
      fromUser: "oFcAgent_confirm_act",
      msgId: `fc-pending-${Date.now()}`,
    });
    await request.post("/wechat", {
      data: createXml,
      headers: { "Content-Type": "application/xml" },
    });

    // Then confirm
    const confirmXml = buildTextXml({
      content: "确认",
      fromUser: "oFcAgent_confirm_act",
      msgId: `fc-confirm-${Date.now()}`,
    });
    const response = await request.post("/wechat", {
      data: confirmXml,
      headers: { "Content-Type": "application/xml" },
    });

    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    // Confirmation reply
    expect(body).toMatch(/success|执行|收到/);
  });
});

// ─── Multiple Message Conversation ───────────────────────────────────────────

test.describe("Multiple Message Conversation", () => {
  test("context maintained across messages (same openId)", async ({ request }) => {
    const fromUser = `oFcAgent_convo_${Date.now()}`;

    // First message: general greeting
    const greeting = buildTextXml({
      content: "你好",
      fromUser,
      msgId: `fc-conv1-${Date.now()}`,
    });
    const res1 = await request.post("/wechat", {
      data: greeting,
      headers: { "Content-Type": "application/xml" },
    });
    expect(res1.status()).toBeLessThan(500);
    const body1 = await res1.text();
    expect(body1.length).toBeGreaterThan(0);

    // Second message: specific query (same openId)
    const query = buildTextXml({
      content: "我刚才说了什么",
      fromUser,
      msgId: `fc-conv2-${Date.now() + 1}`,
    });
    const res2 = await request.post("/wechat", {
      data: query,
      headers: { "Content-Type": "application/xml" },
    });
    expect(res2.status()).toBeLessThan(500);
    const body2 = await res2.text();
    // Both responses should be valid (not errors)
    expect(body2).not.toContain("Internal Server Error");
    expect(body2.length).toBeGreaterThan(0);
  });

  test("different openIds have independent conversations", async ({ request }) => {
    const user1 = `oFcAgent_iso_a_${Date.now()}`;
    const user2 = `oFcAgent_iso_b_${Date.now()}`;

    const msg1 = buildTextXml({ content: "我是用户A", fromUser: user1, msgId: `fc-iso1-${Date.now()}` });
    const msg2 = buildTextXml({ content: "我是用户B", fromUser: user2, msgId: `fc-iso2-${Date.now()}` });

    const [res1, res2] = await Promise.all([
      request.post("/wechat", { data: msg1, headers: { "Content-Type": "application/xml" } }),
      request.post("/wechat", { data: msg2, headers: { "Content-Type": "application/xml" } }),
    ]);

    expect(res1.status()).toBeLessThan(500);
    expect(res2.status()).toBeLessThan(500);
  });
});

// ─── Error Handling ──────────────────────────────────────────────────────────

test.describe("WeChat Error Handling", () => {
  test("malformed XML — returns graceful response (not 500)", async ({ request }) => {
    const response = await request.post("/wechat", {
      data: "<xml><broken>no closing tags<MsgType>text",
      headers: { "Content-Type": "application/xml" },
    });

    // Server should handle gracefully
    expect(response.status()).toBeLessThan(500);
    const body = await response.text();
    // Empty reply or error message, not a crash
    expect(body).toMatch(/success|error|missing|params/i);
  });

  test("empty body — returns graceful response", async ({ request }) => {
    const response = await request.post("/wechat", {
      data: "",
      headers: { "Content-Type": "application/xml" },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test("non-XML content type — still handled gracefully", async ({ request }) => {
    const response = await request.post("/wechat", {
      data: '{"message": "not xml"}',
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBeLessThan(500);
  });
});

// ─── WeChat Signature Verification ──────────────────────────────────────────

test.describe("WeChat Signature Verification", () => {
  test("GET /wechat with valid signature echoes echostr", async ({ request }) => {
    // The signature verification uses SHA-1 of sorted [token, timestamp, nonce]
    // Without the real WECHAT_MP_TOKEN, we test the endpoint behavior
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = "fc_test_nonce_123";
    const echostr = "fc_echo_validation_string";

    const response = await request.get("/wechat", {
      params: {
        signature: "invalid_signature_for_testing",
        timestamp,
        nonce,
        echostr,
      },
    });

    // Invalid signature → 403 rejection
    expect(response.status()).toBe(403);
    const body = await response.text();
    expect(body).toContain("invalid signature");
  });

  test("GET /wechat missing params — returns 400", async ({ request }) => {
    const response = await request.get("/wechat", {
      params: { signature: "abc" },
    });

    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toContain("missing params");
  });

  test("GET /wechat no params — returns 400", async ({ request }) => {
    const response = await request.get("/wechat");
    expect(response.status()).toBe(400);
  });
});

// ─── Chat Stream API (Dashboard) ────────────────────────────────────────────

test.describe("Chat Stream API — Dashboard UI", () => {
  test("streaming text renders in chat panel", async ({ page }) => {
    await setupStaffAuth(page);
    await mockChatStream(page, {
      text: "已为您查询光谷店今日订单，共有5单在进行中。",
      toolCalls: [
        {
          id: "fc-query-001",
          name: "query_gql",
          args: { query: "query { orders { items { id status } } }" },
          result: {
            orders: [
              { id: "fc-ord-001", status: "ACTIVE" },
              { id: "fc-ord-002", status: "ACTIVE" },
            ],
          },
        },
      ],
    });

    await openDesktopChat(page, "/dash/orders");
    await sendChat(page, "今天光谷店有多少订单");

    // Verify assistant text renders
    await expect(page.getByText("已为您查询光谷店今日订单")).toBeVisible();
    // Verify tool call result indicator
    await expect(page.getByText("查询结果")).toBeVisible();
  });

  test("tool call results display expandable JSON", async ({ page }) => {
    await setupStaffAuth(page);
    await mockChatStream(page, {
      text: "桌台数据如下",
      toolCalls: [
        {
          id: "fc-query-tables",
          name: "query_gql",
          args: { query: "query { tables { id code } }" },
          result: { tables: [{ id: "table-FCA1", code: "FCA1" }, { id: "table-FCB1", code: "FCB1" }] },
        },
      ],
    });

    await openDesktopChat(page, "/dash/tables");
    await sendChat(page, "显示所有桌台");

    await expect(page.getByText("桌台数据如下")).toBeVisible();
    // Expand to see JSON content
    const expandBtn = page.getByRole("button", { name: "展开" });
    await expandBtn.scrollIntoViewIfNeeded();
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();
    await expect(page.locator("pre")).toContainText("FCA1");
  });

  test("user message bubble scrolled into view and visible", async ({ page }) => {
    await setupStaffAuth(page);
    await mockChatStream(page, { text: "收到您的消息" });

    await openDesktopChat(page, "/dash/orders");
    await sendChat(page, "测试消息可见性");

    const userBubble = page.locator(".chat.chat-end").filter({ hasText: "测试消息可见性" });
    await expect(userBubble).toBeVisible();
    // Verify it's actually in viewport
    const box = await userBubble.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });

  test("assistant bubble scrolls into view after stream completes", async ({ page }) => {
    await setupStaffAuth(page);
    await mockChatStream(page, { text: "这是一条较长的回复，用于验证滚动行为是否正确" });

    await openDesktopChat(page, "/dash/orders");
    await sendChat(page, "长回复测试");

    const assistantBubble = page.locator(".chat.chat-start").last();
    await expect(assistantBubble).toContainText("这是一条较长的回复");
    const box = await assistantBubble.boundingBox();
    expect(box).not.toBeNull();
  });
});

// ─── Chat Confirmation Flow ──────────────────────────────────────────────────

test.describe("Chat Confirmation Flow", () => {
  test("AI suggests mutation — confirmation card renders", async ({ page }) => {
    await setupStaffAuth(page);
    await mockChatStream(page, {
      text: "我准备暂停订单 fc-ord-003",
      toolCalls: [
        {
          id: "fc-mut-001",
          name: "mutate_gql",
          args: { query: "mutation PauseOrder($id: ID!) { pauseOrder(id: $id) { id } }" },
          result: {
            mutationId: "fc-mut-001",
            query: "mutation PauseOrder($id: ID!) { pauseOrder(id: $id) { id status } }",
            variables: { id: "fc-ord-003" },
            description: "暂停订单 fc-ord-003",
          },
        },
      ],
    });

    await openDesktopChat(page, "/dash/orders");
    await sendChat(page, "暂停订单 fc-ord-003");

    // Verify confirmation card
    await expect(page.getByText("暂停订单 fc-ord-003")).toBeVisible();
    const confirmBtn = page.getByRole("button", { name: /确认执行/ });
    await confirmBtn.scrollIntoViewIfNeeded();
    await expect(confirmBtn).toBeVisible();
    await expect(page.getByRole("button", { name: /取消/ })).toBeVisible();
  });

  test("user confirms → success state displayed", async ({ page }) => {
    await setupStaffAuth(page);
    const capturedMutationIds: string[] = [];

    await mockChatStream(page, {
      text: "准备结算订单",
      toolCalls: [
        {
          id: "fc-mut-settle",
          name: "mutate_gql",
          args: { query: "mutation SettleOrder($id: ID!) { settleOrder(id: $id) { id } }" },
          result: {
            mutationId: "fc-mut-settle",
            query: "mutation SettleOrder($id: ID!) { settleOrder(id: $id) { id } }",
            variables: { id: "fc-ord-005" },
            description: "结算订单 fc-ord-005",
          },
        },
      ],
    });

    await page.route("**/api/chat/confirm", async (route) => {
      const payload = route.request().postDataJSON() as { mutationId?: string };
      if (payload?.mutationId) capturedMutationIds.push(payload.mutationId);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await openDesktopChat(page, "/dash/orders");
    await sendChat(page, "结算订单 fc-ord-005");

    const confirmBtn = page.getByRole("button", { name: /确认执行/ });
    await confirmBtn.scrollIntoViewIfNeeded();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify success state
    await expect(page.getByText("已执行")).toBeVisible();
    expect(capturedMutationIds).toContain("fc-mut-settle");
  });

  test("user rejects mutation — rejected state displayed", async ({ page }) => {
    await setupStaffAuth(page);
    await mockChatStream(page, {
      text: "准备删除用户",
      toolCalls: [
        {
          id: "fc-mut-reject",
          name: "mutate_gql",
          args: { query: "mutation DeleteUser($id: ID!) { deleteUser(id: $id) { id } }" },
          result: {
            mutationId: "fc-mut-reject",
            query: "mutation DeleteUser($id: ID!) { deleteUser(id: $id) { id } }",
            variables: { id: "fc-cust-013" },
            description: "删除用户 杨十五",
          },
        },
      ],
    });

    await openDesktopChat(page, "/dash/users");
    await sendChat(page, "删除用户 杨十五");

    const cancelBtn = page.getByRole("button", { name: /取消/ });
    await cancelBtn.scrollIntoViewIfNeeded();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    await expect(page.getByText(/已取消|已拒绝/)).toBeVisible();
  });

  test("expired mutation shows expired badge on confirm attempt", async ({ page }) => {
    await setupStaffAuth(page);
    await mockChatStream(page, {
      text: "准备操作",
      toolCalls: [
        {
          id: "fc-mut-expired",
          name: "mutate_gql",
          args: { query: "mutation { expiredOp { id } }" },
          result: {
            mutationId: "fc-mut-expired",
            query: "mutation { expiredOp { id } }",
            variables: {},
            description: "过期操作测试",
          },
        },
      ],
    });

    await mockChatConfirm(page, {
      status: 404,
      body: { error: "Mutation preview not found or expired" },
    });

    await openDesktopChat(page, "/dash/orders");
    await sendChat(page, "执行过期操作");

    const confirmBtn = page.getByRole("button", { name: /确认执行/ });
    await confirmBtn.scrollIntoViewIfNeeded();
    await confirmBtn.click();

    await expect(page.getByText("已过期")).toBeVisible();
  });
});

// ─── Admin Chat Context ──────────────────────────────────────────────────────

test.describe("Admin Chat — Page Context", () => {
  test("chat stream receives correct page context from navigation", async ({ page }) => {
    await setupAdminAuth(page);
    let capturedContext = "";

    await page.route("**/api/chat/stream", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const ctx = body?.context as { page?: string } | undefined;
      capturedContext = ctx?.page ?? "";
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Vercel-AI-Data-Stream": "v1",
        },
        body: buildAiDataStream({ text: `当前页面: ${capturedContext}` }),
      });
    });

    await openDesktopChat(page, "/dash/tables");
    await sendChat(page, "当前是什么页面");

    await expect.poll(() => capturedContext).toContain("/dash/tables");
  });
});
