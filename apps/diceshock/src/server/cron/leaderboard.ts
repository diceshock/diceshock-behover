import db, {
  leaderboardSnapshotsTable,
  mahjongMatchesTable,
  userBadgesTable,
  userInfoTable,
} from "@lib/db";
import { and, eq, gte, lte } from "drizzle-orm";
import type { PPCategory } from "@/shared/mahjong/pp";
import {
  calculateMatchPP,
  getPPCategory,
  PP_CATEGORY_LABELS,
} from "@/shared/mahjong/pp";
import type { MatchFormat, MatchMode, MatchType } from "@/shared/mahjong/types";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

const PP_CATEGORIES: PPCategory[] = [
  "tournament",
  "store_4p_hanchan",
  "store_4p_tonpuu",
  "store_3p_hanchan",
  "store_3p_tonpuu",
];

const PERIODS = ["day", "week", "month"] as const;
type Period = (typeof PERIODS)[number];

interface LeaderboardEntry {
  userId: string;
  nickname: string;
  totalPP: number;
  matchCount: number;
  rank: number;
  prevRank: number | null;
}

function shanghaiNow(): Date {
  return new Date(Date.now() + SHANGHAI_OFFSET_MS);
}

function toShanghaiDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getTimeWindow(period: Period): { start: Date; end: Date } {
  const now = shanghaiNow();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  let startShanghai: Date;
  if (period === "day") {
    startShanghai = new Date(Date.UTC(y, m, d));
  } else if (period === "week") {
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startShanghai = new Date(Date.UTC(y, m, d - mondayOffset));
  } else {
    startShanghai = new Date(Date.UTC(y, m, 1));
  }

  const startUTC = new Date(startShanghai.getTime() - SHANGHAI_OFFSET_MS);
  const endUTC = new Date(Date.now());
  return { start: startUTC, end: endUTC };
}

function getPrevSnapshotDate(period: Period): string {
  const now = shanghaiNow();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  if (period === "day") {
    return toShanghaiDateStr(new Date(Date.UTC(y, m, d - 1)));
  }
  if (period === "week") {
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return toShanghaiDateStr(new Date(Date.UTC(y, m, d - mondayOffset - 7)));
  }
  return toShanghaiDateStr(new Date(Date.UTC(y, m - 1, 1)));
}

function matchesCategoryFilter(
  matchType: string,
  mode: string,
  format: string,
  category: PPCategory,
): boolean {
  const actual = getPPCategory(
    matchType as MatchType,
    mode as MatchMode,
    format as MatchFormat,
  );
  return actual === category;
}

function getBadgeTitle(
  rank: number,
  category: PPCategory,
  badgeType: string,
): string {
  const categoryLabel = PP_CATEGORY_LABELS[category];
  const rankLabels: Record<number, string> = {
    1: "金奖",
    2: "银奖",
    3: "铜奖",
  };
  const typeLabels: Record<string, string> = {
    daily_top3: "日",
    monthly_top3: "月",
    yearly_top10: "年",
  };
  const rankLabel = rankLabels[rank] ?? `第${rank}名`;
  const typeLabel = typeLabels[badgeType] ?? "";
  return `${typeLabel}${categoryLabel}${rankLabel}`;
}

