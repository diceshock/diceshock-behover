import db, { accounts, drizzle } from "@lib/db";
import { getWechatAccessToken } from "./wechatApi";

const WECHAT_API_BASE = "https://diceshock.com/wx-proxy";

// ─── Types ──────────────────────────────────────────────────────

interface TemplateDataItem {
  value: string;
  color?: string;
}

interface SendTemplateMessageParams {
  touser: string;
  template_id: string;
  url?: string;
  data: Record<string, TemplateDataItem>;
}

interface SendResult {
  success: boolean;
  errcode?: number;
  errmsg?: string;
}

// ─── Template KV Keys ───────────────────────────────────────────
// Set via: wrangler kv put --binding KV "wechat:template:<key>" "<template_id>"

const TEMPLATE_KEYS = {
  ORDER_START: "wechat:template:order_start",
  TABLE_TRANSFER: "wechat:template:table_transfer",
  MAHJONG_START: "wechat:template:mahjong_start",
  MAHJONG_GSZ_SYNC: "wechat:template:mahjong_gsz_sync",
  PHONE_BOUND: "wechat:template:phone_bound",
  ORDER_SETTLED: "wechat:template:order_settled",
  MEMBERSHIP_CHANGE: "wechat:template:membership_change",
  PASS_EXPIRING: "wechat:template:pass_expiring",
} as const;

// ─── Core ───────────────────────────────────────────────────────

async function sendTemplateMessage(
  env: any,
  params: SendTemplateMessageParams,
): Promise<SendResult> {
  const token = await getWechatAccessToken(env);
  const url = `${WECHAT_API_BASE}/cgi-bin/message/template/send?access_token=${token}`;

  const body: Record<string, unknown> = {
    touser: params.touser,
    template_id: params.template_id,
    data: params.data,
  };
  if (params.url) body.url = params.url;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = (await res.json()) as {
    errcode?: number;
    errmsg?: string;
    msgid?: number;
  };

  if (result.errcode && result.errcode !== 0) {
    console.error("[wechat:template] send failed", {
      errcode: result.errcode,
      errmsg: result.errmsg,
      openId: params.touser.slice(-8),
      templateId: params.template_id.slice(0, 12),
    });
    return { success: false, errcode: result.errcode, errmsg: result.errmsg };
  }

  console.log("[wechat:template] sent ok", {
    openId: params.touser.slice(-8),
    msgid: result.msgid,
  });
  return { success: true };
}

// ─── OpenID Resolution ──────────────────────────────────────────

export async function resolveUserOpenId(
  env: any,
  userId: string,
): Promise<string | null> {
  const tdb = db(env.DB);
  const rows = await tdb
    .select({
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
    })
    .from(accounts)
    .where(
      drizzle.and(
        drizzle.eq(accounts.userId, userId),
        drizzle.inArray(accounts.provider, ["wechat-mp", "wechat-mp-silent"]),
      ),
    );

  const mp = rows.find((r) => r.provider === "wechat-mp");
  if (mp) return mp.providerAccountId;
  const silent = rows.find((r) => r.provider === "wechat-mp-silent");
  return silent?.providerAccountId ?? null;
}

export async function resolveUsersOpenIds(
  env: any,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const tdb = db(env.DB);
  const rows = await tdb
    .select({
      userId: accounts.userId,
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
    })
    .from(accounts)
    .where(
      drizzle.and(
        drizzle.inArray(accounts.userId, userIds),
        drizzle.inArray(accounts.provider, ["wechat-mp", "wechat-mp-silent"]),
      ),
    );

  const result = new Map<string, string>();
  for (const row of rows) {
    const existing = result.get(row.userId);
    if (!existing || row.provider === "wechat-mp") {
      result.set(row.userId, row.providerAccountId);
    }
  }
  return result;
}

// ─── Helpers ────────────────────────────────────────────────────

async function getTemplateId(env: any, key: string): Promise<string | null> {
  const templateId = await env.KV.get(key);
  if (!templateId) {
    console.warn("[wechat:template] template ID not configured:", key);
  }
  return templateId;
}

// ─── Notification Builders ──────────────────────────────────────

export async function notifyOrderStart(
  env: any,
  openId: string,
  data: { tableName: string; startTime: string; seats: number },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.ORDER_START);
  if (!templateId) return null;

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com",
    data: {
      first: { value: "[通知] 计时已开始" },
      keyword1: { value: data.tableName },
      keyword2: { value: data.startTime },
      keyword3: { value: `${data.seats} 位` },
      remark: { value: "结束后工作人员会为您结算" },
    },
  });
}

export async function notifyTableTransfer(
  env: any,
  openId: string,
  data: { fromTable: string; toTable: string; transferTime: string },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.TABLE_TRANSFER);
  if (!templateId) return null;

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com",
    data: {
      first: { value: "[通知] 已换桌" },
      keyword1: { value: data.fromTable },
      keyword2: { value: data.toTable },
      keyword3: { value: data.transferTime },
      remark: { value: "计时不间断" },
    },
  });
}

