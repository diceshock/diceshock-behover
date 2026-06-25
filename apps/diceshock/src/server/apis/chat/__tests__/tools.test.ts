import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeGraphQL: vi.fn(),
  generateTOTP: vi.fn(),
  getRemainingSeconds: vi.fn(),
  getAuthUser: vi.fn(),
  selectResults: [] as unknown[][],
  dbFactory: vi.fn(),
}));

vi.mock("../../wechat/graphql", () => ({
  executeGraphQL: mocks.executeGraphQL,
}));

vi.mock("@/shared/utils/totp", () => ({
  generateTOTP: mocks.generateTOTP,
  getRemainingSeconds: mocks.getRemainingSeconds,
}));

vi.mock("@hono/auth-js", () => ({
  getAuthUser: mocks.getAuthUser,
}));

function createSelectBuilder(result: unknown[]) {
  const builder = Promise.resolve(result) as Promise<unknown[]> & {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };
  builder.from = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(result));
  return builder;
}

vi.mock("@lib/db", () => ({
  default: mocks.dbFactory,
  activeRegistrationsTable: {
    active_id: "active_registrations.active_id",
    user_id: "active_registrations.user_id",
    is_watching: "active_registrations.is_watching",
  },
  activesTable: {
    id: "actives.id",
    creator_id: "actives.creator_id",
    title: "actives.title",
  },
  userBusinessCardTable: {
    id: "business_cards.id",
    share_phone: "business_cards.share_phone",
    wechat: "business_cards.wechat",
    qq: "business_cards.qq",
    custom_content: "business_cards.custom_content",
  },
  userInfoTable: {
    id: "user_info.id",
    nickname: "user_info.nickname",
    phone: "user_info.phone",
  },
  drizzle: {
    eq: vi.fn((field, value) => ({ field, value, op: "eq" })),
    inArray: vi.fn((field, values) => ({ field, values, op: "inArray" })),
  },
}));

import confirmMutation from "../confirmMutation";
import {
  type ChatToolContext,
  createChatTools,
  executeConfirmedMutation,
  executeFormatSearchQuery,
  executeGenerateTotp,
  executeMutateGqlPreview,
  executeQueryActiveParticipants,
  executeQueryGql,
  executeSearchRules,
  getPendingMutation,
  isBlockedIdentityMutation,
  resetPendingMutations,
} from "../tools";

function createContext(overrides?: Partial<ChatToolContext>): ChatToolContext {
  return {
    env: {
      DB: {} as D1Database,
      KV: { get: vi.fn() } as unknown as KVNamespace,
      ...(overrides?.env ?? {}),
    },
    identity: {
      userId: "staff-1",
      role: "staff",
      preferredStoreId: "store-1",
      ...(overrides?.identity ?? {}),
    },
  };
}

function createApp() {
  const app = new Hono();
  app.route("/", confirmMutation);
  return app;
}

