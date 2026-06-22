import dbFactory, {
  activeRegistrationsTable,
  activesTable,
  boardGamesTable,
  drizzle,
  sessions,
  userBusinessCardTable,
  userInfoTable,
  users,
} from "@lib/db";
import { BoardGame } from "@lib/utils";
import { z } from "zod/v4";
import type { GQLContext } from "../context";
import { forbidden, notFound, validationError } from "../errors";
import { requireAdmin, requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

// ─── Helpers ─────────────────────────────────────────────────────────────

function toIsoString(value: Date | number | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

async function getUserProfile(ctx: GQLContext, userId: string) {
  const tdb = dbFactory(ctx.env.DB);
  const user = await tdb.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    with: { userInfo: true, membershipPlans: true },
  });

  if (!user || !user.userInfo) return null;

  return {
    id: user.id,
    uid: user.userInfo.uid,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role.toUpperCase(),
    nickname: user.userInfo.nickname,
    phone: user.userInfo.phone,
    preferredLocale: user.userInfo.preferred_locale,
    preferredStoreId: user.userInfo.preferred_store_id,
    meta: user.userInfo.meta ? JSON.stringify(user.userInfo.meta) : null,
    createdAt: toIsoString(user.userInfo.create_at),
    membershipPlans: (user.membershipPlans ?? []).map((plan) => ({
      id: plan.id,
      userId: plan.user_id,
      planType: plan.plan_type.toUpperCase(),
      amount: plan.amount,
      note: plan.note,
      startDate: toIsoString(plan.start_date),
      endDate: toIsoString(plan.end_date),
      createdAt: toIsoString(plan.create_at),
      updatedAt: toIsoString(plan.update_at),
    })),
  };
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const upsertBusinessCardSchema = z.object({
  sharePhone: z.boolean().optional().default(false),
  wechat: z.string().nullable().optional(),
  qq: z.string().nullable().optional(),
  customContent: z.string().nullable().optional(),
});

const businessCardSchema = z.object({
  userId: z.string().min(1),
  activeId: z.string().min(1),
});

const participantBusinessCardsSchema = z.object({
  activeId: z.string().min(1),
});

const userSearchSchema = z.object({
  searchWords: z.string().nullable().optional(),
  pagination: z
    .object({
      offset: z.number().int().min(0).optional().default(0),
      limit: z.number().int().min(1).max(100).optional().default(20),
    })
    .optional()
    .default({ offset: 0, limit: 20 }),
});

const userByIdSchema = z.object({
  id: z.string().min(1),
});

const disableUserSchema = z.object({
  id: z.string().min(1),
});

const updateRoleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]),
});

const ownedGameFilterSchema = z.object({
  searchWords: z.string().nullable().optional(),
  numOfPlayers: z.number().int().nullable().optional(),
  isBestNumOfPlayers: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  pagination: z
    .object({
      offset: z.number().int().min(0).optional().default(0),
      limit: z.number().int().min(1).max(100).optional().default(20),
    })
    .optional()
    .default({ offset: 0, limit: 20 }),
});

const ownedGameByIdSchema = z.object({
  id: z.string().min(1),
});

const syncOwnedSchema = z.object({
  pageFrom: z.number().int().min(1),
  pageTo: z.number().int().min(1),
  date: z.string().min(1),
});

const wakeOwnedSchema = z.object({
  date: z.string().min(1),
});

// ─── TypeDefs ──────────────────────────────────────────────────────────────

export const usersTypeDefs = `
  extend type Query {
    myBusinessCard: BusinessCard
    businessCard(userId: ID!, activeId: ID!): BusinessCard
    participantBusinessCards(activeId: ID!): [BusinessCard!]!
    users(input: UserSearchInput = {}): UserListResult!
    user(id: ID!): UserProfile
    ownedBoardGames(input: BoardGameFilterInput = {}): [BoardGameSummary!]!
    ownedBoardGameCount: BoardGameCounts!
    ownedBoardGame(id: ID!): BoardGameSummary
  }

  extend type Mutation {
    upsertBusinessCard(input: UpsertBusinessCardInput!): BusinessCard!
    disableUser(id: ID!): UserProfile!
    updateUserRole(input: UpdateRoleInput!): UserProfile!
    syncOwnedBoardGames(pageFrom: Int!, pageTo: Int!, date: String!): BoardGameSyncResult!
    wakeOwnedBoardGames(date: String!): BoardGameSyncResult!
  }
`;

