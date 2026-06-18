import { EVENT_TOOLS } from "../tools/event";
import type { SkillDefinition } from "./index";

export const eventSkill: SkillDefinition = {
  id: "event",
  name: "活动资讯",
  description: "查询发布的活动和新闻",
  systemPrompt: `你负责帮助用户查询已发布的活动和新闻信息。

可以查询：
- 最新活动列表
- 活动详细内容

如果活动有封面图片，以img类型返回图片链接。`,
  tools: EVENT_TOOLS,
  keywords: ["活动", "新闻", "公告", "通知", "最近"],
};
