import { gstoneDb, gstoneDocumentsTable } from "@lib/db";
import { eq } from "drizzle-orm";

export interface GstoneDocCrawlMessage {
  document_id: number;
  game_id: number;
  title: string;
}

export interface GstoneOcrMessage {
  document_id: number;
  page_index: number;
}

const DOC_PAGE_URL = "https://www.gstonegames.com/game/doc-";

export async function handleGstoneDocCrawlQueue(
  batch: MessageBatch<GstoneDocCrawlMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);

  for (const msg of batch.messages) {
    const { document_id: docId, game_id: gameId, title } = msg.body;
    const now = new Date().toISOString();

    try {
      const imageUrls = await fetchDocumentPages(docId);

      await env.GSTONE_DB.prepare(
        `INSERT INTO documents (document_id, game_id, title, page_count, image_urls, created_at, crawled_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(document_id) DO UPDATE SET
           page_count = excluded.page_count,
           image_urls = excluded.image_urls,
           error = NULL,
           crawled_at = excluded.crawled_at,
           updated_at = excluded.updated_at`,
      )
        .bind(
          docId,
          gameId,
          title,
          imageUrls.length,
          JSON.stringify(imageUrls),
          now,
          now,
          now,
        )
        .run();

      if (imageUrls.length > 0) {
        await env.GSTONE_OCR_QUEUE.send({ document_id: docId, page_index: 0 });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await env.GSTONE_DB.prepare(
        `INSERT INTO documents (document_id, game_id, title, error, retry_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(document_id) DO UPDATE SET
           error = excluded.error,
           retry_count = documents.retry_count + 1,
           updated_at = excluded.updated_at`,
      )
        .bind(docId, gameId, title, errMsg, now, now)
        .run();
    }
    msg.ack();
  }
}

async function fetchDocumentPages(docId: number): Promise<string[]> {
  const resp = await fetch(`${DOC_PAGE_URL}${docId}.html`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
    },
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const html = await resp.text();
  const seen = new Set<string>();
  const urls: string[] = [];

  const patterns = [
    /data-original="([^"]+)"/g,
    /src="([^"]*\/image\/document\/[^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      let url = match[1];
      if (url.startsWith("//")) url = "https:" + url;
      if (url.includes("x-oss-process")) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }

  if (urls.length === 0) {
    throw new Error("No page images found in document HTML");
  }

  return urls;
}
