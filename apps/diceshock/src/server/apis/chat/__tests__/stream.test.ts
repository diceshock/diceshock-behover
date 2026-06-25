import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  createOpenAI: vi.fn(),
  streamText: vi.fn(),
  createChatTools: vi.fn(),
  storeFindFirst: vi.fn(),
  userInfoFindFirst: vi.fn(),
}));

vi.mock("@hono/auth-js", () => ({
  getAuthUser: mocks.getAuthUser,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: mocks.createOpenAI,
}));

vi.mock("ai", () => ({
  streamText: mocks.streamText,
}));

vi.mock("../tools", () => ({
  createChatTools: mocks.createChatTools,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({ kind: "where" })),
}));

vi.mock("@lib/db", () => ({
  default: vi.fn(() => ({
    query: {
      storesTable: { findFirst: mocks.storeFindFirst },
      userInfoTable: { findFirst: mocks.userInfoFindFirst },
    },
  })),
  storesTable: { id: "stores.id" },
  userInfoTable: { id: "user_info.id" },
}));

import chatStream, {
  buildSystemPrompt,
  checkChatRateLimit,
  resetChatRateLimits,
  validateChatStreamBody,
} from "../stream";

function createApp() {
  const app = new Hono();
  app.route("/", chatStream);
  return app;
}

function staffAuth(userId = "user-1") {
  return {
    token: {
      sub: userId,
      name: "店长小骰",
      role: "staff",
      preferredStoreId: "store-1",
    },
    user: { id: userId, name: "店长小骰" },
  };
}

