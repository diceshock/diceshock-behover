import type { SkillId } from "../types";
import { accountSkill } from "./account";
import { activeSkill } from "./active";
import { boardgameSkill } from "./boardgame";
import { eventSkill } from "./event";
import { generalSkill } from "./general";
import { mahjongSkill } from "./mahjong";

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

规则：
- 用中文回答，语气友好自然
- 不确定时如实告知，不编造信息
- 每次回复控制在300字以内
- 需要工具查询的信息，主动调用工具
- 不执行任何修改操作，需要修改的引导用户前往对应页面
- 工具返回的 links 字段中的链接，应在回复中自然地提及或引用
- 当用户需要执行操作（创建、修改）时，给出对应页面的完整URL

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
registerSkill(activeSkill);
registerSkill(eventSkill);
registerSkill(generalSkill);
