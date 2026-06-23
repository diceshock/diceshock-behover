import { gstoneDb, gstoneDocumentsTable, gstoneGamesTable } from "@lib/db";
import { and, count, isNotNull, isNull, lt, max, sql } from "drizzle-orm";

const BATCH_SIZE = 100;
const DOC_BATCH_SIZE = 20;
const MAX_GAME_ID = 50000;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;
const BACKPRESSURE_LIMIT = 300;

export const GSTONE_MAX_GAME_ID = MAX_GAME_ID;

export async function dispatchGstoneCrawl(env: {
  GSTONE_DB: D1Database;
  GSTONE_CRAWL_QUEUE: Queue;
}): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);

  const [pendingCount] = await db
    .select({ c: count() })
    .from(gstoneGamesTable)
    .where(
      and(isNull(gstoneGamesTable.crawled_at), isNull(gstoneGamesTable.error)),
    );

  if ((pendingCount?.c ?? 0) > BACKPRESSURE_LIMIT) {
    throw new Error(
      `Game crawl backpressure: ${pendingCount.c} pending items exceeds limit ${BACKPRESSURE_LIMIT}`,
    );
  }

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
  const now = new Date().toISOString();

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

export async function dispatchGstoneDocCrawl(env: {
  GSTONE_DB: D1Database;
  GSTONE_DOC_CRAWL_QUEUE: Queue;
}): Promise<void> {
  const pendingDocs = await env.GSTONE_DB.prepare(
    `SELECT document_id, game_id, title FROM documents
     WHERE crawled_at IS NULL AND error IS NULL
     LIMIT ?`,
  )
    .bind(DOC_BATCH_SIZE)
    .all<{ document_id: number; game_id: number; title: string }>();

  const pendingCount = pendingDocs.results?.length ?? 0;

  if (pendingCount > DOC_BATCH_SIZE * 3) {
    throw new Error(
      `Doc crawl backpressure: ${pendingCount} pending exceeds limit`,
    );
  }

  if (pendingCount > 0) {
    const msgs = (pendingDocs.results ?? []).map((d) => ({
      body: {
        document_id: d.document_id,
        game_id: d.game_id,
        title: d.title ?? "Untitled",
      },
    }));
    for (let i = 0; i < msgs.length; i += 100) {
      await env.GSTONE_DOC_CRAWL_QUEUE.sendBatch(msgs.slice(i, i + 100));
    }
  }

  const rows = await env.GSTONE_DB.prepare(
    `SELECT g.gstone_id, g.name, g.full_data
     FROM games g
     WHERE g.crawled_at IS NOT NULL
       AND g.full_data IS NOT NULL
       AND json_extract(g.full_data, '$.game_info.document_info.num') > 0
       AND NOT EXISTS (
         SELECT 1 FROM documents d WHERE d.game_id = g.gstone_id
       )
     LIMIT ?`,
  )
    .bind(DOC_BATCH_SIZE)
    .all<{ gstone_id: number; name: string | null; full_data: string }>();

  const messages: Array<{
    body: { document_id: number; game_id: number; title: string };
  }> = [];

  for (const row of rows.results ?? []) {
    try {
      const data = JSON.parse(row.full_data);
      const gameInfo = data?.game_info ?? data;
      const docInfo = gameInfo?.document_info;
      const docList: Array<{ id: number; document_title: string }> =
        docInfo?.doc_list ?? [];

      for (const doc of docList) {
        messages.push({
          body: {
            document_id: doc.id,
            game_id: row.gstone_id,
            title: doc.document_title ?? "Untitled",
          },
        });
      }
    } catch {
      // skip malformed full_data
    }
  }

  if (messages.length === 0) return;

  for (let i = 0; i < messages.length; i += 100) {
    await env.GSTONE_DOC_CRAWL_QUEUE.sendBatch(messages.slice(i, i + 100));
  }
}

export async function dispatchGstoneOcr(env: {
  GSTONE_DB: D1Database;
  GSTONE_OCR_QUEUE: Queue;
}): Promise<void> {
  const inflight = await env.GSTONE_DB.prepare(
    `SELECT COUNT(*) as c FROM documents
     WHERE crawled_at IS NOT NULL AND ocr_at IS NULL AND error IS NULL AND ocr_pages IS NOT NULL`,
  ).first<{ c: number }>();

  if ((inflight?.c ?? 0) > 10) return;

  const pending = await env.GSTONE_DB.prepare(
    `SELECT document_id, page_count, ocr_pages FROM documents
     WHERE crawled_at IS NOT NULL AND ocr_at IS NULL AND error IS NULL AND ocr_pages IS NULL
     LIMIT ?`,
  )
    .bind(5)
    .all<{
      document_id: number;
      page_count: number | null;
      ocr_pages: string | null;
    }>();

  const docs = pending.results ?? [];
  if (docs.length === 0) return;

  const msgs = docs.map((d) => ({
    body: { document_id: d.document_id, page_index: 0 },
  }));

  for (let i = 0; i < msgs.length; i += 100) {
    await env.GSTONE_OCR_QUEUE.sendBatch(msgs.slice(i, i + 100));
  }
}
