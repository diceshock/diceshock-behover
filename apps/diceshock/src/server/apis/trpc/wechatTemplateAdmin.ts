import z from "zod/v4";
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

export const wechatTemplateAdmin = {
  addFromLibrary,
  listTemplates,
  listSlots,
  assignSlot,
  removeTemplate,
};
