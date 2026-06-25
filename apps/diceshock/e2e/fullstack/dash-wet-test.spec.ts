import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page, Response, TestInfo } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";
import { BUSINESS_GRAPHQL_MOCKS } from "../fixtures/business-scenarios";
import { mockGraphQL } from "../fixtures/graphql.fixture";

const SKIP_WET = !process.env.VIBE_TEST_LLM_ENDPOINT;
const WET_RESULTS_DIR = join(process.cwd(), "e2e", "artifacts", "wet-test-results");

type CapturedToolCall = {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
};

type AgentCapture = {
  text: string;
  toolCalls: CapturedToolCall[];
  raw: string;
  status: number;
};

test.describe("Wet Agent Tests — Skill Optimization", () => {
  test.skip(SKIP_WET, "Set VIBE_TEST_LLM_ENDPOINT to run wet tests");

  test.beforeEach(async ({ page, mockStaffSession }) => {
    await mockGraphQL(page, BUSINESS_GRAPHQL_MOCKS);
  });

  test.describe("Revenue Reporting Skill", () => {
    test("reports today revenue when asked 报告今天营业数据", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, {
        path: "/dash/orders",
        message: "报告今天营业数据",
        expectedTool: "query_gql",
        expectedText: /营业|收入|营收|订单|活跃/,
        assertions: (capture) => ({ calledQueryGql: calledTool(capture, "query_gql"), mentionedRevenue: /营业|收入|营收|revenue/i.test(capture.text) }),
      });
    });

    test("compares revenue periods when asked 和昨天比", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders", message: "今天的营业额和昨天比怎么样", expectedTool: "query_gql", expectedText: /昨天|对比|相比|环比|today|yesterday/i });
    });

    test("identifies busiest table when asked 最忙的桌子", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders", message: "今天最忙的桌子是哪个", expectedTool: "query_gql", expectedText: /桌|A\d|最忙|使用|小时/ });
    });

    test("finds weekly new users", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/users", message: "本周新注册了多少用户", expectedTool: "query_gql", expectedText: /本周|用户|注册|新增/ });
    });
  });

  test.describe("Pricing Mutation Skill", () => {
    test("proposes correct mutation for 把价格改成35", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/pricing", message: "把标准桌的价格从30改成35", expectedTool: "mutate_gql", expectedText: /确认|预览|价格|35/, expectedMutation: /savePricingSnapshot/ });
      await expect(page.getByRole("button", { name: /确认执行/ })).toBeVisible();
    });

    test("proposes publishPricingSnapshot for 发布价格", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/pricing", message: "发布当前价格方案", expectedTool: "mutate_gql", expectedText: /确认|发布|预览/, expectedMutation: /publishPricingSnapshot/ });
    });

    test("proposes restorePricingSnapshot for 恢复价格快照", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/pricing", message: "恢复上一个价格快照", expectedTool: "mutate_gql", expectedText: /确认|恢复|快照/, expectedMutation: /restorePricingSnapshot/ });
    });
  });

  test.describe("Order Management Skill", () => {
    test("proposes pause mutation for 暂停A1订单", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders", message: "暂停A1桌的订单", expectedTool: "mutate_gql", expectedText: /确认|暂停|A1/, expectedMutation: /pauseOrder|pauseTableOccupancy/ });
    });

    test("proposes settle for 结算订单", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders", message: "结算所有已暂停的订单", expectedTool: "mutate_gql", expectedText: /确认|结算|暂停/, expectedMutation: /settleOrder|settleOrders/ });
    });

    test("proposes create order for 张三 A3", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders", message: "帮我给张三开一个新订单在A3桌", expectedTool: "mutate_gql", expectedText: /确认|张三|A3|新订单/, expectedMutation: /createOrder|createTableOccupancy/ });
    });
  });

  test.describe("Search Generation Skill", () => {
    test("generates correct search for 上周五的订单", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders", message: "帮我找上周五的所有订单", expectedTool: "format_search_query", expectedText: /date|2024|上周五|筛选/ });
    });

    test("generates correct search for 未同步的日麻", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/gsz", message: "筛选出未同步的日麻记录", expectedTool: "format_search_query", expectedText: /sync|unsynced|未同步|筛选/ });
    });

    test("generates correct search for 过期的活动", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/actives", message: "找过期的活动", expectedTool: "format_search_query", expectedText: /expired|过期|活动|筛选/ });
    });

    test("generates correct search for 光谷店日麻", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/gsz", message: "筛选出光谷店的日麻记录", expectedTool: "format_search_query", expectedText: /store|光谷|guanggu|筛选/ });
    });
  });

  test.describe("Context Awareness Skill", () => {
    test("reads current page and filters correctly", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders?q=status%3Aactive", message: "当前有几个活跃订单", expectedTool: "query_gql", expectedText: /当前|活跃|订单|筛选/ });
    });

    test("adjusts entity type based on current page", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/gsz", message: "帮我找未同步的记录", expectedTool: "format_search_query", expectedText: /日麻|mahjong|gsz|sync|筛选/ });
    });

    test("keeps mutation previews unconfirmed", async ({ page }, testInfo) => {
      await wetAgentCheck(page, testInfo, { path: "/dash/orders", message: "暂停A1订单并等待我确认", expectedTool: "mutate_gql", expectedText: /确认|预览|暂停|A1/, expectedMutation: /pause/ });
      await expect(page.getByText("已执行")).not.toBeVisible();
    });
  });
});

