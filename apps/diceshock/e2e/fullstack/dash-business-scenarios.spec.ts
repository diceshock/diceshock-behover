import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";
import {
  BUSINESS_GRAPHQL_MOCKS,
  MOCK_PRICING_PLAN,
  MOCK_REVENUE_DATA,
  participantsTool,
  queryTool,
  mutationTool,
  searchTool,
  type BusinessScenario,
} from "../fixtures/business-scenarios";
import { mockChatConfirm, mockChatStream } from "../fixtures/chat.fixture";
import { mockGraphQL } from "../fixtures/graphql.fixture";

test.describe("Dash business operation scenarios", () => {
  test.describe("Business Scenario: 营业数据报告", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupBusinessDash(page));

    const scenarios: BusinessScenario[] = [
      {
        name: "报告今天营业数据",
        path: "/dash/orders",
        message: "报告今天营业数据",
        response: queryResponse(
          `今天营业额 ¥${MOCK_REVENUE_DATA.orders.totalRevenue}，活跃 ${MOCK_REVENUE_DATA.orders.active} 单，已结束 ${MOCK_REVENUE_DATA.orders.ended} 单。`,
          [ordersQueryTool("revenue-today", { orders: MOCK_REVENUE_DATA.orders })],
        ),
        expectedTexts: [/营业额 ¥4250/, /活跃 5/, /已结束 15/],
      },
      {
        name: "今天最忙的桌子是哪个",
        path: "/dash/orders",
        message: "今天最忙的桌子是哪个",
        response: queryResponse(
          `今天最忙的是 ${MOCK_REVENUE_DATA.topTable.code}，收入 ¥${MOCK_REVENUE_DATA.topTable.revenue}，使用 ${MOCK_REVENUE_DATA.topTable.hours} 小时。`,
          [ordersQueryTool("top-table", { topTable: MOCK_REVENUE_DATA.topTable })],
        ),
        expectedTexts: [/A1/, /¥980/, /8.5 小时/],
      },
      {
        name: "本周新注册了多少用户",
        path: "/dash/users",
        message: "本周新注册了多少用户",
        response: queryResponse("本周新注册用户 18 人，其中 6 人已经产生消费。", [usersQueryTool("weekly-users", { count: 18 })]),
        expectedTexts: [/新注册用户 18 人/],
      },
      {
        name: "活跃订单有哪些超过3小时的",
        path: "/dash/orders",
        message: "活跃订单有哪些超过3小时的",
        response: queryResponse("超过 3 小时的活跃订单：A1 张三 4.2 小时、A3 李四 3.5 小时。", [ordersQueryTool("long-running", { orders: [{ table: "A1", hours: 4.2 }, { table: "A3", hours: 3.5 }] })]),
        expectedTexts: [/A1 张三 4.2 小时/, /A3 李四 3.5 小时/],
      },
      {
        name: "今天的营业额和昨天比怎么样",
        path: "/dash/orders",
        message: "今天的营业额和昨天比怎么样",
        response: queryResponse("今天 ¥4250，昨天 ¥3860，环比增加 ¥390（10.1%）。", [ordersQueryTool("today-revenue", { totalRevenue: 4250 }), ordersQueryTool("yesterday-revenue", { totalRevenue: 3860 })]),
        expectedTexts: [/今天 ¥4250/, /昨天 ¥3860/, /10.1%/],
      },
      {
        name: "列出今天收入最高的用户",
        path: "/dash/users",
        message: "列出今天收入最高的用户",
        response: queryResponse(`今天收入最高的用户是 ${MOCK_REVENUE_DATA.topUser.name}，到店 ${MOCK_REVENUE_DATA.topUser.visits} 次，消费 ¥${MOCK_REVENUE_DATA.topUser.spending}。`, [usersQueryTool("top-user", { topUser: MOCK_REVENUE_DATA.topUser })]),
        expectedTexts: [/张三/, /消费 ¥1500/],
      },
      {
        name: "汇总暂停订单风险",
        path: "/dash/orders",
        message: "汇总暂停订单风险",
        response: queryResponse("当前暂停订单 2 单，建议优先联系 B1 王五确认是否结算。", [ordersQueryTool("paused-risk", { paused: 2 })]),
        expectedTexts: [/暂停订单 2 单/, /B1 王五/],
      },
    ];

    for (const scenario of scenarios) {
      test(scenario.name, async ({ page }) => runScenario(page, scenario));
    }

    test("营业报告场景使用 query_gql 工具卡", async ({ page }) => {
      await mockChatStream(page, queryResponse("查询完成", [ordersQueryTool("query-card", { orders: MOCK_REVENUE_DATA.orders })]));
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "报告今天营业数据");
      await expect(page.getByText("查询结果")).toBeVisible();
    });
  });

  test.describe("Business Scenario: 修改价格方案", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupBusinessDash(page));

    const scenarios: BusinessScenario[] = [
      pricingMutationScenario("把标准桌的价格从30改成35", "savePricingSnapshot", "标准桌 30 → 35"),
      pricingMutationScenario("发布当前价格方案", "publishPricingSnapshot", "发布当前价格方案"),
      pricingMutationScenario("恢复上一个价格快照", "restorePricingSnapshot", "恢复上一个价格快照"),
      {
        name: "显示当前价格方案",
        path: "/dash/pricing",
        message: "显示当前价格方案",
        response: queryResponse(`当前价格方案：${MOCK_PRICING_PLAN.name}，标准桌 ¥30/hour，白天 ${MOCK_PRICING_PLAN.data.config.daytimeStart}-${MOCK_PRICING_PLAN.data.config.daytimeEnd}。`, [queryTool("pricing-current", "query PublishedPricing { publishedPricing { id name status data { plans } } }", { publishedPricing: MOCK_PRICING_PLAN })]),
        expectedTexts: [/工作日标准/, /标准桌 ¥30\/hour/, /10:00-18:00/],
      },
      pricingMutationScenario("复制价格方案给光谷店", "savePricingSnapshot", "复制工作日标准到光谷店"),
      pricingMutationScenario("把夜间时段开始时间改成18点", "savePricingSnapshot", "白天结束时间调整为 18:00"),
    ];

    for (const scenario of scenarios) {
      test(scenario.name, async ({ page }) => runScenario(page, scenario));
    }

    test("Reject scenario: 修改价格", async ({ page }) => {
      let confirmCalled = false;
      await mockChatStream(page, pricingMutationScenario("修改价格", "savePricingSnapshot", "标准桌 30 → 35").response);
      await page.route("**/api/chat/confirm", async (route) => {
        confirmCalled = true;
        await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      });
      await openDesktopChat(page, "/dash/pricing");
      await sendChat(page, "修改价格");
      await page.getByRole("button", { name: /取消/ }).click();
      expect(confirmCalled).toBe(false);
      await expect(page.getByText(/已取消|已拒绝/)).toBeVisible();
    });
  });

  test.describe("Business Scenario: 订单管理", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupBusinessDash(page));

    const scenarios: BusinessScenario[] = [
      orderMutationScenario("暂停A1桌的订单", "pauseOrder", "暂停 A1 桌 order-active-a1"),
      orderMutationScenario("结算所有已暂停的订单", "settleOrders", "批量结算 2 个暂停订单"),
      orderMutationScenario("帮我给张三开一个新订单在A3桌", "createTableOccupancy", "为张三在 A3 开新订单"),
      orderMutationScenario("恢复B1桌暂停的订单", "resumeOrder", "恢复 B1 桌暂停订单"),
      orderMutationScenario("把A1订单人数改成4人", "updateTableOccupancy", "A1 订单人数调整为 4"),
    ];

    for (const scenario of scenarios) {
      test(scenario.name, async ({ page }) => runScenario(page, scenario));
    }
  });

  test.describe("Business Scenario: 活动管理", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupBusinessDash(page));

    const scenarios: BusinessScenario[] = [
      activeMutationScenario("创建一个明天下午的狼人杀活动", "createActive", "创建 2024-06-26 14:00 狼人杀活动"),
      activeMutationScenario("取消已过期的活动", "deleteActive", "取消 3 个已过期活动"),
      {
        name: "查看今天的约局参与者",
        path: "/dash/actives",
        message: "查看今天的约局参与者",
        response: queryResponse("今天约局参与者：张三、李四。", [participantsTool("participants-today")]),
        expectedTexts: [/张三/, /李四/],
      },
      activeMutationScenario("把狼人杀活动人数上限改成8人", "updateActive", "狼人杀人数上限改为 8"),
      {
        name: "统计本周约局报名人数",
        path: "/dash/actives",
        message: "统计本周约局报名人数",
        response: queryResponse("本周约局报名 26 人，平均每场 5.2 人。", [queryTool("weekly-active", "query ManagedActives { managedActives { id registrations { id } } }", { totalRegistrations: 26 })]),
        expectedTexts: [/报名 26 人/, /平均每场 5.2 人/],
      },
    ];

    for (const scenario of scenarios) {
      test(scenario.name, async ({ page }) => runScenario(page, scenario));
    }
  });

  test.describe("Business Scenario: 搜索 + Agent 协作", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupBusinessDash(page));

    const searchScenarios: BusinessScenario[] = [
      searchScenario("帮我找上周五的所有订单", "/dash/orders", "orders", "上周五的所有订单", "date:2024-06-21"),
      searchScenario("筛选出光谷店的日麻记录", "/dash/gsz", "mahjong", "光谷店的日麻记录", "store:guanggu"),
      searchScenario("找未同步的日麻记录", "/dash/gsz", "mahjong", "未同步的日麻", "sync:unsynced"),
      searchScenario("找过期的活动", "/dash/actives", "actives", "过期活动", "status:expired"),
      searchScenario("找A1桌超过3小时的订单", "/dash/orders", "orders", "A1桌超过3小时的订单", "table:A1 duration:>3h"),
    ];

    for (const scenario of searchScenarios) {
      test(scenario.name, async ({ page }) => {
        await runScenario(page, scenario);
        await page.locator("button.badge-primary", { hasText: String(scenario.response.toolCalls?.[0]?.result ?? "") }).click();
        await expect(page.locator('input[type="search"]')).toHaveValue(String(scenario.response.toolCalls?.[0]?.result ?? ""));
      });
    }

    test("Agent reads current filters: 当前有几个活跃订单", async ({ page }) => {
      let contextText = "";
      await mockChatStream(page, ({ body }) => {
        contextText = JSON.stringify((body.context as Record<string, unknown>) ?? {});
        return queryResponse("当前筛选下有 5 个活跃订单。", [ordersQueryTool("filtered-active", { active: 5 })]);
      });
      await openDesktopChat(page, "/dash/orders?q=status%3Aactive");
      await sendChat(page, "当前有几个活跃订单");
      await expect.poll(() => contextText).toContain("status:active");
      await expect(page.getByText(/5 个活跃订单/)).toBeVisible();
    });
  });

  test.describe("Business Scenario: 权限边界", () => {
    test.beforeEach(async ({ page }) => setupBusinessDash(page));

    test("Staff tries 修改用户角色 and agent refuses", async ({ page, mockStaffSession }) => {
      await mockChatStream(page, { text: "不能执行身份管理类操作，例如修改用户角色。" });
      await openDesktopChat(page, "/dash/users");
      await sendChat(page, "修改用户角色");
      await expect(page.getByText(/不能执行身份管理类操作/)).toBeVisible();
      await expect(page.getByRole("button", { name: /确认执行/ })).not.toBeVisible();
    });

    test("Staff tries 删除所有用户 and agent refuses", async ({ page, mockStaffSession }) => {
      await mockChatStream(page, { text: "不能删除所有用户；这是危险批量操作且涉及身份管理。" });
      await openDesktopChat(page, "/dash/users");
      await sendChat(page, "删除所有用户");
      await expect(page.getByText(/危险批量操作/)).toBeVisible();
      await expect(page.getByRole("button", { name: /确认执行/ })).not.toBeVisible();
    });

    test("Staff bulk identity mutation stays blocked", async ({ page, mockStaffSession }) => {
      await mockChatStream(page, { text: "账户、角色、会话和认证器变更都被阻止。" });
      await openDesktopChat(page, "/dash/users");
      await sendChat(page, "把所有员工都改成管理员");
      await expect(page.getByText(/都被阻止/)).toBeVisible();
    });

    test("Admin-only operations: admin may preview safe operational mutation", async ({ page, mockAdminSession }) => {
      await mockChatStream(page, orderMutationScenario("管理员批量结算暂停订单", "settleOrders", "管理员批量结算 2 个暂停订单").response);
      await openDesktopChat(page, "/dash/orders");
      await sendChat(page, "管理员批量结算暂停订单");
      await expect(page.getByRole("button", { name: /确认执行/ })).toBeVisible();
    });

    test("Admin-only operations: staff can still preview non-identity pricing changes", async ({ page, mockStaffSession }) => {
      await mockChatStream(page, pricingMutationScenario("把标准桌价格改成35", "savePricingSnapshot", "标准桌 30 → 35").response);
      await openDesktopChat(page, "/dash/pricing");
      await sendChat(page, "把标准桌价格改成35");
      await expect(page.getByRole("button", { name: /确认执行/ })).toBeVisible();
    });
  });
});

