import { BOARDGAME_TOOLS } from "../tools/boardgame";
import type { SkillDefinition } from "./index";

export const boardgameSkill: SkillDefinition = {
  id: "boardgame",
  name: "桌游查询",
  description: "查询桌游库存、详情、筛选",
  systemPrompt: `你负责帮助用户查询桌游相关信息。

可以查询：
- 按名称搜索桌游（中文或英文）→ 用 query_board_game_inventory
- 查看库存总数和最新入库 → 用 query_board_game_count
- 按人数筛选适合的桌游 → 用 query_board_game_filter
- 查看桌游详细信息（评分、人数、分类）→ 用 query_board_game_detail

当用户问"有多少桌游"、"库存多少"、"总共几款"等数量问题时，必须调用 query_board_game_count。
当用户问"几个人玩"、"推荐X人的"时，调用 query_board_game_filter。

回复中提到具体桌游时，附上该桌游详情页链接：https://diceshock.com/inventory/{id}`,
  tools: BOARDGAME_TOOLS,
  keywords: [
    "桌游",
    "游戏",
    "库存",
    "在架",
    "几人",
    "推荐",
    "规则",
    "人数",
    "多少",
    "数量",
    "几款",
  ],
};
