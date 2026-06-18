import db, { accounts, drizzle, users } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

const { eq } = drizzle;

interface RateLimitBucket {
  tokens: number;
  updatedAt: number;
}

const LIMITS = {
  user_2h: { max: 8000, windowMs: 2 * 60 * 60 * 1000 },
  user_5h: { max: 15000, windowMs: 5 * 60 * 60 * 1000 },
  user_24h: { max: 30000, windowMs: 24 * 60 * 60 * 1000 },
  global_2h: { max: 200000, windowMs: 2 * 60 * 60 * 1000 },
  global_5h: { max: 400000, windowMs: 5 * 60 * 60 * 1000 },
  global_24h: { max: 800000, windowMs: 24 * 60 * 60 * 1000 },
} as const;

type LimitKey = keyof typeof LIMITS;

function kvKey(scope: string, window: string): string {
  return `rl:${scope}:${window}`;
}

async function getBucket(
  kv: KVNamespace,
  key: string,
): Promise<RateLimitBucket> {
  const raw = await kv.get(key);
  if (!raw) return { tokens: 0, updatedAt: Date.now() };
  return JSON.parse(raw) as RateLimitBucket;
}

function isWindowExpired(bucket: RateLimitBucket, windowMs: number): boolean {
  return Date.now() - bucket.updatedAt > windowMs;
}

export async function checkRateLimit(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const isAdmin = await isAdminUser(c, openId);
  if (isAdmin) {
    console.log("[ratelimit] admin bypass", { openId: openId.slice(-8) });
    return { allowed: true };
  }

  const kv = c.env.KV;

  const checks: Array<{ key: string; limitKey: LimitKey }> = [
    { key: kvKey(openId, "2h"), limitKey: "user_2h" },
    { key: kvKey(openId, "5h"), limitKey: "user_5h" },
    { key: kvKey(openId, "24h"), limitKey: "user_24h" },
    { key: kvKey("global", "2h"), limitKey: "global_2h" },
    { key: kvKey("global", "5h"), limitKey: "global_5h" },
    { key: kvKey("global", "24h"), limitKey: "global_24h" },
  ];

  for (const { key, limitKey } of checks) {
    const limit = LIMITS[limitKey];
    const bucket = await getBucket(kv, key);

    if (isWindowExpired(bucket, limit.windowMs)) continue;

    if (bucket.tokens >= limit.max) {
      console.log("[ratelimit] blocked", {
        openId: openId.slice(-8),
        limitKey,
        tokens: bucket.tokens,
        max: limit.max,
      });
      return { allowed: false, reason: "服务繁忙，稍后再试" };
    }
  }

  console.log("[ratelimit] allowed", { openId: openId.slice(-8) });
  return { allowed: true };
}

export async function recordTokenUsage(
  c: Context<HonoCtxEnv>,
  openId: string,
  tokensUsed: number,
): Promise<void> {
  console.log("[ratelimit] record", { openId: openId.slice(-8), tokensUsed });
  const kv = c.env.KV;
  const now = Date.now();

  const windows: Array<{ scope: string; window: string; limitKey: LimitKey }> =
    [
      { scope: openId, window: "2h", limitKey: "user_2h" },
      { scope: openId, window: "5h", limitKey: "user_5h" },
      { scope: openId, window: "24h", limitKey: "user_24h" },
      { scope: "global", window: "2h", limitKey: "global_2h" },
      { scope: "global", window: "5h", limitKey: "global_5h" },
      { scope: "global", window: "24h", limitKey: "global_24h" },
    ];

  await Promise.all(
    windows.map(async ({ scope, window, limitKey }) => {
      const key = kvKey(scope, window);
      const limit = LIMITS[limitKey];
      const bucket = await getBucket(kv, key);

      const newBucket: RateLimitBucket = isWindowExpired(bucket, limit.windowMs)
        ? { tokens: tokensUsed, updatedAt: now }
        : { tokens: bucket.tokens + tokensUsed, updatedAt: bucket.updatedAt };

      const ttlSeconds = Math.ceil(limit.windowMs / 1000);
      await kv.put(key, JSON.stringify(newBucket), {
        expirationTtl: ttlSeconds,
      });
    }),
  );
  console.log("[ratelimit] recorded ok");
}

async function isAdminUser(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<boolean> {
  const d = db(c.env.DB);
  const result = await d
    .select({ role: users.role })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(eq(accounts.providerAccountId, openId))
    .limit(1);

  return (
    result.length > 0 &&
    (result[0].role === "admin" || result[0].role === "staff")
  );
}
