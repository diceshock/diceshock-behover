import dbFactory, { drizzle, userInfoTable, userPointsLogTable } from "@lib/db";
import { z } from "zod/v4";
import type { GQLContext } from "../context";
import { notFound, validationError } from "../errors";
import { requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

type PointsRow = typeof userPointsLogTable.$inferSelect;

function mapRow(row: PointsRow) {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    balanceAfter: row.balance_after,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.create_at ? row.create_at.toISOString() : null,
  };
}

const addPointsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().nullable().optional(),
});

const deductPointsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().nullable().optional(),
});

async function getCurrentBalance(
  tdb: ReturnType<typeof dbFactory>,
  userId: string,
): Promise<number> {
  const info = await tdb.query.userInfoTable.findFirst({
    where: (t, { eq }) => eq(t.id, userId),
    columns: { points: true },
  });
  return info?.points ?? 0;
}

export const pointsResolvers = {
  Query: {
    async pointsLogByUser(
      _source: unknown,
      args: { userId: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = dbFactory(ctx.env.DB);
      const logs = await tdb.query.userPointsLogTable.findMany({
        where: (t, { eq }) => eq(t.user_id, args.userId),
        orderBy: (t, { desc }) => desc(t.create_at),
      });
      return logs.map(mapRow);
    },

    async myPointsBalance(_source: unknown, _args: unknown, ctx: GQLContext) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);
      return getCurrentBalance(tdb, ctx.userId);
    },
  },

  Mutation: {
    async addPoints(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(addPointsSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const currentBalance = await getCurrentBalance(tdb, input.userId);
      const newBalance = currentBalance + input.amount;

      await tdb
        .update(userInfoTable)
        .set({ points: newBalance })
        .where(drizzle.eq(userInfoTable.id, input.userId));

      const [record] = await tdb
        .insert(userPointsLogTable)
        .values({
          user_id: input.userId,
          amount: input.amount,
          balance_after: newBalance,
          note: input.note ?? null,
          created_by: ctx.userId ?? null,
        })
        .returning();

      if (!record) {
        throw notFound("Failed to record points addition");
      }

      return mapRow(record);
    },

    async deductPoints(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(deductPointsSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const currentBalance = await getCurrentBalance(tdb, input.userId);
      if (currentBalance < input.amount) {
        throw validationError(
          "input.amount",
          `Insufficient points (current: ${currentBalance}, deduct: ${input.amount})`,
        );
      }

      const newBalance = currentBalance - input.amount;

      await tdb
        .update(userInfoTable)
        .set({ points: newBalance })
        .where(drizzle.eq(userInfoTable.id, input.userId));

      const [record] = await tdb
        .insert(userPointsLogTable)
        .values({
          user_id: input.userId,
          amount: -input.amount,
          balance_after: newBalance,
          note: input.note ?? null,
          created_by: ctx.userId ?? null,
        })
        .returning();

      if (!record) {
        throw notFound("Failed to record points deduction");
      }

      return mapRow(record);
    },
  },
};
