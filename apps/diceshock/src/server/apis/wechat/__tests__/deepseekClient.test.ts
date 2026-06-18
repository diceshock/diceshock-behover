import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../messagePipeline", () => ({
  sendStatusMessage: vi.fn().mockResolvedValue(undefined),
  parseAgentOutput: (x: string) => [{ type: "text", content: x }],
}));

vi.mock("../tools", () => ({
  executeTool: vi
    .fn()
    .mockResolvedValue(
      JSON.stringify({ result: "mocked tool result", data: [] }),
    ),
}));

import { chatWithAgent } from "../deepseekClient";
import { sendStatusMessage } from "../messagePipeline";

function mockContext(overrides: Record<string, unknown> = {}) {
  return {
    env: {
      DEEPSEEK_API_KEY: "test-api-key",
      CF_ACCOUNT_ID: "test-account",
      CF_AI_GATEWAY_ID: "test-gateway",
      ...overrides,
    },
  } as any;
}

const defaultParams = {
  userMessage: "查一下桌游库存",
  openId: "test-open-id",
  skill: {
    id: "boardgame" as const,
    name: "桌游查询",
    description: "test",
    systemPrompt: "你负责桌游查询",
    tools: [
      {
        type: "function" as const,
        function: {
          name: "query_board_game_inventory",
          description: "查询桌游库存",
          parameters: {},
        },
      },
    ],
    keywords: ["桌游"],
  },
  conversationHistory: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chatWithAgent", () => {
  describe("API key missing", () => {
    it("returns fallback when DEEPSEEK_API_KEY is not set", async () => {
      const ctx = mockContext({ DEEPSEEK_API_KEY: undefined });
      const result = await chatWithAgent(ctx, defaultParams);
      expect(result.tokensUsed).toBe(0);
      expect(result.rawOutput).toContain("AI 服务未配置");
    });

    it("returns fallback when DEEPSEEK_API_KEY is empty string", async () => {
      const ctx = mockContext({ DEEPSEEK_API_KEY: "" });
      const result = await chatWithAgent(ctx, defaultParams);
      expect(result.tokensUsed).toBe(0);
      expect(result.rawOutput).toContain("AI 服务未配置");
    });
  });

  describe("API success with content", () => {
    it("returns text response when API returns content", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: '[{"type":"text","content":"卡坦岛有3盒库存"}]',
                  tool_calls: undefined,
                },
              },
            ],
            usage: { total_tokens: 42 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const result = await chatWithAgent(ctx, defaultParams);

      expect(result.tokensUsed).toBe(42);
      expect(result.rawOutput).toContain("卡坦岛");
    });
  });

  describe("API error handling", () => {
    it("returns fallback on non-OK response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("Service Unavailable"),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const result = await chatWithAgent(ctx, defaultParams);

      expect(result.rawOutput).toContain("AI 服务暂时不可用");
    });

    it("returns fallback on empty choices", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const result = await chatWithAgent(ctx, defaultParams);

      expect(result.rawOutput).toContain("AI 返回异常");
    });

    it("returns fallback when assistant content is null", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: { content: null, tool_calls: undefined },
              },
            ],
            usage: { total_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const result = await chatWithAgent(ctx, defaultParams);

      expect(result.rawOutput).toContain("抱歉");
    });
  });

  describe("tool calling flow", () => {
    it("calls tools and returns assistant content after tool round", async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [
                  {
                    message: {
                      content: "",
                      tool_calls: [
                        {
                          id: "call_abc",
                          type: "function",
                          function: {
                            name: "query_board_game_inventory",
                            arguments: "{}",
                          },
                        },
                      ],
                    },
                  },
                ],
                usage: { total_tokens: 50 },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content:
                      '[{"type":"text","content":"查询完成：卡坦岛有3盒"}]',
                    tool_calls: undefined,
                  },
                },
              ],
              usage: { total_tokens: 30 },
            }),
        });
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const result = await chatWithAgent(ctx, defaultParams);

      expect(callCount).toBe(2);
      expect(result.tokensUsed).toBe(80);
      expect(result.rawOutput).toContain("卡坦岛");
      expect(sendStatusMessage).toHaveBeenCalled();
    });
  });

  describe("URL construction", () => {
    it("uses gateway URL when CF_AI_GATEWAY_ID is set", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: '[{"type":"text","content":"ok"}]',
                  tool_calls: undefined,
                },
              },
            ],
            usage: { total_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const params = {
        ...defaultParams,
        skill: {
          ...defaultParams.skill,
          tools: [],
        },
      };
      await chatWithAgent(ctx, params);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("gateway.ai.cloudflare.com");
      expect(url).toContain("test-account");
      expect(url).toContain("test-gateway");
    });

    it("uses direct API URL when no gateway", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: '[{"type":"text","content":"ok"}]',
                  tool_calls: undefined,
                },
              },
            ],
            usage: { total_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext({ CF_AI_GATEWAY_ID: undefined });
      const params = {
        ...defaultParams,
        skill: {
          ...defaultParams.skill,
          tools: [],
        },
      };
      await chatWithAgent(ctx, params);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("api.deepseek.com");
    });
  });

  describe("conversation history and context", () => {
    it("includes conversation history in messages", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: '[{"type":"text","content":"ok"}]',
                  tool_calls: undefined,
                },
              },
            ],
            usage: { total_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const params = {
        ...defaultParams,
        skill: { ...defaultParams.skill, tools: [] },
        conversationHistory: [
          { role: "user" as const, content: "上次我问过", metadata: undefined },
          {
            role: "assistant" as const,
            content: "好的",
            metadata: '{"skillId":"boardgame"}',
          },
        ],
        memory: "用户记忆：喜欢卡坦岛",
        ragContext: "桌游库存信息：卡坦岛有3盒",
      };
      await chatWithAgent(ctx, params);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const system = body.messages[0].content;
      expect(system).toContain("用户记忆：喜欢卡坦岛");
      expect(system).toContain("相关知识库内容");
      expect(system).toContain("桌游库存信息：卡坦岛有3盒");

      const userHistory = body.messages.find(
        (m: any) => m.role === "user" && m.content === "上次我问过",
      );
      expect(userHistory).toBeDefined();
    });
  });

  describe("max tool rounds", () => {
    it("returns last assistant content after max rounds", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: "processing",
                  tool_calls: [
                    {
                      id: "call_loop",
                      type: "function",
                      function: {
                        name: "query_board_game_inventory",
                        arguments: "{}",
                      },
                    },
                  ],
                },
              },
            ],
            usage: { total_tokens: 10 },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const ctx = mockContext();
      const result = await chatWithAgent(ctx, defaultParams);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.rawOutput).toBe("processing");
    });
  });
});
