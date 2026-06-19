import db, { accounts, drizzle } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { MUTATE_TOOL_DEFINITION } from "./graphql/mutateActions";
import { QUERY_TOOL_DEFINITION } from "./graphql/queryValidation";
import { sendStatusMessage } from "./messagePipeline";
import { matchSkills } from "./skillRouter";
import { executeMutateTool } from "./tools/mutate";
import { executeQueryTool } from "./tools/query";
import { executeGenerateTotp, TOTP_TOOL_DEFINITION } from "./tools/totp";
import type { ChatMessage } from "./types";

const MAX_TOOL_CALLS = 3;

const BASE_SYSTEM_PROMPT = `你是骰子奇兵桌游吧的微信客服。你能查询库存、约局、战绩，也能帮用户创建约局、绑定手机等。

[工具]
query  - 读数据库。参数 graphql: 查询字符串。
mutate - 写数据库。参数 action + params + description。
generate_totp - 生成签到码。无参数。

[预算]
${MAX_TOOL_CALLS} 轮。同一轮内多个并行调用只算 1 轮。
注入的业务知识已包含完整答案时（地址、价格等），0 轮直接回复。

[查询语法]
query 接受的字符串格式：
{ 表名(where: {字段: {操作符: 值}}, orderBy: {字段: DESC}, limit: 数字) { 返回字段 } }

操作符：eq ne gt gte lt lte like ilike notLike notIlike inArray notInArray isNull isNotNull
组合：同层多字段 = AND。OR 用 {OR: [{条件1}, {条件2}]}。
模式：ilike "%词%" = 包含，"词%" = 开头，"%词" = 结尾。

示例：
{ boardGamesTable(where: {sch_name: {ilike: "%卡坦%"}}, limit: 10) { id sch_name eng_name player_num gstone_rating category } }
{ activesTable(where: {creator_id: {eq: "uid"}}, limit: 10) { id title date time } }

字段名和表名严格按下方注入的业务知识中的写法。不要猜测、不要用下划线前缀操作符、不要用 GraphQL variables 语法。

[输出]
固定 JSON：[{"type":"text","content":"你的回复"}]
微信纯文本，禁止 ** # \` [](url)。链接直接写 URL。300字内。

示例：
[{"type":"text","content":"找到了！卡坦岛（Catan），评分7.1，适合3-4人。\\n详情：https://diceshock.com/inventory/bg001"}]`;

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
};

const TOOLS: ToolDefinition[] = [
  QUERY_TOOL_DEFINITION,
  MUTATE_TOOL_DEFINITION,
  TOTP_TOOL_DEFINITION,
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
): Promise<ToolContext> {
  const env = c.env as ToolContext["env"];
  return {
    env: {
      ...env,
      aliyunClient: c.get("AliyunClient"),
    },
    openId,
    userId: await resolveUserId(env.DB, openId),
  };
}

async function resolveUserId(
  d1: D1Database,
  openId: string,
): Promise<string | null> {
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
  if (account.length > 0) return account[0].userId;

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
  return silent.length > 0 ? silent[0].userId : null;
}

function getToolStatusMessage(_toolName: string): string | null {
  return null;
}

