import db, {
  accounts,
  activeRegistrationsTable,
  activesTable,
  boardGamesTable,
  drizzle,
} from "@lib/db";
import dayjs from "dayjs";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import {
  clearConversationHistory,
  getRecentHistory,
  saveMessage,
} from "./conversationContext";
import { chatWithAgent } from "./deepseekClient";
import { detectIntent } from "./intentRouter";
import { getRelatedLinks } from "./linkRegistry";
import { generateAndSendMembershipCard } from "./membershipCard";
import { addMemory, deleteAllMemories, searchMemory } from "./memory";
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

  if (content === "清理上下文") {
    c.executionCtx.waitUntil(clearAllContext(c, openId));
    return "✅ 已清理所有对话历史和记忆";
  }

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

  switch (eventKey) {
    case "MENU_INVENTORY":
      return {
        xml: buildTextReply(toUser, fromUser, await buildInventoryReply(c)),
      };
    case "MENU_RIICHI":
      return {
        xml: buildTextReply(
          toUser,
          fromUser,
          await buildRiichiReply(c, toUser),
        ),
      };
    case "MENU_ACTIVES":
      return {
        xml: buildTextReply(toUser, fromUser, await buildActivesReply(c)),
      };
    case "MENU_STORE":
      return {
        xml: buildTextReply(
          toUser,
          fromUser,
          `骰子奇兵·跑团桌游日麻\n\n📍 光谷天地店\n地址：洪山区高新二路光谷总部国际2栋203\n¥35/人\n大众点评：http://dpurl.cn/Cif4Lcbz\n\n📍 街道口店\n地址：洪山区珞南街道阜华大厦C座2103\n大众点评：http://dpurl.cn/mxdbXGYz\n\n咨询请加官微：\n· DiceShock（光谷天地）\n· DiceShockJDK（街道口）`,
        ),
      };
    case "MENU_HELP":
      return {
        xml: buildTextReply(
          toUser,
          fromUser,
          `我是骰子奇兵 AI 助手，直接发送文字消息即可对话。\n\n你可以问我：\n· 查桌游库存\n· 看日麻战绩和排行\n· 查约局、发起约局\n· 查会员信息\n· 绑定手机号/名片\n\n有任何问题直接发消息就好！`,
        ),
      };
    case "MEMBERSHIP_PLAN":
      return {
        xml: buildTextReply(
          toUser,
          fromUser,
          `想查看会员信息？直接问我"我的会员"或"有什么会员计划"即可！\n\n也可以前往个人中心查看：\nhttps://diceshock.com/me`,
        ),
      };
    default:
      return null;
  }
}

const GAME_CATEGORIES = [
  "工人放置",
  "解密推理",
  "角色扮演",
  "合作闯关",
  "卡牌对战",
  "区域控制",
  "跑分竞速",
  "聚会欢乐",
  "剧本演绎",
  "策略博弈",
];

async function buildInventoryReply(c: Context<HonoCtxEnv>): Promise<string> {
  try {
    const d = db(c.env.DB);
    const EPOCH = new Date(0);

    const [{ count }] = await d
      .select({ count: drizzle.count(boardGamesTable.id) })
      .from(boardGamesTable)
      .where(drizzle.eq(boardGamesTable.removeDate, EPOCH));

    const randomCategory =
      GAME_CATEGORIES[Math.floor(Math.random() * GAME_CATEGORIES.length)];

    return `当前库存 ${count} 款桌游在架！\n\n今日推荐方向：${randomCategory}\n直接发消息告诉我你想玩什么类型，或者问"推荐${randomCategory}类桌游"试试～\n\n在线浏览完整库存：\nhttps://diceshock.com/inventory`;
  } catch {
    return `想查桌游库存？直接发消息告诉我桌游名字即可！\n\nhttps://diceshock.com/inventory`;
  }
}

