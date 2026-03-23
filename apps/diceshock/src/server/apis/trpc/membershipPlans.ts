import db, { drizzle, userMembershipPlansTable } from "@lib/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { protectedProcedure, publicProcedure } from "./baseTRPC";

const planTypeEnum = z.enum([
  "monthly",
  "monthly_cc",
  "yearly",
  "stored_value",
]);

const TIME_PLAN_TYPES = ["monthly", "monthly_cc", "yearly"] as const;

function isTimePlan(t: string): boolean {
  return (TIME_PLAN_TYPES as readonly string[]).includes(t);
}

interface Interval {
  id: string;
  start: number;
  end: number;
}

function findOverlaps(
  intervals: Interval[],
  target: { start: number; end: number },
  excludeId?: string,
): string[] {
  const ids: string[] = [];
  for (const iv of intervals) {
    if (excludeId && iv.id === excludeId) continue;
    if (target.start < iv.end && target.end > iv.start) {
      ids.push(iv.id);
    }
  }
  return ids;
}

async function getAllTimePlans(tdb: ReturnType<typeof db>, userId: string) {
  const all = await tdb.query.userMembershipPlansTable.findMany({
    where: (p, { eq, and, inArray }) =>
      and(eq(p.user_id, userId), inArray(p.plan_type, [...TIME_PLAN_TYPES])),
  });
  return all
    .filter((p) => p.start_date && p.end_date)
    .map((p) => ({
      id: p.id,
      start: new Date(p.start_date!).getTime(),
      end: new Date(p.end_date!).getTime(),
    }));
}

const getByUserId = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    return tdb.query.userMembershipPlansTable.findMany({
      where: (plan, { eq }) => eq(plan.user_id, input.userId),
      orderBy: (plan, { desc }) => desc(plan.start_date),
    });
  });

const getMyPlans = protectedProcedure
  .input(z.object({}).optional())
  .query(async ({ ctx }) => {
    const tdb = db(ctx.env.DB);
    return tdb.query.userMembershipPlansTable.findMany({
      where: (plan, { eq }) => eq(plan.user_id, ctx.userId!),
      orderBy: (plan, { desc }) => desc(plan.start_date),
    });
  });

const createZ = z.object({
  userId: z.string(),
  planType: planTypeEnum,
  amount: z.number().int().nullable().optional(),
  startDate: z.number(),
  endDate: z.number().nullable().optional(),
});

const create = publicProcedure
  .input(createZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    if (isTimePlan(input.planType) && input.endDate) {
      const existing = await getAllTimePlans(tdb, input.userId);
      const conflicts = findOverlaps(existing, {
        start: input.startDate,
        end: input.endDate,
      });
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: JSON.stringify({ conflictIds: conflicts }),
        });
      }
    }

    const [created] = await tdb
      .insert(userMembershipPlansTable)
      .values({
        user_id: input.userId,
        plan_type: input.planType,
        amount: input.amount ?? null,
        start_date: new Date(input.startDate),
        end_date: input.endDate ? new Date(input.endDate) : null,
      })
      .returning();
    return created;
  });

const updateZ = z.object({
  id: z.string(),
  planType: planTypeEnum.optional(),
  amount: z.number().int().nullable().optional(),
  startDate: z.number().optional(),
  endDate: z.number().nullable().optional(),
});

const update = publicProcedure
  .input(updateZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const current = await tdb.query.userMembershipPlansTable.findFirst({
      where: (p, { eq }) => eq(p.id, input.id),
    });
    if (!current) {
      throw new TRPCError({ code: "NOT_FOUND", message: "计划不存在" });
    }

    const finalType = input.planType ?? current.plan_type;
    const finalStart =
      input.startDate ??
      (current.start_date ? new Date(current.start_date).getTime() : 0);
    const finalEnd =
      input.endDate !== undefined
        ? input.endDate
        : current.end_date
          ? new Date(current.end_date).getTime()
          : null;

    if (isTimePlan(finalType) && finalEnd) {
      const existing = await getAllTimePlans(tdb, current.user_id);
      const conflicts = findOverlaps(
        existing,
        { start: finalStart, end: finalEnd },
        input.id,
      );
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: JSON.stringify({ conflictIds: [...conflicts, input.id] }),
        });
      }
    }

    const updateData: Record<string, unknown> = { update_at: new Date() };

    if (input.planType !== undefined) updateData.plan_type = input.planType;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.startDate !== undefined)
      updateData.start_date = new Date(input.startDate);
    if (input.endDate !== undefined)
      updateData.end_date = input.endDate ? new Date(input.endDate) : null;

    const [updated] = await tdb
      .update(userMembershipPlansTable)
      .set(updateData)
      .where(drizzle.eq(userMembershipPlansTable.id, input.id))
      .returning();
    return updated;
  });

const deduct = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      amount: z.number().int().positive(),
      note: z.string().min(1),
      date: z.number(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const svPlans = await tdb.query.userMembershipPlansTable.findMany({
      where: (p, { eq, and }) =>
        and(eq(p.user_id, input.userId), eq(p.plan_type, "stored_value")),
      orderBy: (p, { asc }) => asc(p.create_at),
    });

    const total = svPlans.reduce((s, p) => s + (p.amount ?? 0), 0);
    if (total < input.amount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `余额不足，当前余额 ¥${(total / 100).toFixed(0)}，扣费 ¥${(input.amount / 100).toFixed(0)}`,
      });
    }

    let remaining = input.amount;
    for (const plan of svPlans) {
      if (remaining <= 0) break;
      const available = plan.amount ?? 0;
      if (available <= 0) continue;
      const deductAmount = Math.min(available, remaining);
      await tdb
        .update(userMembershipPlansTable)
        .set({ amount: available - deductAmount, update_at: new Date() })
        .where(drizzle.eq(userMembershipPlansTable.id, plan.id));
      remaining -= deductAmount;
    }

    await tdb.insert(userMembershipPlansTable).values({
      user_id: input.userId,
      plan_type: "stored_value",
      amount: -input.amount,
      note: input.note,
      start_date: new Date(input.date),
    });

    return { success: true, deducted: input.amount };
  });

const remove = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .delete(userMembershipPlansTable)
      .where(drizzle.eq(userMembershipPlansTable.id, input.id));
    return { success: true };
  });

export default { getByUserId, getMyPlans, create, update, deduct, remove };
