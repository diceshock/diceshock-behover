/**
 * Standalone agent loop — decoupled from Hono Context.
 * Accepts raw env bindings + progress callback for streaming status updates.
 * Designed to run inside a Durable Object with per-round progress reporting.
 */
import Dysmsapi from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import db, { accounts, drizzle, storesTable, userInfoTable } from "@lib/db";
import {
  LOCALES,
  type LocaleCode,
  STORES,
  type StoreCode,
} from "@/shared/store-locale";
import { MUTATE_TOOL_DEFINITION } from "./graphql/mutateActions";
import { QUERY_TOOL_DEFINITION } from "./graphql/queryValidation";
import { matchSkills } from "./skillRouter";
import { renderDirectory } from "./skills/_directory";
import { MUTATE_SYNTAX, QUERY_SYNTAX } from "./skills/_syntax";
import { executeMutateTool } from "./tools/mutate";
import {
  executeQueryActiveParticipants,
  executeQueryTool,
  QUERY_PARTICIPANTS_TOOL_DEFINITION,
} from "./tools/query";
import {
  executeSearchRules,
  SEARCH_RULES_TOOL_DEFINITION,
} from "./tools/searchRules";
import { executeGenerateTotp, TOTP_TOOL_DEFINITION } from "./tools/totp";
import type { ChatMessage } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

export interface AgentEnv {
  DB: D1Database;
  KV: KVNamespace;
  AI_SEARCH?: {
    search: (args: {
      query: string;
      ai_search_options?: { retrieval?: { max_num_results?: number } };
    }) => Promise<{ chunks?: Array<{ text?: string }> }>;
  };
  DEEPSEEK_API_KEY: string;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
  WECHAT_MP_APP_ID: string;
  WECHAT_MP_APP_SECRET: string;
  MEM0_API_KEY?: string;
  ALIBABA_CLOUD_ACCESS_KEY_ID?: string;
  ALIBABA_CLOUD_ACCESS_KEY_SECRET?: string;
  DEV_SMS_CODE?: string;
  GSZ_TOKEN?: string;
}

export interface AgentLoopParams {
  userMessage: string;
  openId: string;
  conversationHistory: ChatMessage[];
  ragContext?: string;
  memory?: string;
  skill?: { systemPrompt?: string };
}

export interface AgentResult {
  rawOutput: string;
  tokensUsed: number;
  collectedReferences: Array<{ text: string; source: string; score: number }>;
}

type ProgressFn = (status: string) => void;

// ─── Constants ──────────────────────────────────────────────────────

const MAX_ROUNDS = 3;
const FETCH_TIMEOUT_MS = 20_000;

const BASE_SYSTEM_PROMPT = `骰子奇兵桌游吧微信客服。

[工具]
query - ${QUERY_SYNTAX}
mutate - ${MUTATE_SYNTAX}
generate_totp - 生成签到码
query_active_participants - 查约局参与者名片(需active_id,仅创建者/参与者可用)
search_rules - 搜索DND5E跑团规则(职业/法术/怪物/物品/战斗规则等)

[执行模式]
文本输出直接发送给用户。工具调用可与文本同时发出。
输出包含 [END] → 对话结束。不包含 → 系统继续下一轮注入业务知识。
最多3轮工具调用。第3轮必须输出最终回复+[END],不能再调工具。
每次调工具必须填message参数,用自然语言告诉用户你正在做什么(如"帮你查一下最近的约局")。

[行为]
- 破坏性操作(删除/修改)直接调mutate,系统自动弹硬确认,你不要在文本里问"确定吗"
- 创建操作: 用户明确给全信息→直接创建; 有推断值(人数/店铺/时间)→先输出方案等确认再创建
- 能推断的不问("明天下午"=明天14:00)
- 纯文本回复,禁止markdown,300字内
- 手机号脱敏用省略号: 155...5699, 禁止用星号(会被系统吃掉)
- 跑团规则问题: 调search_rules查询后,用自己的话简洁回答,引用具体规则页

[目录] 系统按关键词自动注入以下业务知识:
${renderDirectory()}`;

