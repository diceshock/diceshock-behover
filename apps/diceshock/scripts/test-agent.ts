#!/usr/bin/env -S npx tsx
/**
 * Agent integration test with customer role simulation.
 * Tests complex multi-step scenarios against DeepSeek V4 Flash.
 *
 * Usage:
 *   npx tsx apps/diceshock/scripts/test-agent.ts                  # run all scenarios
 *   npx tsx apps/diceshock/scripts/test-agent.ts "自定义问题"      # single query
 *   npx tsx apps/diceshock/scripts/test-agent.ts --customer        # customer agent generates scenarios
 */

import { matchSkills } from "../src/server/apis/wechat/skillRouter";

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error("Set DEEPSEEK_API_KEY"); process.exit(1); }

const MAX_TOOL_CALLS = 3;
const CURRENT_USER_ID = "user_test_001";
const CURRENT_DATE = "2025-06-20";

const MOCK_ACTIVES = [
  { id: "act001", title: "周五卡坦岛", date: "2025-06-20", time: "19:00", maxPlayers: 4, creator_id: CURRENT_USER_ID, board_game_id: "bg001", create_at: 1750000000000 },
  { id: "act002", title: "周六日麻半庄", date: "2025-06-21", time: "14:00", maxPlayers: 4, creator_id: CURRENT_USER_ID, board_game_id: null, create_at: 1750100000000 },
  { id: "act003", title: "周日阿瓦隆", date: "2025-06-22", time: "15:00", maxPlayers: 8, creator_id: "user_other_002", board_game_id: "bg012", create_at: 1750200000000 },
];

const MOCK_REGISTRATIONS = [
  { id: "reg001", active_id: "act001", user_id: CURRENT_USER_ID, is_watching: false, create_at: 1750000000000 },
  { id: "reg002", active_id: "act001", user_id: "user_other_002", is_watching: false, create_at: 1750001000000 },
  { id: "reg003", active_id: "act003", user_id: CURRENT_USER_ID, is_watching: true, create_at: 1750200100000 },
];

