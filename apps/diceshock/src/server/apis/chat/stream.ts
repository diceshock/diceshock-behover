import { createDeepSeek } from "@ai-sdk/deepseek";
import { getAuthUser } from "@hono/auth-js";
import db, {
  chatMessagesTable,
  chatSessionsTable,
  storesTable,
  userInfoTable,
} from "@lib/db";
import { type CoreMessage, streamText, type ToolInvocation } from "ai";
import { and, eq } from "drizzle-orm";
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
  selectedRows?: unknown[];
};

type ChatStreamBody = {
  messages?: ChatMessage[];
  context?: PageContext;
  sessionId?: string;
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
        Pick<ChatStreamBody, "context" | "sessionId">;
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

    const selectedRows = contextRecord.selectedRows;
    if (selectedRows !== undefined && !Array.isArray(selectedRows)) {
      return { ok: false, error: "Invalid 'context.selectedRows' field" };
    }

    context = {
      page,
      filters: filters as Record<string, unknown> | undefined,
      selectedRows: selectedRows as unknown[] | undefined,
    };
  }

  const sessionId =
    record.sessionId === undefined
      ? undefined
      : resolveString(record.sessionId);
  if (record.sessionId !== undefined && !sessionId) {
    return { ok: false, error: "Invalid 'sessionId' field" };
  }

  return {
    ok: true,
    value: {
      messages: record.messages as ChatMessage[],
      context,
      sessionId: sessionId ?? undefined,
    },
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
  const selectedRows = params.pageContext?.selectedRows?.length
    ? JSON.stringify(params.pageContext.selectedRows, null, 2)
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
- 已选行数据: ${selectedRows}

[可用工具]
- generate_totp: 生成当前后台用户的签到验证码。
- search_rules: 搜索 TRPG/DND/麻将规则片段。
- query_active_participants: 查询约局参与者名片，仅约局发起者可用。
- format_search_query: 将自然语言筛选描述转换为后台搜索语法。

[GraphQL 查询/变更输出格式 — 重要]
当需要查询或修改数据时，直接在回复中用 markdown 代码块输出 GraphQL 语句。前端会自动识别并执行。

查询示例（前端自动执行并显示结果）:
\`\`\`graphql
query { managedUsers(filter: { pagination: { offset: 0, limit: 10 } }) { items { id name phone role createdAt } pageInfo { total } } }
\`\`\`

变更示例（前端显示确认卡片，用户选择执行或跳过）:
\`\`\`graphql-mutation
mutation { pauseOrder(id: "order-123") { id status } }
\`\`\`

规则:
- 查询用 \`\`\`graphql，变更用 \`\`\`graphql-mutation
- 每个代码块只包含一个 GraphQL 操作
- 可以在代码块前后写解释文字，文字和查询会按顺序混合展示
- 需要多步查询时，按顺序输出多个代码块，每个之间可加分析文字
- 变更操作必须在代码块前简要说明将要做什么

[字段命名规则 — 重要]
- 所有 GraphQL 字段使用驼峰式: createdAt, updatedAt, schName, engName, startAt, endAt, finalPrice, storeId, boardGameId
- 禁止使用下划线式: 不存在 create_at, sch_name, eng_name, start_at, end_at, final_price, store_id, board_game_id
- 所有 managedXxx 查询使用 filter: 参数（不是 where:）
- filter 通用字段: search(文本搜索), status(数组), store(门店ID), pagination({offset, limit}), sortBy, sortOrder(ASC|DESC)
- 分页: pagination: { offset: 0, limit: 20 }
- 日期范围: dateFrom/dateTo 格式 "YYYY-MM-DD"

[Schema — 用户 UserProfile]
字段: id uid name email image role nickname phone points preferredLocale preferredStoreId meta createdAt membershipPlans{id userId planType amount note startDate endDate createdAt updatedAt}
查询: query { managedUsers(filter: { search: "关键词", role: ["CUSTOMER","STAFF","ADMIN"], store: "storeId", sortBy: "name", sortOrder: DESC, pagination: { offset: 0, limit: 30 } }) { items { ...字段 } pageInfo { offset limit total hasMore } } }
单个: query { user(id: "userId") { ...字段 } }
关联: membershipPlansByUser(userId) / pointsLogByUser(userId) / occupanciesByUser(userId)
变更: mutation { updateUser(input: { id, name, nickname, phone, email }) { id } }
     mutation { disableUser(id: "userId") { id role } }

[Schema — 订单 TableOccupancy]
字段: id tableId userId tempId nickname uid phone seats status startAt endAt finalPrice pricingSnapshotId priceBreakdown table{id name code scope}
状态: ACTIVE | PAUSED | SETTLED | CANCELLED
查询: query { orders(filter: { status: ["ACTIVE","PAUSED"], tableCode: "A1", store: "storeId", dateFrom: "2025-01-01", dateTo: "2025-01-31" }) { items { ...字段 } pageInfo { offset limit total hasMore } } }
变更: pauseOrder(id) / resumeOrder(id) / endOrder(id) / settleOrder(input: { id, useStoredValue }) / batchSettleOrders(input: { ids, useStoredValue })
     batchPauseOrders(ids) / batchResumeOrders(ids) / cancelBatchSettlement(ids)
创建: mutation { addTableOccupancy(input: { tableId, userId }) { id status } }
预览: query { settlementPreview(id) { totalMinutes pausedMinutes billableMinutes finalPrice priceBreakdown{...} membership{...} } }

[Schema — 桌台 Table]
字段: id name type scope status capacity code description storeId occupancies{id tableId userId nickname uid seats status startAt} createdAt updatedAt
类型: type=FIXED|SOLO  scope=TRPG|BOARDGAME|CONSOLE|MAHJONG  status=ACTIVE|INACTIVE
查询: query { managedTables(filter: { search: "A1", type: ["FIXED"], status: ["ACTIVE"], scope: ["MAHJONG"], store: "storeId", pagination: { offset: 0, limit: 20 } }) { ...字段 } }
变更: createTable(input: { name, type, scope, capacity, storeId }) / updateTable(input: { id, name, description }) / removeTable(id) / toggleTableStatus(id)

[Schema — 约局 Active]
字段: id creatorId creator{id name} title boardGameId boardGame{id schName engName} storeId date time maxPlayers content isGame registrations{id activeId userId isWatching nickname uid} createdAt updatedAt
查询: query { managedActives(filter: { search: "关键词", status: ["active","expired"], store: "storeId", pagination: { limit: 20 } }) { ...字段 } }
变更: createActive(input: { title, date, time, maxPlayers, isGame, storeId, boardGameId, content }) / updateActive(input: { id, title, date, time, maxPlayers }) / removeActive(id) / batchRemoveActives(ids)
     removeActiveRegistration(registrationId)

[Schema — 活动公告 Event]
字段: id title description coverImageUrl content isPublished createdAt updatedAt
查询: query { managedEvents(filter: { search: "关键词", status: ["published","draft"], dateFrom, dateTo, store: "storeId" }) { ...字段 } }
变更: createEvent(input: { title, description, content, coverImageUrl, isPublished }) / updateEvent(input: { id, title, ... }) / removeEvent(id) / toggleEventPublish(id)

[Schema — 日麻对局 MahjongMatch]
字段: id tableId table{id name code} matchType gszRecordId gszSynced gszError gszSyncedAt mode format startedAt endedAt terminationReason players{userId nickname seat finalScore} playersJson unsyncableReasons{nickname userId reason}
模式: mode=THREE_PLAYER|FOUR_PLAYER  format=TONPUU|HANCHAN
查询: query { managedMahjongMatches(filter: { mode: ["FOUR_PLAYER"], format: ["HANCHAN"], syncStatus: ["SYNCED","UNSYNCED"], dateFrom, dateTo, store: "storeId" }) { items { ...字段 } pageInfo { offset limit total hasMore } } }
变更: terminateMahjongMatch(tableCode, reason) / updateMahjongScore(matchId, players: [{userId, nickname, seat, finalScore}]) / syncMahjongMatchToGsz(matchId) / batchSyncMahjongMatchesToGsz(matchIds)
实时: query { activeMahjongMatches { tableCode tableName phase matchType mode format players{userId nickname seat currentPoints} startedAt } }

[Schema — 价格 PricingSnapshot]
字段: id name storeId data{config{daytimeStart daytimeEnd} plans} status summary createdAt publishedAt
查询: query { pricingSnapshots(storeId) { ...字段 } } / query { publishedPricing(storeId) { id data{...} status publishedAt } } / query { pricingDraft(storeId) { data{...} snapshotId snapshotName status } }
变更: savePricingSnapshot(input: { name, data: { config, plans }, storeId }) / publishPricingSnapshot(storeId) / restorePricingSnapshot(id)

[Schema — 会员/积分]
会员: query { membershipPlansByUser(userId) { id userId planType amount note startDate endDate createdAt updatedAt } }
类型: planType = monthly | monthly_cc | yearly | stored_value
变更: createMembershipPlan(input: { userId, planType, amount, note, startDate, endDate }) / updateMembershipPlan(input: { id, ... }) / removeMembershipPlan(id)
储值扣款: deductStoredValue(input: { userId, amount, note }) { plan{id amount} deducted }
积分: query { pointsLogByUser(userId) { id userId amount balanceAfter note createdBy createdAt } }
变更: addPoints(input: { userId, amount, note }) / deductPoints(input: { userId, amount, note })

[日期推断规则]
- "今天" = ${new Date().toISOString().split("T")[0]}
- "昨天" = 前一天的 ISO 日期
- "上周五" = 上一个星期五的日期
- "本周" = 本周一到今天
- "这个月" = 本月1日到今天
- 时间模糊表述: "下午" = 14:00, "晚上" = 19:00, "上午" = 10:00

[营业数据查询模式]
- 计算营业额: 查询 orders(filter: { status: ["SETTLED"], dateFrom, dateTo }) 然后对 finalPrice 字段求和
- 最忙桌子: 查询 orders 按 table.code 分组统计时长 (endAt - startAt)
- 新用户数: 查询 managedUsers(filter: { pagination: { limit: 1 } }) 的 pageInfo.total
- 对比周期: 分别查询两个时间段的数据再做对比

[多步操作]
- "修改并发布价格" = 先调用 savePricingSnapshot 保存 → 确认 → 再调用 publishPricingSnapshot 发布
- "结算所有暂停订单" = 先 query orders(filter: {status:["PAUSED"]}) 获取列表 → 提取 IDs → 再调用 batchSettleOrders(input: {ids})

[行为规则]
- 使用中文回复，必要时可使用 Markdown 格式。
- 回答应结合当前页面和筛选条件，优先给出后台运营可执行建议。
- 变更操作用 \`\`\`graphql-mutation 代码块输出，用户会看到确认/跳过按钮。
- 不要发起身份管理类操作，例如更新用户角色、账户、会话或认证器。
- 不泄露密钥、完整手机号、内部令牌或不必要的个人敏感信息。
- 批量操作（结算/删除多条记录）前，先用 \`\`\`graphql 查询确认影响范围，再在变更代码块前说明影响条数。
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
    : "https://api.deepseek.com";
}

async function saveSessionExchange(params: {
  env: Cloudflare.Env;
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  assistantText: string;
  toolInvocations?: ToolInvocation[];
}) {
  const database = db(params.env.DB);
  const session = await database.query.chatSessionsTable.findFirst({
    where: and(
      eq(chatSessionsTable.id, params.sessionId),
      eq(chatSessionsTable.user_id, params.userId),
    ),
  });
  if (!session) return;

  const lastUserMessage = [...params.messages]
    .reverse()
    .find((message) => message.role === "user");
  const userContent =
    typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : JSON.stringify(lastUserMessage?.content ?? "");
  const now = Date.now();
  const title =
    session.title === "新对话" && userContent.trim()
      ? userContent.trim().slice(0, 20)
      : session.title;

  if (userContent.trim()) {
    await database.insert(chatMessagesTable).values({
      session_id: params.sessionId,
      role: "user",
      content: userContent,
      created_at: now,
    });
  }

  await database.insert(chatMessagesTable).values({
    session_id: params.sessionId,
    role: "assistant",
    content: params.assistantText,
    tool_invocations: params.toolInvocations?.length
      ? JSON.stringify(params.toolInvocations)
      : null,
    created_at: now + 1,
  });

  await database
    .update(chatSessionsTable)
    .set({ title, updated_at: now + 1 })
    .where(eq(chatSessionsTable.id, params.sessionId));
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

    const deepseek = createDeepSeek({
      apiKey,
      baseURL: getDeepSeekBaseURL(c.env),
    });

    const result = streamText({
      model: deepseek("deepseek-v4-pro"),
      providerOptions: {
        deepseek: { reasoningEffort: "low" },
      },
      system,
      messages: parsed.value.messages as CoreMessage[],
      tools,
      maxSteps: 5,
      onFinish: async (event) => {
        if (!parsed.value.sessionId) return;
        const steps = event.steps as Array<{
          toolCalls: Array<{ toolCallId: string; args: unknown }>;
          toolResults: Array<{
            toolCallId: string;
            toolName: string;
            result: unknown;
          }>;
        }>;
        const toolCalls = steps.flatMap((step) => step.toolCalls);
        const toolInvocations = steps.flatMap((step) =>
          step.toolResults.map(
            (toolResult) =>
              ({
                state: "result",
                toolCallId: toolResult.toolCallId,
                toolName: toolResult.toolName,
                args: toolCalls.find(
                  (toolCall) => toolCall.toolCallId === toolResult.toolCallId,
                )?.args,
                result: toolResult.result,
              }) as ToolInvocation,
          ),
        );
        await saveSessionExchange({
          env: c.env,
          userId: identity.userId,
          sessionId: parsed.value.sessionId,
          messages: parsed.value.messages,
          assistantText: event.text,
          toolInvocations,
        });
      },
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
