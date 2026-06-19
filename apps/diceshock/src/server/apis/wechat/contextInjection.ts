import type { D1Database } from "@cloudflare/workers-types";
import db, { accounts, drizzle, userInfoTable } from "@lib/db";

const { and, eq, inArray } = drizzle;

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

function getShanghaiTime(): { iso: string; weekday: string } {
  const now = new Date();
  // Shift to Asia/Shanghai for accurate local time
  const tzOffset = 8 * 60; // minutes
  const localOffset = now.getTimezoneOffset();
  const shanghaiMs = now.getTime() + (tzOffset + localOffset) * 60 * 1000;
  const s = new Date(shanghaiMs);

  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(
    s.getUTCDate(),
  )}T${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}:${pad(
    s.getUTCSeconds(),
  )}+08:00`;

  const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
    timeZone: "Asia/Shanghai",
  });
  return { iso, weekday: weekdayFormatter.format(new Date(shanghaiMs)) };
}

/**
 * Builds an auto-injected context string for the AI agent's first user message.
 * Fast: at most 1 DB query + 1 KV read.
 */
export async function buildAutoContext(
  env: Env,
  openId: string,
): Promise<string> {
  const { iso, weekday } = getShanghaiTime();

  const d = db(env.DB);

  // Single DB query: resolve userId + nickname, preferring wechat-mp over wechat-mp-silent
  const accountRows = await d
    .select({
      userId: accounts.userId,
      nickname: userInfoTable.nickname,
      provider: accounts.provider,
    })
    .from(accounts)
    .leftJoin(userInfoTable, eq(accounts.userId, userInfoTable.id))
    .where(
      and(
        inArray(accounts.provider, ["wechat-mp", "wechat-mp-silent"]),
        eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(2);

  const preferred =
    accountRows.find((r) => r.provider === "wechat-mp") || accountRows[0];
  const userId = preferred?.userId ?? null;
  const nickname = preferred?.nickname ?? null;

  // Single KV read: last known location
  let locationLabel: string | null = null;
  const locationRaw = await env.KV.get(`wechat:location:${openId}`);
  if (locationRaw) {
    try {
      const loc = JSON.parse(locationRaw);
      if (loc.lat && loc.lng) {
        locationLabel = `${loc.lat}, ${loc.lng}`;
      }
    } catch {
      // ignore malformed location data
    }
  }

  // Assemble context string
  const lines = [
    "[当前上下文]",
    `时间: ${iso} (${weekday})`,
    `用户OpenID: ${openId}`,
    `用户ID: ${userId ?? "null (未绑定)"}`,
  ];

  if (nickname) {
    lines.push(`昵称: ${nickname}`);
  }

  if (locationLabel) {
    lines.push(`最近位置: ${locationLabel}`);
  }

  lines.push("");
  lines.push("如需更详细信息(会员状态、战绩等)请使用 query 工具查询。");

  return lines.join("\n");
}
