import { gstoneDb, gstoneDocumentsTable, gstoneGamesTable } from "@lib/db";
import { eq } from "drizzle-orm";
import type { GstoneOcrMessage } from "./gstoneDocCrawlConsumer";

export async function handleGstoneOcrQueue(
  batch: MessageBatch<GstoneOcrMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);

  for (const msg of batch.messages) {
    const { document_id: docId } = msg.body;

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

      const [game] = await db
        .select({
          name: gstoneGamesTable.name,
          eng_name: gstoneGamesTable.eng_name,
        })
        .from(gstoneGamesTable)
        .where(eq(gstoneGamesTable.gstone_id, doc.game_id))
        .limit(1);

      const pages: string[] = [];

      for (let i = 0; i < doc.image_urls.length; i++) {
        const imageUrl = doc.image_urls[i];
        const text = await ocrImage(env, imageUrl);
        pages.push(text);
      }

      const markdown = buildMarkdown({
        gameId: doc.game_id,
        gameName: game?.name ?? null,
        gameEngName: game?.eng_name ?? null,
        documentId: docId,
        documentTitle: doc.title ?? "Untitled",
        imageUrls: doc.image_urls,
        pages,
      });

      const r2Key = `gstone-rulebooks/${doc.game_id}/${docId}.md`;
      await env.RAW_FEED.put(r2Key, markdown, {
        httpMetadata: { contentType: "text/markdown; charset=utf-8" },
      });

      const now = new Date().toISOString();
      await db
        .update(gstoneDocumentsTable)
        .set({ r2_key: r2Key, ocr_at: now, error: null, updated_at: now })
        .where(eq(gstoneDocumentsTable.document_id, docId));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const now = new Date().toISOString();
      await env.GSTONE_DB.prepare(
        `UPDATE documents SET error = ?, retry_count = retry_count + 1, updated_at = ? WHERE document_id = ?`,
      )
        .bind(errMsg, now, docId)
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
    : `${imageUrl}?x-oss-process=image/auto-orient,1/resize,m_lfit,w_1600/quality,q_90`;

  const imageResp = await fetch(resizedUrl);
  if (!imageResp.ok) throw new Error(`Image fetch failed: ${imageResp.status}`);

  const imageData = await imageResp.arrayBuffer();
  const bytes = new Uint8Array(imageData);
  let base64 = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    base64 += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  base64 = btoa(base64);

  const result = (await env.AI.run(
    "@cf/google/gemma-4-26b-a4b-it" as any,
    {
      messages: [
        {
          role: "system",
          content:
            "You are a precise OCR engine. Extract ALL visible text from the image. Preserve line breaks, indentation, table structure (use markdown tables), and formatting. Output Chinese characters as-is alongside English. Do not describe, summarize, or add commentary. Output only the extracted text.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this board game rulebook page.",
            },
            {
              type: "image",
              image: `data:image/jpeg;base64,${base64}`,
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    } as any,
  )) as { response?: string };

  return result.response ?? "";
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
    .map((text, i) => `## Page ${i + 1}\n\n${text.trim()}`)
    .join("\n\n");

  return header + body + "\n";
}
