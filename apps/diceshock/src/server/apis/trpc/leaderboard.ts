import db, {
  leaderboardSnapshotsTable,
  mahjongMatchesTable,
  userBadgesTable,
} from "@lib/db";
import { eq, gte, like, lte } from "drizzle-orm";
import z from "zod/v4";
import type { PPCategory } from "@/shared/mahjong/pp";
import { aggregatePP, PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import type { MatchType } from "@/shared/mahjong/types";
import { protectedProcedure, publicProcedure } from "./baseTRPC";

const categoryZ = z.enum([
  "tournament",
  "store_4p_hanchan",
  "store_4p_tonpuu",
  "store_3p_hanchan",
  "store_3p_tonpuu",
]);

const periodZ = z.enum(["day", "week", "month"]);

const getLeaderboard = publicProcedure
  .input(
    z.object({
      category: categoryZ,
      period: periodZ,
    }),
  )
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const snapshot = await tdb.query.leaderboardSnapshotsTable.findFirst({
      where: (s, { and, eq }) =>
        and(eq(s.category, input.category), eq(s.period, input.period)),
      orderBy: (s, { desc }) => desc(s.computed_at),
    });

    if (!snapshot?.data) return { entries: [], computedAt: null };

    return {
      entries: snapshot.data,
      computedAt: snapshot.computed_at
        ? new Date(snapshot.computed_at).toISOString()
        : null,
    };
  });

const getCategories = publicProcedure.query(() => {
  return Object.entries(PP_CATEGORY_LABELS).map(([key, label]) => ({
    key: key as PPCategory,
    label,
  }));
});

const getMyRankings = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const categories = Object.keys(PP_CATEGORY_LABELS) as PPCategory[];
  const periods = ["day", "week", "month"] as const;

  const rankings: Array<{
    category: PPCategory;
    period: string;
    rank: number | null;
    totalPP: number;
    prevRank: number | null;
    matchCount: number;
  }> = [];

  for (const category of categories) {
    for (const period of periods) {
      const snapshot = await tdb.query.leaderboardSnapshotsTable.findFirst({
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
      const myEntry = data.find((e) => e.userId === ctx.userId);
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

  return rankings;
});

interface VirtualBadge {
  id: string;
  badge_type: string;
  badge_rank: number;
  category: string;
  period_label: string;
  title: string;
  awarded_at: null;
}

function withVirtualBadges<T>(
  dbBadges: T[],
  hasMatches: boolean,
): (T | VirtualBadge)[] {
  const virtual: VirtualBadge[] = [];

  // 默认徽章: 新人上手 (always present)
  virtual.push({
    id: "virtual_newcomer",
    badge_type: "newcomer",
    badge_rank: 0,
    category: "special",
    period_label: "lifetime",
    title: "新人上手",
    awarded_at: null,
  });

  // 条件徽章: 第一战 (if has match history)
  if (hasMatches) {
    virtual.push({
      id: "virtual_first_game",
      badge_type: "first_game",
      badge_rank: 0,
      category: "special",
      period_label: "lifetime",
      title: "第一战",
      awarded_at: null,
    });
  }

  return [...virtual, ...dbBadges];
}

const getMyBadges = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const [badges, matchCount] = await Promise.all([
    tdb.query.userBadgesTable.findMany({
      where: (b, { eq }) => eq(b.user_id, ctx.userId),
      orderBy: (b, { desc }) => desc(b.awarded_at),
    }),
    tdb.query.mahjongMatchesTable
      .findMany({
        where: (m) => like(m.players, `%"userId":"${ctx.userId}"%`),
        columns: { id: true },
        limit: 1,
      })
      .then((rows) => rows.length),
  ]);
  return withVirtualBadges(badges, matchCount > 0);
});

