import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

const PENDING_PREFIX = "wechat:pending:";
const PENDING_TTL_SECONDS = 5 * 60;

export type PendingActionType =
  | "create_active"
  | "join_active"
  | "watch_active"
  | "update_active"
  | "send_sms_code"
  | "verify_phone"
  | "bind_gsz"
  | "upsert_business_card";

export interface PendingAction {
  type: PendingActionType;
  params: Record<string, unknown>;
  summary: string;
  createdAt: number;
}

const CONFIRM_WORDS = [
  "确认",
  "确定",
  "好的",
  "好",
  "是",
  "是的",
  "行",
  "可以",
  "没问题",
  "ok",
  "OK",
  "yes",
  "对",
];

const CANCEL_WORDS = ["取消", "算了", "不要", "不了", "取消操作", "no", "不"];

export function isConfirmation(message: string): boolean {
  const trimmed = message.trim();
  return CONFIRM_WORDS.includes(trimmed);
}

export function isCancellation(message: string): boolean {
  const trimmed = message.trim();
  return CANCEL_WORDS.includes(trimmed);
}

export async function storePendingAction(
  kv: KVNamespace,
  openId: string,
  action: PendingAction,
): Promise<void> {
  await kv.put(`${PENDING_PREFIX}${openId}`, JSON.stringify(action), {
    expirationTtl: PENDING_TTL_SECONDS,
  });
}

export async function getPendingAction(
  kv: KVNamespace,
  openId: string,
): Promise<PendingAction | null> {
  const raw = await kv.get(`${PENDING_PREFIX}${openId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
  }
}

export async function clearPendingAction(
  kv: KVNamespace,
  openId: string,
): Promise<void> {
  await kv.delete(`${PENDING_PREFIX}${openId}`);
}
