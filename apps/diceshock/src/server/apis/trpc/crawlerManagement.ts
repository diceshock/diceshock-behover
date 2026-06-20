import { gstoneDb, gstoneGamesTable } from "@lib/db";
import { and, count, desc, isNotNull, isNull, max } from "drizzle-orm";
import { z } from "zod/v4";
import { GSTONE_MAX_GAME_ID } from "@/server/cron/gstoneCrawl";
import { staffProcedure } from "./baseTRPC";

const getStats = staffProcedure.query(async ({ ctx }) => {
  const db = gstoneDb(ctx.env.GSTONE_DB);

  const [totalRow, crawledRow, errorsRow, imagedRow, maxIdRow] =
    await Promise.all([
      db.select({ c: count() }).from(gstoneGamesTable),
      db
        .select({ c: count() })
        .from(gstoneGamesTable)
        .where(isNotNull(gstoneGamesTable.crawled_at)),
      db
        .select({ c: count() })
        .from(gstoneGamesTable)
        .where(
          and(
            isNotNull(gstoneGamesTable.error),
            isNull(gstoneGamesTable.crawled_at),
          ),
        ),
      db
        .select({ c: count() })
        .from(gstoneGamesTable)
        .where(isNotNull(gstoneGamesTable.r2_cover_url)),
      db.select({ m: max(gstoneGamesTable.gstone_id) }).from(gstoneGamesTable),
    ]);

  return {
    total: totalRow[0]?.c ?? 0,
    crawled: crawledRow[0]?.c ?? 0,
    errors: errorsRow[0]?.c ?? 0,
    images_cached: imagedRow[0]?.c ?? 0,
    max_id: maxIdRow[0]?.m ?? 0,
    estimated_max: GSTONE_MAX_GAME_ID,
  };
});

const getErrors = staffProcedure
  .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
  .query(async ({ input, ctx }) => {
    const db = gstoneDb(ctx.env.GSTONE_DB);
    return db
      .select({
        gstone_id: gstoneGamesTable.gstone_id,
        error: gstoneGamesTable.error,
        retry_count: gstoneGamesTable.retry_count,
        updated_at: gstoneGamesTable.updated_at,
      })
      .from(gstoneGamesTable)
      .where(
        and(
          isNotNull(gstoneGamesTable.error),
          isNull(gstoneGamesTable.crawled_at),
        ),
      )
      .orderBy(desc(gstoneGamesTable.updated_at))
      .limit(input?.limit ?? 20);
  });

const resetCrawl = staffProcedure.mutation(async ({ ctx }) => {
  const db = gstoneDb(ctx.env.GSTONE_DB);
  await db
    .update(gstoneGamesTable)
    .set({
      error: null,
      retry_count: 0,
      updated_at: new Date().toISOString(),
    })
    .where(
      and(
        isNotNull(gstoneGamesTable.error),
        isNull(gstoneGamesTable.crawled_at),
      ),
    );
  return { success: true };
});

export default {
  getStats,
  getErrors,
  resetCrawl,
};
