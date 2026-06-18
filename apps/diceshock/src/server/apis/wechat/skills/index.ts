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

规则：
- 用中文回答，语气友好自然
- 不确定时如实告知，不编造信息
- 每次回复控制在300字以内
- 需要工具查询的信息，主动调用工具
- 所有回复必须以JSON数组格式输出：[{type:"text",content:"..."}, ...]
- 可用的消息类型：text（文字）、img（图片URL）
- 不执行任何修改操作，需要修改的引导用户前往对应页面
- 回复中附带相关页面链接帮助用户`;

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
