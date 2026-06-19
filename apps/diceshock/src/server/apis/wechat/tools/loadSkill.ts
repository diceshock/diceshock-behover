import { ACCOUNT_SKILL_CONTENT } from "../skills/account";
import { ACTIVE_SKILL_CONTENT } from "../skills/active";
import { BOARDGAME_SKILL_CONTENT } from "../skills/boardgame";
import { CLOCKTOWER_SKILL_CONTENT } from "../skills/clocktower";
import { EVENT_SKILL_CONTENT } from "../skills/event";
import { GENERAL_SKILL_CONTENT } from "../skills/general";
import { MAHJONG_SKILL_CONTENT } from "../skills/mahjong";
import { TRPG_SKILL_CONTENT } from "../skills/trpg";
import type { ToolContext } from "./totp";

// ─── Skill Directory ──────────────────────────────────────────────────

export const SKILL_DIRECTORY = [
  {
    id: "boardgame",
    keywords: ["桌游", "游戏", "库存", "搜索"],
    description: "桌游库存查询、推荐、详情",
  },
  {
    id: "active",
    keywords: ["约局", "活动", "参加", "创建"],
    description: "约局创建、参加、查看",
  },
  {
    id: "mahjong",
    keywords: ["日麻", "战绩", "PP", "段位", "排行"],
    description: "日麻数据、PP排行、战绩查询",
  },
  {
    id: "account",
    keywords: ["会员", "手机", "绑定", "名片"],
    description: "会员状态、手机绑定、名片管理",
  },
  {
    id: "event",
    keywords: ["赛事", "比赛", "活动公告"],
    description: "赛事活动公告查询",
  },
  {
    id: "general",
    keywords: ["营业", "地址", "价格", "服务"],
    description: "店铺信息、营业时间、服务价格",
  },
  {
    id: "trpg",
    keywords: ["TRPG", "跑团", "DM", "角色扮演"],
    description: "TRPG跑团服务",
  },
  {
    id: "clocktower",
    keywords: ["血染", "钟楼", "clocktower"],
    description: "血染钟楼服务",
  },
] as const;

// ─── Content Map ─────────────────────────────────────────────────────

const SKILL_CONTENT_MAP: Record<string, string> = {
  boardgame: BOARDGAME_SKILL_CONTENT,
  active: ACTIVE_SKILL_CONTENT,
  mahjong: MAHJONG_SKILL_CONTENT,
  account: ACCOUNT_SKILL_CONTENT,
  event: EVENT_SKILL_CONTENT,
  general: GENERAL_SKILL_CONTENT,
  trpg: TRPG_SKILL_CONTENT,
  clocktower: CLOCKTOWER_SKILL_CONTENT,
};

// ─── Executor ────────────────────────────────────────────────────────

export async function executeLoadSkillTool(
  args: { skill: string },
  _context: ToolContext,
): Promise<string> {
  const content = SKILL_CONTENT_MAP[args.skill];
  if (!content) {
    const validIds = SKILL_DIRECTORY.map((s) => s.id).join(", ");
    return `无效的技能ID: "${args.skill}"。有效选项: ${validIds}`;
  }
  return content;
}

// ─── Tool Definition ─────────────────────────────────────────────────

export const LOAD_SKILL_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "load_skill",
    description:
      "加载指定技能的完整业务知识和工具使用指南。系统提示词中有技能目录。",
    parameters: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          enum: SKILL_DIRECTORY.map((s) => s.id),
          description: "技能ID",
        },
      },
      required: ["skill"],
    },
  },
};
