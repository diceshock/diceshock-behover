import db, {
  accounts,
  activeRegistrationsTable,
  activesTable,
  boardGamesTable,
  drizzle,
  storesTable,
  userInfoTable,
} from "@lib/db";
import dayjs from "dayjs";
import type { Context } from "hono";
import {
  LOCALES,
  type LocaleCode,
  STORES,
  type StoreCode,
} from "@/shared/store-locale";
import type { HonoCtxEnv } from "@/shared/types";
import {
  clearConversationHistory,
  getRecentHistory,
  saveMessage,
} from "./conversationContext";
import { chatWithAgent } from "./deepseekClient";
import { addMemory, deleteAllMemories, searchMemory } from "./memory";
import { dispatchMessages, parseAgentOutput } from "./messagePipeline";
import { checkRateLimit, recordTokenUsage } from "./rateLimit";
import { ERROR_MESSAGES } from "./statusMessages";
import {
  clearPendingAction,
  executePendingAction,
  getPendingAction,
} from "./tools/mutate";
import { sendCustomerTextMessage } from "./wechatApi";
import { buildTextReply } from "./xmlUtils";

const TYPING_REPLY = "收到，正在处理中...";
const CONFIRM_KEYWORDS = new Set([
  "确认",
  "确定",
  "是",
  "好",
  "ok",
  "OK",
  "Yes",
  "yes",
]);
const CANCEL_KEYWORDS = new Set(["取消", "不", "算了", "cancel"]);

const PREF_LANG_KEYWORDS = new Set(["切换语言", "change language"]);
const PREF_STORE_KEYWORDS = new Set(["切换店铺", "change store"]);
const PREF_SHOW_KEYWORDS = new Set(["我的偏好", "my preferences"]);

export async function handleTextMessage(
  c: Context<HonoCtxEnv>,
  msg: Record<string, string>,
): Promise<string> {
  const openId = msg.FromUserName;
  const content = msg.Content?.trim();

  if (!content) return "请输入您的问题~";

  if (content === "清理上下文") {
    c.executionCtx.waitUntil(clearAllContext(c, openId));
    return "已清理所有对话历史和记忆";
  }

  const env = c.env as any;
  const pending = await getPendingAction(env.KV, openId);
  if (pending) {
    if (CONFIRM_KEYWORDS.has(content)) {
      c.executionCtx.waitUntil(executeConfirmedAction(c, openId, pending));
      return "收到，正在执行...";
    }
    if (CANCEL_KEYWORDS.has(content)) {
      await clearPendingAction(env.KV, openId);
      return "已取消操作。";
    }
    await clearPendingAction(env.KV, openId);
  }

  // ─── Preference commands ─────────────────────────────────────────
  const prefResult = await handlePreferenceCommand(c, openId, content);
  if (prefResult) return prefResult;

  const { allowed, reason } = await checkRateLimit(c, openId);
  if (!allowed) return reason || ERROR_MESSAGES.RATE_LIMITED;

  c.executionCtx.waitUntil(processMessage(c, openId, content));
  return TYPING_REPLY;
}

async function executeConfirmedAction(
  c: Context<HonoCtxEnv>,
  openId: string,
  pending: Awaited<ReturnType<typeof getPendingAction>> & {},
): Promise<void> {
  const env = c.env as any;
  await clearPendingAction(env.KV, openId);

  const toolContext = {
    env: { DB: env.DB, KV: env.KV },
    openId,
  };

  try {
    const result = await executePendingAction(pending, toolContext);
    await sendCustomerTextMessage(env, openId, result);
  } catch (e) {
    await sendCustomerTextMessage(
      env,
      openId,
      `操作执行失败: ${String(e).slice(0, 100)}`,
    );
  }
}

