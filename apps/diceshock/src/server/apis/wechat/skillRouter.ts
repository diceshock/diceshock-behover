import { ACCOUNT_INDEX, ACCOUNT_MUTATE } from "./skills/account";
import {
  ACTIVE_CREATE,
  ACTIVE_INDEX,
  ACTIVE_JOIN,
  ACTIVE_LIST,
  ACTIVE_UPDATE,
} from "./skills/active";
import {
  BOARDGAME_DETAIL,
  BOARDGAME_INDEX,
  BOARDGAME_RECOMMEND,
  BOARDGAME_SEARCH,
} from "./skills/boardgame";
import { CLOCKTOWER_SKILL_CONTENT } from "./skills/clocktower";
import { EVENT_SKILL_CONTENT } from "./skills/event";
import { GENERAL_SKILL_CONTENT } from "./skills/general";
import { MAHJONG_INDEX, MAHJONG_QUERY } from "./skills/mahjong";
import { TRPG_SKILL_CONTENT } from "./skills/trpg";

interface SkillRoute {
  keywords: string[];
  content: string;
  subRoutes?: { keywords: string[]; content: string }[];
}

const ROUTES: SkillRoute[] = [
  {
    keywords: [
      "桌游",
      "游戏",
      "库存",
      "搜索",
      "推荐",
      "评分",
      "人数",
      "几人",
      "好玩",
    ],
    content: BOARDGAME_INDEX,
    subRoutes: [
      {
        keywords: ["搜", "找", "查", "有没有", "叫什么"],
        content: BOARDGAME_SEARCH,
      },
      {
        keywords: ["推荐", "适合", "人玩", "类型", "好玩", "什么桌游"],
        content: BOARDGAME_RECOMMEND,
      },
      { keywords: ["详情", "介绍", "详细"], content: BOARDGAME_DETAIL },
    ],
  },
  {
    keywords: ["约局", "约", "开局", "组局", "加入", "参加", "退出", "取消"],
    content: ACTIVE_INDEX,
    subRoutes: [
      {
        keywords: ["查", "看", "有什么", "最近", "列表"],
        content: ACTIVE_LIST,
      },
      {
        keywords: [
          "创建",
          "发起",
          "新建",
          "开",
          "组",
          "约一个",
          "帮我约",
          "约个",
        ],
        content: ACTIVE_CREATE,
      },
      {
        keywords: [
          "加入",
          "参加",
          "报名",
          "观望",
          "退出",
          "取消",
          "删除",
          "删了",
          "删掉",
          "不要了",
        ],
        content: ACTIVE_JOIN,
      },
      { keywords: ["改", "修改", "更新", "换"], content: ACTIVE_UPDATE },
    ],
  },
  {
    keywords: [
      "日麻",
      "麻将",
      "战绩",
      "PP",
      "段位",
      "排行",
      "公式站",
      "GSZ",
      "绑定公式",
    ],
    content: MAHJONG_INDEX,
    subRoutes: [
      {
        keywords: ["查", "看", "排行", "战绩", "PP", "段位"],
        content: MAHJONG_QUERY,
      },
    ],
  },
  {
    keywords: [
      "会员",
      "手机",
      "绑定",
      "名片",
      "余额",
      "通行证",
      "储值",
      "验证码",
    ],
    content: ACCOUNT_INDEX,
    subRoutes: [
      {
        keywords: ["绑", "手机", "验证", "名片", "修改"],
        content: ACCOUNT_MUTATE,
      },
    ],
  },
  {
    keywords: ["赛事", "比赛", "公告", "通知", "活动公告"],
    content: EVENT_SKILL_CONTENT,
  },
  {
    keywords: [
      "地址",
      "在哪",
      "营业",
      "价格",
      "多少钱",
      "怎么去",
      "微信",
      "联系",
      "电话",
      "几点",
    ],
    content: GENERAL_SKILL_CONTENT,
  },
  {
    keywords: [
      "跑团",
      "TRPG",
      "trpg",
      "DM",
      "GM",
      "角色扮演",
      "DND",
      "COC",
      "龙蛋",
    ],
    content: TRPG_SKILL_CONTENT,
  },
  {
    keywords: ["血染", "钟楼", "说书人", "clocktower"],
    content: CLOCKTOWER_SKILL_CONTENT,
  },
];

export function matchSkills(text: string): string {
  const matched: string[] = [];

  for (const route of ROUTES) {
    const hit = route.keywords.some((kw) => text.includes(kw));
    if (!hit) continue;

    if (route.subRoutes) {
      let subHit = false;
      for (const sub of route.subRoutes) {
        if (sub.keywords.some((kw) => text.includes(kw))) {
          matched.push(sub.content);
          subHit = true;
          break;
        }
      }
      if (!subHit) matched.push(route.content);
    } else {
      matched.push(route.content);
    }

    if (matched.length >= 2) break;
  }

  return matched.join("\n\n");
}
