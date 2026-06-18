import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { getRecentHistory, saveMessage } from "./conversationContext";
import { chatWithAgent } from "./deepseekClient";
import { detectIntent } from "./intentRouter";
import { getRelatedLinks } from "./linkRegistry";
import { addMemory, searchMemory } from "./memory";
import { dispatchMessages, parseAgentOutput } from "./messagePipeline";
import {
  clearPendingAction,
  getPendingAction,
  isCancellation,
  isConfirmation,
} from "./pendingAction";
import { checkRateLimit, recordTokenUsage } from "./rateLimit";
import { getSkillById } from "./skills";
import { ERROR_MESSAGES } from "./statusMessages";
import { executeAction } from "./tools/mutations";
import { sendCustomerTextMessage } from "./wechatApi";
import { buildTextReply } from "./xmlUtils";

const TYPING_REPLY = "收到，正在处理中...";

export async function handleTextMessage(
  c: Context<HonoCtxEnv>,
  msg: Record<string, string>,
): Promise<string> {
  const openId = msg.FromUserName;
  const content = msg.Content?.trim();

  if (!content) return "请输入您的问题~";

  const { allowed, reason } = await checkRateLimit(c, openId);
  if (!allowed) return reason || ERROR_MESSAGES.RATE_LIMITED;

  c.executionCtx.waitUntil(processMessage(c, openId, content));
  return TYPING_REPLY;
}

async function processMessage(
  c: Context<HonoCtxEnv>,
  openId: string,
  content: string,
): Promise<void> {
  const env = c.env as any;
  const kv = env.KV as KVNamespace;

  try {
    const pending = await getPendingAction(kv, openId);

    if (pending && isConfirmation(content)) {
      await clearPendingAction(kv, openId);
      const result = await executeAction(c, pending, openId);
      await sendCustomerTextMessage(env, openId, result.notification);
      await saveMessage(
        c,
        openId,
        "user",
        content,
        `{"confirm":"${pending.type}"}`,
      );
      await saveMessage(
        c,
        openId,
        "assistant",
        result.notification,
        `{"action":"${pending.type}"}`,
      );
      return;
    }

    if (pending && isCancellation(content)) {
      await clearPendingAction(kv, openId);
      await sendCustomerTextMessage(env, openId, "已取消操作。");
      await saveMessage(c, openId, "user", content, '{"cancel":true}');
      return;
    }

    const history = await getRecentHistory(c, openId);
    const memory = await searchMemory(env, openId, content);
    const intent = detectIntent(content, history);
    const skill = getSkillById(intent.skillId);

    if (!skill) {
      await sendCustomerTextMessage(env, openId, ERROR_MESSAGES.SERVER_ERROR);
      return;
    }

    const ragContext = await searchKnowledgeBase(c, content);
    const { rawOutput, tokensUsed } = await chatWithAgent(c, {
      userMessage: content,
      openId,
      skill,
      conversationHistory: history,
      ragContext,
      memory,
    });

    if (tokensUsed > 0) {
      await recordTokenUsage(c, openId, tokensUsed);
    }

    const messages = parseAgentOutput(rawOutput);

    const mentionedUrls = new Set(
      rawOutput.match(/https:\/\/diceshock\.com[^\s"}\]）]*/g) || [],
    );
    const relatedLinks = getRelatedLinks(intent.skillId).filter(
      (link) => !mentionedUrls.has(link.url),
    );
    if (relatedLinks.length > 0) {
      const linksText = relatedLinks
        .map((link) => `🔗 ${link.title}: ${link.url}`)
        .join("\n");
      messages.push({ type: "text", content: `相关链接：\n${linksText}` });
    }

    await dispatchMessages(env, openId, messages);

    const metadata = JSON.stringify({
      skillId: intent.skillId,
      confidence: intent.confidence,
    });
    await saveMessage(c, openId, "user", content, metadata);
    await saveMessage(c, openId, "assistant", rawOutput, metadata);

    addMemory(env, openId, [
      { role: "user", content },
      { role: "assistant", content: rawOutput },
    ]).catch(() => {});
  } catch (e) {
    console.error("[wechat:process] pipeline error:", e);
    try {
      await sendCustomerTextMessage(env, openId, ERROR_MESSAGES.AI_UNAVAILABLE);
    } catch {}
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

export async function handleMenuEvent(
  c: Context<HonoCtxEnv>,
  msg: Record<string, string>,
): Promise<{ xml: string } | null> {
  const eventKey = msg.EventKey;
  const toUser = msg.FromUserName;
  const fromUser = msg.ToUserName;

  const MENU_REPLIES: Record<string, string> = {
    MENU_INVENTORY: `想查桌游库存？直接发消息告诉我桌游名字或问"有什么桌游"即可！\n\n也可以在线浏览完整库存：\nhttps://diceshock.com/inventory`,
    MENU_RIICHI: `想看日麻战绩？直接问我"我的日麻战绩"或"排行榜"即可查看！\n\n也可以在线查看：\nhttps://diceshock.com/riichi`,
    MENU_ACTIVES: `想约局？直接告诉我"最近有什么约局"或"我想发起约局"即可！\n\n也可以在线查看：\nhttps://diceshock.com/actives`,
    MENU_HELP: `我是骰子奇兵 AI 助手，直接发送文字消息即可对话。\n\n你可以问我：\n· 查桌游库存\n· 看日麻战绩和排行\n· 查约局、发起约局\n· 查会员信息\n· 绑定手机号/名片\n\n有任何问题直接发消息就好！`,
    MENU_STORE: `骰子奇兵·跑团桌游日麻\n\n📍 光谷天地店\n地址：洪山区高新二路光谷总部国际2栋203\n¥35/人\n大众点评：http://dpurl.cn/Cif4Lcbz\n\n📍 街道口店\n地址：洪山区珞南街道阜华大厦C座2103\n大众点评：http://dpurl.cn/mxdbXGYz\n\n咨询请加官微：\n· DiceShock（光谷天地）\n· DiceShockJDK（街道口）`,
    MEMBERSHIP_PLAN: `想查看会员信息？直接问我"我的会员"或"有什么会员计划"即可！\n\n也可以前往个人中心查看：\nhttps://diceshock.com/me`,
  };

  const reply = MENU_REPLIES[eventKey];
  if (reply) {
    return { xml: buildTextReply(toUser, fromUser, reply) };
  }

  return null;
}