describe("chat tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPendingMutations();
    mocks.selectResults = [];
    mocks.dbFactory.mockImplementation(() => ({
      select: vi.fn(() =>
        createSelectBuilder(mocks.selectResults.shift() ?? []),
      ),
    }));
    mocks.executeGraphQL.mockResolvedValue({ data: { ok: true } });
    mocks.generateTOTP.mockResolvedValue("123456");
    mocks.getRemainingSeconds.mockReturnValue(20);
    mocks.getAuthUser.mockResolvedValue({
      token: { sub: "staff-1", role: "staff", preferredStoreId: "store-1" },
      user: { id: "staff-1" },
    });
  });

  it("defines exactly six tools with raw JSON Schema parameters", () => {
    const tools = createChatTools(createContext());
    expect(Object.keys(tools).sort()).toEqual([
      "format_search_query",
      "generate_totp",
      "mutate_gql",
      "query_active_participants",
      "query_gql",
      "search_rules",
    ]);
    expect(tools.query_gql.parameters).toMatchObject({
      type: "object",
      properties: { query: { type: "string" }, variables: { type: "object" } },
      required: ["query"],
    });
  });

  it("query_gql executes read-only GraphQL with staff permission context", async () => {
    const result = await executeQueryGql(
      { query: "{ __typename }", variables: { limit: 1 } },
      createContext(),
    );
    expect(result).toEqual({ data: { ok: true } });
    expect(mocks.executeGraphQL).toHaveBeenCalledWith(
      expect.stringContaining("__typename"),
      { limit: 1 },
      expect.objectContaining({
        auth: { role: "staff", userId: "staff-1" },
        role: "staff",
        preferredStoreId: "store-1",
      }),
    );
  });

  it("query_gql rejects mutation operations", async () => {
    const result = await executeQueryGql(
      { query: "mutation { __typename }" },
      createContext(),
    );
    expect(result).toEqual({ errors: ["query_gql 只允许执行只读查询"] });
    expect(mocks.executeGraphQL).not.toHaveBeenCalled();
  });

  it("query_gql returns syntax errors without executing", async () => {
    const result = await executeQueryGql(
      { query: "{ broken" },
      createContext(),
    );
    expect(result).toMatchObject({
      errors: [expect.stringContaining("语法错误")],
    });
    expect(mocks.executeGraphQL).not.toHaveBeenCalled();
  });

  it("mutate_gql returns a preview and does not execute", async () => {
    const preview = await executeMutateGqlPreview(
      {
        query: "mutation Update { __typename }",
        variables: { id: "1" },
        description: "更新测试记录",
      },
      createContext(),
      1_000,
    );
    expect(preview).toMatchObject({
      query: "mutation Update { __typename }",
      variables: { id: "1" },
      description: "更新测试记录",
    });
    expect(preview.mutationId).toEqual(expect.any(String));
    expect(getPendingMutation(preview.mutationId, 1_000)).toMatchObject({
      userId: "staff-1",
    });
    expect(mocks.executeGraphQL).not.toHaveBeenCalled();
  });

  it("mutate_gql requires a mutation operation", async () => {
    await expect(
      executeMutateGqlPreview({ query: "{ __typename }" }, createContext()),
    ).rejects.toThrow("mutate_gql 只接受 GraphQL mutation");
  });

  it("blocks identity management mutation names", async () => {
    expect(
      isBlockedIdentityMutation('mutation { updateUserRole(id: "1") { id } }'),
    ).toBe(true);
    await expect(
      executeMutateGqlPreview(
        { query: 'mutation { updateUserRole(id: "1") { id } }' },
        createContext(),
      ),
    ).rejects.toThrow("Identity management mutations");
  });

  it("confirmed mutation executes stored preview and clears it", async () => {
    const preview = await executeMutateGqlPreview(
      { query: "mutation { __typename }", variables: { x: 1 } },
      createContext(),
      1_000,
    );
    const result = await executeConfirmedMutation({
      mutationId: preview.mutationId,
      context: createContext(),
      now: 2_000,
    });
    expect(result).toEqual({ status: 200, body: { data: { ok: true } } });
    expect(mocks.executeGraphQL).toHaveBeenCalledWith(
      "mutation { __typename }",
      { x: 1 },
      expect.objectContaining({ auth: { role: "staff", userId: "staff-1" } }),
    );
    expect(getPendingMutation(preview.mutationId, 2_000)).toBeNull();
  });

  it("confirmed mutation enforces same-user ownership", async () => {
    const preview = await executeMutateGqlPreview(
      { query: "mutation { __typename }" },
      createContext(),
      1_000,
    );
    const result = await executeConfirmedMutation({
      mutationId: preview.mutationId,
      context: createContext({
        identity: { userId: "staff-2", role: "staff", preferredStoreId: null },
      }),
      now: 2_000,
    });
    expect(result.status).toBe(403);
    expect(mocks.executeGraphQL).not.toHaveBeenCalled();
  });

  it("confirmed mutation rejects expired previews", async () => {
    const preview = await executeMutateGqlPreview(
      { query: "mutation { __typename }" },
      createContext(),
      1_000,
    );
    const result = await executeConfirmedMutation({
      mutationId: preview.mutationId,
      context: createContext(),
      now: 1_000 + 5 * 60 * 1000,
    });
    expect(result.status).toBe(404);
    expect(mocks.executeGraphQL).not.toHaveBeenCalled();
  });

  it("generate_totp returns an error when secret is missing", async () => {
    const result = await executeGenerateTotp({}, createContext());
    expect(result).toEqual({
      error: "TOTP 验证码生成失败，请先在个人中心绑定验证器",
    });
  });

  it("generate_totp returns a code and QR URL", async () => {
    const kv = {
      get: vi.fn().mockResolvedValue("SECRET"),
    } as unknown as KVNamespace;
    const result = await executeGenerateTotp(
      {},
      createContext({ env: { DB: {} as D1Database, KV: kv } }),
    );
    expect(result).toMatchObject({
      type: "totp",
      qrcode_url: expect.stringContaining("otpauth"),
      code: "123456",
      remaining_seconds: 20,
    });
  });

  it("search_rules returns configured AI Search chunks", async () => {
    const result = await executeSearchRules(
      { query: "火球术" },
      createContext({
        env: {
          DB: {} as D1Database,
          KV: {} as KVNamespace,
          AI_SEARCH: {
            search: vi.fn().mockResolvedValue({
              chunks: [
                { text: "规则内容", item: { key: "dnd.md" }, score: 0.9 },
              ],
            }),
          },
        },
      }),
    );
    expect(result).toEqual({
      results: [{ text: "规则内容", source: "dnd.md", score: 0.9 }],
    });
  });

  it("search_rules reports missing service", async () => {
    await expect(
      executeSearchRules({ query: "规则" }, createContext()),
    ).resolves.toEqual({
      error: "规则搜索服务未配置",
    });
  });

  it("query_active_participants returns participants for the creator", async () => {
    mocks.selectResults = [
      [{ id: "active-1", creator_id: "staff-1", title: "周末约局" }],
      [
        { user_id: "u1", is_watching: false },
        { user_id: "u2", is_watching: true },
      ],
      [
        { id: "u1", nickname: "甲", phone: "13800138000" },
        { id: "u2", nickname: "乙", phone: "13900139000" },
      ],
      [
        {
          id: "u1",
          share_phone: true,
          wechat: "wx1",
          qq: null,
          custom_content: null,
        },
        {
          id: "u2",
          share_phone: false,
          wechat: null,
          qq: "10000",
          custom_content: "备注",
        },
      ],
    ];
    const result = await executeQueryActiveParticipants(
      { active_id: "active-1" },
      createContext(),
    );
    expect(result).toMatchObject({
      title: "周末约局",
      participants: [
        {
          user_id: "u1",
          nickname: "甲",
          status: "参加",
          phone: "13800138000",
          wechat: "wx1",
        },
        {
          user_id: "u2",
          nickname: "乙",
          status: "观望",
          qq: "10000",
          custom_content: "备注",
        },
      ],
    });
  });

  it("query_active_participants rejects non-creators", async () => {
    mocks.selectResults = [
      [{ id: "active-1", creator_id: "other", title: "约局" }],
    ];
    const result = await executeQueryActiveParticipants(
      { active_id: "active-1" },
      createContext(),
    );
    expect(result).toEqual({
      error: "查询失败: 只有约局发起者可以查看参与者名片",
    });
  });

  it("format_search_query preserves valid syntax", () => {
    expect(
      executeFormatSearchQuery({
        entityType: "orders",
        description: "status:active store:gg",
      }),
    ).toBe("status:active store:gg");
  });

  it("format_search_query creates syntax from natural language hints", () => {
    expect(
      executeFormatSearchQuery({
        entityType: "mahjong",
        description: "查 4p synced store:gg",
      }),
    ).toContain("mode:4p");
  });

  it("confirm endpoint requires auth", async () => {
    mocks.getAuthUser.mockResolvedValue(null);
    const res = await createApp().request(
      "/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutationId: "x" }),
      },
      { DB: {}, KV: {} },
    );
    expect(res.status).toBe(401);
  });

  it("confirm endpoint executes an owned mutation", async () => {
    const preview = await executeMutateGqlPreview(
      { query: "mutation { __typename }" },
      createContext(),
      Date.now(),
    );
    const res = await createApp().request(
      "/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutationId: preview.mutationId }),
      },
      { DB: {}, KV: {} },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { ok: true } });
  });
});
