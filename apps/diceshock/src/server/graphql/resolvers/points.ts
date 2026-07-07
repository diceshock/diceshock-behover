import dbFactory, { drizzle, userInfoTable, userMembershipPlansTable } from "@lib/db";
import type { Database } from "@lib/db";
import { z } from "zod/v4";
import type { GQLContext } from "../context";
import { notFound } from "../errors";
import { requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

type PlanRow = typeof userMembershipPlansTable.$inferSelect;

function toIsoString(value: Date | number | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: PlanRow) {
  return {
    id: row.id,
    userId: row.user_id,
    planType: row.plan_type.toUpperCase(),
    amount: row.amount,
    points: row.points,
    note: row.note,
    orderId: row.order_id ?? null,
    startDate: row.start_date ? toIsoString(row.start_date) : null,
    endDate: row.end_date ? toIsoString(row.end_date) : null,
    createdAt: row.create_at ? toIsoString(row.create_at) : null,
    updatedAt: row.update_at ? toIsoString(row.update_at) : null,
  };
}

const addPointsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  note: z.string().nullable().optional(),
});

const deductPointsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  note: z.string().nullable().optional(),
});

async function getCurrentBalance(
  tdb: Database,
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
      // Return membership plan entries where points is non-null and non-zero
      const rows = await tdb.query.userMembershipPlansTable.findMany({
        where: (t, { eq, and, ne }) =>
          and(eq(t.user_id, args.userId), ne(t.points, 0)),
        orderBy: (t, { desc }) => desc(t.create_at),
      });
      return rows.filter((r) => r.points != null && r.points !== 0).map(mapRow);
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
        .insert(userMembershipPlansTable)
        .values({
          user_id: input.userId,
          plan_type: "stored_value",
          amount: 0,
          points: input.amount,
          note: input.note ?? null,
          start_date: new Date(),
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
      // Allow negative balance (赊 a small amount is ok per requirements)
      const newBalance = currentBalance - input.amount;

      await tdb
        .update(userInfoTable)
        .set({ points: newBalance })
        .where(drizzle.eq(userInfoTable.id, input.userId));

      const [record] = await tdb
        .insert(userMembershipPlansTable)
        .values({
          user_id: input.userId,
          plan_type: "stored_value",
          amount: 0,
          points: -input.amount,
          note: input.note ?? null,
          start_date: new Date(),
        })
        .returning();

      if (!record) {
        throw notFound("Failed to record points deduction");
      }

      return mapRow(record);
    },
  },
};
