import db, { accounts, drizzle } from "@lib/db";

const { and, eq } = drizzle;

import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { SITE_LINKS } from "../linkRegistry";
import type { ToolDefinition } from "../skills";

// ─── Resolve userId ────────────────────────────────────────────

async function resolveUserId(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string | null> {
  const d = db(c.env.DB);

  const account = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "wechat-mp"),
        eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(1);

  if (account.length > 0) return account[0].userId;

  const accountSilent = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "wechat-mp-silent"),
        eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(1);

  if (accountSilent.length > 0) return accountSilent[0].userId;
  return null;
}

// ─── Base links ────────────────────────────────────────────────

function baseLinks() {
  return [SITE_LINKS.riichi(), SITE_LINKS.myRiichi()];
}

function withMatchLinks(
  data: Array<{ id: string }>,
): Array<{ id: string; link: string }> {
  return data.map((item) => ({
    ...item,
    link: SITE_LINKS.matchDetail(item.id),
  }));
}

// ─── Tool definitions ──────────────────────────────────────────

export const MAHJONG_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "query_leaderboard",
      description:
        "查询日麻公共排行榜，按赛事类型和时间范围筛选。category: tournament|store_4p_hanchan|store_4p_tonpuu|store_3p_hanchan|store_3p_tonpuu, period: day|week|month",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "赛事类型" },
          period: { type: "string", description: "时间范围：day/week/month" },
        },
        required: ["category", "period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_my_rankings",
      description: "查询当前用户在所有赛事类型和时间范围内的排名和PP",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_my_match_history",
      description: "查询当前用户的日麻对局历史记录",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "返回条数，默认20，最大50",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_my_pp_stats",
      description: "查询当前用户的PP统计（各赛事类型的累计PP、对局数、场均PP）",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_my_badges",
      description: "查询当前用户的徽章成就",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

// ─── Dispatch ──────────────────────────────────────────────────

export async function executeMahjongTool(
  c: Context<HonoCtxEnv>,
  toolName: string,
  args: Record<string, unknown>,
  openId: string,
): Promise<string> {
  switch (toolName) {
    case "query_leaderboard":
      return await queryLeaderboard(
        c,
        args.category as string,
        args.period as string,
      );
    case "query_my_rankings":
      return await queryMyRankings(c, openId);
    case "query_my_match_history":
      return await queryMyMatchHistory(
        c,
        openId,
        args.limit as number | undefined,
      );
    case "query_my_pp_stats":
      return await queryMyPPStats(c, openId);
    case "query_my_badges":
      return await queryMyBadges(c, openId);
    default:
      return JSON.stringify({ error: `未知工具: ${toolName}` });
  }
}

// ─── Tool implementations ──────────────────────────────────────

// ── query_leaderboard ──

async function queryLeaderboard(
  c: Context<HonoCtxEnv>,
  category: string,
  period: string,
): Promise<string> {
  console.log("[tools:mahjong:leaderboard]", { category, period });
  const d = db(c.env.DB);

  const snapshot = await d.query.leaderboardSnapshotsTable.findFirst({
    where: (s, { and, eq }) =>
      and(eq(s.category, category as never), eq(s.period, period as never)),
    orderBy: (s, { desc }) => desc(s.computed_at),
  });

  if (!snapshot?.data) {
    return JSON.stringify({
      entries: [],
      computed_at: null,
      message: "暂无数据",
      links: baseLinks(),
    });
  }

  return JSON.stringify({
    category,
    period,
    entries: snapshot.data,
    computed_at: snapshot.computed_at
      ? new Date(snapshot.computed_at).toISOString()
      : null,
    links: baseLinks(),
  });
}

// ── query_my_rankings ──

const PP_CATEGORIES = [
  "tournament",
  "store_4p_hanchan",
  "store_4p_tonpuu",
  "store_3p_hanchan",
  "store_3p_tonpuu",
] as const;

const PERIODS = ["day", "week", "month"] as const;

async function queryMyRankings(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  console.log("[tools:mahjong:rankings] lookup openId:", openId.slice(-8));
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return JSON.stringify({
      found: false,
      message: "未找到用户记录，请先在网站注册",
      links: baseLinks(),
    });
  }

  const d = db(c.env.DB);
  const rankings: Array<{
    category: string;
    period: string;
    rank: number | null;
    totalPP: number;
    prevRank: number | null;
    matchCount: number;
  }> = [];

  for (const category of PP_CATEGORIES) {
    for (const period of PERIODS) {
      const snapshot = await d.query.leaderboardSnapshotsTable.findFirst({
        where: (s, { and, eq }) =>
          and(eq(s.category, category), eq(s.period, period)),
        orderBy: (s, { desc }) => desc(s.computed_at),
      });

      if (!snapshot?.data) continue;

      const data = snapshot.data as Array<{
        userId: string;
        totalPP: number;
        rank: number;
        prevRank: number | null;
        matchCount: number;
      }>;
      const myEntry = data.find((e) => e.userId === userId);
      if (!myEntry) continue;

      rankings.push({
        category,
        period,
        rank: myEntry.rank,
        totalPP: myEntry.totalPP,
        prevRank: myEntry.prevRank,
        matchCount: myEntry.matchCount,
      });
    }
  }

  return JSON.stringify({
    found: true,
    rankings,
    links: baseLinks(),
  });
}

// ── query_my_match_history ──

