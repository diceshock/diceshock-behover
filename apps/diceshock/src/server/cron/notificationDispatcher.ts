import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import db, { drizzle, userPreferencesTable } from "@lib/db";
import {
  checkDailyPushLimit,
  logPushNotification,
  resolveUserOpenId,
  sendPreferenceMatchNotification,
} from "@/server/apis/wechat/templateMessage";
import {
  PUSH_WINDOW_END,
  PUSH_WINDOW_START,
} from "@/shared/preferences/constants";
import type { MatchResult } from "@/shared/preferences/types";

const { eq } = drizzle;

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const MATCH_QUEUE_KEY = "preference:match_queue";

function shanghaiHour(): number {
  const now = new Date(Date.now() + SHANGHAI_OFFSET_MS);
  return now.getUTCHours();
}

function todayStr(): string {
  const now = new Date(Date.now() + SHANGHAI_OFFSET_MS);
  return now.toISOString().slice(0, 10);
}

interface StoreEnv {
  KV: KVNamespace;
}

interface DispatchEnv {
  DB: D1Database;
  KV: KVNamespace;
}

export async function storeMatchQueue(
  env: StoreEnv,
  matches: MatchResult[],
): Promise<void> {
  await env.KV.put(MATCH_QUEUE_KEY, JSON.stringify(matches), {
    expirationTtl: 86400,
  });
}

async function getMatchQueue(env: StoreEnv): Promise<MatchResult[]> {
  const raw = await env.KV.get(MATCH_QUEUE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as MatchResult[];
}

async function getPreferenceRawText(
  d1: D1Database,
  preferenceId: string,
): Promise<string> {
  const tdb = db(d1);
  const [pref] = await tdb
    .select({ rawText: userPreferencesTable.raw_text })
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.id, preferenceId))
    .limit(1);
  return pref?.rawText ?? "约局偏好";
}

export async function dispatchPreferenceNotifications(
  env: DispatchEnv,
): Promise<void> {
  const hour = shanghaiHour();
  if (hour < PUSH_WINDOW_START || hour >= PUSH_WINDOW_END) {
    return;
  }

  const matches = await getMatchQueue(env);
  if (matches.length === 0) return;

  const today = todayStr();
  const processed = new Set<number>();

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const prefText = match.preferenceIds[0]
      ? await getPreferenceRawText(env.DB, match.preferenceIds[0])
      : "约局偏好";

    for (const userId of match.userIds) {
      const { allowed } = await checkDailyPushLimit(env, userId, today);
      if (!allowed) continue;

      const openId = await resolveUserOpenId(env, userId);
      if (!openId) continue;

      const reason =
        match.type === "preference_cross"
          ? `因为你的「${prefText}」偏好，我们发现 ${match.userIds.length} 人有相似兴趣，已为你创建推荐约局`
          : `因为你的「${prefText}」偏好，发现一个匹配的约局「${match.activeTitle}」(${match.date})`;

      const activeUrl = match.activeId
        ? `https://diceshock.com/actives/${match.activeId}`
        : "https://diceshock.com/actives";

      await sendPreferenceMatchNotification(env, openId, {
        reason,
        activeTitle:
          match.activeTitle ??
          `推荐${match.category ? ({ trpg: "跑团", boardgame: "桌游", mahjong: "日麻" }[match.category] ?? "") : ""}局`,
        activeDate: match.date,
        activeUrl,
        manageUrl: "https://diceshock.com/preferences",
      });

      await logPushNotification(env, {
        userId,
        preferenceId: match.preferenceIds[0] ?? null,
        activeId: match.activeId ?? null,
        pushType:
          match.type === "preference_cross"
            ? "preference_match"
            : "active_match",
        pushDate: today,
        messageSummary: reason.slice(0, 100),
      });
    }

    processed.add(i);
  }

  if (processed.size > 0) {
    const remaining = matches.filter((_, i) => !processed.has(i));
    if (remaining.length === 0) {
      await env.KV.delete(MATCH_QUEUE_KEY);
    } else {
      await storeMatchQueue(env, remaining);
    }
  }
}