async function buildRiichiReply(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  try {
    const d = db(c.env.DB);

    const account = await d
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(
        drizzle.and(
          drizzle.inArray(accounts.provider, ["wechat-mp", "wechat-mp-silent"]),
          drizzle.eq(accounts.providerAccountId, openId),
        ),
      )
      .limit(1);

    if (account.length === 0) {
      return `想看日麻战绩？先关注服务号注册账号，然后直接问我"我的战绩"即可！\n\nhttps://diceshock.com/riichi`;
    }

    const snapshot = await d.query.leaderboardSnapshotsTable.findFirst({
      where: (s, { eq }) => eq(s.category, "store_4p_hanchan" as never),
      orderBy: (s, { desc }) => desc(s.computed_at),
    });

    let leaderboardInfo = "";
    if (snapshot?.data && Array.isArray(snapshot.data)) {
      const top3 = (
        snapshot.data as Array<{ nickname?: string; pp?: number }>
      ).slice(0, 3);
      if (top3.length > 0) {
        leaderboardInfo = `\n\n本周4人半庄 Top3：\n${top3.map((e, i) => `${i + 1}. ${e.nickname ?? "?"} (${e.pp ?? 0}PP)`).join("\n")}`;
      }
    }

    return `日麻数据中心${leaderboardInfo}\n\n直接问我"我的战绩"、"排行榜"或"我的PP"查看更多！\n\nhttps://diceshock.com/riichi`;
  } catch {
    return `想看日麻战绩？直接问我"我的日麻战绩"或"排行榜"即可！\n\nhttps://diceshock.com/riichi`;
  }
}

async function buildActivesReply(c: Context<HonoCtxEnv>): Promise<string> {
  try {
    const d = db(c.env.DB);
    const today = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");
    const weekEnd = dayjs()
      .tz("Asia/Shanghai")
      .endOf("week")
      .format("YYYY-MM-DD");

    const upcomingActives = await d
      .select({
        id: activesTable.id,
        title: activesTable.title,
        date: activesTable.date,
        time: activesTable.time,
        max_players: activesTable.max_players,
      })
      .from(activesTable)
      .where(
        drizzle.and(
          drizzle.gte(activesTable.date, today),
          drizzle.lte(activesTable.date, weekEnd),
        ),
      )
      .orderBy(activesTable.date)
      .limit(5);

    if (upcomingActives.length === 0) {
      return `本周暂时没有约局，不如你来发起一个？\n\n直接告诉我"我想发起约局"或者去网页创建：\nhttps://diceshock.com/actives/new`;
    }

    const activeIds = upcomingActives.map((a) => a.id);
    const regs = await d
      .select({
        active_id: activeRegistrationsTable.active_id,
        is_watching: activeRegistrationsTable.is_watching,
      })
      .from(activeRegistrationsTable)
      .where(drizzle.inArray(activeRegistrationsTable.active_id, activeIds));

    const lines = upcomingActives.map((a) => {
      const joined = regs.filter(
        (r) => r.active_id === a.id && !r.is_watching,
      ).length;
      const slots = a.max_players - joined;
      const timeStr = a.time ? ` ${a.time}` : "";
      const slotsStr = slots > 0 ? `（还剩${slots}位）` : "（已满）";
      return `· ${a.date}${timeStr} ${a.title} ${slotsStr}`;
    });

    return `本周有 ${upcomingActives.length} 个约局：\n\n${lines.join("\n")}\n\n想加入？直接告诉我约局名称即可！\n发起新约局：告诉我"我想发起约局"\n\nhttps://diceshock.com/actives`;
  } catch {
    return `想约局？直接告诉我"最近有什么约局"或"我想发起约局"即可！\n\nhttps://diceshock.com/actives`;
  }
}

async function clearAllContext(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<void> {
  const env = c.env as any;
  const kv = env.KV as KVNamespace;

  await Promise.all([
    clearConversationHistory(c, openId),
    deleteAllMemories(env, openId),
    clearPendingAction(kv, openId),
  ]);

  console.log("[wechat:clear] cleared all context", {
    openId: openId.slice(-8),
  });
}
