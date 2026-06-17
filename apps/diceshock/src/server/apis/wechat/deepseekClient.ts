import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { executeTool, TOOLS } from "./tools";

const SYSTEM_PROMPT = `你是 Diceshock 桌游吧的AI助手。你的职责：
- 回答关于店铺、桌游、会员计划的问题
- 帮用户查询桌游库存
- 帮用户查询会员状态（通行证/储值卡）
- 基于知识库内容回答常见问题

规则：
- 用中文回答，语气友好自然
- 不确定时如实告知，不编造信息
- 回复控制在200字以内（微信消息有长度限制）
- 如果用户问的信息需要工具查询，主动调用工具`;

const MAX_TOOL_ROUNDS = 3;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chatWithDeepSeek(
  c: Context<HonoCtxEnv>,
  userMessage: string,
  openId: string,
  ragContext?: string,
): Promise<{ reply: string; tokensUsed: number }> {
  const env = c.env as any;
  const apiKey = env.DEEPSEEK_API_KEY as string;
  const accountId =
    (env.CF_ACCOUNT_ID as string) || "3244c8f91cd34317ce18652158e5853a";
  const gatewayId = env.CF_AI_GATEWAY_ID as string;

  if (!apiKey) {
    console.error("[deepseek] DEEPSEEK_API_KEY not configured");
    return { reply: "AI 服务未配置，请联系管理员", tokensUsed: 0 };
  }

  const baseUrl = gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek`
    : "https://api.deepseek.com/v1";

  console.log("[deepseek] starting chat", {
    openId: openId.slice(-8),
    msgLen: userMessage.length,
    hasRag: !!ragContext,
    ragLen: ragContext?.length ?? 0,
    baseUrl,
  });

  let systemContent = SYSTEM_PROMPT;
  if (ragContext) {
    systemContent += `\n\n以下是与用户问题相关的知识库内容，请参考回答：\n${ragContext}`;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    { role: "user", content: userMessage },
  ];

  let totalTokens = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    console.log("[deepseek] round", round + 1, "messages:", messages.length);

    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/chat/completions`, {
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
    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      console.error("[deepseek] API error", {
        status: response.status,
        elapsed,
        body: errText.slice(0, 500),
      });
      return {
        reply: "AI 服务暂时不可用，请稍后再试",
        tokensUsed: totalTokens,
      };
    }

    const data = (await response.json()) as DeepSeekResponse;
    totalTokens += data.usage?.total_tokens ?? 0;

    console.log("[deepseek] response ok", {
      elapsed,
      tokens: data.usage,
      finishReason: data.choices[0]?.finish_reason,
      hasToolCalls: !!data.choices[0]?.message?.tool_calls?.length,
    });

    const choice = data.choices[0];
    if (!choice) {
      console.error("[deepseek] empty choices array");
      return { reply: "AI 返回异常，请稍后再试", tokensUsed: totalTokens };
    }

    const assistantMsg = choice.message;

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      console.log("[deepseek] final reply", {
        len: assistantMsg.content?.length ?? 0,
        totalTokens,
      });
      return {
        reply: assistantMsg.content || "抱歉，我无法回答这个问题",
        tokensUsed: totalTokens,
      };
    }

    messages.push({
      role: "assistant",
      content: assistantMsg.content || "",
      tool_calls: assistantMsg.tool_calls,
    });

    for (const toolCall of assistantMsg.tool_calls) {
      console.log("[deepseek] tool call", {
        name: toolCall.function.name,
        args: toolCall.function.arguments.slice(0, 200),
      });
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const toolStart = Date.now();
      const result = await executeTool(c, toolCall.function.name, args, openId);
      console.log("[deepseek] tool result", {
        name: toolCall.function.name,
        elapsed: Date.now() - toolStart,
        resultLen: result.length,
      });
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: toolCall.id,
      });
    }
  }

  console.log("[deepseek] max tool rounds reached", { totalTokens });
  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  return {
    reply: lastAssistant?.content || "查询完成，但未能生成回复",
    tokensUsed: totalTokens,
  };
}
