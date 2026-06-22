import dbFactory, {
  activeRegistrationsTable,
  activesTable,
  drizzle,
} from "@lib/db";
import { z } from "zod/v4";
import type { GQLContext } from "../context";
import { notFound, validationError } from "../errors";
import { requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const createActiveSchema = z.object({
  title: z.string().min(1).max(100),
  boardGameId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm")
    .optional(),
  maxPlayers: z.number().int().min(2).max(100),
  content: z.string().optional(),
  isGame: z.boolean().default(true),
  storeId: z.string().optional(),
});

const joinActiveSchema = z.object({
  activeId: z.string().min(1),
  isWatching: z.boolean().default(false),
});

const leaveActiveSchema = z.object({
  activeId: z.string().min(1),
});

const updateActiveSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100).optional(),
  boardGameId: z.string().nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm")
    .nullable()
    .optional(),
  maxPlayers: z.number().int().min(2).max(100).optional(),
  content: z.string().nullable().optional(),
  isGame: z.boolean().optional(),
});

const removeActiveSchema = z.object({
  id: z.string().min(1),
});

const removeRegistrationSchema = z.object({
  registrationId: z.string().min(1),
});

const batchRemoveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

const activeParticipantsSchema = z.object({
  activeId: z.string().min(1),
});

// ─── Field Mappers ────────────────────────────────────────────────────────

function toGqlRegistration(
  reg: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: reg.id,
    activeId: reg.active_id ?? reg.activeId,
    userId: reg.user_id ?? reg.userId,
    isWatching: Boolean(reg.is_watching ?? reg.isWatching ?? false),
    nickname: (reg.nickname as string | undefined) ?? null,
    uid: (reg.uid as string | undefined) ?? null,
    createdAt: reg.create_at
      ? new Date(reg.create_at as number).toISOString()
      : null,
  };
}

