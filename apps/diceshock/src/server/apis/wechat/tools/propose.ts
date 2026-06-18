import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import type { PendingAction, PendingActionType } from "../pendingAction";
import { storePendingAction } from "../pendingAction";
import type { ToolDefinition } from "../skills";

export const ACTIVE_WRITE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "propose_create_active",
      description:
        "提议创建一个新约局。会存储待确认操作，用户确认后执行。必须提供标题、日期、人数上限。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "约局标题" },
          date: {
            type: "string",
            description: "日期，格式 YYYY-MM-DD",
          },
          time: { type: "string", description: "时间，格式 HH:mm（可选）" },
          max_players: { type: "number", description: "人数上限（1-100）" },
          board_game_id: {
            type: "string",
            description: "关联桌游ID（可选）",
          },
        },
        required: ["title", "date", "max_players"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_join_active",
      description: "提议加入一个约局。需要约局ID。",
      parameters: {
        type: "object",
        properties: {
          active_id: { type: "string", description: "约局ID" },
          active_title: {
            type: "string",
            description: "约局标题（用于确认提示）",
          },
        },
        required: ["active_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_watch_active",
      description: "提议观望一个约局（不占名额，关注动态）。需要约局ID。",
      parameters: {
        type: "object",
        properties: {
          active_id: { type: "string", description: "约局ID" },
          active_title: {
            type: "string",
            description: "约局标题（用于确认提示）",
          },
        },
        required: ["active_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_update_active",
      description: "提议修改已有约局信息（只有发起者可修改）。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "约局ID" },
          title: { type: "string", description: "新标题（可选）" },
          date: { type: "string", description: "新日期（可选）" },
          time: { type: "string", description: "新时间（可选）" },
          max_players: { type: "number", description: "新人数上限（可选）" },
        },
        required: ["id"],
      },
    },
  },
];

export const PHONE_WRITE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "propose_send_sms_code",
      description: "提议向手机号发送验证码以绑定手机。用户确认后发送短信。",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "11位手机号码" },
        },
        required: ["phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_verify_phone",
      description: "提议用验证码完成手机号绑定。用户提供验证码后调用。",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "之前发送验证码的手机号" },
          code: { type: "string", description: "用户提供的6位验证码" },
        },
        required: ["phone", "code"],
      },
    },
  },
];

export const GSZ_WRITE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "propose_bind_gsz",
      description:
        "提议绑定日麻公式战（GSZ）账号。需要用户已绑定手机号，或提供手机号。可指定公式战昵称。",
      parameters: {
        type: "object",
        properties: {
          gsz_name: {
            type: "string",
            description: "公式战昵称（若未在GSZ注册过，将用此昵称注册）",
          },
          phone: {
            type: "string",
            description: "手机号（若用户已绑定手机可不填）",
          },
        },
      },
    },
  },
];

export const BUSINESS_CARD_WRITE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "propose_upsert_business_card",
      description:
        "提议创建或更新用户名片。可设置微信号、QQ、自定义内容、是否公开手机号。",
      parameters: {
        type: "object",
        properties: {
          wechat: { type: "string", description: "微信号" },
          qq: { type: "string", description: "QQ号" },
          custom_content: {
            type: "string",
            description: "自定义名片内容",
          },
          share_phone: {
            type: "boolean",
            description: "是否在名片中公开手机号",
          },
        },
      },
    },
  },
];

const SUMMARIES: Record<
  PendingActionType,
  (params: Record<string, unknown>) => string
> = {
  create_active: (p) =>
    `创建约局\n标题: ${p.title}\n日期: ${p.date}${p.time ? ` ${p.time}` : ""}\n人数上限: ${p.max_players}`,
  join_active: (p) => `加入约局: ${p.active_title || p.active_id}`,
  watch_active: (p) => `观望约局: ${p.active_title || p.active_id}`,
  update_active: (p) => {
    const parts = ["修改约局"];
    if (p.title) parts.push(`标题→${p.title}`);
    if (p.date) parts.push(`日期→${p.date}`);
    if (p.time) parts.push(`时间→${p.time}`);
    if (p.max_players) parts.push(`人数→${p.max_players}`);
    return parts.join("\n");
  },
  send_sms_code: (p) => `发送验证码到: ${p.phone}`,
  verify_phone: (p) =>
    `验证并绑定手机号: ${(p.phone as string)?.slice(0, 3)}****${(p.phone as string)?.slice(-4)}`,
  bind_gsz: (p) => `绑定公式战${p.gsz_name ? `（昵称: ${p.gsz_name}）` : ""}`,
  upsert_business_card: (p) => {
    const parts = ["更新名片"];
    if (p.wechat) parts.push(`微信: ${p.wechat}`);
    if (p.qq) parts.push(`QQ: ${p.qq}`);
    if (p.custom_content) parts.push(`内容: ${p.custom_content}`);
    if (p.share_phone !== undefined)
      parts.push(`公开手机: ${p.share_phone ? "是" : "否"}`);
    return parts.join("\n");
  },
};

function getActionType(toolName: string): PendingActionType | null {
  const map: Record<string, PendingActionType> = {
    propose_create_active: "create_active",
    propose_join_active: "join_active",
    propose_watch_active: "watch_active",
    propose_update_active: "update_active",
    propose_send_sms_code: "send_sms_code",
    propose_verify_phone: "verify_phone",
    propose_bind_gsz: "bind_gsz",
    propose_upsert_business_card: "upsert_business_card",
  };
  return map[toolName] || null;
}

export function isProposeToolName(toolName: string): boolean {
  return toolName.startsWith("propose_");
}

export async function executeProposeTool(
  c: Context<HonoCtxEnv>,
  toolName: string,
  args: Record<string, unknown>,
  openId: string,
): Promise<string> {
  const actionType = getActionType(toolName);
  if (!actionType) {
    return JSON.stringify({ error: "未知操作" });
  }

  const summaryFn = SUMMARIES[actionType];
  const summary = summaryFn(args);

  const action: PendingAction = {
    type: actionType,
    params: args,
    summary,
    createdAt: Date.now(),
  };

  const kv = (c.env as any).KV as KVNamespace;
  await storePendingAction(kv, openId, action);

  return JSON.stringify({
    pending: true,
    summary,
    instruction:
      "请向用户展示操作摘要，并提示用户回复【确认】执行或【取消】放弃",
  });
}