const MOCK_BOARD_GAMES = [
  { id: "bg001", sch_name: "卡坦岛", eng_name: "Catan", player_num: [3,4], best_player_num: [4], gstone_rating: 7.1, category: ["STRATEGY","FAMILY"], removeDate: 0 },
  { id: "bg002", sch_name: "璀璨宝石", eng_name: "Splendor", player_num: [2,3,4], best_player_num: [3], gstone_rating: 7.4, category: ["STRATEGY","FAMILY"], removeDate: 0 },
  { id: "bg003", sch_name: "花砖物语", eng_name: "Azul", player_num: [2,3,4], best_player_num: [2], gstone_rating: 7.8, category: ["ABSTRACT","FAMILY"], removeDate: 0 },
  { id: "bg004", sch_name: "七大奇迹", eng_name: "7 Wonders", player_num: [3,4,5,6,7], best_player_num: [4,5], gstone_rating: 7.7, category: ["STRATEGY"], removeDate: 0 },
  { id: "bg005", sch_name: "农场主", eng_name: "Agricola", player_num: [1,2,3,4,5], best_player_num: [3,4], gstone_rating: 7.9, category: ["STRATEGY"], removeDate: 0 },
  { id: "bg006", sch_name: "勃艮第城堡", eng_name: "Castles of Burgundy", player_num: [2,3,4], best_player_num: [2], gstone_rating: 8.1, category: ["STRATEGY"], removeDate: 0 },
  { id: "bg007", sch_name: "马可波罗", eng_name: "Marco Polo", player_num: [2,3,4], best_player_num: [4], gstone_rating: 7.6, category: ["STRATEGY"], removeDate: 0 },
  { id: "bg008", sch_name: "石器时代", eng_name: "Stone Age", player_num: [2,3,4], best_player_num: [4], gstone_rating: 7.0, category: ["STRATEGY","FAMILY"], removeDate: 0 },
  { id: "bg009", sch_name: "拼布对决", eng_name: "Patchwork", player_num: [2], best_player_num: [2], gstone_rating: 7.8, category: ["ABSTRACT"], removeDate: 0 },
  { id: "bg010", sch_name: "你画我猜", eng_name: "Telestrations", player_num: [4,5,6,7,8], best_player_num: [6,7,8], gstone_rating: 7.2, category: ["PARTY"], removeDate: 0 },
  { id: "bg011", sch_name: "矮人矿坑", eng_name: "Saboteur", player_num: [3,4,5,6,7,8,9,10], best_player_num: [7,8], gstone_rating: 6.2, category: ["PARTY"], removeDate: 0 },
  { id: "bg012", sch_name: "阿瓦隆", eng_name: "Avalon", player_num: [5,6,7,8,9,10], best_player_num: [7,8], gstone_rating: 7.5, category: ["PARTY","STRATEGY"], removeDate: 0 },
  { id: "bg013", sch_name: "铁路环游", eng_name: "Ticket to Ride", player_num: [2,3,4,5], best_player_num: [4], gstone_rating: 7.4, category: ["FAMILY","STRATEGY"], removeDate: 0 },
  { id: "bg014", sch_name: "铁路环游欧洲版", eng_name: "Ticket to Ride Europe", player_num: [2,3,4,5], best_player_num: [4], gstone_rating: 7.6, category: ["FAMILY","STRATEGY"], removeDate: 0 },
  { id: "bg015", sch_name: "蒸汽时代", eng_name: "Age of Steam", player_num: [3,4,5,6], best_player_num: [4,5], gstone_rating: 7.5, category: ["STRATEGY"], removeDate: 0 },
  { id: "bg016", sch_name: "铁路大亨", eng_name: "Railways of the World", player_num: [2,3,4,5,6], best_player_num: [4], gstone_rating: 7.3, category: ["STRATEGY"], removeDate: 0 },
  { id: "bg017", sch_name: "1817 (2020)", eng_name: "1817 (2020)", player_num: [3,4,5,6,7], best_player_num: [5], gstone_rating: 7.8, category: ["STRATEGY"], removeDate: 0 },
];

let mutateLog: Array<{action: string; params: any; description: string}> = [];

