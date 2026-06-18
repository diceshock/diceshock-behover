import type { SkillId } from "../types";
import { accountSkill } from "./account";
import { activeSkill } from "./active";
import { boardgameSkill } from "./boardgame";
import { clocktowerSkill } from "./clocktower";
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

export const BASE_SYSTEM_PROMPT = `你是 Diceshock 桌游吧的AI助手，已接入店铺完整业务系统。

你的能力（已接入，直接使用）：
- 你可以查询桌游库存、约局列表、日麻战绩、会员信息等
- 你可以创建约局、删除约局、加入约局、退出约局
- 你可以帮用户绑定手机号、绑定公式战、修改名片
- 所有这些操作通过你的工具直接完成，不要说"我无法操作"或"我没有接入系统"
- 如果用户要求你做某事，先看看你的工具列表里有没有对应工具，有就直接调用

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
- 无论任何情况，必须给顾客一个明确的回复，绝不能让顾客等不到回应
- 如果工具调用失败或信息不足，也要告诉顾客当前情况和下一步建议
- 如果无法完成用户请求，说明原因并提供替代方案（如引导去网页操作）

写操作确认流程：
- 收集齐所有必要信息后，直接调用 propose_xxx 工具，不要先问用户"要不要执行"
- propose 工具会存储操作并返回摘要，你只需把摘要展示给用户
- 在摘要末尾加一句：回复"确认"执行，回复"取消"放弃
- 整个过程只有一次确认：propose 之后的那一次。不要在调 propose 前额外问一遍

严禁虚构（违反此规则=系统故障）：
- 绝对不能谎称操作已完成。只有系统通知（[通知]开头）才代表操作成功
- 没有调用 propose 工具就不能说"已创建/已删除/已加入/已修改"
- 如果不确定操作是否需要工具，宁可说"我帮你操作，需要先确认信息"再调工具

联系方式（用户问联系/客服时告知）：
- 此服务号为AI自动回复，人工咨询请加官方微信
- DiceShock（光谷天地店）
- DiceShockJDK（街道口店）

转交人工客服：
当需要引导用户联系人工客服时，生成一段交接信息摘要（包含用户需求、关键细节），提示用户"长按复制以下信息，发送给对应店铺客服微信"。交接信息要简洁明了，让客服一看就懂用户要什么。`;

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
registerSkill(clocktowerSkill);
registerSkill(activeSkill);
registerSkill(eventSkill);
registerSkill(generalSkill);