async function setupBusinessDash(page: Page) {
  await mockGraphQL(page, BUSINESS_GRAPHQL_MOCKS);
  await mockChatConfirm(page);
}

async function runScenario(page: Page, scenario: BusinessScenario) {
  await mockChatStream(page, scenario.response);
  await openDesktopChat(page, scenario.path);
  await sendChat(page, scenario.message);

  for (const text of scenario.expectedTexts ?? []) await expect(page.getByText(text)).toBeVisible();
  if (scenario.response.toolCalls?.some((tool) => tool.name === "query_gql")) await expect(page.getByText("查询结果").first()).toBeVisible();
  if (scenario.response.toolCalls?.some((tool) => tool.name === "mutate_gql")) await expect(page.getByRole("button", { name: /确认执行/ })).toBeVisible();
  if (scenario.response.toolCalls?.some((tool) => tool.name === "format_search_query")) await expect(page.locator("button.badge-primary").first()).toBeVisible();
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

function queryResponse(text: string, toolCalls: BusinessScenario["response"]["toolCalls"]): BusinessScenario["response"] {
  return { text, toolCalls };
}

function ordersQueryTool(id: string, result: unknown) {
  return queryTool(id, "query Orders($filter: OrderFilterInput) { orders(filter: $filter) { items { id status finalPrice table { code } } } }", result, { filter: { dateFrom: MOCK_REVENUE_DATA.today } });
}

function usersQueryTool(id: string, result: unknown) {
  return queryTool(id, "query Users($filter: UserFilterInput) { managedUsers(filter: $filter) { items { id name role createdAt } } }", result, { filter: { dateFrom: "2024-06-24" } });
}

function pricingMutationScenario(name: string, rootField: string, description: string): BusinessScenario {
  return {
    name,
    path: "/dash/pricing",
    message: name,
    response: {
      text: `请确认：${description}`,
      toolCalls: [mutationTool(`pricing-${rootField}-${slug(name)}`, `mutation ${rootField}Preview { ${rootField}(storeId: "demo") { id name status } }`, description, { storeId: "demo" })],
    },
    expectedTexts: [new RegExp(escapeRegExp(description))],
  };
}

function orderMutationScenario(name: string, rootField: string, description: string): BusinessScenario {
  return {
    name,
    path: "/dash/orders",
    message: name,
    response: {
      text: `请确认：${description}`,
      toolCalls: [mutationTool(`order-${rootField}-${slug(name)}`, `mutation ${rootField}Preview { ${rootField}(id: "order-active-a1") { id } }`, description, { id: "order-active-a1" })],
    },
    expectedTexts: [new RegExp(escapeRegExp(description))],
  };
}

function activeMutationScenario(name: string, rootField: string, description: string): BusinessScenario {
  return {
    name,
    path: "/dash/actives",
    message: name,
    response: {
      text: `请确认：${description}`,
      toolCalls: [mutationTool(`active-${rootField}-${slug(name)}`, `mutation ${rootField}Preview { ${rootField}(id: "active-001") { id title } }`, description, { id: "active-001" })],
    },
    expectedTexts: [new RegExp(escapeRegExp(description))],
  };
}

function searchScenario(name: string, path: string, entityType: string, description: string, syntax: string): BusinessScenario {
  return {
    name,
    path,
    message: name,
    response: { text: `已生成筛选 ${syntax}`, toolCalls: [searchTool(`search-${slug(name)}`, entityType, description, syntax)] },
    expectedTexts: [new RegExp(escapeRegExp(syntax))],
  };
}

function slug(value: string) {
  return Array.from(value).map((char) => char.charCodeAt(0).toString(36)).join("-").slice(0, 40);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
