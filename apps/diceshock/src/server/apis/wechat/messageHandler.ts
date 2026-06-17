import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { chatWithDeepSeek } from "./deepseekClient";
import { generateAndSendMembershipCard } from "./membershipCard";
import { checkRateLimit, recordTokenUsage } from "./rateLimit";
import { getWechatAccessToken, sendCustomerTextMessage } from "./wechatApi";
import { buildTextReply } from "./xmlUtils";

const TYPING_REPLY = "正在思考中，请稍候...";

export async function handleTextMessage(
  c: Context<HonoCtxEnv>,
  msg: Record<string, string>,
): Promise<string> {
  const openId = msg.FromUserName;
  const content = msg.Content?.trim();

  if (!content) return "请输入您的问题~";

  const { allowed, reason } = await checkRateLimit(c, openId);
  if (!allowed) return reason || "服务繁忙，稍后再试";

  c.executionCtx.waitUntil(processAndReplyAsync(c, openId, content));

  return TYPING_REPLY;
}

async function processAndReplyAsync(
  c: Context<HonoCtxEnv>,
  openId: string,
  content: string,
): Promise<void> {
  try {
    const ragContext = await searchKnowledgeBase(c, content);
    const { reply, tokensUsed } = await chatWithDeepSeek(
      c,
      content,
      openId,
      ragContext,
    );

    if (tokensUsed > 0) {
      await recordTokenUsage(c, openId, tokensUsed);
    }

    await sendCustomerTextMessage(c.env as any, openId, reply);
  } catch (e) {
    console.error("[wechat:async] processing failed:", e);
    await sendCustomerTextMessage(
      c.env as any,
      openId,
      "AI 处理异常，请稍后再试",
    );
  }
}

export async function handleMenuEvent(
  c: Context<HonoCtxEnv>,
  msg: Record<string, string>,
): Promise<{ xml: string } | null> {
  const eventKey = msg.EventKey;
  const toUser = msg.FromUserName;
  const fromUser = msg.ToUserName;

  switch (eventKey) {
    case "MEMBERSHIP_PLAN": {
      const reply = buildTextReply(
        toUser,
        fromUser,
        "正在为您生成会员信息，请稍候...",
      );
      c.executionCtx.waitUntil(
        generateAndSendMembershipCard(c, msg.FromUserName),
      );
      return { xml: reply };
    }
    default:
      return null;
  }
}

async function searchKnowledgeBase(
  c: Context<HonoCtxEnv>,
  query: string,
): Promise<string | undefined> {
  const aiSearch = (c.env as any).AI_SEARCH;
  if (!aiSearch) return undefined;

  try {
    const results = await aiSearch.search({
      messages: [{ role: "user", content: query }],
      ai_search_options: {
        retrieval: {
          retrieval_type: "hybrid",
          max_num_results: 5,
        },
      },
    });

    if (!results?.data?.length) return undefined;

    const chunks = results.data
      .map((d: any) => d.text || d.content || "")
      .filter(Boolean);

    return chunks.length > 0 ? chunks.join("\n\n") : undefined;
  } catch (e) {
    console.error("[AI Search] error:", e);
    return undefined;
  }
}