export async function computeLeaderboards(env: {
  DB: D1Database;
}): Promise<void> {
  const tdb = db(env.DB);
  const todayStr = toShanghaiDateStr(shanghaiNow());

  const nicknameMap = new Map<string, string>();
  const allUserInfo = await tdb.query.userInfoTable.findMany({
    columns: { id: true, nickname: true },
  });
  for (const u of allUserInfo) {
    if (u.nickname) nicknameMap.set(u.id, u.nickname);
  }

  for (const category of PP_CATEGORIES) {
    for (const period of PERIODS) {
      const { start, end } = getTimeWindow(period);

      const matches = await tdb.query.mahjongMatchesTable.findMany({
        where: (m, { and, gte, lte }) =>
          and(gte(m.ended_at, start), lte(m.ended_at, end)),
      });

      const validMatches = matches.filter(
        (m) =>
          m.termination_reason !== null &&
          (m.termination_reason === "score_complete" ||
            m.termination_reason === "vote") &&
          m.match_type !== null &&
          matchesCategoryFilter(m.match_type, m.mode, m.format, category),
      );

      const userAgg = new Map<
        string,
        { totalPP: number; matchCount: number }
      >();

      for (const match of validMatches) {
        if (!match.players || match.players.length === 0) continue;

        const ppResult = calculateMatchPP(
          match.players,
          match.mode as MatchMode,
          match.format as MatchFormat,
          match.match_type as MatchType,
        );

        for (const pp of ppResult.players) {
          const existing = userAgg.get(pp.userId) ?? {
            totalPP: 0,
            matchCount: 0,
          };
          existing.totalPP += pp.totalPP;
          existing.matchCount += 1;
          userAgg.set(pp.userId, existing);
        }
      }

      const ranked = Array.from(userAgg.entries())
        .map(([userId, data]) => ({
          userId,
          nickname:
            nicknameMap.get(userId) ??
            validMatches
              .flatMap((m) => m.players ?? [])
              .find((p) => p.userId === userId)?.nickname ??
            userId.slice(0, 8),
          totalPP: Math.round(data.totalPP * 10) / 10,
          matchCount: data.matchCount,
          rank: 0,
          prevRank: null as number | null,
        }))
        .sort((a, b) => b.totalPP - a.totalPP);

      for (let i = 0; i < ranked.length; i++) {
        ranked[i].rank = i + 1;
      }

      const prevDate = getPrevSnapshotDate(period);
      const prevSnapshot = await tdb.query.leaderboardSnapshotsTable.findFirst({
        where: (s, { and, eq }) =>
          and(
            eq(s.category, category),
            eq(s.period, period),
            eq(s.snapshot_date, prevDate),
          ),
      });

      if (prevSnapshot?.data) {
        const prevData = prevSnapshot.data as LeaderboardEntry[];
        const prevRankMap = new Map<string, number>();
        for (const entry of prevData) {
          prevRankMap.set(entry.userId, entry.rank);
        }
        for (const entry of ranked) {
          entry.prevRank = prevRankMap.get(entry.userId) ?? null;
        }
      }

      const existing = await tdb.query.leaderboardSnapshotsTable.findFirst({
        where: (s, { and, eq }) =>
          and(
            eq(s.category, category),
            eq(s.period, period),
            eq(s.snapshot_date, todayStr),
          ),
      });

      if (existing) {
        await tdb
          .update(leaderboardSnapshotsTable)
          .set({
            data: ranked,
            computed_at: new Date(),
          })
          .where(eq(leaderboardSnapshotsTable.id, existing.id));
      } else {
        await tdb.insert(leaderboardSnapshotsTable).values({
          category,
          period,
          snapshot_date: todayStr,
          data: ranked,
          computed_at: new Date(),
        });
      }
    }
  }

  await awardBadges(tdb, todayStr);
}

async function awardBadges(
  tdb: ReturnType<typeof db>,
  todayStr: string,
): Promise<void> {
  const now = shanghaiNow();
  const monthLabel = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const yearLabel = String(now.getUTCFullYear());

  const badgeConfigs: Array<{
    badgeType: "daily_top3" | "monthly_top3" | "yearly_top10";
    period: Period;
    periodLabel: string;
    topN: number;
  }> = [
    {
      badgeType: "daily_top3",
      period: "day",
      periodLabel: todayStr,
      topN: 3,
    },
    {
      badgeType: "monthly_top3",
      period: "month",
      periodLabel: monthLabel,
      topN: 3,
    },
    {
      badgeType: "yearly_top10",
      period: "month",
      periodLabel: yearLabel,
      topN: 10,
    },
  ];

  for (const category of PP_CATEGORIES) {
    for (const config of badgeConfigs) {
      const snapshot = await tdb.query.leaderboardSnapshotsTable.findFirst({
        where: (s, { and, eq }) =>
          and(
            eq(s.category, category),
            eq(s.period, config.period),
            eq(s.snapshot_date, todayStr),
          ),
      });

      if (!snapshot?.data) continue;
      const data = snapshot.data as LeaderboardEntry[];
      const topEntries = data.slice(0, config.topN);

      for (const entry of topEntries) {
        if (entry.matchCount === 0) continue;

        const existingBadge = await tdb.query.userBadgesTable.findFirst({
          where: (b, { and, eq }) =>
            and(
              eq(b.user_id, entry.userId),
              eq(b.badge_type, config.badgeType),
              eq(b.category, category),
              eq(b.period_label, config.periodLabel),
            ),
        });

        if (existingBadge) continue;

        await tdb.insert(userBadgesTable).values({
          user_id: entry.userId,
          badge_type: config.badgeType,
          badge_rank: entry.rank,
          category,
          period_label: config.periodLabel,
          title: getBadgeTitle(entry.rank, category, config.badgeType),
          awarded_at: new Date(),
        });
      }
    }
  }
}
