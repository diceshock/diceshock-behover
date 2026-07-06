import dbFactory, { dashSearchHistoryTable } from "@lib/db";
import { and, desc, eq, lt } from "drizzle-orm";
import type { GQLContext } from "../context";
import { requireStaff } from "../guards";

function db(ctx: GQLContext) {
  return dbFactory(ctx.env.DB);
}

const MAX_HISTORY = 30;

export const searchHistoryResolvers = {
  Query: {
    dashSearchHistory: async (
      _: unknown,
      args: { limit?: number | null },
      ctx: GQLContext,
    ) => {
      requireStaff(ctx);
      const limit = Math.min(args.limit ?? MAX_HISTORY, MAX_HISTORY);

      const rows = await db(ctx)
        .select()
        .from(dashSearchHistoryTable)
        .where(eq(dashSearchHistoryTable.user_id, ctx.userId!))
        .orderBy(desc(dashSearchHistoryTable.created_at))
        .limit(limit);

      return rows.map((r) => ({
        id: r.id,
        label: r.label,
        categoryId: r.category_id,
        route: r.route,
        params: r.params,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    },
  },
  Mutation: {
    saveDashSearchHistory: async (
      _: unknown,
      args: {
        input: {
          label: string;
          categoryId: string;
          route: string;
          params: string;
        };
      },
      ctx: GQLContext,
    ) => {
      requireStaff(ctx);
      const { label, categoryId, route, params } = args.input;
      const userId = ctx.userId!;

      // Dedupe: remove existing entry with same route+params for this user
      const dedupeId = `${categoryId}:${params}`;
      await db(ctx)
        .delete(dashSearchHistoryTable)
        .where(
          and(
            eq(dashSearchHistoryTable.user_id, userId),
            eq(dashSearchHistoryTable.category_id, categoryId),
            eq(dashSearchHistoryTable.params, params),
          ),
        );

      // Insert new entry
      const id = crypto.randomUUID();
      const now = Date.now();
      await db(ctx).insert(dashSearchHistoryTable).values({
        id,
        user_id: userId,
        label,
        category_id: categoryId,
        route,
        params,
        created_at: now,
      });

      // Trim: keep only MAX_HISTORY entries per user
      const oldest = await db(ctx)
        .select({ id: dashSearchHistoryTable.id })
        .from(dashSearchHistoryTable)
        .where(eq(dashSearchHistoryTable.user_id, userId))
        .orderBy(desc(dashSearchHistoryTable.created_at))
        .limit(1)
        .offset(MAX_HISTORY);

      if (oldest.length > 0) {
        // Delete entries older than the Nth
        const cutoff = await db(ctx)
          .select({ created_at: dashSearchHistoryTable.created_at })
          .from(dashSearchHistoryTable)
          .where(eq(dashSearchHistoryTable.user_id, userId))
          .orderBy(desc(dashSearchHistoryTable.created_at))
          .limit(1)
          .offset(MAX_HISTORY - 1);

        if (cutoff.length > 0) {
          await db(ctx)
            .delete(dashSearchHistoryTable)
            .where(
              and(
                eq(dashSearchHistoryTable.user_id, userId),
                lt(dashSearchHistoryTable.created_at, cutoff[0].created_at),
              ),
            );
        }
      }

      return {
        id,
        label,
        categoryId,
        route,
        params,
        createdAt: new Date(now).toISOString(),
      };
    },

    removeDashSearchHistory: async (
      _: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) => {
      requireStaff(ctx);
      // Only delete if owned by current user
      const deleted = await db(ctx)
        .delete(dashSearchHistoryTable)
        .where(
          and(
            eq(dashSearchHistoryTable.id, args.id),
            eq(dashSearchHistoryTable.user_id, ctx.userId!),
          ),
        );
      return true;
    },

    clearDashSearchHistory: async (
      _: unknown,
      _args: unknown,
      ctx: GQLContext,
    ) => {
      requireStaff(ctx);
      await db(ctx)
        .delete(dashSearchHistoryTable)
        .where(eq(dashSearchHistoryTable.user_id, ctx.userId!));
      return true;
    },
  },
};
