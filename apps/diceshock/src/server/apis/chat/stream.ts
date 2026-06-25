import { createOpenAI } from "@ai-sdk/openai";
import { getAuthUser } from "@hono/auth-js";
import db, { storesTable, userInfoTable } from "@lib/db";
import { type CoreMessage, streamText } from "ai";
import { eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { createChatTools } from "./tools";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

type ChatRole = "system" | "user" | "assistant" | "tool";

type ChatMessage = {
  role: ChatRole;
  content: unknown;
};

type PageContext = {
  page: string;
  filters?: Record<string, unknown>;
};

type ChatStreamBody = {
  messages?: ChatMessage[];
  context?: PageContext;
};

type AuthIdentity = {
  userId: string;
  role: "admin" | "staff";
  name: string;
  preferredStoreId: string | null;
};

type StoreContext = {
  id: string | null;
  code: string | null;
  name: string;
  address: string | null;
};

type RateLimitRecord = {
  timestamps: number[];
};

const rateLimitByUser = new Map<string, RateLimitRecord>();

const chatStream = new Hono<HonoCtxEnv>();

function isStaffRole(role: unknown): role is "admin" | "staff" {
  return role === "admin" || role === "staff";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function validateChatStreamBody(body: unknown):
  | {
      ok: true;
      value: Required<Pick<ChatStreamBody, "messages">> &
        Pick<ChatStreamBody, "context">;
    }
  | { ok: false; error: string } {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "Request body must be an object" };

  if (!Array.isArray(record.messages)) {
    return { ok: false, error: "Missing or invalid 'messages' field" };
  }

  for (const message of record.messages) {
    const msg = asRecord(message);
    if (!msg) return { ok: false, error: "Each message must be an object" };
    if (
      msg.role !== "system" &&
      msg.role !== "user" &&
      msg.role !== "assistant" &&
      msg.role !== "tool"
    ) {
      return { ok: false, error: "Each message must include a valid role" };
    }
    if (typeof msg.content !== "string" && !Array.isArray(msg.content)) {
      return { ok: false, error: "Each message must include valid content" };
    }
  }

  let context: PageContext | undefined;
  if (record.context !== undefined) {
    const contextRecord = asRecord(record.context);
    const page = contextRecord ? resolveString(contextRecord.page) : null;
    if (!contextRecord || !page) {
      return { ok: false, error: "Invalid 'context.page' field" };
    }

    const filters = contextRecord.filters;
    if (filters !== undefined && !asRecord(filters)) {
      return { ok: false, error: "Invalid 'context.filters' field" };
    }

    context = {
      page,
      filters: filters as Record<string, unknown> | undefined,
    };
  }

  return {
    ok: true,
    value: { messages: record.messages as ChatMessage[], context },
  };
}

export function checkChatRateLimit(
  userId: string,
  now = Date.now(),
):
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfter: number } {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const record = rateLimitByUser.get(userId) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - record.timestamps[0]);
    rateLimitByUser.set(userId, record);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  record.timestamps.push(now);
  rateLimitByUser.set(userId, record);
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - record.timestamps.length,
  };
}

export function resetChatRateLimits() {
  rateLimitByUser.clear();
}