function executeQuery(graphql: string): string {
  const n = graphql.replace(/\s+/g, " ").trim();

  if (n.includes("activesTable") && !n.includes("Registration")) {
    let results = [...MOCK_ACTIVES];
    const dateEq = n.match(/date:\s*\{eq:\s*"([^"]+)"\}/);
    if (dateEq) results = results.filter(a => a.date === dateEq[1]);
    const dateGte = n.match(/date:\s*\{gte:\s*"([^"]+)"\}/);
    if (dateGte) results = results.filter(a => a.date >= dateGte[1]);
    const creatorEq = n.match(/creator_id:\s*\{eq:\s*"([^"]+)"\}/);
    if (creatorEq) results = results.filter(a => a.creator_id === creatorEq[1]);
    const idEq = n.match(/(?:^|[^_])id:\s*\{eq:\s*"([^"]+)"\}/);
    if (idEq) results = results.filter(a => a.id === idEq[1]);
    if (n.includes("DESC")) results.sort((a, b) => b.create_at - a.create_at);
    const limitMatch = n.match(/limit:\s*(\d+)/);
    if (limitMatch) results = results.slice(0, parseInt(limitMatch[1]));
    if (n.includes("TableSingle")) {
      return JSON.stringify({ activesTableSingle: results[0] || null }) + `\n[_meta: 本次返回${results[0] ? 1 : 0}条]`;
    }
    return JSON.stringify({ activesTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("activeRegistrationsTable") || n.includes("Registration")) {
    let results = [...MOCK_REGISTRATIONS];
    const aidEq = n.match(/active_id:\s*\{eq:\s*"([^"]+)"\}/);
    if (aidEq) results = results.filter(r => r.active_id === aidEq[1]);
    const uidEq = n.match(/user_id:\s*\{eq:\s*"([^"]+)"\}/);
    if (uidEq) results = results.filter(r => r.user_id === uidEq[1]);
    return JSON.stringify({ activeRegistrationsTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("boardGamesTable")) {
    let results = [...MOCK_BOARD_GAMES];
    const nameMatch = n.match(/sch_name:\s*\{ilike:\s*"([^"]+)"\}/);
    if (nameMatch) {
      const kw = nameMatch[1].replace(/%/g, "").toLowerCase();
      results = results.filter(g => g.sch_name.toLowerCase().includes(kw) || g.eng_name.toLowerCase().includes(kw));
    }
    const engMatch = n.match(/eng_name:\s*\{ilike:\s*"([^"]+)"\}/);
    if (engMatch) {
      const kw = engMatch[1].replace(/%/g, "").toLowerCase();
      results = results.filter(g => g.eng_name.toLowerCase().includes(kw));
    }
    const ratingMatch = n.match(/gstone_rating:\s*\{gte:\s*([0-9.]+)\}/);
    if (ratingMatch) results = results.filter(g => g.gstone_rating >= parseFloat(ratingMatch[1]));
    const removeDateMatch = n.match(/removeDate:\s*\{eq:\s*(\d+)\}/);
    if (removeDateMatch) results = results.filter(g => g.removeDate === parseInt(removeDateMatch[1]));
    if (n.includes("DESC")) results.sort((a, b) => b.gstone_rating - a.gstone_rating);
    const limitMatch = n.match(/limit:\s*(\d+)/);
    if (limitMatch) results = results.slice(0, parseInt(limitMatch[1]));
    if (n.includes("TableSingle")) {
      return JSON.stringify({ boardGamesTableSingle: results[0] || null }) + `\n[_meta: 本次返回${results[0] ? 1 : 0}条]`;
    }
    return JSON.stringify({ boardGamesTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  return `查询错误: 未识别的表名。可用表: boardGamesTable, activesTable, activeRegistrationsTable`;
}

const ACTION_ALIASES: Record<string, string> = {
  delete_active: "leave_active",
  cancel_active: "leave_active",
  remove_active: "leave_active",
  quit_active: "leave_active",
  exit_active: "leave_active",
};

function executeMutate(action: string, params: any, description: string): string {
  const resolved = ACTION_ALIASES[action] || action;
  mutateLog.push({ action: resolved, params, description });
  switch (resolved) {
    case "create_active":
      return `[通知] 约局已创建! 标题: ${params.title || params.name}, 日期: ${params.date} ${params.startTime || params.start_time}, ${params.maxPlayers || params.max_players}人局。ID: act_new_001`;
    case "join_active":
      return `[通知] 已加入约局 ${params.activeId || params.active_id || params.id}`;
    case "watch_active":
      return `[通知] 已观望约局 ${params.activeId || params.active_id || params.id}`;
    case "leave_active":
      return `[通知] 已退出约局 ${params.activeId || params.active_id || params.id}`;
    case "update_active":
      return `[通知] 约局 ${params.activeId || params.active_id || params.id} 已更新: ${JSON.stringify(params.fields)}`;
    case "send_sms_code":
      return `[通知] 验证码已发送至 ${params.phone}`;
    case "verify_phone":
      return `[通知] 手机号 ${params.phone} 验证成功并绑定`;
    case "bind_gsz":
      return `[通知] 公式站账号 ${params.gszId} 绑定成功`;
    case "upsert_business_card":
      return `[通知] 名片已更新`;
    default:
      return `错误: 未知操作 ${action}。有效: create_active/join_active/watch_active/leave_active/update_active/send_sms_code/verify_phone/bind_gsz/upsert_business_card`;
  }
}

function executeTool(name: string, args: Record<string, unknown>, remaining: number): string {
  let result: string;
  switch (name) {
    case "query":
      result = executeQuery(args.graphql as string);
      break;
    case "mutate":
      result = executeMutate(args.action as string, args.params, args.description as string);
      break;
    case "generate_totp":
      result = `[通知] TOTP: 123456`;
      break;
    default:
      result = `未知工具: ${name}`;
  }
  const suffix = remaining <= 1 ? `\n[剩余调用:${remaining}/${MAX_TOOL_CALLS}。请直接回复用户]` : `\n[剩余:${remaining}]`;
  return result + suffix;
}

function buildSystemPrompt(userMessage: string): string {
  const base = `你是 Diceshock 桌游吧的AI助手，已接入店铺完整业务系统。
当前用户ID: ${CURRENT_USER_ID}
当前日期: ${CURRENT_DATE}

你有三个工具：query, mutate, generate_totp

执行约束：
- 你有 ${MAX_TOOL_CALLS} 次工具调用机会。
- 如果注入的业务知识已包含完整答案（如店铺地址、价格），直接回复，不要调用工具。
- 只有需要查数据库的场景才调用 query/mutate。
- 拿到数据后立即回复，不要反复查询同一张表。
- 查询失败时检查字段名是否正确，最多重试1次。重试仍失败就告知用户稍后再试。

回复格式：
- 必须是 JSON 数组：[{"type":"text","content":"你的回复"}]
- 无论任何情况，回复都必须包裹在上述 JSON 结构中。不接受裸文本。
- 微信不支持 Markdown。content 中禁止出现 ** # [链接](url) 反引号。
- 链接直接写 URL 文本。
- 中文回答，300字以内，友好自然。`;

  const skills = matchSkills(userMessage);
  if (skills) return base + `\n\n[已注入业务知识]\n${skills}`;
  return base;
}

const TOOLS = [
  { type: "function", function: { name: "query", description: "执行 GraphQL 查询", parameters: { type: "object", properties: { graphql: { type: "string" }, variables: { type: "object" } }, required: ["graphql"] } } },
  { type: "function", function: { name: "mutate", description: "执行数据修改操作", parameters: { type: "object", properties: { action: { type: "string" }, params: { type: "object" }, description: { type: "string" } }, required: ["action", "params", "description"] } } },
  { type: "function", function: { name: "generate_totp", description: "生成活动签到验证码", parameters: { type: "object", properties: {}, required: [] } } },
];

interface Message { role: string; content: string; tool_calls?: any[]; tool_call_id?: string; }

async function callDeepSeek(messages: Message[], useTools: boolean) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-v4-flash", messages, ...(useTools ? { tools: TOOLS, tool_choice: "auto" } : {}), max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as any;
}

interface TestResult { query: string; passed: boolean; toolCalls: number; response: string; errors: string[] }

async function runAgent(userMessage: string, silent = false): Promise<TestResult> {
  const result: TestResult = { query: userMessage, passed: false, toolCalls: 0, response: "", errors: [] };
  if (!silent) { console.log(`\n${"=".repeat(60)}`); console.log(`USER: ${userMessage}`); console.log("=".repeat(60)); }
  mutateLog = [];

  const messages: Message[] = [
    { role: "system", content: buildSystemPrompt(userMessage) },
    { role: "user", content: userMessage },
  ];

  let totalToolCalls = 0;

  for (let round = 1; round <= 10; round++) {
    const hasToolBudget = totalToolCalls < MAX_TOOL_CALLS;
    if (!silent) console.log(`\n--- Round ${round} (tools: ${totalToolCalls}/${MAX_TOOL_CALLS}) ---`);

    const data = await callDeepSeek(messages, hasToolBudget);
    const choice = data.choices?.[0]?.message;

    if (!choice?.tool_calls?.length) {
      result.response = choice?.content || "(empty)";
      result.toolCalls = totalToolCalls;
      if (!silent) { console.log(`\nRESPONSE:`); console.log(result.response); }
      break;
    }

    if (choice.content && !silent) console.log(`  THINKING: ${choice.content.slice(0, 100)}`);
    messages.push({ role: "assistant", content: choice.content || "", tool_calls: choice.tool_calls });

    for (const tc of choice.tool_calls) {
      totalToolCalls++;
      const remaining = MAX_TOOL_CALLS - totalToolCalls;
      const args = JSON.parse(tc.function.arguments || "{}");
      if (!silent) console.log(`  TOOL #${totalToolCalls}: ${tc.function.name}(${JSON.stringify(args).slice(0, 120)}...)`);

      if (totalToolCalls > MAX_TOOL_CALLS) {
        messages.push({ role: "tool", content: "[错误]调用次数已用完。请立即根据已有数据回复用户。", tool_call_id: tc.id });
        continue;
      }
      const toolResult = executeTool(tc.function.name, args, remaining);
      if (!silent) console.log(`  RESULT: ${toolResult.slice(0, 150)}${toolResult.length > 150 ? "..." : ""}`);
      messages.push({ role: "tool", content: toolResult, tool_call_id: tc.id });
    }

    if (totalToolCalls >= MAX_TOOL_CALLS) {
      if (!silent) console.log(`\n--- Budget reached, forcing final ---`);
      messages.push({ role: "user", content: '工具调用结束。请根据以上全部工具返回的数据，直接回复用户。格式：[{"type":"text","content":"你的回复"}]' });
      const final = await callDeepSeek(messages, false);
      result.response = final.choices?.[0]?.message?.content || "(empty)";
      result.toolCalls = totalToolCalls;
      if (!silent) { console.log(`\nRESPONSE:`); console.log(result.response); }
      break;
    }
  }

  return validateResult(result);
}

function validateResult(result: TestResult): TestResult {
  const r = result.response;
  if (!r || r === "(empty)") { result.errors.push("EMPTY_RESPONSE"); return result; }
  if (result.toolCalls > MAX_TOOL_CALLS) result.errors.push("EXCEEDED_BUDGET");
  result.passed = result.errors.length === 0;
  return result;
}

interface Scenario { name: string; input: string; expect: { toolsCalled?: string[]; mutateAction?: string; containsUrl?: boolean; containsText?: string; noTools?: boolean } }

const SCENARIOS: Scenario[] = [
  { name: "桌游搜索-精确名", input: "搜索卡坦岛", expect: { toolsCalled: ["query"], containsUrl: true } },
  { name: "桌游推荐-人数", input: "有什么3人玩的桌游推荐吗", expect: { toolsCalled: ["query"] } },
  { name: "桌游推荐-2人", input: "推荐适合2人玩的桌游", expect: { toolsCalled: ["query"] } },
  { name: "桌游推荐-派对", input: "有什么派对类型的桌游", expect: { toolsCalled: ["query"] } },
  { name: "店铺信息-无需工具", input: "你们店在哪里", expect: { noTools: true } },
  { name: "约局-查列表", input: "有什么约局可以参加", expect: { toolsCalled: ["query"] } },
  { name: "约局-创建简单", input: "帮我创建一个明天下午3点的约局，玩阿瓦隆，8个人，在光谷天地", expect: { mutateAction: "create_active" } },
  { name: "约局-查+加入", input: "我想加入周日那个阿瓦隆约局", expect: { toolsCalled: ["query", "mutate"], mutateAction: "join_active" } },
  { name: "约局-退出", input: "我想退出act001那个约局", expect: { mutateAction: "leave_active" } },
  { name: "约局-删除自己的", input: "帮我把我创建的周五卡坦岛约局删了", expect: { mutateAction: "leave_active" } },
  { name: "联合-搜桌游+提方案", input: "帮我搜一下卡坦岛，然后创建一个明天晚上7点的3人约局", expect: { toolsCalled: ["query"], containsText: "光谷天地" } },
];

async function runAllScenarios() {
  console.log(`\n${"#".repeat(60)}`);
  console.log(`# AGENT INTEGRATION TEST - DeepSeek V4 Flash`);
  console.log(`# ${SCENARIOS.length} scenarios | MAX_TOOL_CALLS=${MAX_TOOL_CALLS}`);
  console.log(`${"#".repeat(60)}`);

  const results: TestResult[] = [];
  for (const s of SCENARIOS) {
    console.log(`\n[SCENARIO] ${s.name}`);
    const r = await runAgent(s.input);

    if (s.expect.noTools && r.toolCalls > 0) { r.errors.push(`EXPECTED_NO_TOOLS_BUT_USED_${r.toolCalls}`); r.passed = false; }
    if (s.expect.mutateAction && !mutateLog.some(m => m.action === s.expect.mutateAction)) {
      r.errors.push(`EXPECTED_MUTATE_${s.expect.mutateAction}_NOT_CALLED`); r.passed = false;
    }
    if (s.expect.containsUrl && !r.response.includes("https://")) { r.errors.push("EXPECTED_URL_MISSING"); r.passed = false; }
    if (s.expect.containsText && !r.response.includes(s.expect.containsText)) { r.errors.push(`EXPECTED_TEXT_MISSING:${s.expect.containsText}`); r.passed = false; }

    results.push(r);
  }

  console.log(`\n\n${"=".repeat(60)}`);
  console.log("RESULTS SUMMARY");
  console.log("=".repeat(60));
  const passed = results.filter(r => r.passed).length;
  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`  [${status}] ${r.query.slice(0, 30).padEnd(30)} | tools:${r.toolCalls} | ${r.errors.join(", ") || "ok"}`);
  }
  console.log(`\n  TOTAL: ${passed}/${results.length} passed`);
  if (passed < results.length) process.exit(1);
}

async function runCustomerAgent() {
  console.log(`\n${"#".repeat(60)}`);
  console.log(`# CUSTOMER AGENT MODE - generating realistic scenarios`);
  console.log(`${"#".repeat(60)}`);

  const customerPrompt = `你是一个桌游店的普通顾客，在微信公众号上和店铺AI客服对话。
你不懂技术，用自然口语表达需求。生成10个不同的对话请求，覆盖：
- 简单查询（搜桌游、问地址）
- 推荐（按人数、类型）
- 约局操作（查看、创建、加入、退出）
- 复合操作（搜桌游+约局）
- 账号操作（绑手机、查会员）

每行一个请求，不要编号，不要解释，只写用户会说的话。像真人一样随意，可以有错别字。`;

  const customerRes = await callDeepSeek([{ role: "user", content: customerPrompt }], false);
  const lines = (customerRes.choices?.[0]?.message?.content || "").split("\n").filter((l: string) => l.trim().length > 2);

  console.log(`\nCustomer generated ${lines.length} queries:\n`);
  for (const line of lines) console.log(`  - ${line}`);

  console.log(`\n${"─".repeat(60)}`);
  let passed = 0;
  for (const line of lines.slice(0, 10)) {
    console.log(`\n[CUSTOMER] ${line}`);
    const r = await runAgent(line.trim(), true);
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`  [${status}] tools:${r.toolCalls} | response:${r.response.slice(0, 80)}...`);
    if (r.errors.length) console.log(`  ERRORS: ${r.errors.join(", ")}`);
    if (r.passed) passed++;
  }

  console.log(`\n\n  CUSTOMER TEST: ${passed}/${lines.slice(0, 10).length} passed`);
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--customer") {
    await runCustomerAgent();
  } else if (arg) {
    await runAgent(arg);
  } else {
    await runAllScenarios();
  }
}

main().catch(console.error);