type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const TOOLS: ToolDefinition[] = [
  QUERY_TOOL_DEFINITION,
  MUTATE_TOOL_DEFINITION,
  TOTP_TOOL_DEFINITION,
  QUERY_PARTICIPANTS_TOOL_DEFINITION,
  SEARCH_RULES_TOOL_DEFINITION,
];

type DeepSeekMessage = {
  role: string;
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

interface DeepSeekResponse {
  choices?: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
  }>;
  usage?: { total_tokens?: number };
}

interface UserIdentity {
  userId: string | null;
  nickname: string | null;
  preferredStoreId: string | null;
  preferredStoreCode: StoreCode | null;
  preferredStoreName: string | null;
  preferredStoreAddress: string | null;
  preferredLocale: LocaleCode | null;
}

interface ToolContext {
  env: AgentEnv & { aliyunClient?: unknown };
  openId: string;
  userId: string | null;
  preferredStoreId: string | null;
}

// ─── Tool name → friendly progress text ─────────────────────────────

const TOOL_PROGRESS: Record<string, string> = {
  query: "正在查询数据...",
  mutate: "正在执行操作...",
  search_rules: "正在搜索规则...",
  query_active_participants: "正在查询参与者...",
  generate_totp: "正在生成签到码...",
};

// ─── Main entry point ───────────────────────────────────────────────

/**
 * Run the agent loop. Calls `onProgress` after each tool round
 * so the caller (DO) can push status messages to the user.
 *
 * Respects `signal` for cooperative cancellation.
 */
