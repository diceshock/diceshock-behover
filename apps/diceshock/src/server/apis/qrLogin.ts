import { encode } from "@auth/core/jwt";
import dbFactory from "@lib/db";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { z } from "zod/v4";
import type { HonoCtxEnv } from "@/shared/types";
import { miniappAccount } from "../services/miniappAuth";

/**
 * 小程序扫码登录后台。
 *
 * 流程：
 *  1. 网页 POST /create 拿到 qrId，把它渲染成二维码；
 *  2. 已登录 小程序 端扫到二维码后 POST /confirm（Bearer 小程序令牌）确认登录；
 *  3. 网页轮询 GET /status，确认后由服务端直接下发 Auth.js 会话 Cookie。
 *
 * 只有 admin / staff / host 可以确认；顾客与会员会被拒绝。
 * 二维码一次性使用，5 分钟过期。
 */
const DASH_ROLES = new Set(["admin", "staff", "host"]);
const TTL_SECONDS = 300;
const CODE_PREFIX = "ds-login:";
const COOKIE_NAME = "__Secure-authjs.session-token";

type QrState = {
  status: "pending" | "confirmed";
  userId?: string;
  createdAt: number;
};

const qrKey = (id: string) => `qr-login:${id}`;

export const qrLoginRoutes = new Hono<HonoCtxEnv>();

/** 网页端申请一个二维码。 */
qrLoginRoutes.post("/create", async (c) => {
  const qrId = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  const state: QrState = { status: "pending", createdAt: Date.now() };
  await c.env.KV.put(qrKey(qrId), JSON.stringify(state), {
    expirationTtl: TTL_SECONDS,
  });
  return c.json({
    qrId,
    code: `${CODE_PREFIX}${qrId}`,
    expiresIn: TTL_SECONDS,
  });
});

/** 网页端轮询扫码结果；确认后直接写入会话 Cookie。 */
qrLoginRoutes.get("/status", async (c) => {
  const qrId = c.req.query("qrId");
  if (!qrId) throw new HTTPException(400, { message: "缺少二维码参数" });

  const key = qrKey(qrId);
  const raw = await c.env.KV.get(key);
  if (!raw) return c.json({ status: "expired" });

  const state = JSON.parse(raw) as QrState;
  if (state.status !== "confirmed" || !state.userId) {
    return c.json({ status: "pending" });
  }

  const userId = state.userId;
  const user = await dbFactory(c.env.DB).query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  });
  if (!user || !DASH_ROLES.has(user.role)) {
    await c.env.KV.delete(key);
    throw new HTTPException(403, { message: "该账号没有后台权限" });
  }

  const secret = c.env.AUTH_SECRET;
  if (!secret) throw new HTTPException(500, { message: "AUTH_SECRET 缺失" });

  const maxAge = 60 * 60 * 24 * 30;
  const token = await encode({
    token: { sub: user.id, name: user.name ?? "", role: user.role },
    secret,
    salt: COOKIE_NAME,
    maxAge,
  });
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge,
  });

  // 一次性使用
  await c.env.KV.delete(key);
  return c.json({ status: "confirmed" });
});

/** 小程序端扫码后确认登录。 */
qrLoginRoutes.post("/confirm", async (c) => {
  const account = await miniappAccount(c.env.DB, c.req.header("Authorization"));
  const input = z
    .object({ qrId: z.string().trim().min(8).max(64) })
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success) throw new HTTPException(400, { message: "参数无效" });

  const user = await dbFactory(c.env.DB).query.users.findFirst({
    where: (u, { eq }) => eq(u.id, account.id),
  });
  if (!user || !DASH_ROLES.has(user.role)) {
    throw new HTTPException(403, { message: "顾客和会员不能登录后台" });
  }

  const key = qrKey(input.data.qrId);
  const raw = await c.env.KV.get(key);
  if (!raw) throw new HTTPException(410, { message: "二维码已过期，请刷新" });

  const state = JSON.parse(raw) as QrState;
  if (state.status === "confirmed") {
    throw new HTTPException(409, { message: "该二维码已被使用" });
  }

  const next: QrState = { ...state, status: "confirmed", userId: account.id };
  await c.env.KV.put(key, JSON.stringify(next), {
    expirationTtl: TTL_SECONDS,
  });
  return c.json({ ok: true, role: user.role });
});
