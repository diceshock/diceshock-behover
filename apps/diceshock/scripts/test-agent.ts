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

const MOCK_MEMBERSHIP_PLANS = [
  { id: "mp001", user_id: CURRENT_USER_ID, plan_type: "monthly", amount: null, start_date: 1748000000000, end_date: 1750592000000, create_at: 1748000000000 },
];

const MOCK_USER_INFO = [
  { id: CURRENT_USER_ID, uid: "DS0042", nickname: "测试用户", phone: "13800138000" },
];

const MOCK_BUSINESS_CARDS = [
  { id: CURRENT_USER_ID, share_phone: true, wechat: "test_wx_001", qq: "12345678", custom_content: "桌游爱好者，最爱18XX" },
];

const MOCK_TABLES = [
  { id: "tbl001", name: "A1", type: "FIXED", scope: "BOARDGAME", status: "ACTIVE", capacity: 6, code: "A1GG", description: "六人大桌", store_id: "store_gg", create_at: 1748000000000 },
  { id: "tbl002", name: "A2", type: "FIXED", scope: "BOARDGAME", status: "ACTIVE", capacity: 4, code: "A2GG", description: "四人标准桌", store_id: "store_gg", create_at: 1748000000000 },
  { id: "tbl003", name: "M1", type: "FIXED", scope: "MAHJONG", status: "ACTIVE", capacity: 4, code: "M1GG", description: "麻将专用桌", store_id: "store_gg", create_at: 1748000000000 },
  { id: "tbl004", name: "B1", type: "SOLO", scope: "CONSOLE", status: "INACTIVE", capacity: 2, code: "B1GG", description: "双人主机位", store_id: "store_gg", create_at: 1748000000000 },
];

const MOCK_ORDERS = [
  { id: "ord001", table_id: "tbl001", user_id: CURRENT_USER_ID, nickname: "测试用户", uid: "DS0042", seats: 2, status: "ACTIVE", start_at: 1750300000000, end_at: null, final_price: null, table_name: "A1", table_code: "A1GG" },
  { id: "ord002", table_id: "tbl002", user_id: "user_other_002", nickname: "路人甲", uid: "DS0088", seats: 1, status: "SETTLED", start_at: 1750200000000, end_at: 1750210000000, final_price: 35, table_name: "A2", table_code: "A2GG" },
  { id: "ord003", table_id: "tbl003", user_id: CURRENT_USER_ID, nickname: "测试用户", uid: "DS0042", seats: 4, status: "PAUSED", start_at: 1750250000000, end_at: null, final_price: null, table_name: "M1", table_code: "M1GG" },
];

const MOCK_EVENTS = [
  { id: "evt001", title: "周末卡坦岛联赛", description: "4v4循环赛", is_published: true, create_at: 1750000000000 },
  { id: "evt002", title: "新人体验日", description: "免费试玩，老师教学", is_published: true, create_at: 1750100000000 },
  { id: "evt003", title: "日麻大师赛(草稿)", description: "仅限段位R1800+", is_published: false, create_at: 1750200000000 },
];

const MOCK_POINTS_LOG = [
  { id: "pt001", user_id: CURRENT_USER_ID, amount: 100, balance_after: 100, note: "注册赠送", created_by: "system", create_at: 1748000000000 },
  { id: "pt002", user_id: CURRENT_USER_ID, amount: 50, balance_after: 150, note: "约局奖励", created_by: "system", create_at: 1750000000000 },
  { id: "pt003", user_id: CURRENT_USER_ID, amount: -20, balance_after: 130, note: "兑换饮品", created_by: "staff_001", create_at: 1750100000000 },
];

const MOCK_MAHJONG_MATCHES = [
  { id: "mj001", table_id: "tbl003", match_type: "ranked", mode: "FOUR_PLAYER", format: "HANCHAN", start_at: 1750200000000, end_at: 1750210000000, gsz_synced: true, players: [{user_id: CURRENT_USER_ID, nickname: "测试用户", seat: 0, final_score: 32000}, {user_id: "user_002", nickname: "东风侠", seat: 1, final_score: 28000}, {user_id: "user_003", nickname: "自摸王", seat: 2, final_score: 22000}, {user_id: "user_004", nickname: "点炮哥", seat: 3, final_score: 18000}] },
  { id: "mj002", table_id: "tbl003", match_type: "casual", mode: "FOUR_PLAYER", format: "TONPUU", start_at: 1750250000000, end_at: 1750255000000, gsz_synced: false, players: [{user_id: CURRENT_USER_ID, nickname: "测试用户", seat: 0, final_score: 29000}, {user_id: "user_002", nickname: "东风侠", seat: 1, final_score: 31000}, {user_id: "user_005", nickname: "立直党", seat: 2, final_score: 24000}, {user_id: "user_006", nickname: "门清狂", seat: 3, final_score: 16000}] },
];

