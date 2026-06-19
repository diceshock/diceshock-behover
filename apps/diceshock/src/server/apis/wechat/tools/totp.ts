import db, { accounts, drizzle } from "@lib/db";
import { generateTOTP, getRemainingSeconds } from "@/shared/utils/totp";
import type { TotpMessage } from "../types";

const { and, eq } = drizzle;

const MINIMUM_REMAINING_SECONDS = 10;
const TOTP_PERIOD = 30;

// ─── Shared Types ──────────────────────────────────────────────────

export interface ToolContext {
  env: {
    DB: D1Database;
    KV: KVNamespace;
  };
  openId: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

async function resolveUserId(
  d1: D1Database,
  openId: string,
): Promise<string | null> {
  const d = db(d1);
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

function buildOtpAuthUri(secret: string, label: string): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedIssuer = encodeURIComponent("Diceshock");
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=${TOTP_PERIOD}`;
}

function generateQrCodeUrl(data: string): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
}

// ─── Tool Definition ───────────────────────────────────────────────

export const TOTP_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "generate_totp",
    description: "生成活动签到验证码。返回验证码和对应的二维码数据。",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

// ─── Executor ──────────────────────────────────────────────────────

async function generateTotpMessage(
  ctx: ToolContext,
): Promise<TotpMessage | null> {
  const userId = await resolveUserId(ctx.env.DB, ctx.openId);
  if (!userId) {
    console.log("[tools:totp] no user found for openId:", ctx.openId.slice(-8));
    return null;
  }

  const kvKey = `totp_secret:${userId}`;
  const secret = await ctx.env.KV.get(kvKey);
  if (!secret) {
    console.log("[tools:totp] no totp secret for user:", userId.slice(-8));
    return null;
  }

  const remaining = getRemainingSeconds(TOTP_PERIOD);
  let code: string;
  let effectiveRemaining: number;

  if (remaining < MINIMUM_REMAINING_SECONDS) {
    const nextTimestamp = Date.now() + (remaining + 1) * 1000;
    code = await generateTOTP(secret, TOTP_PERIOD, 6, nextTimestamp);
    effectiveRemaining = remaining + TOTP_PERIOD;
  } else {
    code = await generateTOTP(secret);
    effectiveRemaining = remaining;
  }

  const otpauthUri = buildOtpAuthUri(secret, `UID:${userId}`);
  const qrcode_url = generateQrCodeUrl(otpauthUri);

  return {
    type: "totp",
    qrcode_url,
    code,
    remaining_seconds: effectiveRemaining,
  };
}

export async function executeGenerateTotp(
  _args: {},
  context: ToolContext,
): Promise<string> {
  const totpMsg = await generateTotpMessage(context);
  if (!totpMsg) {
    return JSON.stringify({
      error: "TOTP 验证码生成失败，请先在个人中心绑定验证器",
    });
  }
  return JSON.stringify(totpMsg);
}