function toGqlActive(row: Record<string, unknown>): Record<string, unknown> {
  const registrations = row.registrations as
    | Record<string, unknown>[]
    | undefined;
  return {
    id: row.id,
    creatorId: row.creator_id ?? row.creatorId,
    creator: row.creator ?? null,
    title: row.title,
    boardGameId: row.board_game_id ?? row.boardGameId ?? null,
    boardGame: row.boardGame ?? null,
    boardGames: row.boardGames ?? (row.boardGame ? [row.boardGame] : []),
    storeId: row.store_id ?? row.storeId ?? null,
    date: row.date,
    time: row.time ?? null,
    maxPlayers: row.max_players ?? row.maxPlayers,
    content: row.content ?? null,
    isGame: Boolean(row.is_game ?? row.isGame ?? true),
    isSystemRecommended: Boolean(
      row.is_system_recommended ?? row.isSystemRecommended ?? false,
    ),
    registrations: registrations
      ? registrations.map((r) => toGqlRegistration(r))
      : [],
    createdAt: row.create_at
      ? new Date(row.create_at as number).toISOString()
      : null,
    updatedAt: row.update_at
      ? new Date(row.update_at as number).toISOString()
      : null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type EnvWithPubSub = GQLContext["env"] & {
  PUBSUB: DurableObjectNamespace;
};

function envWithPubSub(ctx: GQLContext): EnvWithPubSub {
  return ctx.env as EnvWithPubSub;
}

async function fetchActive(
  tdb: ReturnType<typeof dbFactory>,
  id: string,
): Promise<Record<string, unknown> | null> {
  const row = await tdb.query.activesTable.findFirst({
    where: (a, { eq }) => eq(a.id, id),
    with: {
      creator: { columns: { id: true, name: true, image: true } },
      registrations: {
        columns: {
          id: true,
          active_id: true,
          user_id: true,
          is_watching: true,
          create_at: true,
        },
      },
    },
  });
  return (row as Record<string, unknown> | null) ?? null;
}

async function fetchActiveOrThrow(
  tdb: ReturnType<typeof dbFactory>,
  id: string,
): Promise<Record<string, unknown>> {
  const active = await fetchActive(tdb, id);
  if (!active) throw notFound("Active not found");
  return active;
}

async function publishEvent(
  ctx: GQLContext,
  activeId: string,
  event: { type: string; payload: Record<string, unknown> },
): Promise<void> {
  try {
    const env = envWithPubSub(ctx);
    const pubsubId = env.PUBSUB.idFromName(`active:${activeId}`);
    const stub = env.PUBSUB.get(pubsubId);
    await stub.fetch("https://internal/publish", {
      method: "POST",
      body: JSON.stringify({
        type: event.type,
        payload: event.payload,
        timestamp: Date.now(),
      }),
    });
  } catch {
    // PubSub is best-effort; don't fail the mutation
  }
}

// ─── Type Definitions ─────────────────────────────────────────────────────

export const activesTypeDefs = `
  extend type Mutation {
    createActive(input: CreateActiveInput!): Active!
    joinActive(input: JoinActiveInput!): ActiveRegistration!
    leaveActive(activeId: ID!): Active
    updateActive(input: UpdateActiveInput!): Active!
    removeActive(id: ID!): Active!
    removeActiveRegistration(registrationId: ID!): ActiveRegistration!
    batchRemoveActives(ids: [ID!]!): [Active!]!
  }

  extend type Query {
    activeParticipants(activeId: ID!): [ActiveRegistration!]!
  }
`;

// ─── Resolvers ────────────────────────────────────────────────────────────

export const activesResolvers = {
  Mutation: {
    async createActive(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(createActiveSchema, args.input);

      const tdb = dbFactory(ctx.env.DB);
      const [inserted] = await tdb
        .insert(activesTable)
        .values({
          creator_id: ctx.userId,
          title: input.title,
          board_game_id: input.boardGameId ?? null,
          date: input.date,
          time: input.time ?? null,
          max_players: input.maxPlayers,
          content: input.content ?? null,
          is_game: input.isGame,
          store_id: input.storeId ?? null,
        })
        .returning();

      await tdb.insert(activeRegistrationsTable).values({
        active_id: inserted.id,
        user_id: ctx.userId,
        is_watching: false,
      });

      const active = await fetchActiveOrThrow(tdb, inserted.id);

      await publishEvent(ctx, inserted.id, {
        type: "ACTIVE_CREATED",
        payload: {
          userId: ctx.userId,
          title: input.title,
          date: input.date,
        },
      });

      return toGqlActive(active);
    },

    async joinActive(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(joinActiveSchema, args.input);

      const tdb = dbFactory(ctx.env.DB);
      const active = await tdb.query.activesTable.findFirst({
        where: (a, { eq }) => eq(a.id, input.activeId),
        with: { registrations: true },
      });

      if (!active) throw notFound("Active not found");
      if (active.creator_id === ctx.userId) {
        throw validationError(
          "activeId",
          "Creator cannot join their own active",
        );
      }

      const existing = active.registrations.find(
        (r) => r.user_id === ctx.userId,
      );
      if (existing) {
        throw validationError("activeId", "Already joined this active");
      }

      if (!input.isWatching) {
        const joinedCount = active.registrations.filter(
          (r) => !r.is_watching,
        ).length;
        if (joinedCount >= active.max_players) {
          throw validationError("activeId", "Active is full");
        }
      }

      const [reg] = await tdb
        .insert(activeRegistrationsTable)
        .values({
          active_id: input.activeId,
          user_id: ctx.userId,
          is_watching: input.isWatching,
        })
        .returning();

      const userInfo = await tdb.query.userInfoTable.findFirst({
        where: (info, { eq }) => eq(info.id, ctx.userId),
        columns: { nickname: true, uid: true },
      });

      await publishEvent(ctx, input.activeId, {
        type: "PARTICIPANT_JOINED",
        payload: {
          userId: ctx.userId,
          nickname: userInfo?.nickname ?? "Anonymous",
        },
      });

      return toGqlRegistration({
        ...reg,
        nickname: userInfo?.nickname ?? "Anonymous",
        uid: userInfo?.uid ?? null,
      });
    },

    async leaveActive(
      _source: unknown,
      args: { activeId: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(leaveActiveSchema, args);

      const tdb = dbFactory(ctx.env.DB);
      const active = await tdb.query.activesTable.findFirst({
        where: (a, { eq }) => eq(a.id, input.activeId),
        columns: {
          id: true,
          creator_id: true,
          is_system_recommended: true,
        },
      });

      if (!active) throw notFound("Active not found");
      if (active.is_system_recommended) {
        throw validationError(
          "activeId",
          "Cannot leave a system-recommended active",
        );
      }

      if (active.creator_id === ctx.userId) {
        // Creator deletes: remove all registrations + active
        await tdb
          .delete(activeRegistrationsTable)
          .where(
            drizzle.eq(activeRegistrationsTable.active_id, input.activeId),
          );
        await tdb
          .delete(activesTable)
          .where(drizzle.eq(activesTable.id, input.activeId));

        await publishEvent(ctx, input.activeId, {
          type: "ACTIVE_DELETED",
          payload: { userId: ctx.userId },
        });

        return null;
      }

      // Participant leaves: remove only their registration
      await tdb
        .delete(activeRegistrationsTable)
        .where(
          drizzle.and(
            drizzle.eq(activeRegistrationsTable.active_id, input.activeId),
            drizzle.eq(activeRegistrationsTable.user_id, ctx.userId),
          ),
        );

      await publishEvent(ctx, input.activeId, {
        type: "PARTICIPANT_LEFT",
        payload: { userId: ctx.userId },
      });

      const updated = await fetchActiveOrThrow(tdb, input.activeId);
      return toGqlActive(updated);
    },

    async updateActive(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(updateActiveSchema, args.input);

      const tdb = dbFactory(ctx.env.DB);
      const { id, ...fields } = input;

      const updateData: Record<string, unknown> = {
        update_at: new Date(),
      };
      if (fields.title !== undefined) updateData.title = fields.title;
      if (fields.boardGameId !== undefined)
        updateData.board_game_id = fields.boardGameId;
      if (fields.date !== undefined) updateData.date = fields.date;
      if (fields.time !== undefined) updateData.time = fields.time;
      if (fields.maxPlayers !== undefined)
        updateData.max_players = fields.maxPlayers;
      if (fields.content !== undefined) updateData.content = fields.content;
      if (fields.isGame !== undefined) updateData.is_game = fields.isGame;

      if (Object.keys(updateData).length <= 1) {
        throw validationError("input", "No fields to update");
      }

      await tdb
        .update(activesTable)
        .set(updateData)
        .where(drizzle.eq(activesTable.id, id));

      const active = await fetchActiveOrThrow(tdb, id);
      return toGqlActive(active);
    },

    async removeActive(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(removeActiveSchema, args);

      const tdb = dbFactory(ctx.env.DB);
      const active = await fetchActiveOrThrow(tdb, input.id);

      await tdb
        .delete(activeRegistrationsTable)
        .where(drizzle.eq(activeRegistrationsTable.active_id, input.id));
      await tdb
        .delete(activesTable)
        .where(drizzle.eq(activesTable.id, input.id));

      return toGqlActive(active);
    },

    async removeActiveRegistration(
      _source: unknown,
      args: { registrationId: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(removeRegistrationSchema, args);

      const tdb = dbFactory(ctx.env.DB);
      const registration = await tdb.query.activeRegistrationsTable.findFirst({
        where: (r, { eq }) => eq(r.id, input.registrationId),
        columns: {
          id: true,
          active_id: true,
          user_id: true,
          is_watching: true,
          create_at: true,
        },
      });

      if (!registration) throw notFound("Registration not found");

      await tdb
        .delete(activeRegistrationsTable)
        .where(drizzle.eq(activeRegistrationsTable.id, input.registrationId));

      return toGqlRegistration(registration as Record<string, unknown>);
    },

    async batchRemoveActives(
      _source: unknown,
      args: { ids: string[] },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(batchRemoveSchema, args);

      const tdb = dbFactory(ctx.env.DB);

      const rows = await tdb.query.activesTable.findMany({
        where: (a, { inArray }) => inArray(a.id, input.ids),
        with: {
          creator: { columns: { id: true, name: true, image: true } },
          registrations: {
            columns: {
              id: true,
              active_id: true,
              user_id: true,
              is_watching: true,
              create_at: true,
            },
          },
        },
      });

      await tdb
        .delete(activeRegistrationsTable)
        .where(drizzle.inArray(activeRegistrationsTable.active_id, input.ids));
      await tdb
        .delete(activesTable)
        .where(drizzle.inArray(activesTable.id, input.ids));

      return rows.map((r) => toGqlActive(r as Record<string, unknown>));
    },
  },
  Query: {
    async activeParticipants(
      _source: unknown,
      args: { activeId: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(activeParticipantsSchema, args);

      const tdb = dbFactory(ctx.env.DB);
      const registrations = await tdb.query.activeRegistrationsTable.findMany({
        where: (r, { eq }) => eq(r.active_id, input.activeId),
      });

      const participants = await Promise.all(
        registrations.map(async (reg) => {
          const userInfo = await tdb.query.userInfoTable.findFirst({
            where: (info, { eq }) => eq(info.id, reg.user_id),
            columns: { nickname: true, uid: true },
          });
          return toGqlRegistration({
            ...reg,
            nickname: userInfo?.nickname ?? "Anonymous",
            uid: userInfo?.uid ?? null,
          });
        }),
      );

      return participants;
    },
  },
};