async function wetAgentCheck(
  page: Page,
  testInfo: TestInfo,
  options: {
    path: string;
    message: string;
    expectedTool: string;
    expectedText: RegExp;
    expectedMutation?: RegExp;
    assertions?: (capture: AgentCapture) => Record<string, boolean>;
  },
) {
  const capturePromise = waitForAgentStream(page);
  await openDesktopChat(page, options.path);
  await sendChat(page, options.message);

  const capture = await capturePromise;
  const assertions = {
    calledExpectedTool: calledTool(capture, options.expectedTool),
    textMatched: options.expectedText.test(capture.text),
    mutationMatched: options.expectedMutation ? mutationMatched(capture, options.expectedMutation) : true,
    ...(options.assertions?.(capture) ?? {}),
  };
  const pass = Object.values(assertions).every(Boolean);

  await logWetResult(testInfo, {
    testName: testInfo.title,
    timestamp: new Date().toISOString(),
    page: options.path,
    userMessage: options.message,
    agentResponse: { text: capture.text, toolCalls: capture.toolCalls, raw: capture.raw, status: capture.status },
    assertions,
    pass,
  });

  expect(assertions.calledExpectedTool).toBe(true);
  expect(assertions.textMatched).toBe(true);
  expect(assertions.mutationMatched).toBe(true);
}

async function waitForAgentStream(page: Page) {
  const response = await page.waitForResponse((candidate) => candidate.url().includes("/api/chat/stream") && candidate.request().method() === "POST");
  return parseAgentStream(response);
}

async function parseAgentStream(response: Response): Promise<AgentCapture> {
  const raw = await response.text();
  const toolCalls = new Map<string, CapturedToolCall>();
  const textParts: string[] = [];

  for (const line of raw.split("\n")) {
    if (!line) continue;
    const prefix = line.slice(0, 2);
    const payload = line.slice(2);
    if (prefix === "0:") textParts.push(String(JSON.parse(payload)));
    if (prefix === "9:") {
      const parsed = JSON.parse(payload) as CapturedToolCall;
      toolCalls.set(parsed.toolCallId, parsed);
    }
    if (prefix === "a:") {
      const parsed = JSON.parse(payload) as { toolCallId: string; result: unknown };
      toolCalls.set(parsed.toolCallId, { ...(toolCalls.get(parsed.toolCallId) ?? { toolCallId: parsed.toolCallId, toolName: "unknown" }), result: parsed.result });
    }
  }

  return { text: textParts.join(""), toolCalls: Array.from(toolCalls.values()), raw, status: response.status() };
}

async function logWetResult(testInfo: TestInfo, result: Record<string, unknown>) {
  await mkdir(WET_RESULTS_DIR, { recursive: true });
  const fileName = `${slug(testInfo.titlePath.join("-"))}.json`;
  await writeFile(join(WET_RESULTS_DIR, fileName), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

async function openDesktopChat(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("body")).toBeVisible();
  const toggle = page.locator(".hidden.lg\\:block.fixed button:has(svg)").first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByText("AI 助手")).toBeVisible();
}

async function sendChat(page: Page, message: string) {
  await page.locator('textarea[placeholder="输入消息..."]').fill(message);
  await page.locator("form button.btn-primary.btn-square").last().click();
}

function calledTool(capture: AgentCapture, toolName: string) {
  return capture.toolCalls.some((tool) => tool.toolName === toolName);
}

function mutationMatched(capture: AgentCapture, expected: RegExp) {
  return capture.toolCalls.some((tool) => tool.toolName === "mutate_gql" && expected.test(JSON.stringify(tool)));
}

function slug(value: string) {
  return value.replace(/[^a-z0-9一-龥]+/gi, "-").replace(/^-|-$/g, "").slice(0, 120) || "wet-test";
}
