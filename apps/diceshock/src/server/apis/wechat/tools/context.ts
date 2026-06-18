import db, { accounts, drizzle, userInfoTable, users } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import type { ToolDefinition } from "../skills";

const { and, eq } = drizzle;

export const CONTEXT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_current_context",
    description:
      "获取当前环境上下文：当前时间、用户基本信息（昵称、UID、角色、手机号）、用户地理位置。在需要知道当前时间、日期、用户身份时主动调用。",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

interface UserContext {
  time: {
    datetime: string;
    date: string;
    weekday: string;
    timestamp: number;
  };
  user: {
    found: boolean;
    nickname?: string | null;
    uid?: string | null;
    phone?: string | null;
    role?: string;
    registered_at?: Date | null;
  };
  location: {
    available: boolean;
    latitude?: string;
    longitude?: string;
    precision?: string;
    updated_at?: number;
  };
}

export async function executeContextTool(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  const env = c.env as any;
  const kv = env.KV as KVNamespace;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const timeStr = `${get("hour")}:${get("minute")}`;
  const weekday = get("weekday");

  const ctx: UserContext = {
    time: {
      datetime: `${dateStr} ${timeStr}`,
      date: dateStr,
      weekday,
      timestamp: now.getTime(),
    },
    user: { found: false },
    location: { available: false },
  };

  const d = db(env.DB);
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

  const userId =
    account.length > 0
      ? account[0].userId
      : await (async () => {
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
        })();

  if (userId) {
    const info = await d
      .select({
        nickname: userInfoTable.nickname,
        uid: userInfoTable.uid,
        phone: userInfoTable.phone,
        create_at: userInfoTable.create_at,
      })
      .from(userInfoTable)
      .where(eq(userInfoTable.id, userId))
      .limit(1);

    const userRow = await d
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    ctx.user = {
      found: true,
      nickname: info[0]?.nickname || null,
      uid: info[0]?.uid || null,
      phone: info[0]?.phone || null,
      role: userRow[0]?.role || "customer",
      registered_at: info[0]?.create_at || null,
    };
  }

  const locationRaw = await kv.get(`wechat:location:${openId}`);
  if (locationRaw) {
    try {
      const loc = JSON.parse(locationRaw);
      ctx.location = {
        available: true,
        latitude: loc.lat,
        longitude: loc.lng,
        precision: loc.precision,
        updated_at: loc.ts,
      };
    } catch {}
  }

  return JSON.stringify(ctx);
}
