import db, { accounts, drizzle, storesTable, userInfoTable } from "@lib/db";
import type { Context } from "hono";
import {
  LOCALES,
  type LocaleCode,
  STORES,
  type StoreCode,
} from "@/shared/store-locale";
import type { HonoCtxEnv } from "@/shared/types";
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
import { executeGenerateTotp, TOTP_TOOL_DEFINITION } from "./tools/totp";
import type { ChatMessage } from "./types";

const MAX_ROUNDS = 5;

const BASE_SYSTEM_PROMPT = `骰子奇兵桌游吧微信客服。

[工具]
query - ${QUERY_SYNTAX}
mutate - ${MUTATE_SYNTAX}
generate_totp - 生成签到码
query_active_participants - 查约局参与者名片(需active_id,仅创建者/参与者可用)

[执行模式]
文本输出直接发送给用户。工具调用可与文本同时发出。
输出包含 [END] → 对话结束。不包含 → 系统继续下一轮注入业务知识。

[行为]
- 破坏性操作(删除/修改)直接调mutate,系统自动弹硬确认,你不要在文本里问"确定吗"
- 创建操作: 用户明确给全信息→直接创建; 有推断值(人数/店铺/时间)→先输出方案等确认再创建
- 能推断的不问("明天下午"=明天14:00)
- 纯文本回复,禁止markdown,300字内
- 手机号脱敏用省略号: 155...5699, 禁止用星号(会被系统吃掉)

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

type ToolContext = {
  env: HonoCtxEnv["Bindings"] & {
    aliyunClient?: unknown;
    DEV_SMS_CODE?: string;
    GSZ_TOKEN?: string;
  };
  openId: string;
  userId: string | null;
  preferredStoreId: string | null;
};

const TOOLS: ToolDefinition[] = [
  QUERY_TOOL_DEFINITION,
  MUTATE_TOOL_DEFINITION,
  TOTP_TOOL_DEFINITION,
  QUERY_PARTICIPANTS_TOOL_DEFINITION,
];

interface ChatWithAgentParams {
  userMessage: string;
  openId: string;
  skill?: { systemPrompt?: string };
  conversationHistory: ChatMessage[];
  ragContext?: string;
  memory?: string;
}

interface AgentResult {
  rawOutput: string;
  tokensUsed: number;
}

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
  usage?: {
    total_tokens?: number;
  };
}

async function buildToolContext(
  c: Context<HonoCtxEnv>,
  openId: string,
  identity: UserIdentity,
): Promise<ToolContext> {
  const env = c.env as ToolContext["env"];
  return {
    env: {
      ...env,
      aliyunClient: c.get("AliyunClient"),
    },
    openId,
    userId: identity.userId,
    preferredStoreId: identity.preferredStoreId,
  };
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

function _getToolStatusMessage(_toolName: string): string | null {
  return null;
}

function _ensureJsonArray(raw: string): string {
  if (!raw.trim())
    return '[{"type":"text","content":"抱歉，我暂时无法回答这个问题。"}]';
  const trimmed = raw.trim();

  if (trimmed.startsWith("[") && trimmed.includes('"type"')) {
    try {
      const arr = JSON.parse(trimmed) as Array<{
        type: string;
        content: string;
      }>;
      const cleaned = arr.map((m) => ({
        type: m.type || "text",
        content: stripMarkdown(m.content || ""),
      }));
      return JSON.stringify(cleaned);
    } catch {}
  }

  return JSON.stringify([{ type: "text", content: stripMarkdown(trimmed) }]);
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
      return await executeGenerateTotp(
        parsedArgs as Record<string, never>,
        toolContext,
      );
    case "query_active_participants":
      return await executeQueryActiveParticipants(
        parsedArgs as { active_id: string },
        toolContext,
      );
    default:
      return `未知工具: ${toolName}`;
  }
}

export async function chatWithAgent(
  c: Context<HonoCtxEnv>,
  params: ChatWithAgentParams,
): Promise<AgentResult> {
  const env = c.env as any;
  const apiKey = env.DEEPSEEK_API_KEY as string;
  const accountId =
    (env.CF_ACCOUNT_ID as string) || "3244c8f91cd34317ce18652158e5853a";
  const gatewayId = env.CF_AI_GATEWAY_ID as string;

  if (!apiKey) {
    return {
      rawOutput: '[{"type":"text","content":"AI 服务未配置，请联系管理员"}]',
      tokensUsed: 0,
    };
  }

  const baseUrl = gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek`
    : "https://api.deepseek.com/v1";

  const identity = await resolveUserIdentity(env.DB, params.openId);

  let systemContent = BASE_SYSTEM_PROMPT;

  const today = new Date().toISOString().split("T")[0];
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const dow = weekdays[new Date().getDay()];
  systemContent += `\n\n[当前时间] ${today} 周${dow}`;

  if (identity.userId) {
    systemContent += `\n\n[当前用户] userId: ${identity.userId}`;
    if (identity.nickname) {
      systemContent += ` | 昵称: ${identity.nickname}`;
    }
    systemContent += `\n用户说"我的"时，用 creator_id eq "${identity.userId}" 或 user_id eq "${identity.userId}" 查询。不要再问手机号。`;

    const storeName = identity.preferredStoreName || STORES.gg.name;
    const storeAddress = identity.preferredStoreAddress || STORES.gg.address;
    const storeId = identity.preferredStoreId || null;
    systemContent += `\n\n[关联店铺] ${storeName}（${storeAddress}）`;
    if (storeId) {
      systemContent += `\n查询库存/约局时，必须用 store_id eq "${storeId}" 过滤，只能查该店铺数据。`;
    } else {
      systemContent += `\n查询库存/约局时，用 store_id eq "光谷店" 作为默认店铺。`;
    }

    const locale = identity.preferredLocale || "zh_Hans";
    const localeName = LOCALES[locale]?.name || "简体中文";
    if (locale !== "zh_Hans") {
      systemContent += `\n\n[语言] 请使用${localeName}回复用户。`;
    }
  } else {
    systemContent += `\n\n[当前用户] 未注册用户（openId: ${params.openId.slice(-8)}）。需要写操作时提示先注册。`;
    systemContent += `\n[关联店铺] ${STORES.gg.name}（${STORES.gg.address}）`;
  }

  const skillContent = matchSkills(params.userMessage);
  if (skillContent) {
    systemContent += `\n\n[已注入业务知识]\n${skillContent}`;
  }
  if (params.skill?.systemPrompt) {
    systemContent += `\n\n${params.skill.systemPrompt}`;
  }
  if (params.memory) {
    systemContent += `\n\n${params.memory}`;
  }
  if (params.ragContext) {
    systemContent += `\n\n${params.ragContext}`;
  }

  const messages: DeepSeekMessage[] = [
    { role: "system", content: systemContent },
    ...params.conversationHistory.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: params.userMessage },
  ];

  let totalTokens = 0;
  const toolContext = await buildToolContext(c, params.openId, identity);
  const collectedReplies: string[] = [];

  console.log("[deepseek] start", {
    openId: params.openId,
    userMessage: params.userMessage,
  });

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`[deepseek] round ${round}`, {
      messageCount: messages.length,
    });

    let response: Response | null = null;
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
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
        });
        if (response.ok) break;
        const errText = await response.text();
        console.error(
          `[deepseek] round ${round} attempt ${attempt} API error`,
          {
            status: response.status,
            body: errText.slice(0, 500),
          },
        );
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        )
          break;
      } catch (fetchErr) {
        console.log(
          `[deepseek] round ${round} attempt ${attempt} fetch error`,
          {
            error: String(fetchErr),
          },
        );
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }

    if (!response?.ok) break;

    const data = (await response.json()) as DeepSeekResponse;
    totalTokens += data.usage?.total_tokens ?? 0;

    const choice = data.choices?.[0];
    if (!choice) {
      console.error("[deepseek] no choice in response");
      break;
    }

    const assistantMsg = choice.message;
    const content = assistantMsg.content || "";
    const hasEnd = content.includes("[END]");
    const cleanContent = content.replace("[END]", "").trim();

    if (cleanContent) {
      console.log(`[deepseek] round ${round} output`, {
        content: cleanContent,
      });
      collectedReplies.push(cleanContent);
    }

    if (hasEnd) {
      console.log(`[deepseek] [END] received at round ${round}`);
      break;
    }

    if (!assistantMsg.tool_calls?.length) {
      console.log(
        `[deepseek] round ${round} no tools, no [END], treating as final`,
      );
      break;
    }

    if (assistantMsg.content) {
      console.log(`[deepseek] round ${round} thinking`, {
        content: assistantMsg.content.slice(0, 200),
      });
    }

    console.log(
      `[deepseek] round ${round} tool_calls`,
      JSON.stringify(
        assistantMsg.tool_calls.map((tc) => ({
          name: tc.function.name,
          args: tc.function.arguments,
        })),
      ),
    );

    messages.push({
      role: "assistant",
      content: assistantMsg.content || "",
      tool_calls: assistantMsg.tool_calls,
    });

    for (const toolCall of assistantMsg.tool_calls) {
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

      console.log(`[deepseek] exec ${toolCall.function.name}`, {
        args: JSON.stringify(args).slice(0, 200),
      });
      const t0 = Date.now();

      try {
        const result = await executeToolCall(
          toolCall.function.name,
          args,
          toolContext,
        );
        console.log(`[deepseek] ${toolCall.function.name} done`, {
          ms: Date.now() - t0,
          resultLen: result.length,
        });
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      } catch (toolErr) {
        console.error(`[deepseek] ${toolCall.function.name} error`, {
          error: String(toolErr),
        });
        messages.push({
          role: "tool",
          content: `工具错误: ${String(toolErr).slice(0, 200)}`,
          tool_call_id: toolCall.id,
        });
      }
    }

    const roundContext = collectRoundContext(assistantMsg, messages);
    if (roundContext) {
      const extraSkills = matchSkills(roundContext);
      if (extraSkills) {
        messages.push({
          role: "system",
          content: `[追加业务知识]\n${extraSkills}`,
        });
        console.log(`[deepseek] injected extra skills for round ${round + 1}`);
      }
    }
  }

  if (collectedReplies.length === 0) {
    console.log("[deepseek] no text output after loop, forcing final call");
    try {
      messages.push({
        role: "user",
        content:
          "工具调用已结束。请根据以上全部工具返回结果直接回复用户。如果所有查询都失败了，告知用户具体问题并建议解决方式。",
      });
      const finalRes = await fetch(`${baseUrl}/chat/completions`, {
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
      });
      if (finalRes.ok) {
        const finalData = (await finalRes.json()) as DeepSeekResponse;
        totalTokens += finalData.usage?.total_tokens ?? 0;
        const finalContent = finalData.choices?.[0]?.message?.content
          ?.replace("[END]", "")
          .trim();
        if (finalContent) {
          collectedReplies.push(finalContent);
        }
      }
    } catch (e) {
      console.error("[deepseek] forced final call failed:", e);
    }
  }

  if (collectedReplies.length === 0) {
    collectedReplies.push("抱歉，我暂时无法处理这个请求，请稍后再试。");
  }

  const output = collectedReplies.map((text) => ({
    type: "text",
    content: stripMarkdown(text),
  }));

  console.log("[deepseek] complete", {
    replies: collectedReplies.length,
    totalTokens,
  });

  return { rawOutput: JSON.stringify(output), tokensUsed: totalTokens };
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