function postBody(body: unknown) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("Chat Stream - production AI SDK endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChatRateLimits();
    mocks.getAuthUser.mockResolvedValue(staffAuth());
    mocks.createOpenAI.mockReturnValue((modelId: string) => ({ modelId }));
    mocks.createChatTools.mockReturnValue({
      query_gql: {
        description: "query",
        parameters: { type: "object", properties: {}, required: [] },
        execute: vi.fn(),
      },
    });
    mocks.streamText.mockReturnValue({
      toDataStreamResponse: () =>
        new Response('0:"ok"\n', {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Vercel-AI-Data-Stream": "v1",
          },
        }),
    });
    mocks.storeFindFirst.mockResolvedValue({
      id: "store-1",
      code: "gg",
      name: "光谷店",
      address: "武汉市洪山区鲁磨路光谷广场",
    });
    mocks.userInfoFindFirst.mockResolvedValue({
      preferred_store_id: "store-1",
    });
  });

  it("registers POST / route on the Hono instance", () => {
    const app = createApp();
    const postRoute = app.routes.find(
      (route) => route.method === "POST" && route.path === "/",
    );
    expect(postRoute).toBeDefined();
  });

  it("returns 401 when session is missing", async () => {
    mocks.getAuthUser.mockResolvedValue(null);
    const res = await createApp().request(
      "/",
      postBody({ messages: [{ role: "user", content: "你好" }] }),
      { DEEPSEEK_API_KEY: "test-key", DB: {} },
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for authenticated non-staff users", async () => {
    mocks.getAuthUser.mockResolvedValue({
      token: { sub: "customer-1", role: "customer", name: "玩家" },
      user: { id: "customer-1", name: "玩家" },
    });
    const res = await createApp().request(
      "/",
      postBody({ messages: [{ role: "user", content: "你好" }] }),
      { DEEPSEEK_API_KEY: "test-key", DB: {} },
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 when DEEPSEEK_API_KEY is not configured", async () => {
    const res = await createApp().request(
      "/",
      postBody({ messages: [{ role: "user", content: "你好" }] }),
      { DB: {} },
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "DEEPSEEK_API_KEY not configured",
    });
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await createApp().request(
      "/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      },
      { DEEPSEEK_API_KEY: "test-key", DB: {} },
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("validates that messages is required", () => {
    const result = validateChatStreamBody({
      context: { page: "/dash/orders" },
    });
    expect(result).toEqual({
      ok: false,
      error: "Missing or invalid 'messages' field",
    });
  });

  it("validates page context shape", () => {
    const result = validateChatStreamBody({
      messages: [{ role: "user", content: "你好" }],
      context: { filters: {} },
    });
    expect(result).toEqual({
      ok: false,
      error: "Invalid 'context.page' field",
    });
  });

  it("limits each user to 10 requests per minute", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkChatRateLimit("user-1", 1_000).allowed).toBe(true);
    }
    const blocked = checkChatRateLimit("user-1", 1_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfter).toBe(60);
  });

  it("rate limits users independently", () => {
    for (let i = 0; i < 10; i++) checkChatRateLimit("user-1", 1_000);
    expect(checkChatRateLimit("user-2", 1_000).allowed).toBe(true);
  });

  it("returns 429 with Retry-After when route rate limit is exceeded", async () => {
    const app = createApp();
    for (let i = 0; i < 10; i++) {
      await app.request(
        "/",
        postBody({ messages: [{ role: "user", content: `第${i}次` }] }),
        { DEEPSEEK_API_KEY: "test-key", DB: {} },
      );
    }
    const res = await app.request(
      "/",
      postBody({ messages: [{ role: "user", content: "第11次" }] }),
      { DEEPSEEK_API_KEY: "test-key", DB: {} },
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(await res.json()).toEqual({ error: "Rate limit exceeded" });
  });

  it("streams a useChat-compatible data response", async () => {
    const res = await createApp().request(
      "/",
      postBody({ messages: [{ role: "user", content: "订单今天怎么样" }] }),
      { DEEPSEEK_API_KEY: "test-key", DB: {} },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(res.headers.get("X-Vercel-AI-Data-Stream")).toBe("v1");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("9");
  });

  it("configures DeepSeek reasoner through OpenAI-compatible provider", async () => {
    await createApp().request(
      "/",
      postBody({ messages: [{ role: "user", content: "查订单" }] }),
      {
        DEEPSEEK_API_KEY: "test-key",
        CF_ACCOUNT_ID: "account-1",
        CF_AI_GATEWAY_ID: "gateway-1",
        DB: {},
      },
    );
    expect(mocks.createOpenAI).toHaveBeenCalledWith({
      apiKey: "test-key",
      baseURL:
        "https://gateway.ai.cloudflare.com/v1/account-1/gateway-1/deepseek",
      compatibility: "compatible",
    });
    expect(mocks.streamText.mock.calls[0][0].model).toEqual({
      modelId: "deepseek-v4-pro",
    });
  });

  it("passes conversation and page context into streamText", async () => {
    await createApp().request(
      "/",
      postBody({
        messages: [
          { role: "user", content: "只看暂停订单" },
          { role: "assistant", content: "可以" },
        ],
        context: {
          page: "/dash/orders",
          filters: { status: "paused", store: "gg" },
        },
      }),
      { DEEPSEEK_API_KEY: "test-key", DB: {} },
    );
    const options = mocks.streamText.mock.calls[0][0];
    expect(options.messages).toHaveLength(2);
    expect(options.system).toContain("骰子奇兵后台助手");
    expect(options.system).toContain("/dash/orders");
    expect(options.system).toContain('"status": "paused"');
    expect(options.system).toContain("店长小骰");
    expect(options.system).toContain("光谷店");
  });

  it("builds a prompt with tool descriptions and safety rules", () => {
    const prompt = buildSystemPrompt({
      identity: {
        userId: "admin-1",
        role: "admin",
        name: "管理员",
        preferredStoreId: "store-1",
      },
      store: {
        id: "store-1",
        code: "jdk",
        name: "街道口店",
        address: "武汉市洪山区珞喻路街道口",
      },
      pageContext: { page: "/dash/users", filters: { role: "staff" } },
    });
    expect(prompt).toContain("使用中文回复");
    expect(prompt).toContain("Markdown");
    expect(prompt).toContain("所有 mutation 都必须先调用 mutate_gql");
    expect(prompt).toContain("query_gql");
    expect(prompt).toContain("mutate_gql");
    expect(prompt).toContain("format_search_query");
  });

  it("creates request-scoped real tools for streamText", async () => {
    await createApp().request(
      "/",
      postBody({ messages: [{ role: "user", content: "查订单" }] }),
      { DEEPSEEK_API_KEY: "test-key", DB: {}, KV: {} },
    );
    expect(mocks.createChatTools).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: {
          userId: "user-1",
          role: "staff",
          preferredStoreId: "store-1",
        },
      }),
    );
    expect(mocks.streamText.mock.calls[0][0].tools).toBe(
      mocks.createChatTools.mock.results[0].value,
    );
  });
});
