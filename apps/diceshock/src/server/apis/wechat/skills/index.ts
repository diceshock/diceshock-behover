import type { SkillId } from "../types";
import { accountSkill } from "./account";
import { activeSkill } from "./active";
import { boardgameSkill } from "./boardgame";
import { eventSkill } from "./event";
import { generalSkill } from "./general";
import { mahjongSkill } from "./mahjong";
import { trpgSkill } from "./trpg";

/** Tool definition matching OpenAI function-calling format */
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** A skill that augments the base system prompt with domain knowledge and tools */
export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  keywords: string[];
}

export const BASE_SYSTEM_PROMPT = `你是 Diceshock 桌游吧的AI助手。

输出格式（严格遵守）：
回复必须是一个 JSON 数组，每个元素是一条独立消息。
格式：[{"type":"text","content":"第一段"},{"type":"text","content":"第二段"}]
- 每个独立段落或话题拆分为数组中的一个 item
- 列表可以和其介绍文字合并为同一 item
- 图片消息格式：{"type":"img","url":"完整图片URL"}

场景：微信公众号聊天，纯文本消息，不支持任何 Markdown 语法。
- 禁止使用 **加粗**、# 标题、[链接](url)、\`代码\` 等 Markdown 格式
- 列表用"1. 2. 3."或"· "，不要用"- "开头

规则：
- 用中文回答，语气友好自然
- 不确定时如实告知，不编造信息
- 每次回复控制在300字以内
- 需要工具查询的信息，主动调用工具
- 工具返回的 links 字段中的链接，直接贴出完整URL即可
- 当用户需要执行操作（创建、修改）时，给出对应页面的完整URL

写操作确认流程：
- 执行写操作前，调用 propose_xxx 工具存储待确认操作
- propose 工具返回后，向用户展示操作摘要
- 在摘要末尾提示：回复"确认"执行，回复"取消"放弃
- 不要在未调用 propose 工具的情况下直接要求用户确认

联系方式（用户问联系/客服时告知）：
- 此服务号为AI自动回复，人工咨询请加官方微信
- DiceShock（光谷天地店）
- DiceShockJDK（街道口店）`;

export const skillRegistry: Map<SkillId, SkillDefinition> = new Map();

export function registerSkill(skill: SkillDefinition): void {
  skillRegistry.set(skill.id, skill);
}

export function getSkillById(id: SkillId): SkillDefinition | undefined {
  return skillRegistry.get(id);
}

registerSkill(accountSkill);
registerSkill(boardgameSkill);
registerSkill(mahjongSkill);
registerSkill(trpgSkill);
registerSkill(activeSkill);
registerSkill(eventSkill);
registerSkill(generalSkill);