export function buildSystemPrompt(params: {
  identity: AuthIdentity;
  store: StoreContext;
  pageContext?: PageContext;
}): string {
  const filters = params.pageContext?.filters
    ? JSON.stringify(params.pageContext.filters, null, 2)
    : "无";

  return `你是骰子奇兵后台助手（Diceshock Backend Assistant），服务于骰子奇兵桌游吧后台管理系统。

[用户身份]
- 用户ID: ${params.identity.userId}
- 姓名: ${params.identity.name}
- 角色: ${params.identity.role}

[门店上下文]
- 门店ID: ${params.store.id ?? "未绑定"}
- 门店代码: ${params.store.code ?? "未知"}
- 门店名称: ${params.store.name}
- 门店地址: ${params.store.address ?? "未知"}

[当前页面]
- 页面: ${params.pageContext?.page ?? "未知页面"}
- 当前筛选: ${filters}

[可用工具]
- query_gql: 执行只读 GraphQL 查询，受当前用户权限控制。
- mutate_gql: 仅生成 GraphQL mutation 预览，不会执行；返回 mutationId、query、variables、description。
- generate_totp: 生成当前后台用户的签到验证码。
- search_rules: 搜索 TRPG/DND/麻将规则片段。
- query_active_participants: 查询约局参与者名片，仅约局发起者可用。
- format_search_query: 将自然语言筛选描述转换为后台搜索语法。

[GraphQL Schema 参考 — 订单操作]
- 查询订单: query { orders(filter: { status: ["ACTIVE"|"PAUSED"|"ENDED"], dateFrom: "YYYY-MM-DD", dateTo: "YYYY-MM-DD", tableCode: "A1", store: "storeId" }) { items { id tableCode userName startedAt endedAt status amount } pageInfo { total } } }
- 暂停订单: mutation { pauseOrder(id: "order-id") { id status } }
- 恢复订单: mutation { resumeOrder(id: "order-id") { id status } }
- 结算订单: mutation { settleOrders(ids: ["id1", "id2"]) { id status } }
- 创建订单: mutation { createTableOccupancy(input: { tableId: "table-id", userId: "user-id" }) { id status } }

[GraphQL Schema 参考 — 价格管理]
- 查询当前价格: query { publishedPricing(storeId: "store-id") { id name data { config { daytimeStart daytimeEnd } plans } status publishedAt } }
- 保存价格方案: mutation { savePricingSnapshot(input: { name: "方案名", data: { config: "{\\"daytimeStart\\":\\"10:00\\",\\"daytimeEnd\\":\\"18:00\\"}", plans: "[{\\"name\\":\\"标准桌\\",\\"price\\":35,\\"unit\\":\\"hour\\"}]" }, storeId: "store-id" }) { id name status } }
- 发布价格: mutation { publishPricingSnapshot(storeId: "store-id") { id name status publishedAt } }
- 恢复历史快照: mutation { restorePricingSnapshot(id: "snapshot-id") { id name status } }

[GraphQL Schema 参考 — 活动/约局]
- 查询活动: query { managedActives(filter: { status: ["active"|"expired"], store: "storeId" }) { ... } }
- 创建约局: mutation { createActive(input: { title: "标题", date: "YYYY-MM-DD", time: "HH:mm", maxPlayers: N, isGame: true, storeId: "store-id" }) { id title } }
- 删除约局: mutation { removeActive(input: { id: "active-id" }) }
- 批量删除: mutation { batchRemoveActives(input: { ids: ["id1", "id2"] }) }

[GraphQL Schema 参考 — 用户]
- 查询用户: query { managedUsers(filter: { search: "关键词", role: ["STAFF"], store: "storeId", pagination: { offset: 0, limit: 30 } }) { items { id name phone role } pageInfo { total } } }

[日期推断规则]
- "今天" = ${new Date().toISOString().split("T")[0]}
- "昨天" = 前一天的 ISO 日期
- "上周五" = 上一个星期五的日期
- "本周" = 本周一到今天
- "这个月" = 本月1日到今天
- 时间模糊表述: "下午" = 14:00, "晚上" = 19:00, "上午" = 10:00

[营业数据查询模式]
- 计算营业额: 查询 orders(filter: { status: ["ENDED"], dateFrom, dateTo }) 然后对 amount 字段求和
- 最忙桌子: 查询 orders 按 tableCode 分组统计时长
- 新用户数: 查询 managedUsers(filter: { dateFrom }) 的 pageInfo.total
- 对比周期: 分别查询两个时间段的数据再做对比

[多步操作]
- "修改并发布价格" = 先调用 savePricingSnapshot 保存 → 确认 → 再调用 publishPricingSnapshot 发布
- "结算所有暂停订单" = 先 query 获取暂停订单列表 → 提取 IDs → 再调用 settleOrders(ids)

[行为规则]
- 使用中文回复，必要时可使用 Markdown 格式。
- 回答应结合当前页面和筛选条件，优先给出后台运营可执行建议。
- 所有 mutation 都必须先调用 mutate_gql 生成预览，明确要求用户确认后再提示前端调用 /api/chat/confirm。
- mutate_gql 返回预览不代表操作已经执行；确认前不要声称已创建、已更新、已删除或已结算。
- 不要发起身份管理类操作，例如更新用户角色、账户、会话或认证器。
- 不泄露密钥、完整手机号、内部令牌或不必要的个人敏感信息。
- 批量操作（结算/删除多条记录）前，先用 query_gql 查询确认影响范围，在 description 中明确列出影响条数。
- 搜索语法生成时，根据当前页面自动选择 entityType（/dash/orders → orders，/dash/gsz → mahjong 等）。`;
}