async function queryMyMatchHistory(
  c: Context<HonoCtxEnv>,
  openId: string,
  limit: number | undefined,
): Promise<string> {
  console.log("[tools:mahjong:history] lookup openId:", openId.slice(-8));
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return JSON.stringify({
      found: false,
      message: "未找到用户记录，请先在网站注册",
      links: baseLinks(),
    });
  }

  const limitCount = Math.min(limit ?? 20, 50);
  const d = db(c.env.DB);

  const matches = await d.query.mahjongMatchesTable.findMany({
    where: (m, { like }) => like(m.players, `%"userId":"${userId}"%`),
    orderBy: (m, { desc }) => desc(m.created_at),
    limit: limitCount,
  });

  return JSON.stringify({
    found: true,
    total: matches.length,
    matches: withMatchLinks(
      matches as Array<{ id: string; [key: string]: unknown }>,
    ),
    links: baseLinks(),
  });
}

// ── query_my_pp_stats ──

async function queryMyPPStats(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  console.log("[tools:mahjong:pp] lookup openId:", openId.slice(-8));
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return JSON.stringify({
      found: false,
      message: "未找到用户记录，请先在网站注册",
      links: baseLinks(),
    });
  }

  const d = db(c.env.DB);
  const matches = await d.query.mahjongMatchesTable.findMany({
    where: (m, { like }) => like(m.players, `%"userId":"${userId}"%`),
    orderBy: (m, { desc }) => desc(m.created_at),
  });

  if (matches.length === 0) {
    return JSON.stringify({
      found: true,
      ppStats: [],
      totalMatches: 0,
      message: "暂无对局记录",
      links: baseLinks(),
    });
  }

  // Aggregate PP by category
  const categoryMap = new Map<string, { total: number; count: number }>();

  for (const match of matches) {
    if (
      !match.termination_reason ||
      match.termination_reason === "order_invalid"
    )
      continue;
    if (!match.players) continue;

    const players = match.players as Array<{
      userId: string;
      nickname: string;
      seat: string | null;
      finalScore: number;
    }>;
    const myPlayer = players.find((p) => p.userId === userId);
    if (!myPlayer) continue;

    const matchType = (match.match_type ?? match.config?.type ?? "store") as
      | "store"
      | "tournament";
    const mode = match.mode as "3p" | "4p";
    const format = match.format as "tonpuu" | "hanchan";

    const category = `${matchType}_${mode}_${format}`;

    // Calculate PP for this match
    const config =
      mode === "4p"
        ? {
            returnPoints: 25000,
            pointsPerPP: 1000,
            seatOrder: ["east", "south", "west", "north"],
            placementBonus: [0, 0, 0, 0],
          }
        : {
            returnPoints: 35000,
            pointsPerPP: 1000,
            seatOrder: ["east", "south", "west"],
            placementBonus: [0, 0, 0],
          };

    const rawPP =
      (myPlayer.finalScore - config.returnPoints) / config.pointsPerPP;
    const pp = Math.round(rawPP * 10) / 10;

    const existing = categoryMap.get(category) ?? { total: 0, count: 0 };
    existing.total += pp;
    existing.count += 1;
    categoryMap.set(category, existing);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    tournament_4p_hanchan: "公式战 半庄",
    tournament_4p_tonpuu: "公式战 东风",
    tournament_3p_hanchan: "公式战 三麻半庄",
    tournament_3p_tonpuu: "公式战 三麻东风",
    store_4p_hanchan: "四麻半庄",
    store_4p_tonpuu: "四麻东风",
    store_3p_hanchan: "三麻半庄",
    store_3p_tonpuu: "三麻东风",
  };

  const ppStats = Array.from(categoryMap.entries()).map(([cat, data]) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    totalPP: Math.round(data.total * 10) / 10,
    matchCount: data.count,
    avgPP: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
  }));

  return JSON.stringify({
    found: true,
    ppStats,
    totalMatches: matches.length,
    links: baseLinks(),
  });
}

// ── query_my_badges ──

function makeVirtualBadges(hasMatches: boolean) {
  return [
    {
      id: "virtual_newcomer",
      badge_type: "newcomer",
      badge_rank: 0,
      category: "special",
      period_label: "lifetime",
      title: "新人上手",
      awarded_at: null,
    },
    ...(hasMatches
      ? [
          {
            id: "virtual_first_game",
            badge_type: "first_game",
            badge_rank: 0,
            category: "special",
            period_label: "lifetime",
            title: "第一战",
            awarded_at: null,
          },
        ]
      : []),
  ];
}

async function queryMyBadges(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  console.log("[tools:mahjong:badges] lookup openId:", openId.slice(-8));
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return JSON.stringify({
      found: false,
      message: "未找到用户记录，请先在网站注册",
      links: baseLinks(),
    });
  }

  const d = db(c.env.DB);

  const [badges, matchRows] = await Promise.all([
    d.query.userBadgesTable.findMany({
      where: (b, { eq }) => eq(b.user_id, userId),
      orderBy: (b, { desc }) => desc(b.awarded_at),
    }),
    d.query.mahjongMatchesTable.findMany({
      where: (m, { like }) => like(m.players, `%"userId":"${userId}"%`),
      columns: { id: true },
      limit: 1,
    }),
  ]);

  const virtual = makeVirtualBadges(matchRows.length > 0);

  return JSON.stringify({
    found: true,
    badges: [...virtual, ...badges],
    links: baseLinks(),
  });
}
