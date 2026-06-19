import db, { accounts, drizzle } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { MUTATE_TOOL_DEFINITION } from "./graphql/mutateActions";
import { QUERY_TOOL_DEFINITION } from "./graphql/queryValidation";
import { sendStatusMessage } from "./messagePipeline";
import {
  executeLoadSkillTool,
  LOAD_SKILL_TOOL_DEFINITION,
} from "./tools/loadSkill";
import { executeMutateTool } from "./tools/mutate";
import { executeQueryTool } from "./tools/query";
import { executeGenerateTotp, TOTP_TOOL_DEFINITION } from "./tools/totp";
import type { ChatMessage } from "./types";

const FINAL_CALL_TIMEOUT_MS = 15_000;
const MAX_TOOL_CALLS = 10;

const BASE_SYSTEM_PROMPT = `你是 Diceshock 桌游吧的AI助手，已接入店铺完整业务系统。

你有且只有四个工具：
- query：执行 GraphQL 查询，用于查询桌游库存、约局、日麻战绩、会员资料等数据；可先用 introspection 发现 schema。
- mutate：执行创建约局、参加约局、退出约局、绑定手机号、绑定公式战、更新名片等写操作。
- load_skill：按需加载业务技能说明。遇到具体业务问题时，先加载最相关技能再查询或操作。
- generate_totp：生成活动签到验证码。

技能目录：
- boardgame：桌游库存查询、推荐、详情
- active：约局创建、参加、查看
- mahjong：日麻数据、PP排行、战绩查询
- account：会员状态、手机绑定、名片管理
- event：赛事活动公告查询
- general：店铺信息、营业时间、服务价格
- trpg：TRPG跑团服务
- clocktower：血染钟楼服务

重要规则：
- 用户询问店铺业务、库存、活动、战绩或账号信息时，主动调用工具，不要声称无法操作。
- 每轮对话最多调用${MAX_TOOL_CALLS}次工具。用完后必须根据已有信息回复用户。
- 输出必须是 JSON 数组，格式：[{"type":"text","content":"回复内容"}]
- 微信聊天不支持 Markdown，禁止使用 **、#、[链接](url)、反引号等格式。
- 用中文回答，语气友好自然，控制在300字以内。
- 工具返回的完整 URL 可以直接贴出。
- 只有工具返回 [通知] 开头的结果才代表操作成功，绝不能虚构操作已完成。`;

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
  LOAD_SKILL_TOOL_DEFINITION,
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

function getToolStatusMessage(toolName: string): string | null {
  switch (toolName) {
    case "query":
      return "正在查询数据...";
    case "mutate":
      return "正在执行操作...";
    case "generate_totp":
      return "正在生成验证码...";
    default:
      return null;
  }
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
    case "load_skill":
      return await executeLoadSkillTool(
        parsedArgs as { skill: string },
        toolContext,
      );
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
  if (params.skill?.systemPrompt) {
    systemContent += `\n\n${params.skill.systemPrompt}`;
  }
  if (params.memory) {
    systemContent += `\n\n${params.memory}`;
  }
  if (params.ragContext) {
    systemContent += `\n\n相关知识库内容：\n${params.ragContext}`;
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

  for (;;) {
    const hasToolBudget = totalToolCalls < MAX_TOOL_CALLS;

    const response = await fetch(`${baseUrl}/chat/completions`, {
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
      return {
        rawOutput: '[{"type":"text","content":"AI 返回异常，请稍后再试"}]',
        tokensUsed: totalTokens,
      };
    }

    const assistantMsg = choice.message;
    if (!assistantMsg.tool_calls?.length) {
      return {
        rawOutput:
          assistantMsg.content ||
          '[{"type":"text","content":"抱歉，我无法回答这个问题"}]',
        tokensUsed: totalTokens,
      };
    }

    messages.push({
      role: "assistant",
      content: assistantMsg.content || "",
      tool_calls: assistantMsg.tool_calls,
    });

    for (const toolCall of assistantMsg.tool_calls) {
      totalToolCalls++;

      if (totalToolCalls > MAX_TOOL_CALLS) {
        messages.push({
          role: "tool",
          content: JSON.stringify({
            error: "工具调用次数已用完，请根据已有信息直接回复用户",
          }),
          tool_call_id: toolCall.id,
        });
        continue;
      }

      const statusMessage = getToolStatusMessage(toolCall.function.name);
      if (statusMessage) {
        sendStatusMessage(env, params.openId, statusMessage).catch(() => {});
      }

      const args = JSON.parse(toolCall.function.arguments || "{}");
      const result = await executeToolCall(
        toolCall.function.name,
        args,
        toolContext,
      );
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: toolCall.id,
      });
    }

    if (totalToolCalls >= MAX_TOOL_CALLS) break;
  }

  const toolResults = messages
    .filter((m) => m.role === "tool")
    .map((m) => m.content);

  messages.push({
    role: "user",
    content:
      '请根据以上工具返回的信息，直接用JSON数组格式回复用户。不要再调用工具。格式示例：[{"type":"text","content":"回复内容"}]',
  });

  console.log("[deepseek] final call", {
    messageCount: messages.length,
    toolResultCount: toolResults.length,
    totalToolCalls,
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
      signal: AbortSignal.timeout(FINAL_CALL_TIMEOUT_MS),
    });

    if (finalResponse.ok) {
      const finalData = (await finalResponse.json()) as DeepSeekResponse;
      totalTokens += finalData.usage?.total_tokens ?? 0;
      const finalChoice = finalData.choices?.[0]?.message;
      if (finalChoice?.content) {
        return { rawOutput: finalChoice.content, tokensUsed: totalTokens };
      }
    } else {
      console.error("[deepseek] final call failed", {
        status: finalResponse.status,
      });
    }
  } catch (e) {
    console.error("[deepseek] final call timeout/error", { error: String(e) });
  }

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
