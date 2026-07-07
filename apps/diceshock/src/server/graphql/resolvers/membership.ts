import dbFactory, { drizzle, userMembershipPlansTable } from "@lib/db";
import { z } from "zod/v4";
import type { GQLContext } from "../context";
import { notFound, validationError } from "../errors";
import { requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

// ─── Helpers ─────────────────────────────────────────────────────────────

type PlanRow = typeof userMembershipPlansTable.$inferSelect;

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

async function getAllTimePlans(
  tdb: ReturnType<typeof dbFactory>,
  userId: string,
) {
  const all = await tdb.query.userMembershipPlansTable.findMany({
    where: (p, { eq, and, inArray }) =>
      and(eq(p.user_id, userId), inArray(p.plan_type, [...TIME_PLAN_TYPES])),
  });
  return all
    .filter((p) => p.start_date && p.end_date)
    .map((p) => ({
      id: p.id,
      start: p.start_date!.getTime(),
      end: p.end_date!.getTime(),
    }));
}

function toIsoString(value: Date | number | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function planTypeToEnum(pt: string): string {
  return pt.toUpperCase();
}

function planTypeFromEnum(pt: string): (typeof TIME_PLAN_TYPES)[number] {
  // Expects STORED_VALUE, MONTHLY, MONTHLY_CC, YEARLY from GraphQL enum
  const lowered = pt.toLowerCase();
  return lowered as (typeof TIME_PLAN_TYPES)[number];
}

function mapRow(row: PlanRow) {
  return {
    id: row.id,
    userId: row.user_id,
    planType: planTypeToEnum(row.plan_type),
    amount: row.amount,
    note: row.note,
    orderId: row.order_id ?? null,
    startDate: row.start_date ? toIsoString(row.start_date) : null,
    endDate: row.end_date ? toIsoString(row.end_date) : null,
    createdAt: row.create_at ? toIsoString(row.create_at) : null,
    updatedAt: row.update_at ? toIsoString(row.update_at) : null,
  };
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const planTypeEnum = z.enum([
  "MONTHLY",
  "MONTHLY_CC",
  "YEARLY",
  "STORED_VALUE",
]);

const createPlanSchema = z.object({
  userId: z.string().min(1),
  planType: planTypeEnum,
  amount: z.number().int().nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
});

const updatePlanSchema = z.object({
  id: z.string().min(1),
  planType: planTypeEnum.optional(),
  amount: z.number().int().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
});

const removePlanSchema = z.object({
  id: z.string().min(1),
});

const deductSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().min(1),
  date: z.string().min(1),
});

const plansByUserSchema = z.object({
  userId: z.string().min(1),
});

// ─── TypeDefs ──────────────────────────────────────────────────────────────

export const membershipTypeDefs = `
  extend type Query {
    membershipPlansByUser(userId: ID!): [MembershipPlan!]!
    myMembershipPlans: [MembershipPlan!]!
  }

  extend type Mutation {
    createMembershipPlan(input: CreateMembershipPlanInput!): MembershipPlan!
    updateMembershipPlan(input: UpdateMembershipPlanInput!): MembershipPlan!
    removeMembershipPlan(id: ID!): MembershipPlan!
    deductStoredValue(input: DeductStoredValueInput!): MembershipDeductionResult!
  }
`;

// ─── Resolvers ─────────────────────────────────────────────────────────────

export const membershipResolvers = {
  Query: {
    async myMembershipPlans(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);
      const rows = await tdb.query.userMembershipPlansTable.findMany({
        where: (plan, { eq }) => eq(plan.user_id, ctx.userId),
        orderBy: (plan, { desc }) => desc(plan.start_date),
      });
      return rows.map(mapRow);
    },

    async membershipPlansByUser(
      _source: unknown,
      args: { userId: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(plansByUserSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const rows = await tdb.query.userMembershipPlansTable.findMany({
        where: (plan, { eq }) => eq(plan.user_id, input.userId),
        orderBy: (plan, { desc }) => desc(plan.start_date),
      });
      return rows.map(mapRow);
    },
  },

  Mutation: {
    async createMembershipPlan(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(createPlanSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const startDate = new Date(input.startDate).getTime();
      const endDate = input.endDate ? new Date(input.endDate).getTime() : null;

      if (isTimePlan(input.planType.toLowerCase()) && endDate) {
        const existing = await getAllTimePlans(tdb, input.userId);
        const conflicts = findOverlaps(existing, {
          start: startDate,
          end: endDate,
        });
        if (conflicts.length > 0) {
          throw validationError(
            "input.startDate",
            `Time range overlaps with existing plans: ${conflicts.join(", ")}`,
          );
        }
      }

      const [created] = await tdb
        .insert(userMembershipPlansTable)
        .values({
          user_id: input.userId,
          plan_type: planTypeFromEnum(input.planType),
          amount: input.amount ?? null,
          start_date: new Date(startDate),
          end_date: endDate ? new Date(endDate) : null,
        })
        .returning();

      if (!created) {
        throw notFound("Failed to create membership plan");
      }

      return mapRow(created);
    },

    async updateMembershipPlan(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(updatePlanSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const current = await tdb.query.userMembershipPlansTable.findFirst({
        where: (p, { eq }) => eq(p.id, input.id),
      });
      if (!current) {
        throw notFound("Membership plan not found");
      }

      const finalType = input.planType
        ? planTypeFromEnum(input.planType)
        : current.plan_type;
      const finalStart = input.startDate
        ? new Date(input.startDate).getTime()
        : current.start_date!.getTime();
      const finalEnd =
        input.endDate !== undefined
          ? input.endDate
            ? new Date(input.endDate).getTime()
            : null
          : (current.end_date?.getTime() ?? null);

      if (isTimePlan(finalType) && finalEnd) {
        const existing = await getAllTimePlans(tdb, current.user_id);
        const conflicts = findOverlaps(
          existing,
          { start: finalStart, end: finalEnd },
          input.id,
        );
        if (conflicts.length > 0) {
          throw validationError(
            "input.startDate",
            `Time range overlaps with existing plans: ${conflicts.join(", ")}`,
          );
        }
      }

      const updateData: Record<string, unknown> = {
        update_at: new Date(),
      };
      if (input.planType !== undefined) {
        updateData.plan_type = planTypeFromEnum(input.planType);
      }
      if (input.amount !== undefined) {
        updateData.amount = input.amount;
      }
      if (input.startDate !== undefined) {
        updateData.start_date = new Date(input.startDate);
      }
      if (input.endDate !== undefined) {
        updateData.end_date = input.endDate ? new Date(input.endDate) : null;
      }

      const [updated] = await tdb
        .update(userMembershipPlansTable)
        .set(updateData)
        .where(drizzle.eq(userMembershipPlansTable.id, input.id))
        .returning();

      if (!updated) {
        throw notFound("Membership plan not found");
      }

      return mapRow(updated);
    },

    async removeMembershipPlan(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(removePlanSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const current = await tdb.query.userMembershipPlansTable.findFirst({
        where: (p, { eq }) => eq(p.id, input.id),
      });
      if (!current) {
        throw notFound("Membership plan not found");
      }

      await tdb
        .delete(userMembershipPlansTable)
        .where(drizzle.eq(userMembershipPlansTable.id, input.id));

      return mapRow(current);
    },

    async deductStoredValue(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(deductSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const svPlans = await tdb.query.userMembershipPlansTable.findMany({
        where: (p, { eq, and }) =>
          and(eq(p.user_id, input.userId), eq(p.plan_type, "stored_value")),
        orderBy: (p, { asc }) => asc(p.create_at),
      });

      const total = svPlans.reduce((s, p) => s + (p.amount ?? 0), 0);
      if (total < input.amount) {
        const balanceYuan = (total / 100).toFixed(0);
        const deductYuan = (input.amount / 100).toFixed(0);
        throw validationError(
          "input.amount",
          `Insufficient balance (current: ${balanceYuan}, deduct: ${deductYuan})`,
        );
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

      const deductionDate = new Date(input.date);
      const [record] = await tdb
        .insert(userMembershipPlansTable)
        .values({
          user_id: input.userId,
          plan_type: "stored_value",
          amount: -input.amount,
          note: input.note,
          start_date: deductionDate,
        })
        .returning();

      if (!record) {
        throw notFound("Failed to record deduction");
      }

      return {
        plan: mapRow(record),
        deducted: input.amount,
      };
    },
  },
};
