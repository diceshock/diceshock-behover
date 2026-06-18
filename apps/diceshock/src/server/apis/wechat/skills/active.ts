import { ACTIVE_TOOLS } from "../tools/active";
import type { SkillDefinition } from "./index";

export const activeSkill: SkillDefinition = {
  id: "active",
  name: "约局助手",
  description: "查询和管理约局活动",
  systemPrompt: `你负责帮助用户查询约局信息。

可以查询：
- 最近的约局列表（今天/本周/本月）
- 约局详情（参加人数、桌游、时间）
- 用户已报名的约局

创建约局和加入约局需要在网页完成。当用户想约局/创建活动时，告知：
"创建约局请前往：https://diceshock.com/actives/new"`,
  tools: ACTIVE_TOOLS,
  keywords: [
    "约局",
    "组局",
    "报名",
    "参加",
    "拼桌",
    "一起玩",
    "创建约局",
    "发起",
  ],
};
