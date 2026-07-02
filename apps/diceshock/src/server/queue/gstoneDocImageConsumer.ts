export interface GstoneDocImageMessage {
  document_id: number;
  page_index: number;
  source_url: string;
}

const CDN_BASE = "https://assets.runespark.fun/";
const KEY_PREFIX = "gstone-doc-pages/";

export async function handleGstoneDocImageQueue(
  batch: MessageBatch<GstoneDocImageMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  for (const msg of batch.messages) {
    const { document_id: docId, page_index: pageIndex, source_url: sourceUrl } =
      msg.body;

    try {
      const key = `${KEY_PREFIX}${docId}/${pageIndex}.jpg`;

      // Skip if already cached
      const existing = await env.R2.head(key);
      if (!existing) {
        const resp = await fetch(sourceUrl);
        if (!resp.ok || !resp.body) {
          throw new Error(`HTTP ${resp.status}`);
        }

        await env.R2.put(key, resp.body, {
          httpMetadata: {
            contentType: resp.headers.get("content-type") ?? "image/jpeg",
          },
        });
      }

      // Check if this was the last page for the document
      const doc = await env.GSTONE_DB.prepare(
        "SELECT page_count, images_synced_at FROM documents WHERE document_id = ?",
      )
        .bind(docId)
        .first<{ page_count: number; images_synced_at: string | null }>();

      if (doc && !doc.images_synced_at && pageIndex === doc.page_count - 1) {
        const now = new Date().toISOString();
        const r2Urls = Array.from({ length: doc.page_count }, (_, i) =>
          `${CDN_BASE}${KEY_PREFIX}${docId}/${i}.jpg`,
        );
        await env.GSTONE_DB.prepare(
          "UPDATE documents SET images_synced_at = ?, r2_image_urls = ?, updated_at = ? WHERE document_id = ? AND images_synced_at IS NULL",
        )
          .bind(now, JSON.stringify(r2Urls), now, docId)
          .run();
      }

      msg.ack();
    } catch {
      msg.retry();
    }
  }
}
