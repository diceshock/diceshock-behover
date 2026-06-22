import dbFactory, {
  drizzle,
  leaderboardSnapshotsTable,
  mahjongMatchesTable,
  mahjongRegistrationsTable,
  userBadgesTable,
  userInfoTable,
} from "@lib/db";
import { desc, eq, like } from "drizzle-orm";
import { z } from "zod/v4";
import { gszFetch } from "@/server/apis/trpc/gszApi";
import {
  aggregatePP,
  PP_CATEGORY_LABELS,
  type PPCategory,
} from "@/shared/mahjong/pp";
import type { MatchType } from "@/shared/mahjong/types";
import type { GQLContext } from "../context";
import { forbidden, notFound, validationError } from "../errors";
import { requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const leaderboardInputSchema = z.object({
  category: z.enum([
    "tournament",
    "store_4p_hanchan",
    "store_4p_tonpuu",
    "store_3p_hanchan",
    "store_3p_tonpuu",
  ]),
  period: z.enum(["day", "week", "month"]),
  storeId: z.string().optional(),
});

const matchHistoryInputSchema = z.object({
  userId: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
  matchType: z.enum(["store", "tournament"]).optional(),
  mode: z.enum(["3p", "4p"]).optional(),
  format: z.enum(["tonpuu", "hanchan"]).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

const heatmapInputSchema = z.object({
  userId: z.string().optional(),
});

const userBadgesInputSchema = z.object({
  userId: z.string(),
});

const matchByIdInputSchema = z.object({
  id: z.string(),
});

const saveMatchInputSchema = z.object({
  tableId: z.string().optional(),
  matchType: z.enum(["store", "tournament"]),
  mode: z.enum(["3p", "4p"]),
  format: z.enum(["tonpuu", "hanchan"]),
  startedAt: z.string(),
  endedAt: z.string(),
  terminationReason: z.enum([
    "score_complete",
    "vote",
    "admin_abort",
    "order_invalid",
  ]),
  players: z.array(
    z.object({
      userId: z.string(),
      nickname: z.string(),
      seat: z.string().nullable().optional(),
      finalScore: z.number(),
    }),
  ),
  config: z.object({
    type: z.string(),
    mode: z.string(),
    format: z.string(),
  }),
});

const registerGszInputSchema = z.object({
  phone: z.string().min(1),
  smsCode: z.string().min(1),
  gszName: z.string().min(1),
  syncNickname: z.boolean().optional(),
});

const terminateMatchInputSchema = z.object({
  tableCode: z.string().min(1),
  reason: z.enum(["admin_abort", "order_invalid"]).default("admin_abort"),
});

const updateScoreInputSchema = z.object({
  matchId: z.string(),
  players: z.array(
    z.object({
      userId: z.string(),
      nickname: z.string(),
      seat: z.string().nullable().optional(),
      finalScore: z.number(),
    }),
  ),
});

const syncToGszInputSchema = z.object({
  matchId: z.string(),
});

const batchSyncToGszInputSchema = z.object({
  matchIds: z.array(z.string()).min(1).max(50),
});

const gszRegisterInputSchema = z.object({
  username: z.string().min(1),
  phone: z.string().min(1),
  password: z.string().optional(),
  qq: z.string().optional(),
  wechat: z.string().optional(),
});

const gszScoreAddInputSchema = z.object({
  phone1: z.string().min(1),
  phone2: z.string().min(1),
  phone3: z.string().min(1),
  phone4: z.string().min(1),
  point1: z.string().min(1),
  point2: z.string().min(1),
  point3: z.string().min(1),
  point4: z.string().min(1),
  rateTime: z.string().min(1),
});

const gszScoreUpdateInputSchema = z.object({
  recordId: z.number().int(),
  phone1: z.string().min(1),
  phone2: z.string().min(1),
  phone3: z.string().min(1),
  phone4: z.string().min(1),
  point1: z.string().min(1),
  point2: z.string().min(1),
  point3: z.string().min(1),
  point4: z.string().min(1),
  rateTime: z.string().min(1),
});

// ─── Field Mappers ────────────────────────────────────────────────────────

type PlayerJSON = {
  userId: string;
  nickname: string;
  seat: string | null;
  finalScore: number;
};

type MatchRow = {
  id: string;
  table_id: string | null;
  store_id: string | null;
  match_type: string | null;
  gsz_record_id: number | null;
  gsz_synced: boolean;
  gsz_error: string | null;
  gsz_synced_at: number | null;
  mode: string;
  format: string;
  started_at: Date | number;
  ended_at: Date | number;
  termination_reason: string;
  players: PlayerJSON[] | null;
  config: { type?: string; mode: string; format: string } | null;
  created_at: Date | number | null;
};

function toGqlMatch(row: MatchRow): Record<string, unknown> {
  const players = row.players ?? [];
  const ts = (v: Date | number): string =>
    v instanceof Date ? v.toISOString() : new Date(v).toISOString();

  return {
    id: row.id,
    tableId: row.table_id,
    table: null,
    matchType: row.match_type?.toUpperCase() ?? null,
    gszRecordId: row.gsz_record_id,
    gszSynced: Boolean(row.gsz_synced),
    gszError: row.gsz_error,
    gszSyncedAt: row.gsz_synced_at ? ts(row.gsz_synced_at) : null,
    mode: row.mode?.toUpperCase(),
    format: row.format?.toUpperCase(),
    startedAt: ts(row.started_at),
    endedAt: ts(row.ended_at),
    terminationReason: row.termination_reason?.toUpperCase(),
    players: players.map((p) => ({
      userId: p.userId,
      nickname: p.nickname,
      seat: p.seat,
      finalScore: p.finalScore,
    })),
    playersJson: JSON.stringify(players),
    scores: null,
    config: row.config
      ? {
          type: row.config.type ?? null,
          mode: row.config.mode,
          format: row.config.format,
        }
      : null,
    createdAt: row.created_at ? ts(row.created_at) : null,
    unsyncableReasons: [],
  };
}

function isoDateOf(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type EnvWithPubSub = GQLContext["env"] & {
  PUBSUB: DurableObjectNamespace;
};

function envWithPubSub(ctx: GQLContext): EnvWithPubSub {
  return ctx.env as EnvWithPubSub;
}

type EnvWithSocket = GQLContext["env"] & {
  SOCKET: DurableObjectNamespace;
};

function envWithSocket(ctx: GQLContext): EnvWithSocket {
  return ctx.env as EnvWithSocket;
}

async function publishLeaderboardUpdated(
  ctx: GQLContext,
  category: string,
): Promise<void> {
  try {
    const env = envWithPubSub(ctx);
    const pubsubId = env.PUBSUB.idFromName(`leaderboard:${category}`);
    const stub = env.PUBSUB.get(pubsubId);
    await stub.fetch("https://internal/publish", {
      method: "POST",
      body: JSON.stringify({ updated: true, category, timestamp: Date.now() }),
    });
  } catch {
    // PubSub is best-effort
  }
}

/** Determine leaderboard categories affected by a match's mode/format/type. */
function affectedCategories(
  matchType: string | null,
  mode: string,
  format: string,
): string[] {
  if (matchType === "tournament") return ["tournament"];
  const modeKey = mode as string;
  const fmtKey = format as string;
  const cat = `store_${modeKey}_${fmtKey}`;
  if (
    [
      "store_4p_hanchan",
      "store_4p_tonpuu",
      "store_3p_hanchan",
      "store_3p_tonpuu",
    ].includes(cat)
  ) {
    return [cat];
  }
  return [];
}

// ─── GSZ Sync Core ────────────────────────────────────────────────────────

async function performGszSync(
  env: GQLContext["env"],
  matchId: string,
): Promise<{ success: boolean; error?: string }> {
  const tdb = dbFactory(env.DB);
  const match = await tdb.query.mahjongMatchesTable.findFirst({
    where: (m, { eq }) => eq(m.id, matchId),
  });
  if (!match) return { success: false, error: "match not found" };
  if (match.match_type !== "tournament")
    return { success: false, error: "only tournament matches can be synced" };

  const players = (match.players ?? []) as PlayerJSON[];
  if (players.length !== 4) return { success: false, error: "need 4 players" };

  const seatOrder = ["east", "south", "west", "north"];
  const sorted = [...players].sort(
    (a, b) => seatOrder.indexOf(a.seat ?? "") - seatOrder.indexOf(b.seat ?? ""),
  );

  const userIds = sorted.map((p) => p.userId);
  const registrations = await tdb.query.mahjongRegistrationsTable.findMany({
    where: (r, { inArray }) => inArray(r.user_id, userIds),
  });
  const regMap = new Map(registrations.map((r) => [r.user_id, r]));
  const phones = sorted.map((p) => regMap.get(p.userId)?.phone ?? "");
  if (!phones.every(Boolean))
    return { success: false, error: "some players missing phone" };

  // Ensure all players have GSZ IDs
  for (const p of sorted) {
    const reg = regMap.get(p.userId);
    if (reg && !reg.gsz_id) {
      try {
        const gszResult = await gszFetch<{
          records: Array<{ id: number; name: string }>;
          total: number;
        }>(
          env,
          "/gszapi/open/customer/page",
          { params: { phone: reg.phone } },
          { pageNo: 1, pageSize: 1 },
        );

        let gszId: number | null = null;
        let gszName = p.nickname;
        if (gszResult.records.length > 0) {
          gszId = gszResult.records[0].id;
          gszName = gszResult.records[0].name;
        } else {
          gszId = await gszFetch<number>(env, "/gszapi/open/register", {
            params: { username: p.nickname, phone: reg.phone },
          });
        }

        if (gszId) {
          await tdb
            .update(mahjongRegistrationsTable)
            .set({
              gsz_id: gszId,
              gsz_name: gszName,
              gsz_synced: true,
              gsz_error: null,
              gsz_synced_at: new Date(),
            })
            .where(eq(mahjongRegistrationsTable.user_id, p.userId));
        }
      } catch {
        return {
          success: false,
          error: `failed to register player ${p.nickname}`,
        };
      }
    }
  }

  const endedAt =
    match.ended_at instanceof Date
      ? match.ended_at.getTime()
      : Number(match.ended_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(endedAt);
  const rateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  try {
    if (match.gsz_record_id) {
      await gszFetch(env, "/gszapi/open/score/update", {
        params: {
          recordId: match.gsz_record_id,
          phone1: phones[0],
          phone2: phones[1],
          phone3: phones[2],
          phone4: phones[3],
          point1: String(sorted[0].finalScore),
          point2: String(sorted[1].finalScore),
          point3: String(sorted[2].finalScore),
          point4: String(sorted[3].finalScore),
          rateTime,
        },
      });
    } else {
      const gszRecordId = await gszFetch<number>(
        env,
        "/gszapi/open/score/add",
        {
          params: {
            phone1: phones[0],
            phone2: phones[1],
            phone3: phones[2],
            phone4: phones[3],
            point1: String(sorted[0].finalScore),
            point2: String(sorted[1].finalScore),
            point3: String(sorted[2].finalScore),
            point4: String(sorted[3].finalScore),
            rateTime,
          },
        },
      );
      if (gszRecordId) {
        await tdb
          .update(mahjongMatchesTable)
          .set({ gsz_record_id: gszRecordId })
          .where(eq(mahjongMatchesTable.id, matchId));
      }
    }

    await tdb
      .update(mahjongMatchesTable)
      .set({
        gsz_synced: true,
        gsz_error: null,
        gsz_synced_at: new Date(),
      })
      .where(eq(mahjongMatchesTable.id, matchId));

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "sync failed";
    await tdb
      .update(mahjongMatchesTable)
      .set({ gsz_error: errorMsg })
      .where(eq(mahjongMatchesTable.id, matchId));
    return { success: false, error: errorMsg };
  }
}

// ─── Virtual Badges Helper ────────────────────────────────────────────────

interface VirtualBadge {
  id: string;
  badge_type: string;
  badge_rank: number;
  category: string;
  period_label: string;
  title: string;
  awarded_at: null;
}

function toGqlBadge(
  b: Record<string, unknown> | VirtualBadge,
): Record<string, unknown> {
  return {
    id: b.id,
    userId:
      (b as Record<string, unknown>).user_id ??
      (b as Record<string, unknown>).userId ??
      null,
    badgeType: (b as Record<string, unknown>).badge_type ?? b.badge_type,
    badgeRank: (b as Record<string, unknown>).badge_rank ?? b.badge_rank,
    category: (b as Record<string, unknown>).category ?? b.category,
    periodLabel: (b as Record<string, unknown>).period_label ?? b.period_label,
    title: (b as Record<string, unknown>).title ?? b.title,
    awardedAt: (b as Record<string, unknown>).awarded_at
      ? new Date(
          (b as Record<string, unknown>).awarded_at as number,
        ).toISOString()
      : null,
    createdAt: (b as Record<string, unknown>).created_at
      ? new Date(
          (b as Record<string, unknown>).created_at as number,
        ).toISOString()
      : null,
  };
}

function withVirtualBadges(
  dbBadges: Record<string, unknown>[],
  hasMatches: boolean,
): (Record<string, unknown> | VirtualBadge)[] {
  const virtual: VirtualBadge[] = [];

  virtual.push({
    id: "virtual_newcomer",
    badge_type: "newcomer",
    badge_rank: 0,
    category: "special",
    period_label: "lifetime",
    title: "新人上手",
    awarded_at: null,
  });

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

// ─── Type Definitions ─────────────────────────────────────────────────────

export const mahjongTypeDefs = `
  extend type Query {
    leaderboard(category: LeaderboardCategory!, period: LeaderboardPeriod!, storeId: ID): Leaderboard!
    leaderboardCategories: [LeaderboardCategoryInfo!]!
    myRankings(storeId: ID): [RankingSummary!]!
    myBadges(storeId: ID): [UserBadge!]!
    userBadges(userId: ID!, storeId: ID): [UserBadge!]!
    myPPStats(storeId: ID): PPStats!
    myMahjongMatches(storeId: ID): [MahjongMatch!]!
    mahjongMatch(id: ID!, storeId: ID): MahjongMatch
    myMahjongRegistration: MahjongRegistrationStatus!
    mahjongMatchHistory(input: MahjongMatchHistoryInput): MahjongMatchListResult!
    mahjongHeatmap(userId: ID, storeId: ID): String!
  }

  extend type Mutation {
    saveMahjongMatch(input: SaveMahjongMatchInput!): MahjongMatch!
    registerMahjong(input: RegisterMahjongInput!): MahjongRegistrationStatus!
    terminateMahjongMatch(tableCode: String!, reason: MahjongTerminationReason): MahjongMatch!
    updateMahjongScore(matchId: ID!, players: [MahjongPlayerInput!]!): MahjongMatch!
    syncMahjongMatchToGsz(matchId: ID!): GszSyncResult!
    batchSyncMahjongMatchesToGsz(matchIds: [ID!]!): GszSyncResult!
    gszRegister(input: GszRegisterInput!): GszCustomer!
    gszScoreAdd(input: GszScoreAddInput!): MahjongMatch!
    gszScoreUpdate(input: GszScoreUpdateInput!): MahjongMatch!
  }
`;

// ─── Resolvers ────────────────────────────────────────────────────────────

export const mahjongResolvers = {
  Query: {
    async leaderboard(
      _source: unknown,
      args: { category: string; period: string; storeId?: string },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(leaderboardInputSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const snapshot = await tdb.query.leaderboardSnapshotsTable.findFirst({
        where: (s, { and, eq }) => {
          const conditions = [
            eq(s.category, input.category),
            eq(s.period, input.period),
          ];
          if (input.storeId) {
            conditions.push(eq(s.store_id, input.storeId));
          }
          return and(...conditions);
        },
        orderBy: (s, { desc }) => desc(s.computed_at),
      });

      if (!snapshot?.data) {
        return {
          category: input.category,
          period: input.period,
          entries: [],
          computedAt: null,
        };
      }

      return {
        category: input.category,
        period: input.period,
        entries: snapshot.data.map((e) => ({
          userId: e.userId,
          nickname: e.nickname,
          totalPP: e.totalPP,
          matchCount: e.matchCount,
          rank: e.rank,
          prevRank: e.prevRank,
        })),
        computedAt: snapshot.computed_at
          ? new Date(snapshot.computed_at).toISOString()
          : null,
      };
    },

    leaderboardCategories() {
      return Object.entries(PP_CATEGORY_LABELS).map(([key, label]) => ({
        key,
        label,
      }));
    },

    async myRankings(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);
      const categories = Object.keys(PP_CATEGORY_LABELS) as PPCategory[];
      const periods = ["day", "week", "month"] as const;

      const rankings: Array<{
        category: string;
        period: string;
        rank: number | null;
        totalPP: number;
        prevRank: number | null;
        matchCount: number;
      }> = [];

      for (const category of categories) {
        for (const period of periods) {
          const snapshot = await tdb.query.leaderboardSnapshotsTable.findFirst({
            where: (s, { and, eq }) => {
              const conditions = [
                eq(s.category, category),
                eq(s.period, period),
              ];
              if (args.storeId) {
                conditions.push(eq(s.store_id, args.storeId));
              }
              return and(...conditions);
            },
            orderBy: (s, { desc }) => desc(s.computed_at),
          });

          if (!snapshot?.data) continue;

          const myEntry = snapshot.data.find((e) => e.userId === ctx.userId);
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
    },

    async myBadges(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);
      const [badges, matchCount] = await Promise.all([
        tdb.query.userBadgesTable.findMany({
          where: (b, { eq }) => eq(b.user_id, ctx.userId),
          orderBy: (b, { desc }) => desc(b.awarded_at),
        }),
        tdb.query.mahjongMatchesTable
          .findMany({
            where: (m, { and, eq, like }) => {
              const conditions = [
                like(m.players, `%"userId":"${ctx.userId}"%`),
              ];
              if (args.storeId) {
                conditions.push(eq(m.store_id, args.storeId));
              }
              return and(...conditions);
            },
            columns: { id: true },
            limit: 1,
          })
          .then((rows) => rows.length),
      ]);

      return withVirtualBadges(
        badges.map((b) => b as unknown as Record<string, unknown>),
        matchCount > 0,
      ).map(toGqlBadge);
    },

    async userBadges(
      _source: unknown,
      args: { userId: string; storeId?: string },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(userBadgesInputSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const [badges, matchCount] = await Promise.all([
        tdb.query.userBadgesTable.findMany({
          where: (b, { eq }) => eq(b.user_id, input.userId),
          orderBy: (b, { desc }) => desc(b.awarded_at),
        }),
        tdb.query.mahjongMatchesTable
          .findMany({
            where: (m, { and, eq, like }) => {
              const conditions = [
                like(m.players, `%"userId":"${input.userId}"%`),
              ];
              if (args.storeId) {
                conditions.push(eq(m.store_id, args.storeId));
              }
              return and(...conditions);
            },
            columns: { id: true },
            limit: 1,
          })
          .then((rows) => rows.length),
      ]);

      return withVirtualBadges(
        badges.map((b) => b as unknown as Record<string, unknown>),
        matchCount > 0,
      ).map(toGqlBadge);
    },

    async myPPStats(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);

      const matches = await tdb.query.mahjongMatchesTable.findMany({
        where: (m, { and, eq, like }) => {
          const conditions = [like(m.players, `%"userId":"${ctx.userId}"%`)];
          if (args.storeId) {
            conditions.push(eq(m.store_id, args.storeId));
          }
          return and(...conditions);
        },
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

      const aggregated = aggregatePP(matchData, ctx.userId);
      const totalPP = aggregated.reduce((sum, s) => sum + s.totalPP, 0);

      return {
        totalPP: Math.round(totalPP * 10) / 10,
        categories: JSON.stringify(
          aggregated.map((s) => ({
            category: s.category,
            totalPP: s.totalPP,
            matchCount: s.matchCount,
            avgPP: s.avgPP,
          })),
        ),
        raw: JSON.stringify(aggregated),
      };
    },

    async myMahjongMatches(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);

      const matches = await tdb.query.mahjongMatchesTable.findMany({
        where: (m, { and, eq, like }) => {
          const conditions = [like(m.players, `%"userId":"${ctx.userId}"%`)];
          if (args.storeId) {
            conditions.push(eq(m.store_id, args.storeId));
          }
          return and(...conditions);
        },
        orderBy: (m, { desc }) => desc(m.created_at),
        limit: 50,
      });

      return matches.map((m) => toGqlMatch(m as unknown as MatchRow));
    },

    async mahjongMatch(
      _source: unknown,
      args: { id: string; storeId?: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(matchByIdInputSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const match = await tdb.query.mahjongMatchesTable.findFirst({
        where: (m, { and, eq }) => {
          const conditions = [eq(m.id, input.id)];
          if (args.storeId) {
            conditions.push(eq(m.store_id, args.storeId));
          }
          return and(...conditions);
        },
      });

      if (!match) return null;
      return toGqlMatch(match as unknown as MatchRow);
    },

    async myMahjongRegistration(
      _source: unknown,
      _args: unknown,
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);

      const userInfo = await tdb.query.userInfoTable.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.userId),
        columns: { phone: true, nickname: true },
      });

      const registration = await tdb.query.mahjongRegistrationsTable.findFirst({
        where: (r, { eq }) => eq(r.user_id, ctx.userId),
      });

      return {
        hasPhone: !!userInfo?.phone,
        phone: userInfo?.phone ?? null,
        nickname: userInfo?.nickname ?? null,
        registered: !!registration,
        gszName: registration?.gsz_name ?? null,
        gszId: registration?.gsz_id ?? null,
        gszSynced: registration?.gsz_synced ?? false,
        gszError: registration?.gsz_error ?? null,
        alreadyExisted: !!registration,
        nicknameSynced: false,
      };
    },

    async mahjongMatchHistory(
      _source: unknown,
      args: { input?: Record<string, unknown> },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const rawInput = args.input ?? {};
      const input = zodToGraphQLError(matchHistoryInputSchema, rawInput);
      const tdb = dbFactory(ctx.env.DB);
      const targetUserId = input.userId ?? ctx.userId;
      const limitCount = input.limit;

      const matches = await tdb.query.mahjongMatchesTable.findMany({
        where: (m, { and, eq, gte, like, lte }) => {
          const conditions = [like(m.players, `%"userId":"${targetUserId}"%`)];
          if (input.cursor) {
            conditions.push(lte(m.created_at, new Date(input.cursor)));
          }
          if (input.matchType) {
            conditions.push(eq(m.match_type, input.matchType));
          }
          if (input.mode) {
            conditions.push(eq(m.mode, input.mode));
          }
          if (input.format) {
            conditions.push(eq(m.format, input.format));
          }
          if (input.startDate) {
            conditions.push(gte(m.started_at, new Date(input.startDate)));
          }
          if (input.endDate) {
            conditions.push(lte(m.started_at, new Date(input.endDate)));
          }
          if (input.search?.trim()) {
            conditions.push(
              like(m.players, `%"nickname":"%${input.search.trim()}%"%`),
            );
          }
          return and(...conditions);
        },
        orderBy: (m, { desc }) => desc(m.created_at),
        limit: limitCount + 1,
      });

      const hasMore = matches.length > limitCount;
      const items = hasMore ? matches.slice(0, limitCount) : matches;
      const nextCursor =
        hasMore && items.length > 0
          ? (items[items.length - 1].created_at?.toISOString() ?? null)
          : null;

      return {
        items: items.map((m) => toGqlMatch(m as unknown as MatchRow)),
        pageInfo: {
          offset: 0,
          limit: limitCount,
          total: null,
          nextCursor,
          hasMore,
        },
      };
    },

    async mahjongHeatmap(
      _source: unknown,
      args: { userId?: string; storeId?: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(heatmapInputSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const targetUserId = input.userId ?? ctx.userId;

      const matches = await tdb.query.mahjongMatchesTable.findMany({
        where: (m, { and, eq, like }) => {
          const conditions = [like(m.players, `%"userId":"${targetUserId}"%`)];
          if (args.storeId) {
            conditions.push(eq(m.store_id, args.storeId));
          }
          return and(...conditions);
        },
        columns: { ended_at: true },
      });

      const heatmap: Record<string, number> = {};
      for (const m of matches) {
        if (!m.ended_at) continue;
        const dateStr = isoDateOf(
          m.ended_at instanceof Date
            ? m.ended_at.getTime()
            : Number(m.ended_at),
        );
        heatmap[dateStr] = (heatmap[dateStr] ?? 0) + 1;
      }

      return JSON.stringify(heatmap);
    },
  },

  Mutation: {
    async saveMahjongMatch(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(saveMatchInputSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const [match] = await tdb
        .insert(mahjongMatchesTable)
        .values({
          table_id: input.tableId ?? null,
          match_type: input.matchType,
          mode: input.mode,
          format: input.format,
          started_at: new Date(input.startedAt),
          ended_at: new Date(input.endedAt),
          termination_reason: input.terminationReason,
          players: input.players.map((p) => ({
            userId: p.userId,
            nickname: p.nickname,
            seat: p.seat ?? null,
            finalScore: p.finalScore,
          })),
          config: input.config,
        })
        .returning();

      // Publish leaderboard update events for affected categories
      const cats = affectedCategories(
        input.matchType,
        input.mode,
        input.format,
      );
      await Promise.all(cats.map((c) => publishLeaderboardUpdated(ctx, c)));

      return toGqlMatch(match as unknown as MatchRow);
    },

    async registerMahjong(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(registerGszInputSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);
      const { KV } = ctx.env;

      const existing = await tdb.query.mahjongRegistrationsTable.findFirst({
        where: (r, { eq }) => eq(r.user_id, ctx.userId),
      });
      if (existing) {
        return {
          hasPhone: true,
          phone: existing.phone,
          nickname: null,
          registered: true,
          gszName: existing.gsz_name,
          gszId: existing.gsz_id,
          gszSynced: existing.gsz_synced,
          gszError: existing.gsz_error,
          alreadyExisted: true,
          nicknameSynced: false,
        };
      }

      const userInfo = await tdb.query.userInfoTable.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.userId),
        columns: { phone: true, nickname: true },
      });

      const hasPhone = !!userInfo?.phone;
      if (!hasPhone) {
        const kvKey = `sms_tmp_code:${input.phone}`;
        const storedCode = await KV?.get(kvKey);
        if (!storedCode || storedCode !== input.smsCode) {
          throw validationError("smsCode", "SMS code invalid or expired");
        }
        await KV?.delete(kvKey);
      }

      const phoneToUse = hasPhone ? userInfo!.phone! : input.phone;

      let gszId: number | null = null;
      let gszName = input.gszName;
      let gszSynced = false;
      let gszError: string | null = null;

      try {
        const gszResult = await gszFetch<{
          records: Array<{ id: number; name: string }>;
          total: number;
        }>(
          ctx.env,
          "/gszapi/open/customer/page",
          { params: { phone: phoneToUse } },
          { pageNo: 1, pageSize: 1 },
        );

        if (gszResult.records.length > 0) {
          const record = gszResult.records[0];
          gszId = record.id;
          gszName = record.name;
        } else {
          gszId = await gszFetch<number>(ctx.env, "/gszapi/open/register", {
            params: { username: input.gszName, phone: phoneToUse },
          });
        }
        gszSynced = true;
      } catch (err) {
        gszError =
          err instanceof Error ? err.message : "GSZ system unavailable";
      }

      if (!hasPhone) {
        await tdb
          .update(userInfoTable)
          .set({ phone: phoneToUse })
          .where(eq(userInfoTable.id, ctx.userId));
      }

      const [reg] = await tdb
        .insert(mahjongRegistrationsTable)
        .values({
          user_id: ctx.userId,
          phone: phoneToUse,
          gsz_id: gszId,
          gsz_name: gszName,
          gsz_synced: gszSynced,
          gsz_error: gszError,
          gsz_synced_at: gszSynced ? new Date() : null,
        })
        .returning();

      let nicknameSynced = false;
      if (input.syncNickname && gszName) {
        await tdb
          .update(userInfoTable)
          .set({ nickname: gszName })
          .where(eq(userInfoTable.id, ctx.userId));
        nicknameSynced = true;
      }

      return {
        hasPhone: !!userInfo?.phone,
        phone: phoneToUse,
        nickname: userInfo?.nickname ?? null,
        registered: true,
        gszName: reg.gsz_name,
        gszId: reg.gsz_id,
        gszSynced: reg.gsz_synced,
        gszError: reg.gsz_error,
        alreadyExisted: false,
        nicknameSynced,
      };
    },

    async terminateMahjongMatch(
      _source: unknown,
      args: { tableCode: string; reason?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(terminateMatchInputSchema, {
        tableCode: args.tableCode,
        reason: args.reason ?? "admin_abort",
      });

      const env = envWithSocket(ctx);
      const doId = env.SOCKET.idFromName(input.tableCode);
      const stub = env.SOCKET.get(doId);
      const res = await stub.fetch(
        new Request("https://do/mahjong-abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: input.reason }),
        }),
      );
      if (!res.ok)
        throw validationError("tableCode", "Failed to terminate match");

      // Return a placeholder match shape; actual match saved by SocketDO
      return {
        id: "",
        tableId: null,
        table: null,
        matchType: null,
        gszRecordId: null,
        gszSynced: false,
        gszError: null,
        gszSyncedAt: null,
        mode: null,
        format: null,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        terminationReason: "ADMIN_ABORT",
        players: [],
        playersJson: "[]",
        scores: null,
        config: null,
        createdAt: new Date().toISOString(),
        unsyncableReasons: [],
      };
    },

    async updateMahjongScore(
      _source: unknown,
      args: { matchId: string; players: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(updateScoreInputSchema, {
        matchId: args.matchId,
        players: args.players,
      });
      const tdb = dbFactory(ctx.env.DB);

      const match = await tdb.query.mahjongMatchesTable.findFirst({
        where: (m, { eq }) => eq(m.id, input.matchId),
      });
      if (!match) throw notFound("Match not found");

      const players = input.players.map((p) => ({
        userId: p.userId,
        nickname: p.nickname,
        seat: p.seat ?? null,
        finalScore: p.finalScore,
      }));

      await tdb
        .update(mahjongMatchesTable)
        .set({ players })
        .where(eq(mahjongMatchesTable.id, input.matchId));

      // If tournament and has gsz_record_id, sync score update to GSZ
      if (match.match_type === "tournament" && match.gsz_record_id) {
        const seatOrder = ["east", "south", "west", "north"];
        const sorted = [...players].sort(
          (a, b) =>
            seatOrder.indexOf(a.seat ?? "") - seatOrder.indexOf(b.seat ?? ""),
        );

        if (sorted.length === 4) {
          const endedAt =
            match.ended_at instanceof Date
              ? match.ended_at.getTime()
              : Number(match.ended_at);
          const pad = (n: number) => String(n).padStart(2, "0");
          const d = new Date(endedAt);
          const rateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

          const userIds = sorted.map((p) => p.userId);
          const registrations =
            await tdb.query.mahjongRegistrationsTable.findMany({
              where: (r, { inArray }) => inArray(r.user_id, userIds),
            });
          const phoneMap = new Map(
            registrations.map((r) => [r.user_id, r.phone]),
          );

          const phones = sorted.map((p) => phoneMap.get(p.userId) ?? "");
          const allHavePhones = phones.every(Boolean);

          if (allHavePhones) {
            try {
              await gszFetch(ctx.env, "/gszapi/open/score/update", {
                params: {
                  recordId: match.gsz_record_id,
                  phone1: phones[0],
                  phone2: phones[1],
                  phone3: phones[2],
                  phone4: phones[3],
                  point1: String(sorted[0].finalScore),
                  point2: String(sorted[1].finalScore),
                  point3: String(sorted[2].finalScore),
                  point4: String(sorted[3].finalScore),
                  rateTime,
                },
              });
            } catch {
              // GSZ sync is best-effort on score update
            }
          }
        }
      }

      // Publish leaderboard updates
      const cats = affectedCategories(
        match.match_type ?? null,
        match.mode,
        match.format,
      );
      await Promise.all(cats.map((c) => publishLeaderboardUpdated(ctx, c)));

      // Re-fetch updated match
      const updated = await tdb.query.mahjongMatchesTable.findFirst({
        where: (m, { eq }) => eq(m.id, input.matchId),
      });
      if (!updated) throw notFound("Match not found after update");
      return toGqlMatch(updated as unknown as MatchRow);
    },

    async syncMahjongMatchToGsz(
      _source: unknown,
      args: { matchId: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(syncToGszInputSchema, args);
      const result = await performGszSync(ctx.env, input.matchId);

      // Publish leaderboard update if synced successfully
      if (result.success) {
        const tdb = dbFactory(ctx.env.DB);
        const match = await tdb.query.mahjongMatchesTable.findFirst({
          where: (m, { eq }) => eq(m.id, input.matchId),
          columns: { match_type: true, mode: true, format: true },
        });
        if (match) {
          const cats = affectedCategories(
            match.match_type ?? null,
            match.mode,
            match.format,
          );
          await Promise.all(cats.map((c) => publishLeaderboardUpdated(ctx, c)));
        }
      }

      return {
        success: result.success,
        error: result.error ?? null,
        successCount: result.success ? 1 : 0,
        failCount: result.success ? 0 : 1,
        total: 1,
        match: null,
      };
    },

    async batchSyncMahjongMatchesToGsz(
      _source: unknown,
      args: { matchIds: string[] },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(batchSyncToGszInputSchema, args);

      const results = await Promise.allSettled(
        input.matchIds.map((id) => performGszSync(ctx.env, id)),
      );

      let successCount = 0;
      let failCount = 0;
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.success) successCount++;
        else failCount++;
      }

      return {
        success: failCount === 0,
        error: failCount > 0 ? `${failCount} syncs failed` : null,
        successCount,
        failCount,
        total: input.matchIds.length,
        match: null,
      };
    },

    async gszRegister(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(gszRegisterInputSchema, args.input);

      const gszId = await gszFetch<number>(ctx.env, "/gszapi/open/register", {
        params: input,
      });

      return {
        id: gszId,
        name: input.username,
        phone: input.phone,
        qq: input.qq ?? null,
        wechat: input.wechat ?? null,
        raw: JSON.stringify(input),
      };
    },

    async gszScoreAdd(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(gszScoreAddInputSchema, args.input);

      await gszFetch<number>(ctx.env, "/gszapi/open/score/add", {
        params: input,
      });

      // Return a placeholder match — GSZ score add doesn't produce a local match
      return {
        id: "",
        tableId: null,
        table: null,
        matchType: null,
        gszRecordId: null,
        gszSynced: false,
        gszError: null,
        gszSyncedAt: null,
        mode: null,
        format: null,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        terminationReason: null,
        players: [],
        playersJson: "[]",
        scores: null,
        config: null,
        createdAt: new Date().toISOString(),
        unsyncableReasons: [],
      };
    },

    async gszScoreUpdate(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(gszScoreUpdateInputSchema, args.input);

      await gszFetch(ctx.env, "/gszapi/open/score/update", {
        params: input,
      });

      // Return a placeholder match
      return {
        id: "",
        tableId: null,
        table: null,
        matchType: null,
        gszRecordId: input.recordId,
        gszSynced: true,
        gszError: null,
        gszSyncedAt: new Date().toISOString(),
        mode: null,
        format: null,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        terminationReason: null,
        players: [],
        playersJson: "[]",
        scores: null,
        config: null,
        createdAt: new Date().toISOString(),
        unsyncableReasons: [],
      };
    },
  },
};
