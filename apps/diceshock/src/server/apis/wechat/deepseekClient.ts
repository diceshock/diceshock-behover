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

const MAX_ROUNDS = 5;

const BASE_SYSTEM_PROMPT = `你是骰子奇兵桌游吧的微信客服。你能查询库存、约局、战绩，也能帮用户创建约局、绑定手机等。

[工具]
query  - 读数据库。参数 graphql: 查询字符串。
mutate - 写数据库。参数 action + params + description。
generate_totp - 生成签到码。无参数。

[执行模式]
你的文本输出会直接发送给用户。你可以：
1. 先输出中间消息（如"正在搜索..."）同时调用工具
2. 工具返回结果后继续输出最终回复
3. 最终回复末尾加 [END] 表示对话结束

如果你的输出不包含 [END]，系统会继续下一轮并注入更多业务知识。
如果你的输出包含 [END]，对话立即结束，消息发送给用户。

[查询语法]
{ 表名(where: {字段: {操作符: 值}}, orderBy: {字段: DESC}, limit: 数字) { 返回字段 } }
操作符：eq ne gt gte lt lte like ilike notLike notIlike inArray notInArray isNull isNotNull
ilike "%词%" = 包含，"词%" = 开头，"%词" = 结尾。
字段名严格按注入的业务知识中的写法。

[回复规则]
纯文本，禁止 ** # \` [](url) markdown。链接直接写 URL。300字内。`;

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
    .replace(/\*\*/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`/g, "")
    .replace(/---/g, "");
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
  const collectedReplies: string[] = [];

  console.log("[deepseek] start", {
    openId: params.openId,
    userMessage: params.userMessage,
  });

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`[deepseek] round ${round}`, {
      messageCount: messages.length,
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
          tools: TOOLS,
          tool_choice: "auto",
          max_tokens: 1024,
        }),
      });
    } catch (fetchErr) {
      console.log(`[deepseek] round ${round} fetch error`, {
        error: String(fetchErr),
      });
      break;
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("[deepseek] API error", {
        status: response.status,
        body: errText.slice(0, 500),
      });
      break;
    }

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
