import { gstoneDb, gstoneGamesTable } from "@lib/db";
import { and, isNull, lt, max } from "drizzle-orm";

const BATCH_SIZE = 100;
const MAX_GAME_ID = 50000;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

export const GSTONE_MAX_GAME_ID = MAX_GAME_ID;

export async function dispatchGstoneCrawl(env: {
  GSTONE_DB: D1Database;
  GSTONE_CRAWL_QUEUE: Queue;
}): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);
  const now = new Date().toISOString();

  const staleThreshold = new Date(
    Date.now() - STALE_THRESHOLD_MS,
  ).toISOString();
  const staleRows = await db
    .select({ gstone_id: gstoneGamesTable.gstone_id })
    .from(gstoneGamesTable)
    .where(
      and(
        isNull(gstoneGamesTable.crawled_at),
        isNull(gstoneGamesTable.error),
        lt(gstoneGamesTable.created_at, staleThreshold),
      ),
    )
    .limit(BATCH_SIZE);

  if (staleRows.length > 0) {
    const msgs = staleRows.map((r) => ({ body: { game_id: r.gstone_id } }));
    for (let i = 0; i < msgs.length; i += 100) {
      await env.GSTONE_CRAWL_QUEUE.sendBatch(msgs.slice(i, i + 100));
    }
    return;
  }

  const [row] = await db
    .select({ maxId: max(gstoneGamesTable.gstone_id) })
    .from(gstoneGamesTable);

  const nextId = (row?.maxId ?? 0) + 1;
  if (nextId >= MAX_GAME_ID) return;

  const endId = Math.min(nextId + BATCH_SIZE, MAX_GAME_ID);

  const newRows = Array.from({ length: endId - nextId }, (_, i) => ({
    gstone_id: nextId + i,
    created_at: now,
    updated_at: now,
  }));

  for (let i = 0; i < newRows.length; i += 20) {
    await db
      .insert(gstoneGamesTable)
      .values(newRows.slice(i, i + 20))
      .onConflictDoNothing();
  }

  const messages = newRows.map((r) => ({ body: { game_id: r.gstone_id } }));
  for (let i = 0; i < messages.length; i += 100) {
    await env.GSTONE_CRAWL_QUEUE.sendBatch(messages.slice(i, i + 100));
  }
}
