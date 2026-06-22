import db, { accounts, drizzle, preferencePushLogTable } from "@lib/db";
import { getWechatAccessToken } from "./wechatApi";

const WECHAT_API_BASE = "https://diceshock.com/wx-proxy";

interface TemplateDataItem {
  value: string;
}

interface SendResult {
  success: boolean;
  errcode?: number;
  errmsg?: string;
}

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

async function getTemplateId(env: any, key: string): Promise<string | null> {
  const templateId = await env.KV.get(key);
  if (!templateId) {
    console.warn("[wechat:template] not configured:", key);
  }
  return templateId;
}

async function sendTemplateMessage(
  env: any,
  openId: string,
  templateKey: string,
  data: Record<string, TemplateDataItem>,
  url?: string,
): Promise<SendResult> {
  const templateId = await getTemplateId(env, templateKey);
  if (!templateId) return { success: false, errmsg: "template not configured" };

  const token = await getWechatAccessToken(env);
  const apiUrl = `${WECHAT_API_BASE}/cgi-bin/message/template/send?access_token=${token}`;

  const body: Record<string, unknown> = {
    touser: openId,
    template_id: templateId,
    data,
  };
  if (url) body.url = url;

  const res = await fetch(apiUrl, {
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
      openId: openId.slice(-8),
    });
    return { success: false, errcode: result.errcode, errmsg: result.errmsg };
  }

  console.log("[wechat:template] sent ok", {
    openId: openId.slice(-8),
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

// ─── Notification Builders ──────────────────────────────────────

export async function notifyOrderStart(
  env: any,
  openId: string,
  data: { tableName: string; startTime: string; seats: number },
): Promise<SendResult | null> {
  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.ORDER_START,
    {
      first: { value: "[通知] 计时已开始" },
      thing1: { value: data.tableName },
      time4: { value: data.startTime },
      time5: { value: "-" },
      thing6: { value: `${data.seats} 位` },
      thing8: { value: "骰子奇兵" },
      remark: { value: "结束后工作人员为您结算" },
    },
    "https://diceshock.com",
  );
}

export async function notifyTableTransfer(
  env: any,
  openId: string,
  data: { fromTable: string; toTable: string; transferTime: string },
): Promise<SendResult | null> {
  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.TABLE_TRANSFER,
    {
      first: { value: "[通知] 已换桌" },
      thing1: { value: "骰子奇兵" },
      time2: { value: data.transferTime },
      thing3: { value: data.fromTable },
      thing4: { value: data.toTable },
      time5: { value: data.transferTime },
      remark: { value: "计时不间断" },
    },
    "https://diceshock.com",
  );
}

export async function notifyMahjongStart(
  env: any,
  openId: string,
  data: { mode: string; format: string; tableName: string; startTime: string },
): Promise<SendResult | null> {
  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.MAHJONG_START,
    {
      first: { value: "[通知] 日麻对局已开始" },
      thing1: { value: data.tableName },
      time2: { value: data.startTime },
      thing3: { value: `${data.mode} · ${data.format}` },
      time5: { value: data.startTime },
      remark: { value: "结束后成绩自动记录" },
    },
    "https://diceshock.com/mahjong",
  );
}

export async function notifyGszSync(
  env: any,
  openId: string,
  data: { success: boolean; matchInfo: string; errorMsg?: string },
): Promise<SendResult | null> {
  const status = data.success ? "同步成功" : "同步失败";
  const remark = data.success
    ? "成绩已上传至公式站"
    : `原因: ${data.errorMsg || "未知错误"}`;

  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.MAHJONG_GSZ_SYNC,
    {
      first: { value: `[通知] 公式站成绩${status}` },
      thing1: { value: data.matchInfo },
      thing2: { value: status },
      remark: { value: remark },
    },
    "https://diceshock.com/mahjong",
  );
}

export async function notifyPhoneBound(
  env: any,
  openId: string,
  data: { phone: string; bindTime: string },
): Promise<SendResult | null> {
  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.PHONE_BOUND,
    {
      first: { value: "[通知] 手机号绑定成功" },
      phone_number8: { value: data.phone },
      time2: { value: data.bindTime },
      const3: { value: "微信公众号" },
      thing4: { value: "骰子奇兵" },
      remark: { value: "可用于登录及公式站成绩同步" },
    },
    "https://diceshock.com",
  );
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
  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.ORDER_SETTLED,
    {
      first: { value: "[通知] 订单已结算" },
      character_string1: { value: data.duration },
      thing2: { value: data.tableName },
      amount3: { value: data.price },
      time4: { value: data.settledTime },
      thing5: { value: data.payMethod || "骰子奇兵" },
      remark: { value: "感谢光临" },
    },
    "https://diceshock.com",
  );
}

export async function notifyMembershipChange(
  env: any,
  openId: string,
  data: { action: string; planName: string; detail: string },
): Promise<SendResult | null> {
  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.MEMBERSHIP_CHANGE,
    {
      first: { value: `[通知] 会员计划${data.action}` },
      character_string1: { value: "-" },
      thing2: { value: data.planName },
      character_string3: { value: data.detail },
      time4: { value: new Date().toISOString().slice(0, 16).replace("T", " ") },
      time5: { value: "-" },
      remark: { value: "如有疑问请联系工作人员" },
    },
    "https://diceshock.com",
  );
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
  const statusText = data.status === "expiring_5d" ? "即将到期" : "已过期";
  const remark =
    data.status === "expiring_5d" ? "请在到期前续费" : "续费后即可重新激活";

  return sendTemplateMessage(
    env,
    openId,
    TEMPLATE_KEYS.PASS_EXPIRING,
    {
      first: { value: `[通知] 通行卡${statusText}` },
      thing2: { value: data.planName },
      time3: { value: data.endDate },
      thing7: { value: "骰子奇兵" },
      const8: { value: statusText },
      remark: { value: remark },
    },
    "https://diceshock.com",
  );
}