async function processMessage(
  c: Context<HonoCtxEnv>,
  openId: string,
  content: string,
): Promise<void> {
  const env = c.env as any;
  const t0 = Date.now();
  const tag = openId.slice(-6);

  try {
    console.log(`[pipeline:${tag}] start`, { content: content.slice(0, 50) });

    const history = await getRecentHistory(c, openId);
    console.log(`[pipeline:${tag}] history loaded`, {
      count: history.length,
      ms: Date.now() - t0,
    });

    const memory = await searchMemory(env, openId, content);
    console.log(`[pipeline:${tag}] memory searched`, {
      found: !!memory,
      ms: Date.now() - t0,
    });

    const ragContext = await searchKnowledgeBase(c, content);
    console.log(`[pipeline:${tag}] rag done`, {
      found: !!ragContext,
      ms: Date.now() - t0,
    });

    const { rawOutput, tokensUsed } = await chatWithAgent(c, {
      userMessage: content,
      openId,
      conversationHistory: history,
      ragContext,
      memory,
    });

    console.log(`[pipeline:${tag}] agent done`, {
      tokensUsed,
      rawOutputLen: rawOutput.length,
      ms: Date.now() - t0,
    });

    if (tokensUsed > 0) {
      await recordTokenUsage(c, openId, tokensUsed);
    }

    const messages = parseAgentOutput(rawOutput);
    console.log(`[pipeline:${tag}] parsed`, {
      messageCount: messages.length,
      types: messages.map((m) => m.type),
    });

    if (messages.length === 0) {
      messages.push({
        type: "text",
        content: "抱歉，我暂时无法生成回复。请稍后再试或换个方式提问。",
      });
    }

    await dispatchMessages(env, openId, messages);
    console.log(`[pipeline:${tag}] dispatched`, { ms: Date.now() - t0 });

    await saveMessage(c, openId, "user", content, "{}");
    await saveMessage(c, openId, "assistant", rawOutput, "{}");

    addMemory(env, openId, [
      { role: "user", content },
      { role: "assistant", content: rawOutput },
    ]).catch(() => {});

    console.log(`[pipeline:${tag}] complete`, { totalMs: Date.now() - t0 });
  } catch (e) {
    console.error(`[pipeline:${tag}] error`, {
      error: String(e),
      ms: Date.now() - t0,
    });
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

// ─── Preference helpers ─────────────────────────────────────────────

const PREF_MENU_TTL = 300;

async function resolveUserId(
  dbEnv: D1Database,
  openId: string,
): Promise<string | null> {
  const d = db(dbEnv);
  const { and, eq } = drizzle;

  const account = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "wechat-mp"),
        eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(1);
  if (account.length > 0) return account[0].userId;

  const silent = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "wechat-mp-silent"),
        eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(1);
  return silent.length > 0 ? silent[0].userId : null;
}

function buildLanguageOptions(): string {
  const entries = Object.entries(LOCALES);
  const lines = entries.map(
    ([, loc], i) => `${i + 1}. ${loc.name} (${loc.code})`,
  );
  return `请选择语言:\n${lines.join("\n")}\n\n回复数字或语言名称`;
}

function buildStoreOptions(): string {
  const entries = Object.entries(STORES);
  const lines = entries.map(([, store], i) => `${i + 1}. ${store.name}`);
  return `请选择店铺:\n${lines.join("\n")}\n\n回复数字或店铺名称`;
}

async function buildPreferenceDisplay(
  d1: D1Database,
  userId: string,
): Promise<string> {
  const d = db(d1);
  const { eq } = drizzle;

  const info = await d
    .select({
      preferred_locale: userInfoTable.preferred_locale,
      preferred_store_id: userInfoTable.preferred_store_id,
    })
    .from(userInfoTable)
    .where(eq(userInfoTable.id, userId))
    .limit(1);

  if (info.length === 0) {
    return "暂未设置偏好";
  }

  const pl = info[0].preferred_locale;
  const ps = info[0].preferred_store_id;

  let storeName = "未设置";
  if (ps) {
    const store = await d
      .select({ name: storesTable.name })
      .from(storesTable)
      .where(eq(storesTable.id, ps))
      .limit(1);
    if (store.length > 0) storeName = store[0].name;
  }

  const localeName = pl
    ? ((LOCALES as Record<string, { name: string }>)[pl]?.name ?? pl)
    : "未设置";

  return `当前偏好设置\n语言: ${localeName}\n店铺: ${storeName}\n\n回复"切换语言"或"切换店铺"修改设置`;
}

function resolveLanguageChoice(input: string): LocaleCode | null {
  const num = Number(input);
  const codes = Object.keys(LOCALES) as LocaleCode[];
  if (num >= 1 && num <= codes.length) {
    return codes[num - 1];
  }

  const lower = input.toLowerCase();
  for (const code of codes) {
    const loc = LOCALES[code];
    if (
      lower === loc.name.toLowerCase() ||
      lower === loc.code.toLowerCase() ||
      lower === loc.bcp47.toLowerCase()
    ) {
      return code;
    }
  }

  return null;
}

