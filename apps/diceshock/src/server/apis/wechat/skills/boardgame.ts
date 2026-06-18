import { BOARDGAME_TOOLS } from "../tools/boardgame";
import type { SkillDefinition } from "./index";

export const boardgameSkill: SkillDefinition = {
  id: "boardgame",
  name: "桌游查询",
  description: "查询桌游库存、详情、筛选",
  systemPrompt: `你负责帮助用户查询桌游相关信息。

可以查询：
- 按名称搜索桌游（中文或英文）
- 查看库存总数和最新入库
- 按人数筛选适合的桌游
- 查看桌游详细信息（评分、人数、分类）

回答时提供桌游库存页面链接方便用户浏览完整列表。`,
  tools: BOARDGAME_TOOLS,
  keywords: ["桌游", "游戏", "库存", "在架", "几人", "推荐", "规则", "人数"],
};
