export interface GstoneDocImageMessage {
  document_id: number;
}

const CDN_BASE = "https://assets.runespark.fun/";
const KEY_PREFIX = "gstone-doc-pages/";

export async function handleGstoneDocImageQueue(
  batch: MessageBatch<GstoneDocImageMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  for (const msg of batch.messages) {
    const { document_id: docId } = msg.body;
    const now = new Date().toISOString();

    try {
      const row = await env.GSTONE_DB.prepare(
        "SELECT image_urls, images_synced_at FROM documents WHERE document_id = ?",
      )
        .bind(docId)
        .first<{ image_urls: string | null; images_synced_at: string | null }>();

      // Dirty check: skip if missing, already synced, or no images
      if (!row || row.images_synced_at || !row.image_urls) {
        msg.ack();
        continue;
      }

      const urls: string[] = JSON.parse(row.image_urls);
      if (urls.length === 0) {
        msg.ack();
        continue;
      }

      // Download all pages concurrently (bounded by CF subrequest limits)
      const results = await Promise.allSettled(
        urls.map((url, i) => cachePageImage(env, docId, i, url)),
      );

      // Check if any failed
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        throw new Error(
          `${failures.length}/${urls.length} pages failed to sync`,
        );
      }

      // Build r2 URLs array
      const r2Urls = urls.map(
        (_, i) => `${CDN_BASE}${KEY_PREFIX}${docId}/${i}.jpg`,
      );

      await env.GSTONE_DB.prepare(
        "UPDATE documents SET images_synced_at = ?, r2_image_urls = ?, updated_at = ? WHERE document_id = ? AND images_synced_at IS NULL",
      )
        .bind(now, JSON.stringify(r2Urls), now, docId)
        .run();

      msg.ack();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Doc image sync failed doc=${docId}: ${errMsg}`);
      msg.retry();
    }
  }
}

async function cachePageImage(
  env: Cloudflare.Env,
  docId: number,
  pageIndex: number,
  sourceUrl: string,
): Promise<void> {
  const key = `${KEY_PREFIX}${docId}/${pageIndex}.jpg`;

  // Skip if already cached
  const existing = await env.R2.head(key);
  if (existing) return;

  const resp = await fetch(sourceUrl);
  if (!resp.ok || !resp.body) {
    throw new Error(`HTTP ${resp.status} for ${sourceUrl}`);
  }

  await env.R2.put(key, resp.body, {
    httpMetadata: {
      contentType: resp.headers.get("content-type") ?? "image/jpeg",
    },
  });
}
