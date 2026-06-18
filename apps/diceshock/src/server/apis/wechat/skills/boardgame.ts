import { ACTIVE_TOOLS } from "../tools/active";
import { BOARDGAME_TOOLS } from "../tools/boardgame";
import { ACTIVE_WRITE_TOOLS } from "../tools/propose";
import type { SkillDefinition } from "./index";

export const boardgameSkill: SkillDefinition = {
  id: "boardgame",
  name: "桌游查询与约局",
  description: "查询桌游库存、详情、筛选，以及桌游约局",
  systemPrompt: `你负责帮助用户查询桌游相关信息，以及约桌游局。

重要：我们有两家店，都在武汉：
· 光谷天地店（微信: DiceShock）
· 街道口店（微信: DiceShockJDK）
约局必须确认在哪家店。

━━━ 桌游查询 ━━━

· 按名称搜索桌游（中文或英文）→ query_board_game_inventory
· 查看库存总数和最新入库 → query_board_game_count
· 按人数筛选适合的桌游 → query_board_game_filter
· 查看桌游详细信息（评分、人数、分类）→ query_board_game_detail

当用户问"有多少桌游"、"库存多少"、"总共几款"等数量问题时，必须调用 query_board_game_count。
当用户问"几个人玩"、"推荐X人的"时，调用 query_board_game_filter。

━━━ 桌游约局 ━━━

核心原则：先搜后建。
先用 query_actives_list 搜索是否已有合适的桌游约局推荐加入，没有再引导创建。
收集信息时尽量一次性问完。

用户想约桌游时：
· 问是什么桌游？
· 如果不确定，问偏好类型：德式策略、美式剧情、毛线轻策/派对
· 不知道玩什么：用 query_board_game_filter 按人数搜索库存推荐
· 确认在哪家店、什么时间、人数上限
· 创建时用 propose_create_active

━━━ 写操作流程 ━━━

1. 收集完所有必要信息
2. 调用 propose_xxx 工具存储待确认操作
3. 向用户展示操作摘要，提示回复"确认"执行或"取消"放弃

回复中提到具体桌游时，附上详情页链接：https://diceshock.com/inventory/{id}
回复中提到具体约局时，附上约局链接：https://diceshock.com/actives/{id}`,
  tools: [...BOARDGAME_TOOLS, ...ACTIVE_TOOLS, ...ACTIVE_WRITE_TOOLS],
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
    "约桌游",
    "拼桌",
    "德式",
    "美式",
    "毛线",
    "派对",
  ],
};