const getUserBadges = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const [badges, matchCount] = await Promise.all([
      tdb.query.userBadgesTable.findMany({
        where: (b, { eq }) => eq(b.user_id, input.userId),
        orderBy: (b, { desc }) => desc(b.awarded_at),
      }),
      tdb.query.mahjongMatchesTable
        .findMany({
          where: (m) => like(m.players, `%"userId":"${input.userId}"%`),
          columns: { id: true },
          limit: 1,
        })
        .then((rows) => rows.length),
    ]);
    return withVirtualBadges(badges, matchCount > 0);
  });

const getMyPPStats = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const matches = await tdb.query.mahjongMatchesTable.findMany({
    where: (m) => like(m.players, `%"userId":"${ctx.userId}"%`),
    orderBy: (m, { desc }) => desc(m.created_at),
  });

  const matchData = matches
    .filter((m) => m.players && m.players.length > 0)
    .map((m) => ({
      players: m.players!,
      mode: m.mode as "3p" | "4p",
      format: m.format as "tonpuu" | "hanchan",
      matchType: (m.match_type ?? m.config?.type ?? "store") as MatchType,
      terminationReason: m.termination_reason,
    }));

  return aggregatePP(matchData, ctx.userId);
});

const getMatchHistory = protectedProcedure
  .input(
    z
      .object({
        userId: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
        cursor: z.string().optional(),
        search: z.string().optional(),
        matchType: z.enum(["store", "tournament"]).optional(),
        mode: z.enum(["3p", "4p"]).optional(),
        format: z.enum(["tonpuu", "hanchan"]).optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      })
      .optional(),
  )
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const targetUserId = input?.userId ?? ctx.userId;
    const limitCount = input?.limit ?? 20;

    const conditions = [
      like(mahjongMatchesTable.players, `%"userId":"${targetUserId}"%`),
    ];
    if (input?.cursor) {
      conditions.push(
        lte(mahjongMatchesTable.created_at, new Date(input.cursor)),
      );
    }
    if (input?.matchType) {
      conditions.push(eq(mahjongMatchesTable.match_type, input.matchType));
    }
    if (input?.mode) {
      conditions.push(eq(mahjongMatchesTable.mode, input.mode));
    }
    if (input?.format) {
      conditions.push(eq(mahjongMatchesTable.format, input.format));
    }
    if (input?.startDate) {
      conditions.push(
        gte(mahjongMatchesTable.started_at, new Date(input.startDate)),
      );
    }
    if (input?.endDate) {
      conditions.push(
        lte(mahjongMatchesTable.started_at, new Date(input.endDate)),
      );
    }
    if (input?.search?.trim()) {
      conditions.push(
        like(
          mahjongMatchesTable.players,
          `%"nickname":"%${input.search.trim()}%"%`,
        ),
      );
    }

    const matches = await tdb.query.mahjongMatchesTable.findMany({
      where: (_m, { and }) => and(...conditions),
      orderBy: (m, { desc }) => desc(m.created_at),
      limit: limitCount + 1,
    });

    const hasMore = matches.length > limitCount;
    const items = hasMore ? matches.slice(0, limitCount) : matches;
    const nextCursor =
      hasMore && items.length > 0
        ? (items[items.length - 1].created_at?.toISOString() ?? null)
        : null;

    return { items, nextCursor };
  });

const getHeatmapData = protectedProcedure
  .input(
    z
      .object({
        userId: z.string().optional(),
      })
      .optional(),
  )
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const targetUserId = input?.userId ?? ctx.userId;

    const matches = await tdb.query.mahjongMatchesTable.findMany({
      where: (m) => like(m.players, `%"userId":"${targetUserId}"%`),
      columns: { ended_at: true },
    });

    const heatmap: Record<string, number> = {};
    for (const m of matches) {
      if (!m.ended_at) continue;
      const dateStr = new Date(m.ended_at).toISOString().slice(0, 10);
      heatmap[dateStr] = (heatmap[dateStr] ?? 0) + 1;
    }

    return heatmap;
  });

export default {
  getLeaderboard,
  getCategories,
  getMyRankings,
  getMyBadges,
  getUserBadges,
  getMyPPStats,
  getMatchHistory,
  getHeatmapData,
};