function _synthesizeFromToolResults(toolResults: string[]): string {
  const summaries: string[] = [];

  for (const raw of toolResults) {
    try {
      const data = JSON.parse(raw);
      if (data.error) {
        summaries.push(data.error);
        continue;
      }
      if (data.actives && Array.isArray(data.actives)) {
        const items = data.actives
          .slice(0, 5)
          .map(
            (a: any) =>
              `- ${a.date || ""} ${a.title || ""}${a.link ? ` ${a.link}` : ""}`,
          );
        summaries.push(
          `找到 ${data.count ?? data.total ?? data.actives.length} 个约局:\n${items.join("\n")}`,
        );
      } else if (data.games && Array.isArray(data.games)) {
        const items = data.games
          .slice(0, 5)
          .map(
            (g: any) =>
              `- ${g.sch_name || g.eng_name || g.name || ""}${g.link ? ` ${g.link}` : ""}`,
          );
        summaries.push(
          `找到 ${data.count ?? data.games.length} 款桌游:\n${items.join("\n")}`,
        );
      } else if (data.total_count !== undefined) {
        summaries.push(`当前库存共 ${data.total_count} 款桌游`);
      } else if (data.message) {
        summaries.push(data.message);
      }
    } catch {
      if (raw && raw.length < 200) summaries.push(raw);
    }
  }

  if (summaries.length === 0) {
    return '[{"type":"text","content":"查询完成，但未找到相关结果。请尝试换个方式提问。"}]';
  }

  const content = summaries.join("\n\n").replace(/"/g, '\\"');
  return `[{"type":"text","content":"${content}"}]`;
}
