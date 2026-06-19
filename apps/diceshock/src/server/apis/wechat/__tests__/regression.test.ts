import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeQueryTool: vi.fn(),
  executeMutateTool: vi.fn(),
  executeLoadSkillTool: vi.fn(),
  sendStatusMessage: vi.fn(),
}));

vi.mock("@lib/db", () => {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(async () => []),
  };
  return {
    default: vi.fn(() => ({ select: vi.fn(() => query) })),
    accounts: {
      userId: "userId",
      provider: "provider",
      providerAccountId: "providerAccountId",
    },
    drizzle: { and: vi.fn(), eq: vi.fn() },
  };
});

vi.mock("../messagePipeline", () => ({
  sendStatusMessage: mocks.sendStatusMessage,
}));

vi.mock("../tools/query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../tools/query")>()),
  executeQueryTool: mocks.executeQueryTool,
}));

vi.mock("../tools/mutate", () => ({
  executeMutateTool: mocks.executeMutateTool,
}));

vi.mock("../tools/loadSkill", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../tools/loadSkill")>()),
  executeLoadSkillTool: mocks.executeLoadSkillTool,
}));

import { chatWithAgent } from "../deepseekClient";

const finalText = (content: string, tokens = 7) => ({
  choices: [{ message: { content } }],
  usage: { total_tokens: tokens },
});

const toolResponse = (
  name: string,
  args: Record<string, unknown>,
  id = `call_${name}`,
  tokens = 11,
) => ({
  choices: [
    {
      message: {
        content: "",
        tool_calls: [
          {
            id,
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    },
  ],
  usage: { total_tokens: tokens },
});

function jsonResponse(data: unknown) {
  return { ok: true, json: vi.fn(async () => data) };
}

function mockContext() {
  return {
    env: {
      DEEPSEEK_API_KEY: "test-api-key",
      CF_ACCOUNT_ID: "test-account",
      CF_AI_GATEWAY_ID: "test-gateway",
      DB: {},
      KV: {},
    },
    get: vi.fn(() => undefined),
  } as any;
}

const defaultParams = {
  userMessage: "帮我查一下",
  openId: "test-open-id",
  conversationHistory: [],
};

function parsedOutput(rawOutput: string) {
  return JSON.parse(rawOutput) as Array<{ type: string; content: string }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.executeQueryTool.mockImplementation(async ({ graphql }) => {
    if (String(graphql).trim().startsWith("mutation")) {
      return "查询工具只允许 GraphQL query，不能执行 mutation";
    }
    return '{"__schema":{"queryType":{"name":"Query"}}}';
  });
  mocks.executeMutateTool.mockResolvedValue(
    "无效操作: delete_everything。有效操作: create_active, join_active, watch_active, update_active, leave_active, send_sms_code, verify_phone, bind_gsz, upsert_business_card",
  );
  mocks.executeLoadSkillTool.mockResolvedValue(
    "桌游技能：库存查询、推荐、详情",
  );
  mocks.sendStatusMessage.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wechat deepseekClient regression pipeline", () => {
  it("runs schema introspection through query and returns final text", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          toolResponse("query", {
            graphql: "{ __schema { queryType { name } } }",
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          finalText('[{"type":"text","content":"Schema query type is Query"}]'),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await chatWithAgent(mockContext(), defaultParams);

    expect(mocks.executeQueryTool).toHaveBeenCalledWith(
      { graphql: "{ __schema { queryType { name } } }" },
      expect.objectContaining({ openId: "test-open-id", userId: null }),
    );
    expect(parsedOutput(result.rawOutput)[0]).toMatchObject({
      type: "text",
      content: "Schema query type is Query",
    });
    expect(result.tokensUsed).toBe(18);
  });

  it("loads boardgame skill before answering", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(toolResponse("load_skill", { skill: "boardgame" })),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          finalText(
            '[{"type":"text","content":"I can help with board games."}]',
          ),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await chatWithAgent(mockContext(), {
      ...defaultParams,
      userMessage: "推荐桌游",
    });

    expect(mocks.executeLoadSkillTool).toHaveBeenCalledWith(
      { skill: "boardgame" },
      expect.objectContaining({ openId: "test-open-id" }),
    );
    expect(parsedOutput(result.rawOutput)[0].content).toContain("board games");
  });

  it("surfaces mutate action validation errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          toolResponse("mutate", {
            action: "delete_everything",
            params: {},
            description: "invalid destructive action",
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          finalText('[{"type":"text","content":"That action is invalid."}]'),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await chatWithAgent(mockContext(), defaultParams);

    expect(mocks.executeMutateTool).toHaveBeenCalledWith(
      {
        action: "delete_everything",
        params: {},
        description: "invalid destructive action",
      },
      expect.objectContaining({ openId: "test-open-id" }),
    );
    expect(parsedOutput(result.rawOutput)[0].content).toContain("invalid");
  });

  it("rejects mutation strings sent to the query tool", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          toolResponse("query", {
            graphql: "mutation { createActive(input: {}) { id } }",
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          finalText(
            '[{"type":"text","content":"Queries cannot run mutations."}]',
          ),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await chatWithAgent(mockContext(), defaultParams);

    expect(mocks.executeQueryTool).toHaveBeenCalledWith(
      { graphql: "mutation { createActive(input: {}) { id } }" },
      expect.any(Object),
    );
    expect(parsedOutput(result.rawOutput)[0].content).toContain("mutations");
  });

  it("stops tool looping at the budget and makes a no-tool synthesis call", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.tool_choice === "none") {
        return jsonResponse(
          finalText('[{"type":"text","content":"Tool budget exhausted."}]', 5),
        );
      }
      return jsonResponse(
        toolResponse("query", {
          graphql: "{ __schema { queryType { name } } }",
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await chatWithAgent(mockContext(), defaultParams);

    expect(mocks.executeQueryTool).toHaveBeenCalledTimes(10);
    expect(fetchMock).toHaveBeenCalledTimes(11);
    const finalBody = JSON.parse(
      String(fetchMock.mock.calls.at(-1)?.[1]?.body),
    );
    expect(finalBody.tool_choice).toBe("none");
    expect(finalBody.tools).toBeUndefined();
    expect(parsedOutput(result.rawOutput)[0].content).toBe(
      "Tool budget exhausted.",
    );
  });
});