function ensureJsonArray(raw: string): string {
  if (!raw.trim())
    return '[{"type":"text","content":"抱歉，我暂时无法回答这个问题。"}]';
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.includes('"type"')) return trimmed;
  const content = trimmed
    .replace(/\*\*/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`/g, "")
    .replace(/---/g, "")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  return `[{"type":"text","content":"${content}"}]`;
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

  let systemContent = BASE_SYSTEM_PROMPT;

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
  const toolContext = await buildToolContext(c, params.openId);

  let totalToolCalls = 0;
  let round = 0;
  const loopStart = Date.now();

  console.log("[deepseek] start", {
    openId: params.openId,
    userMessage: params.userMessage,
  });

  for (;;) {
    round++;
    const elapsed = Date.now() - loopStart;
    const hasToolBudget = totalToolCalls < MAX_TOOL_CALLS;

    console.log(`[deepseek] round ${round}`, {
      hasToolBudget,
      totalToolCalls,
      messageCount: messages.length,
      elapsedMs: elapsed,
    });

    let response: Response;
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
          ...(hasToolBudget ? { tools: TOOLS, tool_choice: "auto" } : {}),
          max_tokens: 1024,
        }),
      });
    } catch (fetchErr) {
      console.log(
        `[deepseek] round ${round} fetch error after ${Date.now() - loopStart}ms`,
        { error: String(fetchErr) },
      );
      break;
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("[deepseek] API error", {
        status: response.status,
        body: errText.slice(0, 500),
      });
      return {
        rawOutput:
          '[{"type":"text","content":"AI 服务暂时不可用，请稍后再试"}]',
        tokensUsed: totalTokens,
      };
    }

    const data = (await response.json()) as DeepSeekResponse;
    totalTokens += data.usage?.total_tokens ?? 0;

    const choice = data.choices?.[0];
    if (!choice) {
      console.error("[deepseek] no choice in response");
      return {
        rawOutput: '[{"type":"text","content":"AI 返回异常，请稍后再试"}]',
        tokensUsed: totalTokens,
      };
    }

    const assistantMsg = choice.message;
    if (!assistantMsg.tool_calls?.length) {
      const raw = assistantMsg.content || "";
      console.log(`[deepseek] round ${round} FINAL TEXT`, { content: raw });
      return {
        rawOutput: ensureJsonArray(raw),
        tokensUsed: totalTokens,
      };
    }

    if (assistantMsg.content) {
      console.log(`[deepseek] round ${round} thinking`, {
        content: assistantMsg.content,
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

    let roundCounted = false;
    for (const toolCall of assistantMsg.tool_calls) {
      const isSkillLoad = toolCall.function.name === "load_skill";
      if (!isSkillLoad && !roundCounted) {
        totalToolCalls++;
        roundCounted = true;
      }
      const remaining = MAX_TOOL_CALLS - totalToolCalls;

      if (!isSkillLoad && totalToolCalls > MAX_TOOL_CALLS) {
        console.log(`[deepseek] budget exhausted at round ${round}`);
        messages.push({
          role: "tool",
          content: `[错误]调用次数已用完。请立即根据已有数据回复用户。`,
          tool_call_id: toolCall.id,
        });
        continue;
      }

      const statusMessage = getToolStatusMessage(toolCall.function.name);
      if (statusMessage) {
        sendStatusMessage(env, params.openId, statusMessage).catch(() => {});
      }

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (parseErr) {
        console.error(`[deepseek] tool args parse failed`, {
          name: toolCall.function.name,
          raw: toolCall.function.arguments.slice(0, 200),
        });
        messages.push({
          role: "tool",
          content: `参数解析失败[剩余调用:${remaining}]`,
          tool_call_id: toolCall.id,
        });
        continue;
      }

      console.log(`[deepseek] exec tool #${totalToolCalls}`, {
        name: toolCall.function.name,
        args: JSON.stringify(args),
      });
      const t0 = Date.now();

      try {
        const result = await executeToolCall(
          toolCall.function.name,
          args,
          toolContext,
        );
        const suffix =
          remaining <= 3
            ? `[剩余调用:${remaining}/${MAX_TOOL_CALLS}。数据足够时请直接回复]`
            : `[剩余:${remaining}]`;
        console.log(`[deepseek] tool #${totalToolCalls} result`, {
          name: toolCall.function.name,
          ms: Date.now() - t0,
          result,
        });
        messages.push({
          role: "tool",
          content: result + suffix,
          tool_call_id: toolCall.id,
        });
      } catch (toolErr) {
        console.error(`[deepseek] tool #${totalToolCalls} threw`, {
          name: toolCall.function.name,
          error: String(toolErr),
        });
        messages.push({
          role: "tool",
          content: `工具执行错误: ${String(toolErr).slice(0, 200)}[剩余:${remaining}]`,
          tool_call_id: toolCall.id,
        });
      }
    }

    if (totalToolCalls >= MAX_TOOL_CALLS) {
      console.log(
        "[deepseek] budget reached, forcing final round without tools",
      );
      break;
    }
  }

  messages.push({
    role: "user",
    content:
      '工具调用结束。请根据以上全部工具返回的数据，直接回复用户。格式：[{"type":"text","content":"你的回复"}]',
  });

  console.log("[deepseek] final call", {
    messageCount: messages.length,
    totalToolCalls,
    totalTokens,
  });

  try {
    const finalResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages,
        tool_choice: "none",
        max_tokens: 1024,
      }),
    });

    if (finalResponse.ok) {
      const finalData = (await finalResponse.json()) as DeepSeekResponse;
      totalTokens += finalData.usage?.total_tokens ?? 0;
      const finalChoice = finalData.choices?.[0]?.message;
      if (finalChoice?.content) {
        console.log("[deepseek] final call success", {
          contentLen: finalChoice.content.length,
          totalTokens,
        });
        return {
          rawOutput: ensureJsonArray(finalChoice.content),
          tokensUsed: totalTokens,
        };
      }
      console.error("[deepseek] final call empty content", {
        choices: JSON.stringify(finalData.choices).slice(0, 200),
      });
    } else {
      const errBody = await finalResponse.text();
      console.error("[deepseek] final call failed", {
        status: finalResponse.status,
        body: errBody.slice(0, 300),
      });
    }
  } catch (e) {
    console.error("[deepseek] final call timeout/error", { error: String(e) });
  }

  const toolResults = messages
    .filter((m) => m.role === "tool")
    .map((m) => m.content);
  console.log("[deepseek] using synthesize fallback", {
    toolResultCount: toolResults.length,
  });
  return {
    rawOutput: synthesizeFromToolResults(toolResults),
    tokensUsed: totalTokens,
  };
}

function synthesizeFromToolResults(toolResults: string[]): string {
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