type MutationParams = Record<string, unknown>;

let mutateLog: Array<{action: string; params: MutationParams; description: string}> = [];

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

  if (n.includes("userMembershipPlansTable") || n.includes("membershipPlans")) {
    let results = [...MOCK_MEMBERSHIP_PLANS];
    const uidEq = n.match(/user_id:\s*\{eq:\s*"([^"]+)"\}/);
    if (uidEq) results = results.filter(m => m.user_id === uidEq[1]);
    return JSON.stringify({ userMembershipPlansTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("userInfoTable")) {
    let results = [...MOCK_USER_INFO];
    const idEq = n.match(/(?:^|[^_])id:\s*\{eq:\s*"([^"]+)"\}/);
    if (idEq) results = results.filter(u => u.id === idEq[1]);
    return JSON.stringify({ userInfoTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("userBusinessCardTable") || n.includes("businessCard")) {
    let results = [...MOCK_BUSINESS_CARDS];
    const idEq = n.match(/(?:^|[^_])id:\s*\{eq:\s*"([^"]+)"\}/);
    if (idEq) results = results.filter(c => c.id === idEq[1]);
    return JSON.stringify({ userBusinessCardTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("tablesTable") || n.includes("managedTables")) {
    let results = [...MOCK_TABLES];
    const statusMatch = n.match(/status:\s*\{eq:\s*"([^"]+)"\}/);
    if (statusMatch) results = results.filter(t => t.status === statusMatch[1]);
    const scopeMatch = n.match(/scope:\s*\{eq:\s*"([^"]+)"\}/);
    if (scopeMatch) results = results.filter(t => t.scope === scopeMatch[1]);
    const nameMatch = n.match(/name:\s*\{ilike:\s*"([^"]+)"\}/);
    if (nameMatch) {
      const kw = nameMatch[1].replace(/%/g, "").toLowerCase();
      results = results.filter(t => t.name.toLowerCase().includes(kw));
    }
    return JSON.stringify({ tablesTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("ordersTable") || n.includes("orders")) {
    let results = [...MOCK_ORDERS];
    const statusMatch = n.match(/status:\s*\{eq:\s*"([^"]+)"\}/);
    if (statusMatch) results = results.filter(o => o.status === statusMatch[1]);
    const uidMatch = n.match(/user_id:\s*\{eq:\s*"([^"]+)"\}/);
    if (uidMatch) results = results.filter(o => o.user_id === uidMatch[1]);
    return JSON.stringify({ ordersTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("eventsTable")) {
    let results = [...MOCK_EVENTS];
    const pubMatch = n.match(/is_published:\s*\{eq:\s*(true|false)\}/);
    if (pubMatch) results = results.filter(e => e.is_published === (pubMatch[1] === "true"));
    if (n.includes("DESC")) results.sort((a, b) => b.create_at - a.create_at);
    const limitMatch = n.match(/limit:\s*(\d+)/);
    if (limitMatch) results = results.slice(0, parseInt(limitMatch[1]));
    return JSON.stringify({ eventsTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("pointsLogTable") || n.includes("pointsLog")) {
    let results = [...MOCK_POINTS_LOG];
    const uidMatch = n.match(/user_id:\s*\{eq:\s*"([^"]+)"\}/);
    if (uidMatch) results = results.filter(p => p.user_id === uidMatch[1]);
    if (n.includes("DESC")) results.sort((a, b) => b.create_at - a.create_at);
    return JSON.stringify({ pointsLogTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  if (n.includes("mahjongMatchesTable") || n.includes("mahjongMatches")) {
    let results = [...MOCK_MAHJONG_MATCHES];
    const modeMatch = n.match(/mode:\s*\{eq:\s*"([^"]+)"\}/);
    if (modeMatch) results = results.filter(m => m.mode === modeMatch[1]);
    const formatMatch = n.match(/format:\s*\{eq:\s*"([^"]+)"\}/);
    if (formatMatch) results = results.filter(m => m.format === formatMatch[1]);
    if (n.includes("DESC")) results.sort((a, b) => b.start_at - a.start_at);
    return JSON.stringify({ mahjongMatchesTable: results }) + `\n[_meta: 本次返回${results.length}条]`;
  }

  return `查询错误: 未识别的表名。可用表: boardGamesTable, activesTable, activeRegistrationsTable, userMembershipPlansTable, userInfoTable, userBusinessCardTable, tablesTable, ordersTable, eventsTable, pointsLogTable, mahjongMatchesTable`;
}

const ACTION_ALIASES: Record<string, string> = {
  delete_active: "leave_active",
  cancel_active: "leave_active",
  remove_active: "leave_active",
  quit_active: "leave_active",
  exit_active: "leave_active",
};

function executeMutate(action: string, params: MutationParams, description: string): string {
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
    case "update_profile":
      return `[通知] 昵称已修改为: ${params.nickname}`;
    case "update_preferences": {
      const parts: string[] = [];
      if (params.locale || params.language || params.lang) parts.push(`语言: ${params.locale || params.language || params.lang}`);
      if (params.store_id || params.store) parts.push(`店铺: ${params.store_id || params.store}`);
      return `[通知] 偏好设置已更新\n${parts.join(" | ")}`;
    }
    default:
      return `错误: 未知操作 ${action}。有效: create_active/join_active/watch_active/leave_active/update_active/send_sms_code/verify_phone/bind_gsz/upsert_business_card/update_profile`;
  }
}

function executeTool(name: string, args: Record<string, unknown>, remaining: number): string {
  let result: string;
  switch (name) {
    case "query":
      result = executeQuery(args.graphql as string);
      break;
    case "mutate":
      result = executeMutate(args.action as string, getMutationParams(args.params), args.description as string);
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

function getMutationParams(value: unknown): MutationParams {
  return value && typeof value === "object" ? (value as MutationParams) : {};
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

interface Message { role: string; content: string; tool_calls?: ToolCall[]; tool_call_id?: string; }
interface ToolCall { id: string; function: { name: string; arguments: string }; }

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: ToolCall[];
    };
  }>;
}

async function callDeepSeek(messages: Message[], useTools: boolean): Promise<DeepSeekResponse> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-v4-flash", messages, ...(useTools ? { tools: TOOLS, tool_choice: "auto" } : {}), max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as DeepSeekResponse;
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
  { name: "会员-查询", input: "查询我的会员信息", expect: { toolsCalled: ["query"] } },
  { name: "名片-查询", input: "查看我的名片", expect: { toolsCalled: ["query"], containsText: "test_wx_001" } },
  { name: "昵称-修改", input: "修改我的昵称到 孤独摇滚第二季制作决定", expect: { mutateAction: "update_profile" } },
  { name: "设置-切换英文", input: "Switch to English", expect: { mutateAction: "update_preferences" } },
  { name: "设置-切换店铺", input: "切换到街道口店", expect: { mutateAction: "update_preferences" } },
  { name: "桌台-查所有", input: "查看所有桌台", expect: { toolsCalled: ["query"] } },
  { name: "桌台-搜麻将桌", input: "有哪些麻将桌", expect: { toolsCalled: ["query"] } },
  { name: "订单-查进行中", input: "目前有哪些正在进行的订单", expect: { toolsCalled: ["query"] } },
  { name: "订单-查我的", input: "我今天有订单吗", expect: { toolsCalled: ["query"] } },
  { name: "活动-查最新", input: "最近有什么活动", expect: { toolsCalled: ["query"] } },
  { name: "积分-查余额", input: "我还有多少积分", expect: { toolsCalled: ["query"] } },
  { name: "积分-查记录", input: "看看我的积分记录", expect: { toolsCalled: ["query"] } },
  { name: "日麻-查最近对局", input: "查一下我最近打的日麻", expect: { toolsCalled: ["query"] } },
  { name: "日麻-查半庄", input: "有没有最近的半庄记录", expect: { toolsCalled: ["query"] } },
  { name: "联合-积分+会员", input: "查一下我的积分和会员状态", expect: { toolsCalled: ["query"] } },
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
