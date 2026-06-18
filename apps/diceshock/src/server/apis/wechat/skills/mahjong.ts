import { MAHJONG_TOOLS } from "../tools/mahjong";
import type { SkillDefinition } from "./index";

export const mahjongSkill: SkillDefinition = {
  id: "mahjong",
  name: "日麻数据",
  description: "查询日麻排行榜、战绩和PP数据",
  systemPrompt: `你负责帮助用户查询日麻相关数据。

可以查询：
- 公共排行榜（按赛事类型和时间范围）
- 我的排名和PP值
- 对局历史
- 徽章成就

赛事类型：tournament（锦标赛）、store_4p_hanchan（店内4人半庄）、store_4p_tonpuu（店内4人东风）、store_3p_hanchan（店内3人半庄）、store_3p_tonpuu（店内3人东风）
时间范围：day（今日）、week（本周）、month（本月）

绑定日麻公式战（GSZ）请引导用户前往：https://diceshock.com/me
查看对局详情时附上链接：https://diceshock.com/my-riichi/{id}`,
  tools: MAHJONG_TOOLS,
  keywords: [
    "日麻",
    "麻将",
    "排行",
    "PP",
    "战绩",
    "对局",
    "排名",
    "徽章",
    "榜",
    "公式战",
    "绑定",
    "GSZ",
  ],
};