// ─── Resolvers ─────────────────────────────────────────────────────────────

export const usersResolvers = {
  Query: {
    // ── BusinessCards ───────────────────────────────────────────────

    async myBusinessCard(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);

      const card = await tdb.query.userBusinessCardTable.findFirst({
        where: (c, { eq }) => eq(c.id, ctx.userId),
      });

      const userInfo = await tdb.query.userInfoTable.findFirst({
        where: (info, { eq }) => eq(info.id, ctx.userId),
      });

      if (!userInfo) return null;

      return {
        userId: ctx.userId,
        nickname: userInfo.nickname,
        uid: userInfo.uid,
        sharePhone: card?.share_phone ?? false,
        phone: card?.share_phone ? userInfo.phone : null,
        wechat: card?.wechat ?? null,
        qq: card?.qq ?? null,
        customContent: card?.custom_content ?? null,
        isWatching: null,
        registrationId: null,
        createdAt: card?.create_at ? toIsoString(card.create_at) : null,
        updatedAt: card?.update_at ? toIsoString(card.update_at) : null,
      };
    },

    async businessCard(
      _source: unknown,
      args: { userId: string; activeId: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(businessCardSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      // Verify the viewer is part of this active (creator or participant)
      const active = await tdb.query.activesTable.findFirst({
        where: (a, { eq, and }) =>
          and(eq(a.id, input.activeId), eq(a.is_game, true)),
        columns: { creator_id: true },
      });

      if (!active) throw notFound("Active not found or is not a game");

      if (active.creator_id !== ctx.userId) {
        throw forbidden(
          "Only the active creator can view participant business cards",
        );
      }

      const card = await tdb.query.userBusinessCardTable.findFirst({
        where: (c, { eq }) => eq(c.id, input.userId),
      });

      const userInfo = await tdb.query.userInfoTable.findFirst({
        where: (info, { eq }) => eq(info.id, input.userId),
      });

      if (!userInfo) return null;

      return {
        userId: input.userId,
        nickname: userInfo.nickname,
        uid: userInfo.uid,
        sharePhone: card?.share_phone ?? false,
        phone: card?.share_phone ? userInfo.phone : null,
        wechat: card?.wechat ?? null,
        qq: card?.qq ?? null,
        customContent: card?.custom_content ?? null,
        isWatching: null,
        registrationId: null,
        createdAt: card?.create_at ? toIsoString(card.create_at) : null,
        updatedAt: card?.update_at ? toIsoString(card.update_at) : null,
      };
    },

    async participantBusinessCards(
      _source: unknown,
      args: { activeId: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(participantBusinessCardsSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const active = await tdb.query.activesTable.findFirst({
        where: (a, { eq, and }) =>
          and(eq(a.id, input.activeId), eq(a.is_game, true)),
        columns: { creator_id: true },
      });

      if (!active) throw notFound("Active not found or is not a game");

      if (active.creator_id !== ctx.userId) {
        throw forbidden(
          "Only the active creator can view participant business cards",
        );
      }

      const registrations = await tdb.query.activeRegistrationsTable.findMany({
        where: (reg, { eq }) => eq(reg.active_id, input.activeId),
      });

      const participants = await Promise.all(
        registrations.map(async (reg) => {
          const userId = reg.user_id;

          const userInfo = await tdb.query.userInfoTable.findFirst({
            where: (info, { eq }) => eq(info.id, userId),
          });

          if (!userInfo) return null;

          const card = await tdb.query.userBusinessCardTable.findFirst({
            where: (c, { eq }) => eq(c.id, userId),
          });

          return {
            userId,
            nickname: userInfo.nickname,
            uid: userInfo.uid,
            sharePhone: card?.share_phone ?? false,
            phone: card?.share_phone ? userInfo.phone : null,
            wechat: card?.wechat ?? null,
            qq: card?.qq ?? null,
            customContent: card?.custom_content ?? null,
            isWatching: reg.is_watching,
            registrationId: reg.id,
            createdAt: reg.create_at ? toIsoString(reg.create_at) : null,
            updatedAt: card?.update_at ? toIsoString(card.update_at) : null,
          };
        }),
      );

      return participants.filter((p): p is NonNullable<typeof p> => p !== null);
    },

    // ── Users ────────────────────────────────────────────────────────

    async managedUsers(
      _source: unknown,
      args: { input?: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(userSearchSchema, args.input ?? {});
      const tdb = dbFactory(ctx.env.DB);

      const { offset, limit } = input.pagination!;
      const { searchWords } = input;

      let matchingIds: string[] | undefined;

      if (searchWords) {
        const matchingUserInfos = await tdb.query.userInfoTable.findMany({
          where: (ui, { or, like }) =>
            or(
              like(ui.uid, `%${searchWords}%`),
              like(ui.nickname, `%${searchWords}%`),
              like(ui.phone, `%${searchWords}%`),
            ),
          columns: { id: true },
        });

        matchingIds = matchingUserInfos.map((u) => u.id);

        if (searchWords.length >= 8) {
          matchingIds.push(searchWords);
        }
      }

      const queryOptions: Parameters<typeof tdb.query.users.findMany>[0] = {
        with: {
          userInfo: true,
          membershipPlans: true,
        },
        limit,
        offset,
        orderBy: (u, { desc }) => desc(u.id),
      };

      if (matchingIds && matchingIds.length > 0) {
        queryOptions.where = (u, { or, inArray, like }) =>
          or(
            inArray(u.id, matchingIds),
            like(u.name, `%${searchWords}%`),
            like(u.email, `%${searchWords}%`),
          );
      } else if (searchWords) {
        queryOptions.where = (u, { or, like }) =>
          or(
            like(u.name, `%${searchWords}%`),
            like(u.email, `%${searchWords}%`),
          );
      }

      const userList = await tdb.query.users.findMany(queryOptions);

      const items = userList.map((user) => {
        const u = user as typeof user & {
          userInfo: {
            uid: string;
            nickname: string;
            phone: string | null;
            preferred_locale: string | null;
            preferred_store_id: string | null;
            create_at: Date | null;
            meta: { auto_nickname?: boolean } | null;
          } | null;
          membershipPlans: Array<{
            id: string;
            user_id: string;
            plan_type: string;
            amount: number | null;
            note: string | null;
            start_date: Date | null;
            end_date: Date | null;
            create_at: Date | null;
            update_at: Date | null;
          }>;
        };

        return {
          id: u.id,
          uid: u.userInfo?.uid ?? null,
          name: u.name,
          email: u.email,
          image: u.image,
          role: u.role.toUpperCase(),
          nickname: u.userInfo?.nickname ?? null,
          phone: u.userInfo?.phone ?? null,
          preferredLocale: u.userInfo?.preferred_locale ?? null,
          preferredStoreId: u.userInfo?.preferred_store_id ?? null,
          meta: u.userInfo?.meta ? JSON.stringify(u.userInfo.meta) : null,
          createdAt: toIsoString(u.userInfo?.create_at ?? null),
          membershipPlans: (u.membershipPlans ?? []).map((plan) => ({
            id: plan.id,
            userId: plan.user_id,
            planType: plan.plan_type.toUpperCase(),
            amount: plan.amount,
            note: plan.note,
            startDate: toIsoString(plan.start_date),
            endDate: toIsoString(plan.end_date),
            createdAt: toIsoString(plan.create_at),
            updatedAt: toIsoString(plan.update_at),
          })),
        };
      });

      return {
        items,
        pageInfo: {
          offset,
          limit,
          total: null,
          hasMore: items.length === limit,
        },
      };
    },

    async user(_source: unknown, args: { id: string }, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(userByIdSchema, args);
      return getUserProfile(ctx, input.id);
    },

    // ── Owned Games ───────────────────────────────────────────────────

    async ownedBoardGames(
      _source: unknown,
      args: { input?: unknown },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(ownedGameFilterSchema, args.input ?? {});
      const tdb = dbFactory(ctx.env.DB);

      const { offset, limit } = input.pagination!;
      const trimmedSearchWords = input.searchWords?.trim();
      const playerNum = input.isBestNumOfPlayers
        ? undefined
        : (input.numOfPlayers ?? undefined);
      const bestPlayerNum = input.isBestNumOfPlayers
        ? (input.numOfPlayers ?? undefined)
        : undefined;

      const games = await tdb.query.boardGamesTable.findMany({
        where: (game, { like, or, and, eq }) =>
          and(
            eq(game.removeDate, new Date(0)),
            trimmedSearchWords
              ? or(
                  like(game.sch_name, `%${trimmedSearchWords}%`),
                  like(game.eng_name, `%${trimmedSearchWords}%`),
                )
              : undefined,
            input.tags.includes("PARTY")
              ? or(
                  like(game.category, "%Party%"),
                  like(game.category, "%Puzzle%"),
                )
              : undefined,
            input.tags.includes("RPG")
              ? or(
                  like(game.category, "%American-style%"),
                  like(game.category, "%Role Playing$"),
                )
              : undefined,
            input.tags.includes("SCORE_RACE")
              ? or(
                  like(game.category, "%Euro-style%"),
                  like(game.category, "%Abstract%"),
                )
              : undefined,
            playerNum === undefined
              ? undefined
              : like(game.player_num, `%${playerNum}%`),
            bestPlayerNum === undefined
              ? undefined
              : like(game.player_num, `%${bestPlayerNum}%`),
          ),
        limit,
        offset,
        orderBy: (game, { desc }) => desc(game.gstone_rating),
      });

      return games.map((g) => ({
        id: g.id,
        schName: g.sch_name,
        engName: g.eng_name,
        gstoneId: g.gstone_id,
        gstoneRating: g.gstone_rating,
        category: typeof g.category === "string" ? g.category : null,
        mode: typeof g.mode === "string" ? g.mode : null,
        playerNum: Array.isArray(g.player_num)
          ? g.player_num.join(",")
          : String(g.player_num ?? ""),
        bestPlayerNum: Array.isArray(g.best_player_num)
          ? g.best_player_num.join(",")
          : String(g.best_player_num ?? ""),
        content: g.content ? JSON.stringify(g.content) : null,
        removeDate: g.removeDate ? toIsoString(g.removeDate) : null,
      }));
    },

    async ownedBoardGameCount(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      const tdb = dbFactory(ctx.env.DB);

      const [{ current }] = await tdb
        .select({ current: drizzle.count(boardGamesTable.id) })
        .from(boardGamesTable)
        .where(drizzle.eq(boardGamesTable.removeDate, new Date(0)));

      const [{ removed }] = await tdb
        .select({ removed: drizzle.count(boardGamesTable.id) })
        .from(boardGamesTable)
        .where(drizzle.gt(boardGamesTable.removeDate, new Date(0)));

      const latestGame = await tdb
        .select({ removeDate: boardGamesTable.removeDate })
        .from(boardGamesTable)
        .orderBy(drizzle.desc(boardGamesTable.removeDate))
        .limit(1);

      const latestDate =
        latestGame.length > 0 && latestGame[0]?.removeDate
          ? toIsoString(latestGame[0].removeDate)
          : null;

      return { current, removed, latestDate };
    },

    async ownedBoardGame(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(ownedGameByIdSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const game = await tdb.query.boardGamesTable.findFirst({
        where: (g, { eq }) => eq(g.id, input.id),
      });

      if (!game) return null;

      return {
        id: game.id,
        schName: game.sch_name,
        engName: game.eng_name,
        gstoneId: game.gstone_id,
        gstoneRating: game.gstone_rating,
        category: typeof game.category === "string" ? game.category : null,
        mode: typeof game.mode === "string" ? game.mode : null,
        playerNum: Array.isArray(game.player_num)
          ? game.player_num.join(",")
          : String(game.player_num ?? ""),
        bestPlayerNum: Array.isArray(game.best_player_num)
          ? game.best_player_num.join(",")
          : String(game.best_player_num ?? ""),
        content: game.content ? JSON.stringify(game.content) : null,
        removeDate: game.removeDate ? toIsoString(game.removeDate) : null,
      };
    },
  },

  Mutation: {
    // ── BusinessCards ───────────────────────────────────────────────

    async upsertBusinessCard(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(upsertBusinessCardSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);
      const userId = ctx.userId;

      const existing = await tdb.query.userBusinessCardTable.findFirst({
        where: (card, { eq }) => eq(card.id, userId),
      });

      const updateData = {
        share_phone: input.sharePhone,
        wechat: input.wechat ?? null,
        qq: input.qq ?? null,
        custom_content: input.customContent ?? null,
        update_at: new Date(),
      };

      let card: typeof userBusinessCardTable.$inferSelect;

      if (existing) {
        const [updated] = await tdb
          .update(userBusinessCardTable)
          .set(updateData)
          .where(drizzle.eq(userBusinessCardTable.id, userId))
          .returning();
        card = updated;
      } else {
        const [created] = await tdb
          .insert(userBusinessCardTable)
          .values({
            id: userId,
            ...updateData,
          })
          .returning();
        card = created;
      }

      const userInfo = await tdb.query.userInfoTable.findFirst({
        where: (info, { eq }) => eq(info.id, userId),
      });

      if (!userInfo) throw notFound("User profile not found");

      return {
        userId,
        nickname: userInfo.nickname,
        uid: userInfo.uid,
        sharePhone: card.share_phone,
        phone: card.share_phone ? userInfo.phone : null,
        wechat: card.wechat,
        qq: card.qq,
        customContent: card.custom_content,
        isWatching: null,
        registrationId: null,
        createdAt: card.create_at ? toIsoString(card.create_at) : null,
        updatedAt: card.update_at ? toIsoString(card.update_at) : null,
      };
    },

    // ── Users ────────────────────────────────────────────────────────

    async disableUser(_source: unknown, args: { id: string }, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(disableUserSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      // Verify user exists
      const userProfile = await getUserProfile(ctx, input.id);
      if (!userProfile) throw notFound("User not found");

      // Disable by deleting all active sessions
      await tdb.delete(sessions).where(drizzle.eq(sessions.userId, input.id));

      return userProfile;
    },

    async updateUserRole(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAdmin(ctx);
      const input = zodToGraphQLError(updateRoleSchema, args.input);

      if (input.id === ctx.userId) {
        throw validationError("input.id", "Cannot modify your own role");
      }

      const tdb = dbFactory(ctx.env.DB);

      await tdb
        .update(users)
        .set({
          role: input.role.toLowerCase() as "customer" | "staff" | "admin",
        })
        .where(drizzle.eq(users.id, input.id));

      const userProfile = await getUserProfile(ctx, input.id);
      if (!userProfile) throw notFound("User not found");

      return userProfile;
    },

    // ── Owned Games ───────────────────────────────────────────────────

    async syncOwnedBoardGames(
      _source: unknown,
      args: { pageFrom: number; pageTo: number; date: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(syncOwnedSchema, args);

      const dateValue = new Date(input.date).getTime();

      await BoardGame.fetchToDb(
        ctx.env.DB,
        input.pageFrom,
        input.pageTo,
        dateValue,
      );

      return {
        success: true,
        message: null,
        processed: input.pageTo - input.pageFrom + 1,
      };
    },

    async wakeOwnedBoardGames(
      _source: unknown,
      args: { date: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(wakeOwnedSchema, args);

      const dateValue = new Date(input.date).getTime();

      await BoardGame.setDateToCurry(ctx.env.DB, dateValue);

      return {
        success: true,
        message: null,
        processed: 0,
      };
    },
  },
};
