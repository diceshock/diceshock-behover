import { gstoneDb, gstoneDocumentsTable, gstoneGamesTable } from "@lib/db";
import { eq } from "drizzle-orm";
import type { GstoneOcrMessage } from "./gstoneDocCrawlConsumer";

export async function handleGstoneOcrQueue(
  batch: MessageBatch<GstoneOcrMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);

  for (const msg of batch.messages) {
    const { document_id: docId, page_index: pageIndex } = msg.body;

    try {
      const [doc] = await db
        .select()
        .from(gstoneDocumentsTable)
        .where(eq(gstoneDocumentsTable.document_id, docId))
        .limit(1);

      if (!doc || !doc.image_urls || doc.image_urls.length === 0) {
        msg.ack();
        continue;
      }

      const imageUrl = doc.image_urls[pageIndex];
      if (!imageUrl) {
        msg.ack();
        continue;
      }

      const pageText = await ocrImage(env, imageUrl);

      const existingPages: string[] = doc.ocr_pages ?? [];
      existingPages[pageIndex] = pageText;

      const now = new Date().toISOString();
      await env.GSTONE_DB.prepare(
        "UPDATE documents SET ocr_pages = ?, updated_at = ? WHERE document_id = ?",
      )
        .bind(JSON.stringify(existingPages), now, docId)
        .run();

      const isLastPage = pageIndex >= doc.image_urls.length - 1;

      if (!isLastPage) {
        await env.GSTONE_OCR_QUEUE.send({
          document_id: docId,
          page_index: pageIndex + 1,
        });
      } else {
        const [game] = await db
          .select({
            name: gstoneGamesTable.name,
            eng_name: gstoneGamesTable.eng_name,
          })
          .from(gstoneGamesTable)
          .where(eq(gstoneGamesTable.gstone_id, doc.game_id))
          .limit(1);

        const markdown = buildMarkdown({
          gameId: doc.game_id,
          gameName: game?.name ?? null,
          gameEngName: game?.eng_name ?? null,
          documentId: docId,
          documentTitle: doc.title ?? "Untitled",
          imageUrls: doc.image_urls,
          pages: existingPages,
        });

        const r2Key = `gstone-rulebooks/${doc.game_id}/${docId}.md`;
        await env.RAW_FEED.put(r2Key, markdown, {
          httpMetadata: { contentType: "text/markdown; charset=utf-8" },
        });

        await env.GSTONE_DB.prepare(
          "UPDATE documents SET r2_key = ?, ocr_at = ?, error = NULL, updated_at = ? WHERE document_id = ?",
        )
          .bind(r2Key, now, now, docId)
          .run();
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const now = new Date().toISOString();
      await env.GSTONE_DB.prepare(
        "UPDATE documents SET error = ?, retry_count = retry_count + 1, updated_at = ? WHERE document_id = ?",
      )
        .bind(`[page ${pageIndex}] ${errMsg}`, now, docId)
        .run();
    }
    msg.ack();
  }
}

async function ocrImage(
  env: Cloudflare.Env,
  imageUrl: string,
): Promise<string> {
  const resizedUrl = imageUrl.includes("?")
    ? imageUrl
    : `${imageUrl}?x-oss-process=image/auto-orient,1/resize,m_lfit,w_1200/quality,q_85`;

  const imageResp = await fetch(resizedUrl);
  if (!imageResp.ok) throw new Error(`Image fetch failed: ${imageResp.status}`);

  const imageData = await imageResp.arrayBuffer();
  const blob = new Blob([imageData], {
    type: imageResp.headers.get("content-type") ?? "image/jpeg",
  });

  const results = await (env.AI as any).toMarkdown([
    { name: "page.jpg", blob },
  ]);

  const page = results?.[0];
  if (!page || !page.data) throw new Error("toMarkdown returned empty result");

  return page.data;
}

function buildMarkdown(opts: {
  gameId: number;
  gameName: string | null;
  gameEngName: string | null;
  documentId: number;
  documentTitle: string;
  imageUrls: string[];
  pages: string[];
}): string {
  const yamlPages = opts.imageUrls
    .map((url, i) => `  - page: ${i + 1}\n    image_url: "${url}"`)
    .join("\n");

  const header = [
    "---",
    `game_id: ${opts.gameId}`,
    `game_name: "${(opts.gameName ?? "").replace(/"/g, '\\"')}"`,
    `game_eng_name: "${(opts.gameEngName ?? "").replace(/"/g, '\\"')}"`,
    `document_id: ${opts.documentId}`,
    `document_title: "${opts.documentTitle.replace(/"/g, '\\"')}"`,
    `total_pages: ${opts.pages.length}`,
    `pages:`,
    yamlPages,
    `crawled_at: "${new Date().toISOString()}"`,
    "---",
    "",
  ].join("\n");

  const body = opts.pages
    .map((text, i) => `## Page ${i + 1}\n\n${(text ?? "").trim()}`)
    .join("\n\n");

  return header + body + "\n";
}
