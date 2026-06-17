import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { chatWithDeepSeek } from "./deepseekClient";
import { checkRateLimit, recordTokenUsage } from "./rateLimit";
import { buildImageReply, buildTextReply } from "./xmlUtils";

export async function handleTextMessage(
  c: Context<HonoCtxEnv>,
  msg: Record<string, string>,
): Promise<string> {
  const openId = msg.FromUserName;
  const content = msg.Content?.trim();

  if (!content) return "请输入您的问题~";

  const { allowed, reason } = await checkRateLimit(c, openId);
  if (!allowed) return reason || "服务繁忙，稍后再试";

  const ragContext = await searchKnowledgeBase(c, content);
  const { reply, tokensUsed } = await chatWithDeepSeek(
    c,
    content,
    openId,
    ragContext,
  );

  if (tokensUsed > 0) {
    c.executionCtx.waitUntil(recordTokenUsage(c, openId, tokensUsed));
  }

  return reply;
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
      c.executionCtx.waitUntil(generateMembershipCard(c, msg.FromUserName));
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

async function generateMembershipCard(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<void> {
  // TODO: Generate membership HTML → IMAGE_QUEUE → upload to WeChat → send customer message
  console.log("[WechatMenu] membership card generation for:", openId);
}
