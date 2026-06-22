import db, { drizzle, userPreferencesTable } from "@lib/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { PREFERENCE_CATEGORIES } from "@/shared/preferences/constants";
import { rruleToHumanReadable } from "@/shared/preferences/rruleDisplay";
import { protectedProcedure } from "./baseTRPC";

const { eq, and, desc } = drizzle;

const categorySchema = z.enum(PREFERENCE_CATEGORIES);

const create = protectedProcedure
  .input(
    z.object({
      rawText: z.string().min(1).max(500),
      rrule: z.string().min(1),
      categories: z.array(categorySchema),
      playerCount: z.number().int().min(1).max(20).nullable(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const [pref] = await tdb
      .insert(userPreferencesTable)
      .values({
        user_id: ctx.userId,
        raw_text: input.rawText,
        rrule: input.rrule,
        categories: input.categories,
        player_count: input.playerCount,
      })
      .returning();
    return pref;
  });

const list = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const prefs = await tdb
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.user_id, ctx.userId))
    .orderBy(desc(userPreferencesTable.created_at));

  return prefs.map((p) => ({
    ...p,
    displayText: rruleToHumanReadable(p.rrule),
  }));
});

const deletePreference = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    // Verify ownership
    const [existing] = await tdb
      .select()
      .from(userPreferencesTable)
      .where(
        and(
          eq(userPreferencesTable.id, input.id),
          eq(userPreferencesTable.user_id, ctx.userId),
        ),
      );

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "偏好不存在或无权删除",
      });
    }

    await tdb
      .delete(userPreferencesTable)
      .where(eq(userPreferencesTable.id, input.id));

    return { success: true };
  });

const toggle = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const [existing] = await tdb
      .select()
      .from(userPreferencesTable)
      .where(
        and(
          eq(userPreferencesTable.id, input.id),
          eq(userPreferencesTable.user_id, ctx.userId),
        ),
      );

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "偏好不存在",
      });
    }

    const [updated] = await tdb
      .update(userPreferencesTable)
      .set({
        enabled: !existing.enabled,
        updated_at: new Date(Date.now()),
      })
      .where(eq(userPreferencesTable.id, input.id))
      .returning();

    return updated;
  });

const getCount = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const prefs = await tdb
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.user_id, ctx.userId));

  return { count: prefs.length };
});

export default { create, list, delete: deletePreference, toggle, getCount };
