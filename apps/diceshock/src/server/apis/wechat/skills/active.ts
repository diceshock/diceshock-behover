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

以下操作请引导用户前往对应页面完成：
- 创建约局 → https://diceshock.com/actives/new
- 加入/观望约局 → 提供具体约局详情页链接
- 修改约局 → 提供具体约局详情页链接

回复中提到具体约局时，附上该约局详情页链接：https://diceshock.com/actives/{id}`,
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