// ─── Preference Notification Helpers ────────────────────────────

interface PreferenceNotificationData {
  reason: string;
  activeTitle: string;
  activeDate: string;
  activeUrl: string;
  manageUrl: string;
}

async function resolvePreferenceTemplateId(env: any): Promise<string | null> {
  const cached = await env.KV.get("wechat:template:preference_match:resolved");
  if (cached) return cached;

  const token = await getWechatAccessToken(env);
  const url = `${WECHAT_API_BASE}/cgi-bin/template/get_all_private_template?access_token=${token}`;
  const res = await fetch(url, { method: "GET" });
  const data = (await res.json()) as {
    template_list?: Array<{
      template_id: string;
      title: string;
      content: string;
      example: string;
    }>;
  };

  const templates = data.template_list ?? [];
  if (templates.length === 0) return null;

  const PRIORITY_KEYWORDS = [
    "活动通知",
    "活动推荐",
    "活动提醒",
    "预约提醒",
    "预约通知",
    "新活动",
    "报名通知",
    "服务通知",
    "消息通知",
  ];

  let bestMatch: {
    template_id: string;
    title: string;
    content: string;
  } | null = null;

  for (const keyword of PRIORITY_KEYWORDS) {
    const match = templates.find((t) => t.title.includes(keyword));
    if (match) {
      bestMatch = match;
      break;
    }
  }

  if (!bestMatch) {
    bestMatch =
      templates.find(
        (t) => t.title.includes("通知") || t.title.includes("提醒"),
      ) ?? null;
  }

  if (!bestMatch) {
    console.warn(
      "[wechat:template] no suitable template found for preference match, available:",
      templates.map((t) => t.title),
    );
    return null;
  }

  console.log(
    "[wechat:template] auto-resolved preference template:",
    bestMatch.title,
    bestMatch.template_id,
  );

  await env.KV.put(
    "wechat:template:preference_match:resolved",
    bestMatch.template_id,
    { expirationTtl: 7 * 24 * 3600 },
  );
  await env.KV.put(
    "wechat:template:preference_match:content",
    bestMatch.content,
    { expirationTtl: 7 * 24 * 3600 },
  );

  return bestMatch.template_id;
}

/** Extracts field names from WeChat template content: "{{field.DATA}}" → ["field"] */
function extractTemplateFields(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\.DATA\}\}/g) ?? [];
  return matches.map((m) => m.replace("{{", "").replace(".DATA}}", ""));
}

export async function sendPreferenceMatchNotification(
  env: any,
  openId: string,
  data: PreferenceNotificationData,
): Promise<SendResult> {
  const templateId = await resolvePreferenceTemplateId(env);
  if (!templateId) {
    return { success: false, errmsg: "no suitable template found" };
  }

  const templateContent =
    (await env.KV.get("wechat:template:preference_match:content")) ?? "";
  const fields = extractTemplateFields(templateContent);

  const templateData: Record<string, TemplateDataItem> = {
    first: { value: data.reason },
  };

  const dataFields = fields.filter((f) => f !== "first" && f !== "remark");
  const values = [data.activeTitle, data.activeDate];
  for (let i = 0; i < Math.min(dataFields.length, values.length); i++) {
    templateData[dataFields[i]] = { value: values[i] };
  }
  templateData.remark = { value: `管理偏好: ${data.manageUrl}` };

  const token = await getWechatAccessToken(env);
  const apiUrl = `${WECHAT_API_BASE}/cgi-bin/message/template/send?access_token=${token}`;

  const body: Record<string, unknown> = {
    touser: openId,
    template_id: templateId,
    data: templateData,
    url: data.activeUrl,
  };

  const res2 = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = (await res2.json()) as {
    errcode?: number;
    errmsg?: string;
    msgid?: number;
  };

  if (result.errcode && result.errcode !== 0) {
    console.error("[wechat:template:preference] send failed", {
      errcode: result.errcode,
      errmsg: result.errmsg,
    });
    return { success: false, errcode: result.errcode, errmsg: result.errmsg };
  }

  return { success: true };
}

/**
 * Check if user has reached daily push limit (MAX_DAILY_PUSHES = 2)
 */
export async function checkDailyPushLimit(
  env: { DB: D1Database },
  userId: string,
  date?: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const today = date ?? new Date().toISOString().slice(0, 10);
  const tdb = db(env.DB);
  const logs = await tdb
    .select()
    .from(preferencePushLogTable)
    .where(
      drizzle.and(
        drizzle.eq(preferencePushLogTable.user_id, userId),
        drizzle.eq(preferencePushLogTable.push_date, today),
      ),
    );

  const count = logs.length;
  const MAX = 2;
  return {
    allowed: count < MAX,
    remaining: Math.max(0, MAX - count),
  };
}

/**
 * Log a sent push notification for dedup and rate limiting
 */
export async function logPushNotification(
  env: { DB: D1Database },
  params: {
    userId: string;
    preferenceId: string | null;
    activeId: string | null;
    pushType: "preference_match" | "active_match";
    pushDate: string;
    messageSummary: string;
  },
): Promise<void> {
  const tdb = db(env.DB);
  await tdb.insert(preferencePushLogTable).values({
    user_id: params.userId,
    preference_id: params.preferenceId,
    active_id: params.activeId,
    push_type: params.pushType,
    push_date: params.pushDate,
    message_summary: params.messageSummary,
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