async function resolveAuthIdentity(
  c: Context<HonoCtxEnv>,
): Promise<AuthIdentity | null> {
  const authUser = await getAuthUser(c).catch(() => null);
  const role =
    authUser?.token?.role ??
    (authUser?.user as { role?: string } | undefined)?.role;
  const userId =
    resolveString(authUser?.token?.sub) ?? resolveString(authUser?.user?.id);

  if (!userId || !isStaffRole(role)) return null;

  return {
    userId,
    role,
    name:
      resolveString(authUser?.token?.name) ??
      resolveString(authUser?.user?.name) ??
      "未命名用户",
    preferredStoreId:
      resolveString(
        (authUser?.token as Record<string, unknown> | undefined)
          ?.preferredStoreId,
      ) ?? null,
  };
}

async function resolveStoreContext(
  c: Context<HonoCtxEnv>,
  identity: AuthIdentity,
): Promise<StoreContext> {
  const database = db(c.env.DB);
  let preferredStoreId = identity.preferredStoreId;

  if (!preferredStoreId) {
    const userInfo = await database.query.userInfoTable
      .findFirst({
        where: eq(userInfoTable.id, identity.userId),
        columns: { preferred_store_id: true },
      })
      .catch(() => null);
    preferredStoreId = userInfo?.preferred_store_id ?? null;
  }

  if (preferredStoreId) {
    const store = await database.query.storesTable
      .findFirst({
        where: eq(storesTable.id, preferredStoreId),
        columns: { id: true, code: true, name: true, address: true },
      })
      .catch(() => null);

    if (store) {
      return {
        id: store.id,
        code: store.code,
        name: store.name,
        address: store.address,
      };
    }
  }

  return {
    id: preferredStoreId,
    code: c.get("StoreCode") ?? null,
    name: preferredStoreId ? "未知门店" : "未绑定门店",
    address: null,
  };
}

function getDeepSeekBaseURL(
  env: Pick<Cloudflare.Env, "CF_AI_GATEWAY_ID" | "CF_ACCOUNT_ID">,
): string {
  const gatewayId = resolveString(env.CF_AI_GATEWAY_ID);
  const accountId =
    resolveString(env.CF_ACCOUNT_ID) ?? "3244c8f91cd34317ce18652158e5853a";

  return gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek`
    : "https://api.deepseek.com/v1";
}

chatStream.post("/", async (c) => {
  try {
    const identity = await resolveAuthIdentity(c);
    if (!identity) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const rateLimit = checkChatRateLimit(identity.userId);
    if (!rateLimit.allowed) {
      c.header("Retry-After", String(rateLimit.retryAfter));
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    c.header("X-RateLimit-Remaining", String(rateLimit.remaining));

    const apiKey = resolveString(c.env.DEEPSEEK_API_KEY);
    if (!apiKey) {
      return c.json({ error: "DEEPSEEK_API_KEY not configured" }, 500);
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = validateChatStreamBody(rawBody);
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }

    const store = await resolveStoreContext(c, identity);
    const tools = createChatTools({
      env: c.env,
      identity: {
        userId: identity.userId,
        role: identity.role,
        preferredStoreId: identity.preferredStoreId,
      },
    });
    const system = buildSystemPrompt({
      identity,
      store,
      pageContext: parsed.value.context,
    });

    const deepseek = createOpenAI({
      apiKey,
      baseURL: getDeepSeekBaseURL(c.env),
      compatibility: "compatible",
    });

    const result = streamText({
      model: deepseek("deepseek-v4-pro"),
      system,
      messages: parsed.value.messages as CoreMessage[],
      tools,
      maxSteps: 5,
      onError: ({ error }) => {
        console.error("[chat/stream] streamText error:", error);
      },
    });

    const response = result.toDataStreamResponse();
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    return response;
  } catch (error) {
    console.error("[chat/stream] handler error:", error);
    return c.json({ error: "Chat stream failed" }, 500);
  }
});

export default chatStream;