export async function runAgentLoop(
  env: AgentEnv,
  params: AgentLoopParams,
  signal: AbortSignal,
  onProgress: ProgressFn,
): Promise<AgentResult> {
  const apiKey = env.DEEPSEEK_API_KEY;
  const accountId = env.CF_ACCOUNT_ID || "3244c8f91cd34317ce18652158e5853a";
  const gatewayId = env.CF_AI_GATEWAY_ID;

  if (!apiKey) {
    return {
      rawOutput: '[{"type":"text","content":"AI 服务未配置，请联系管理员"}]',
      tokensUsed: 0,
      collectedReferences: [],
    };
  }

  const baseUrl = gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek`
    : "https://api.deepseek.com/v1";

  const identity = await resolveUserIdentity(env.DB, params.openId);
  const systemContent = buildSystemContent(identity, params);
  const messages: DeepSeekMessage[] = [
    { role: "system", content: systemContent },
    ...params.conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: params.userMessage },
  ];

  let totalTokens = 0;
  const toolContext: ToolContext = {
    env: { ...env, aliyunClient: buildAliyunClient(env) },
    openId: params.openId,
    userId: identity.userId,
    preferredStoreId: identity.preferredStoreId,
  };
  const collectedReplies: string[] = [];
  const collectedReferences: Array<{
    text: string;
    source: string;
    score: number;
  }> = [];

  console.log("[agent-loop] start", { openId: params.openId });

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (signal.aborted) {
      console.log("[agent-loop] aborted before round", round);
      break;
    }

    console.log(`[agent-loop] round ${round}`);

    const response = await fetchWithTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          max_tokens: 1024,
        }),
      },
      signal,
    );

    if (!response?.ok) {
      console.error("[agent-loop] API failed", {
        status: response?.status,
        round,
      });
      break;
    }

    const data = (await response.json()) as DeepSeekResponse;
    totalTokens += data.usage?.total_tokens ?? 0;

    const choice = data.choices?.[0];
    if (!choice) break;

    const assistantMsg = choice.message;
    const content = assistantMsg.content || "";
    const hasEnd = content.includes("[END]");
    const cleanContent = content.replace("[END]", "").trim();

    if (cleanContent) {
      collectedReplies.push(cleanContent);
    }

    if (hasEnd) {
      console.log(`[agent-loop] [END] at round ${round}`);
      break;
    }

    if (!assistantMsg.tool_calls?.length) {
      console.log(`[agent-loop] round ${round} no tools, treating as final`);
      break;
    }

    // Push assistant thinking to messages
    messages.push({
      role: "assistant",
      content: assistantMsg.content || "",
      tool_calls: assistantMsg.tool_calls,
    });

    // Send progress only on first round (WeChat has message rate limits)
    // Priority: tool_call.message param > model content > hardcoded fallback
    if (round === 1) {
      const toolMessages = assistantMsg.tool_calls
        .map((tc) => {
          try {
            const parsed = JSON.parse(tc.function.arguments || "{}");
            return parsed.message as string | undefined;
          } catch {
            return undefined;
          }
        })
        .filter(Boolean);

      if (toolMessages.length > 0) {
        onProgress(toolMessages[0]!);
      } else if (cleanContent) {
        onProgress(cleanContent);
      } else {
        const toolNames = assistantMsg.tool_calls.map((tc) => tc.function.name);
        const progressText = toolNames
          .map((n) => TOOL_PROGRESS[n] || `执行 ${n}...`)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(" ");
        onProgress(progressText);
      }
    }

    // Execute tool calls
    for (const toolCall of assistantMsg.tool_calls) {
      if (signal.aborted) break;

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        messages.push({
          role: "tool",
          content: "参数解析失败",
          tool_call_id: toolCall.id,
        });
        continue;
      }

      console.log(`[agent-loop] exec ${toolCall.function.name}`);
      const t0 = Date.now();

      try {
        const result = await executeToolCall(
          toolCall.function.name,
          args,
          toolContext,
        );
        console.log(`[agent-loop] ${toolCall.function.name} done`, {
          ms: Date.now() - t0,
        });
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });

        if (toolCall.function.name === "search_rules") {
          try {
            const parsed = JSON.parse(result);
            if (parsed.results?.length) {
              for (const chunk of parsed.results) {
                collectedReferences.push({
                  text: chunk.text || "",
                  source: chunk.source || "",
                  score: chunk.score || 0,
                });
              }
            }
          } catch {}
        }
      } catch (toolErr) {
        console.error(`[agent-loop] ${toolCall.function.name} error`, toolErr);
        messages.push({
          role: "tool",
          content: `工具错误: ${String(toolErr).slice(0, 200)}`,
          tool_call_id: toolCall.id,
        });
      }
    }

    // Inject extra skills based on round context
    const roundContext = collectRoundContext(assistantMsg, messages);
    if (roundContext) {
      const extraSkills = matchSkills(roundContext);
      if (extraSkills) {
        messages.push({
          role: "system",
          content: `[追加业务知识]\n${extraSkills}`,
        });
      }
    }
  }

  // If no text collected, force a final summarizing call
  if (collectedReplies.length === 0 && !signal.aborted) {
    console.log("[agent-loop] forcing final call");
    messages.push({
      role: "user",
      content:
        "工具调用已结束。请根据以上全部工具返回结果直接回复用户。如果所有查询都失败了，告知用户具体问题并建议解决方式。",
    });

    const finalRes = await fetchWithTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages,
          max_tokens: 512,
        }),
      },
      signal,
    );

    if (finalRes?.ok) {
      const finalData = (await finalRes.json()) as DeepSeekResponse;
      totalTokens += finalData.usage?.total_tokens ?? 0;
      const finalContent = finalData.choices?.[0]?.message?.content
        ?.replace("[END]", "")
        .trim();
      if (finalContent) {
        collectedReplies.push(finalContent);
      }
    }
  }

  if (collectedReplies.length === 0) {
    collectedReplies.push("抱歉，我暂时无法处理这个请求，请稍后再试。");
  }

  const output = collectedReplies.map((text) => ({
    type: "text",
    content: stripMarkdown(text),
  }));

  console.log("[agent-loop] complete", {
    replies: collectedReplies.length,
    totalTokens,
  });

  return {
    rawOutput: JSON.stringify(output),
    tokensUsed: totalTokens,
    collectedReferences,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<Response | null> {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Fresh timeout per attempt — old AbortSignal.timeout stays aborted forever
    const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const combined = AbortSignal.any([signal, timeoutSignal]);
    try {
      const response = await fetch(url, { ...init, signal: combined });
      if (response.ok) return response;

      const errText = await response.text();
      console.error(`[agent-loop] API error attempt ${attempt}`, {
        status: response.status,
        body: errText.slice(0, 300),
      });

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
    } catch (e) {
      if (signal.aborted) return null;
      console.error(`[agent-loop] fetch error attempt ${attempt}`, String(e));
    }

    if (attempt < MAX_RETRIES && !signal.aborted) {
      const { promise, resolve } = Promise.withResolvers<void>();
      const id = setTimeout(resolve, 800 * (attempt + 1));
      signal.addEventListener("abort", () => { clearTimeout(id); resolve(); }, { once: true });
      await promise;
    }
  }

  return null;
}

async function executeToolCall(
  toolName: string,
  parsedArgs: Record<string, unknown>,
  toolContext: ToolContext,
): Promise<string> {
  switch (toolName) {
    case "query":
      return await executeQueryTool(
        parsedArgs as { graphql: string; variables?: Record<string, unknown> },
        toolContext,
      );
    case "mutate":
      return await executeMutateTool(parsedArgs as never, toolContext);
    case "generate_totp":
      return await executeGenerateTotp(parsedArgs, toolContext);
    case "query_active_participants":
      return await executeQueryActiveParticipants(
        parsedArgs as { active_id: string },
        toolContext,
      );
    case "search_rules":
      return await executeSearchRules(
        parsedArgs as { query: string },
        toolContext,
      );
    default:
      return `未知工具: ${toolName}`;
  }
}

function buildSystemContent(
  identity: UserIdentity,
  params: AgentLoopParams,
): string {
  let content = BASE_SYSTEM_PROMPT;

  const today = new Date().toISOString().split("T")[0];
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const dow = weekdays[new Date().getDay()];
  content += `\n\n[当前时间] ${today} 周${dow}`;

  if (identity.userId) {
    content += `\n\n[当前用户] userId: ${identity.userId}`;
    if (identity.nickname) content += ` | 昵称: ${identity.nickname}`;
    content += `\n用户说"我的"时，用 creator_id eq "${identity.userId}" 或 user_id eq "${identity.userId}" 查询。不要再问手机号。`;

    const storeName = identity.preferredStoreName || STORES.gg.name;
    const storeAddress = identity.preferredStoreAddress || STORES.gg.address;
    const storeId = identity.preferredStoreId || null;
    content += `\n\n[关联店铺] ${storeName}（${storeAddress}）`;
    if (storeId) {
      content += `\n查询库存/约局时，必须用 store_id eq "${storeId}" 过滤，只能查该店铺数据。`;
    } else {
      content += `\n查询库存/约局时，用 store_id eq "光谷店" 作为默认店铺。`;
    }

    const locale = identity.preferredLocale || "zh_Hans";
    const localeName = LOCALES[locale]?.name || "简体中文";
    if (locale !== "zh_Hans") {
      content += `\n\n[语言] 请使用${localeName}回复用户。`;
    }
  } else {
    content += `\n\n[当前用户] 未注册用户（openId: ${params.openId.slice(-8)}）。需要写操作时提示先注册。`;
    content += `\n[关联店铺] ${STORES.gg.name}（${STORES.gg.address}）`;
  }

  const skillContent = matchSkills(params.userMessage);
  if (skillContent) content += `\n\n[已注入业务知识]\n${skillContent}`;
  if (params.skill?.systemPrompt) content += `\n\n${params.skill.systemPrompt}`;
  if (params.memory) content += `\n\n${params.memory}`;
  if (params.ragContext) content += `\n\n${params.ragContext}`;

  return content;
}

async function resolveUserIdentity(
  d1: D1Database,
  openId: string,
): Promise<UserIdentity> {
  const d = db(d1);
  const account = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      drizzle.and(
        drizzle.eq(accounts.provider, "wechat-mp"),
        drizzle.eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(1);

  let userId: string | null = account.length > 0 ? account[0].userId : null;

  if (!userId) {
    const silent = await d
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(
        drizzle.and(
          drizzle.eq(accounts.provider, "wechat-mp-silent"),
          drizzle.eq(accounts.providerAccountId, openId),
        ),
      )
      .limit(1);
    userId = silent.length > 0 ? silent[0].userId : null;
  }

  if (!userId) {
    return {
      userId: null,
      nickname: null,
      preferredStoreId: null,
      preferredStoreCode: null,
      preferredStoreName: null,
      preferredStoreAddress: null,
      preferredLocale: null,
    };
  }

  const info = await d
    .select({
      nickname: userInfoTable.nickname,
      preferred_store_id: userInfoTable.preferred_store_id,
      preferred_locale: userInfoTable.preferred_locale,
    })
    .from(userInfoTable)
    .where(drizzle.eq(userInfoTable.id, userId))
    .limit(1);

  const nickname = info.length > 0 ? info[0].nickname : null;
  const preferredStoreId =
    info.length > 0 ? (info[0].preferred_store_id ?? null) : null;
  const rawLocale = info.length > 0 ? (info[0].preferred_locale ?? null) : null;

  let preferredLocale: LocaleCode | null = null;
  if (rawLocale && rawLocale in LOCALES) {
    preferredLocale = rawLocale as LocaleCode;
  }

  let preferredStoreCode: StoreCode | null = null;
  let preferredStoreName: string | null = null;
  let preferredStoreAddress: string | null = null;

  if (preferredStoreId) {
    const store = await d
      .select({
        code: storesTable.code,
        name: storesTable.name,
        address: storesTable.address,
      })
      .from(storesTable)
      .where(drizzle.eq(storesTable.id, preferredStoreId))
      .limit(1);

    if (store.length > 0) {
      const code = store[0].code;
      if (code && code in STORES) {
        preferredStoreCode = code as StoreCode;
        preferredStoreName = store[0].name;
        preferredStoreAddress = store[0].address ?? null;
      }
    }
  }

  return {
    userId,
    nickname,
    preferredStoreId,
    preferredStoreCode,
    preferredStoreName,
    preferredStoreAddress,
    preferredLocale,
  };
}

function buildAliyunClient(env: AgentEnv): unknown {
  if (!env.ALIBABA_CLOUD_ACCESS_KEY_ID || !env.ALIBABA_CLOUD_ACCESS_KEY_SECRET) {
    return undefined;
  }
  const Dysmsapi20170525 =
    typeof Dysmsapi === "function"
      ? Dysmsapi
      : (Dysmsapi as { default: typeof Dysmsapi }).default;
  const config = new $OpenApi.Config({
    accessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  });
  config.endpoint = "dysmsapi.aliyuncs.com";
  return new Dysmsapi20170525(config);
}

function collectRoundContext(
  assistantMsg: {
    content: string | null;
    tool_calls?: Array<{ function: { name: string; arguments: string } }>;
  },
  messages: DeepSeekMessage[],
): string {
  const parts: string[] = [];
  if (assistantMsg.content) parts.push(assistantMsg.content);
  if (assistantMsg.tool_calls) {
    for (const tc of assistantMsg.tool_calls) {
      parts.push(`${tc.function.name} ${tc.function.arguments}`);
    }
  }
  const lastToolResults = messages
    .slice(-10)
    .filter((m) => m.role === "tool")
    .map((m) => m.content)
    .join(" ");
  parts.push(lastToolResults);
  return parts.join(" ");
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`/g, "")
    .replace(/---/g, "")
    .replace(/<[｜|]+DSML[｜|]+[^>]*>[\s\S]*?<\/[｜|]*DSML[｜|]*[^>]*>/g, "")
    .replace(/<[｜|]+DSML[｜|]+[^>]*>/g, "")
    .trim();
}

// ─── RAG helper ─────────────────────────────────────────────────────

export async function searchKnowledgeBase(
  env: AgentEnv,
  query: string,
): Promise<string | undefined> {
  const aiSearch = env.AI_SEARCH;
  if (!aiSearch) return undefined;

  try {
    const results = await aiSearch.search({
      query,
      ai_search_options: { retrieval: { max_num_results: 3 } },
    });

    const chunks: string[] = [];
    if (results?.chunks?.length) {
      for (const chunk of results.chunks) {
        const text = chunk.text || "";
        if (text) chunks.push(text.slice(0, 500));
      }
    }

    return chunks.length > 0
      ? `[参考资料]\n${chunks.join("\n---\n")}`
      : undefined;
  } catch (e) {
    console.error("[AI Search] error:", e);
    return undefined;
  }
}