function resolveStoreChoice(input: string): StoreCode | null {
  const num = Number(input);
  const codes = Object.keys(STORES) as StoreCode[];
  if (num >= 1 && num <= codes.length) {
    return codes[num - 1];
  }

  const lower = input.toLowerCase();
  for (const code of codes) {
    const store = STORES[code];
    if (
      lower === store.name.toLowerCase() ||
      lower === store.shortName.toLowerCase()
    ) {
      return code;
    }
  }

  return null;
}

async function handlePreferenceCommand(
  c: Context<HonoCtxEnv>,
  openId: string,
  content: string,
): Promise<string | null> {
  const lower = content.toLowerCase();

  if (PREF_SHOW_KEYWORDS.has(lower)) {
    const env = c.env as any;
    const userId = await resolveUserId(env.DB, openId);
    if (!userId)
      return "请先在骰子奇兵注册账号，再设置偏好~\nhttps://diceshock.com/me";
    return await buildPreferenceDisplay(env.DB, userId);
  }

  if (PREF_LANG_KEYWORDS.has(lower)) {
    const env = c.env as any;
    const userId = await resolveUserId(env.DB, openId);
    if (!userId)
      return "请先在骰子奇兵注册账号，再设置偏好~\nhttps://diceshock.com/me";
    await (env.KV as KVNamespace).put(`preference_menu:${openId}`, "language", {
      expirationTtl: PREF_MENU_TTL,
    });
    return buildLanguageOptions();
  }

  if (PREF_STORE_KEYWORDS.has(lower)) {
    const env = c.env as any;
    const userId = await resolveUserId(env.DB, openId);
    if (!userId)
      return "请先在骰子奇兵注册账号，再设置偏好~\nhttps://diceshock.com/me";
    await (env.KV as KVNamespace).put(`preference_menu:${openId}`, "store", {
      expirationTtl: PREF_MENU_TTL,
    });
    return buildStoreOptions();
  }

  const env = c.env as any;
  const pendingPref = await (env.KV as KVNamespace).get(
    `preference_menu:${openId}`,
  );

  if (pendingPref === "language") {
    await (env.KV as KVNamespace).delete(`preference_menu:${openId}`);
    const choice = resolveLanguageChoice(content);
    if (!choice) {
      await (env.KV as KVNamespace).put(
        `preference_menu:${openId}`,
        "language",
        { expirationTtl: PREF_MENU_TTL },
      );
      return `无法识别"${content}"，请输入数字或语言名称:\n${buildLanguageOptions()}`;
    }
    return await updatePreference(env.DB, openId, "language", choice);
  }

  if (pendingPref === "store") {
    await (env.KV as KVNamespace).delete(`preference_menu:${openId}`);
    const choice = resolveStoreChoice(content);
    if (!choice) {
      await (env.KV as KVNamespace).put(`preference_menu:${openId}`, "store", {
        expirationTtl: PREF_MENU_TTL,
      });
      return `无法识别"${content}"，请输入数字或店铺名称:\n${buildStoreOptions()}`;
    }
    return await updatePreference(env.DB, openId, "store", choice);
  }

  return null;
}

async function updatePreference(
  d1: D1Database,
  openId: string,
  type: "language" | "store",
  value: string,
): Promise<string> {
  const userId = await resolveUserId(d1, openId);
  if (!userId) return "请先在骰子奇兵注册账号";

  const d = db(d1);
  const { eq } = drizzle;

  try {
    const updates: Record<string, string | null> = {};
    let label = "";

    if (type === "language") {
      updates.preferred_locale = value;
      label =
        (LOCALES as Record<string, { name: string }>)[value]?.name ?? value;
    } else {
      const storeEntry = await d
        .select({ name: storesTable.name, id: storesTable.id })
        .from(storesTable)
        .where(eq(storesTable.code, value as StoreCode))
        .limit(1);

      if (storeEntry.length > 0) {
        updates.preferred_store_id = storeEntry[0].id;
        label = storeEntry[0].name;
      } else {
        return "店铺不存在，请联系管理员";
      }
    }

    await d
      .update(userInfoTable)
      .set(updates)
      .where(eq(userInfoTable.id, userId));

    const typeLabel = type === "language" ? "语言" : "店铺";
    return `已更新偏好设置: ${typeLabel} → ${label}`;
  } catch (e) {
    console.error(`[pref:${type}] update failed:`, e);
    return `设置失败: ${String(e).slice(0, 100)}`;
  }
}

async function clearAllContext(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<void> {
  const env = c.env as any;

  await Promise.all([
    clearConversationHistory(c, openId),
    deleteAllMemories(env, openId),
  ]);

  console.log("[wechat:clear] cleared all context", {
    openId: openId.slice(-8),
  });
}
