import z from "zod/v4";
import {
  notifyGszSync,
  notifyMahjongStart,
  notifyMembershipChange,
  notifyOrderSettled,
  notifyOrderStart,
  notifyPassExpiring,
  notifyPhoneBound,
  notifyTableTransfer,
  resolveUserOpenId,
} from "@/server/apis/wechat/templateMessage";
import { getWechatAccessToken } from "@/server/apis/wechat/wechatApi";
import { staffProcedure } from "./baseTRPC";

const WECHAT_API_BASE = "https://diceshock.com/wx-proxy";

const TEMPLATE_KV_PREFIX = "wechat:template:";

const SLOT_KEYS = [
  "order_start",
  "table_transfer",
  "mahjong_start",
  "mahjong_gsz_sync",
  "phone_bound",
  "order_settled",
  "membership_change",
  "pass_expiring",
] as const;

type SlotKey = (typeof SLOT_KEYS)[number];

const SLOT_LABELS: Record<SlotKey, string> = {
  order_start: "开始记时",
  table_transfer: "换桌",
  mahjong_start: "开始日麻",
  mahjong_gsz_sync: "成绩同步",
  phone_bound: "绑定手机号",
  order_settled: "结束订单",
  membership_change: "会员计划变更",
  pass_expiring: "通行卡过期",
};

const addFromLibrary = staffProcedure
  .input((v: unknown) =>
    z
      .object({
        templateIdShort: z.string().min(1),
        keywordNameList: z.array(z.string()).optional(),
        slot: z.enum(SLOT_KEYS),
      })
      .parse(v),
  )
  .mutation(async ({ ctx, input }) => {
    const token = await getWechatAccessToken(ctx.env);
    const url = `${WECHAT_API_BASE}/cgi-bin/template/api_add_template?access_token=${token}`;

    const body: Record<string, unknown> = {
      template_id_short: input.templateIdShort,
    };
    if (input.keywordNameList?.length) {
      body.keyword_name_list = input.keywordNameList;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      errcode?: number;
      errmsg?: string;
      template_id?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return { success: false, error: `${data.errcode}: ${data.errmsg}` };
    }

    const templateId = data.template_id!;
    await ctx.env.KV.put(`${TEMPLATE_KV_PREFIX}${input.slot}`, templateId);

    return {
      success: true,
      templateId,
      slot: input.slot,
      label: SLOT_LABELS[input.slot],
    };
  });

const listTemplates = staffProcedure.query(async ({ ctx }) => {
  const token = await getWechatAccessToken(ctx.env);
  const url = `${WECHAT_API_BASE}/cgi-bin/template/get_all_private_template?access_token=${token}`;

  const res = await fetch(url, { method: "GET" });
  const data = (await res.json()) as {
    errcode?: number;
    errmsg?: string;
    template_list?: Array<{
      template_id: string;
      title: string;
      primary_industry: string;
      deputy_industry: string;
      content: string;
      example: string;
    }>;
  };

  if (data.errcode && data.errcode !== 0) {
    return {
      success: false,
      error: `${data.errcode}: ${data.errmsg}`,
      templates: [],
    };
  }

  return { success: true, templates: data.template_list ?? [] };
});

const listSlots = staffProcedure.query(async ({ ctx }) => {
  const slots: Array<{
    key: SlotKey;
    label: string;
    templateId: string | null;
  }> = [];

  for (const key of SLOT_KEYS) {
    const templateId = await ctx.env.KV.get(`${TEMPLATE_KV_PREFIX}${key}`);
    slots.push({ key, label: SLOT_LABELS[key], templateId });
  }

  return slots;
});

const assignSlot = staffProcedure
  .input((v: unknown) =>
    z
      .object({
        slot: z.enum(SLOT_KEYS),
        templateId: z.string().min(1),
      })
      .parse(v),
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.env.KV.put(
      `${TEMPLATE_KV_PREFIX}${input.slot}`,
      input.templateId,
    );
    return { success: true, slot: input.slot, templateId: input.templateId };
  });

const removeTemplate = staffProcedure
  .input((v: unknown) => z.object({ templateId: z.string().min(1) }).parse(v))
  .mutation(async ({ ctx, input }) => {
    const token = await getWechatAccessToken(ctx.env);
    const url = `${WECHAT_API_BASE}/cgi-bin/template/del_private_template?access_token=${token}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: input.templateId }),
    });
    const data = (await res.json()) as { errcode?: number; errmsg?: string };

    if (data.errcode && data.errcode !== 0) {
      return { success: false, error: `${data.errcode}: ${data.errmsg}` };
    }

    for (const key of SLOT_KEYS) {
      const stored = await ctx.env.KV.get(`${TEMPLATE_KV_PREFIX}${key}`);
      if (stored === input.templateId) {
        await ctx.env.KV.delete(`${TEMPLATE_KV_PREFIX}${key}`);
      }
    }

    return { success: true };
  });

const NOTIFICATION_SLOTS = [
  "order_start",
  "table_transfer",
  "mahjong_start",
  "mahjong_gsz_sync",
  "phone_bound",
  "order_settled",
  "membership_change",
  "pass_expiring",
] as const;

type NotificationSlot = (typeof NOTIFICATION_SLOTS)[number];

const sendTest = staffProcedure
  .input((v: unknown) =>
    z
      .object({
        userId: z.string().min(1),
        slot: z.enum(NOTIFICATION_SLOTS),
      })
      .parse(v),
  )
  .mutation(async ({ ctx, input }) => {
    const openId = await resolveUserOpenId(ctx.env, input.userId);
    if (!openId) {
      return { success: false, error: "用户未绑定微信" };
    }

    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    let result: { success: boolean; errmsg?: string } | null = null;

    switch (input.slot as NotificationSlot) {
      case "order_start":
        result = await notifyOrderStart(ctx.env, openId, {
          tableName: "A1桌",
          startTime: now,
          seats: 4,
        });
        break;
      case "table_transfer":
        result = await notifyTableTransfer(ctx.env, openId, {
          fromTable: "A1桌",
          toTable: "B2桌",
          transferTime: now,
        });
        break;
      case "mahjong_start":
        result = await notifyMahjongStart(ctx.env, openId, {
          mode: "4p",
          format: "半庄",
          tableName: "雀桌1",
          startTime: now,
        });
        break;
      case "mahjong_gsz_sync":
        result = await notifyGszSync(ctx.env, openId, {
          success: true,
          matchInfo: "测试对局 #0",
        });
        break;
      case "phone_bound":
        result = await notifyPhoneBound(ctx.env, openId, {
          phone: "138****0000",
          bindTime: now,
        });
        break;
      case "order_settled":
        result = await notifyOrderSettled(ctx.env, openId, {
          tableName: "A1桌",
          duration: "2h30m",
          price: "¥45.00",
          settledTime: now,
          payMethod: "微信支付",
        });
        break;
      case "membership_change":
        result = await notifyMembershipChange(ctx.env, openId, {
          action: "开通",
          planName: "桌面通行证",
          detail: "30天",
        });
        break;
      case "pass_expiring":
        result = await notifyPassExpiring(ctx.env, openId, {
          planName: "桌面通行证",
          endDate: "2025-01-01",
          status: "expiring_5d",
        });
        break;
    }

    if (!result) return { success: false, error: "模板未配置" };
    if (!result.success)
      return { success: false, error: result.errmsg || "发送失败" };
    return { success: true };
  });

export const wechatTemplateAdmin = {
  addFromLibrary,
  listTemplates,
  listSlots,
  assignSlot,
  removeTemplate,
  sendTest,
};