export async function notifyMahjongStart(
  env: any,
  openId: string,
  data: { mode: string; format: string; tableName: string; startTime: string },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.MAHJONG_START);
  if (!templateId) return null;

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com/mahjong",
    data: {
      first: { value: "[通知] 日麻对局已开始" },
      keyword1: { value: `${data.mode} · ${data.format}` },
      keyword2: { value: data.tableName },
      keyword3: { value: data.startTime },
      remark: { value: "结束后成绩自动记录" },
    },
  });
}

export async function notifyGszSync(
  env: any,
  openId: string,
  data: { success: boolean; matchInfo: string; errorMsg?: string },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.MAHJONG_GSZ_SYNC);
  if (!templateId) return null;

  const statusText = data.success ? "同步成功" : "同步失败";
  const remark = data.success
    ? "成绩已上传至公式站"
    : `原因: ${data.errorMsg || "未知错误"}，可联系工作人员`;

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com/mahjong",
    data: {
      first: { value: `[通知] 公式站成绩${statusText}` },
      keyword1: { value: data.matchInfo },
      keyword2: { value: statusText },
      remark: { value: remark },
    },
  });
}

export async function notifyPhoneBound(
  env: any,
  openId: string,
  data: { phone: string; bindTime: string },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.PHONE_BOUND);
  if (!templateId) return null;

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com",
    data: {
      first: { value: "[通知] 手机号绑定成功" },
      keyword1: { value: data.phone },
      keyword2: { value: data.bindTime },
      remark: { value: "可用于登录及公式站成绩同步" },
    },
  });
}

export async function notifyOrderSettled(
  env: any,
  openId: string,
  data: {
    tableName: string;
    duration: string;
    price: string;
    settledTime: string;
    payMethod?: string;
  },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.ORDER_SETTLED);
  if (!templateId) return null;

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com",
    data: {
      first: { value: "[通知] 订单已结算" },
      keyword1: { value: data.tableName },
      keyword2: { value: data.duration },
      keyword3: { value: data.price },
      keyword4: { value: data.settledTime },
      remark: {
        value: data.payMethod ? `支付方式: ${data.payMethod}` : "感谢光临",
      },
    },
  });
}

export async function notifyMembershipChange(
  env: any,
  openId: string,
  data: { action: string; planName: string; detail: string },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.MEMBERSHIP_CHANGE);
  if (!templateId) return null;

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com",
    data: {
      first: { value: `[通知] 会员计划${data.action}` },
      keyword1: { value: data.planName },
      keyword2: { value: data.detail },
      remark: { value: "如有疑问请联系工作人员" },
    },
  });
}

export async function notifyPassExpiring(
  env: any,
  openId: string,
  data: {
    planName: string;
    endDate: string;
    status: "expiring_5d" | "expired";
  },
): Promise<SendResult | null> {
  const templateId = await getTemplateId(env, TEMPLATE_KEYS.PASS_EXPIRING);
  if (!templateId) return null;

  const title =
    data.status === "expiring_5d"
      ? "[通知] 通行卡即将到期"
      : "[通知] 通行卡已过期";

  const remark =
    data.status === "expiring_5d" ? "请在到期前续费" : "续费后即可重新激活";

  return sendTemplateMessage(env, {
    touser: openId,
    template_id: templateId,
    url: "https://diceshock.com",
    data: {
      first: { value: title },
      keyword1: { value: data.planName },
      keyword2: { value: data.endDate },
      remark: { value: remark },
    },
  });
}

// ─── Queue-based Dispatch ───────────────────────────────────────

export type NotificationMessage =
  | {
      type: "order_start";
      userId: string;
      data: { tableName: string; startTime: string; seats: number };
    }
  | {
      type: "table_transfer";
      userId: string;
      data: { fromTable: string; toTable: string; transferTime: string };
    }
  | {
      type: "mahjong_start";
      userIds: string[];
      data: {
        mode: string;
        format: string;
        tableName: string;
        startTime: string;
      };
    }
  | {
      type: "gsz_sync";
      userIds: string[];
      data: { success: boolean; matchInfo: string; errorMsg?: string };
    }
  | {
      type: "phone_bound";
      userId: string;
      data: { phone: string; bindTime: string };
    }
  | {
      type: "order_settled";
      userId: string;
      data: {
        tableName: string;
        duration: string;
        price: string;
        settledTime: string;
        payMethod?: string;
      };
    }
  | {
      type: "membership_change";
      userId: string;
      data: { action: string; planName: string; detail: string };
    }
  | {
      type: "pass_expiring";
      userId: string;
      openId?: string;
      data: {
        planName: string;
        endDate: string;
        status: "expiring_5d" | "expired";
      };
    };

export async function queueNotification(
  env: any,
  message: NotificationMessage,
): Promise<void> {
  await env.NOTIFICATION_QUEUE.send(message);
}
