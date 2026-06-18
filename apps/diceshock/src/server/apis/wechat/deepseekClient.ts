import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { sendStatusMessage } from "./messagePipeline";
import type { SkillDefinition, ToolDefinition } from "./skills";
import { BASE_SYSTEM_PROMPT } from "./skills";
import { getToolStatusMessage } from "./statusMessages";
import { CONTEXT_TOOL, executeTool } from "./tools";
import { isProposeToolName } from "./tools/propose";
import type { ChatMessage } from "./types";

const MAX_TOOL_ROUNDS = 5;

interface ChatWithAgentParams {
  userMessage: string;
  openId: string;
  skill: SkillDefinition;
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

  let systemContent = `${BASE_SYSTEM_PROMPT}\n\n${params.skill.systemPrompt}`;
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
  const skillTools = params.skill.tools;
  const allTools: ToolDefinition[] = [CONTEXT_TOOL, ...skillTools];
  const tools: ToolDefinition[] | undefined =
    allTools.length > 0 ? allTools : undefined;

  const calledTools: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const isLastToolRound = round === MAX_TOOL_ROUNDS - 1;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages,
        ...(tools && !isLastToolRound ? { tools, tool_choice: "auto" } : {}),
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

    let proposeCalled = false;
    for (const toolCall of assistantMsg.tool_calls) {
      const toolKey = `${toolCall.function.name}:${toolCall.function.arguments}`;
      if (calledTools.includes(toolKey)) {
        console.log("[deepseek] duplicate tool call detected, breaking", {
          tool: toolCall.function.name,
        });
        proposeCalled = true;
        messages.push({
          role: "tool",
          content: JSON.stringify({ error: "重复调用，请直接回复用户" }),
          tool_call_id: toolCall.id,
        });
        continue;
      }
      calledTools.push(toolKey);

      const statusMsg = getToolStatusMessage(toolCall.function.name);
      sendStatusMessage(env, params.openId, statusMsg).catch(() => {});

      const args = JSON.parse(toolCall.function.arguments || "{}");
      const result = await executeTool(
        c,
        toolCall.function.name,
        args,
        params.openId,
      );
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: toolCall.id,
      });

      if (isProposeToolName(toolCall.function.name)) {
        proposeCalled = true;
      }
    }

    if (proposeCalled) break;
  }

  messages.push({
    role: "user",
    content:
      "请根据以上工具返回的信息，直接用JSON数组格式回复用户。不要再调用工具。",
  });

  const finalResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages,
      max_tokens: 1024,
    }),
  });

  if (finalResponse.ok) {
    const finalData = (await finalResponse.json()) as DeepSeekResponse;
    totalTokens += finalData.usage?.total_tokens ?? 0;
    const finalChoice = finalData.choices?.[0]?.message;
    if (finalChoice?.content) {
      return { rawOutput: finalChoice.content, tokensUsed: totalTokens };
    }
  }

  const lastToolResult = [...messages].reverse().find((m) => m.role === "tool");
  if (lastToolResult?.content) {
    try {
      const data = JSON.parse(lastToolResult.content);
      const summary = data.message || data.error || "查询完成";
      return {
        rawOutput: `[{"type":"text","content":"${summary}"}]`,
        tokensUsed: totalTokens,
      };
    } catch {}
  }

  return {
    rawOutput:
      '[{"type":"text","content":"抱歉，处理超时了。请简化您的问题再试一次。"}]',
    tokensUsed: totalTokens,
  };
}
