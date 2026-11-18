import { encode } from "@auth/core/jwt";
import db from "@lib/db";
import { Hono } from "hono";
import { nanoid } from "nanoid/non-secure";
import { DASH_ROLES } from "@/shared/constants";
import type { HonoCtxEnv } from "@/shared/types";
import { miniappAccount } from "../services/miniappAuth";

export const qrLoginRoutes = new Hono<HonoCtxEnv>();

const QR_TTL = 300; // seconds
const KV_PREFIX = "qr-login:";

qrLoginRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

qrLoginRoutes.onError((error, c) => {
  console.error("[qr-login]", error);
  return c.json({ message: "扫码登录服务暂时不可用" }, 500);
});

// ─── POST /create — Web client creates a QR session ─────────────
qrLoginRoutes.post("/create", async (c) => {
  const qrId = nanoid(24);
  const kvKey = `${KV_PREFIX}${qrId}`;

  await c.env.KV.put(kvKey, JSON.stringify({ status: "pending" }), {
    expirationTtl: QR_TTL,
  });

  return c.json({
    qrId,
    code: `ds-login:${qrId}`,
    expiresIn: QR_TTL,
  });
});

// ─── POST /confirm — Mini-app confirms the scan ─────────────────
qrLoginRoutes.post("/confirm", async (c) => {
  const authorization = c.req.header("Authorization");
  const account = await miniappAccount(c.env.DB, authorization);

  const body = await c.req.json<{ qrId: string }>().catch(() => null);
  if (!body?.qrId) return c.json({ message: "参数无效" }, 400);

  const kvKey = `${KV_PREFIX}${body.qrId}`;
  const raw = await c.env.KV.get(kvKey);
  if (!raw) return c.json({ message: "二维码已过期" }, 410);

  const data = JSON.parse(raw) as { status: string };
  if (data.status !== "pending") {
    return c.json({ message: "二维码已被使用" }, 409);
  }

  // Verify user has a dash-eligible role
  const tdb = db(c.env.DB);
  const user = await tdb.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, account.id),
    columns: { id: true, role: true, name: true },
  });
  if (!user || !DASH_ROLES.has(user.role)) {
    return c.json({ message: "当前账号无后台权限" }, 403);
  }

  const confirmToken = crypto.randomUUID();
  await c.env.KV.put(
    kvKey,
    JSON.stringify({
      status: "confirmed",
      userId: user.id,
      confirmToken,
    }),
    { expirationTtl: QR_TTL },
  );

  return c.json({ ok: true, role: user.role });
});

// ─── GET /status — Web client polls for confirmation ─────────────
qrLoginRoutes.get("/status", async (c) => {
  const qrId = c.req.query("qrId");
  if (!qrId) return c.json({ message: "参数无效" }, 400);

  const kvKey = `${KV_PREFIX}${qrId}`;
  const raw = await c.env.KV.get(kvKey);
  if (!raw) return c.json({ status: "expired" });

  const data = JSON.parse(raw) as {
    status: string;
    userId?: string;
    confirmToken?: string;
  };

  if (data.status === "pending") return c.json({ status: "pending" });

  if (data.status === "confirmed") {
    return c.json({
      status: "confirmed",
      userId: data.userId,
      confirmToken: data.confirmToken,
    });
  }

  return c.json({ status: data.status });
});

// ─── POST /exchange — Web client exchanges confirmToken for session ──
qrLoginRoutes.post("/exchange", async (c) => {
  const body = await c.req
    .json<{ qrId: string; confirmToken: string }>()
    .catch(() => null);
  if (!body?.qrId || !body?.confirmToken) {
    return c.json({ message: "参数无效" }, 400);
  }

  const kvKey = `${KV_PREFIX}${body.qrId}`;
  const raw = await c.env.KV.get(kvKey);
  if (!raw) return c.json({ message: "二维码已过期" }, 410);

  const data = JSON.parse(raw) as {
    status: string;
    userId?: string;
    confirmToken?: string;
  };
  if (data.status !== "confirmed" || data.confirmToken !== body.confirmToken) {
    return c.json({ message: "确认凭证无效" }, 403);
  }

  // One-time consumption: delete the KV key immediately
  await c.env.KV.delete(kvKey);

  // Verify user is still valid
  const tdb = db(c.env.DB);
  const user = await tdb.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, data.userId as string),
    columns: { id: true, name: true, role: true, disabled: true },
  });
  if (!user || user.disabled || !DASH_ROLES.has(user.role)) {
    return c.json({ message: "当前账号无后台权限" }, 403);
  }

  // Derive cookie name consistent with Auth.js defaultCookies()
  const protocol = new URL(c.req.url).protocol;
  const useSecure = protocol === "https:";
  const cookieName = useSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const secret =
    c.env.AUTH_SECRET ||
    (import.meta.env.DEV
      ? "diceshock-dev-secret-do-not-use-in-production"
      : "");

  // Encode a JWT matching the shape Auth.js callbacks produce
  const jwtToken = await encode({
    salt: cookieName,
    secret,
    token: {
      sub: user.id,
      name: user.name ?? "admin",
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    },
    maxAge: 30 * 24 * 60 * 60,
  });

  // Set the session cookie
  const cookieFlags = [
    `${cookieName}=${jwtToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${30 * 24 * 60 * 60}`,
  ];
  if (useSecure) cookieFlags.push("Secure");

  c.header("Set-Cookie", cookieFlags.join("; "));

  return c.json({ ok: true });
});
