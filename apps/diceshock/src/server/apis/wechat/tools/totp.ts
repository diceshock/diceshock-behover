import db, { accounts, drizzle } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { generateTOTP, getRemainingSeconds } from "@/shared/utils/totp";
import type { TotpMessage } from "../types";

const { and, eq } = drizzle;

const MINIMUM_REMAINING_SECONDS = 10;
const TOTP_PERIOD = 30;

// ─── Helpers ────────────────────────────────────────────────────

async function resolveUserId(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string | null> {
  const d = db(c.env.DB);
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

// ─── Main Export ────────────────────────────────────────────────

export async function generateTotpMessage(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<TotpMessage | null> {
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    console.log("[tools:totp] no user found for openId:", openId.slice(-8));
    return null;
  }

  const kvKey = `totp_secret:${userId}`;
  const secret = await c.env.KV.get(kvKey);
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
