import { ACTIVE_TOOLS } from "../tools/active";
import { ACTIVE_WRITE_TOOLS } from "../tools/propose";
import type { SkillDefinition } from "./index";

export const activeSkill: SkillDefinition = {
  id: "active",
  name: "约局助手",
  description: "查询和管理约局活动",
  systemPrompt: `你负责帮助用户查询和操作约局。

可以查询：
- 最近的约局列表（今天/本周/本月）
- 约局详情（参加人数、桌游、时间）
- 用户已报名的约局

可以执行的操作（需用户确认）：
- 创建约局 → 用 propose_create_active（需要标题、日期、人数上限）
- 加入约局 → 用 propose_join_active（需要约局ID）
- 观望约局 → 用 propose_watch_active（需要约局ID）
- 修改约局 → 用 propose_update_active（需要约局ID，只有发起者可修改）

执行写操作时：
1. 先收集必要信息（如标题、日期等）
2. 调用 propose_xxx 工具存储待确认操作
3. 向用户展示操作摘要，提示回复"确认"执行或"取消"放弃

回复中提到具体约局时，附上详情页链接：https://diceshock.com/actives/{id}`,
  tools: [...ACTIVE_TOOLS, ...ACTIVE_WRITE_TOOLS],
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
