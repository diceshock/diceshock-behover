import type { Context } from "hono";
import type { ImageProcessMessage, ImageProcessResult } from "../imageProcess";
import type { HonoCtxEnv } from "@/shared/types";
import { fetchAsDataUrl, LOGO_URL } from "../ogCards/shared";
import {
  ARTICLE_WIDTH,
  buildArticleHtml,
  fetchActiveArticleData,
  fetchEventArticleData,
} from "./articleCard";

/**
 * Preview endpoint: renders an activity/event as a mobile article image.
 * GET /edge/media/article/:type/:id
 *
 * Returns the rendered PNG directly (via the image queue pipeline).
 */
export async function articlePreview(c: Context<HonoCtxEnv>) {
  const type = c.req.param("type") as string;
  const id = c.req.param("id") as string;

  if (type !== "active" && type !== "event") {
    return c.json({ error: "type must be 'active' or 'event'" }, 400);
  }

  const env = c.env;
  const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

  const data =
    type === "active"
      ? await fetchActiveArticleData(env.DB, id)
      : await fetchEventArticleData(env.DB, id);

  if (!data) {
    return c.json({ error: "not_found" }, 404);
  }

  // Check R2 cache first
  const r2Key = `article/${type}/${id}/preview.png`;
  const cached = await env.R2.head(r2Key);
  if (cached?.uploaded) {
    const age = Date.now() - cached.uploaded.getTime();
    // Cache for 10 minutes
    if (age < 10 * 60 * 1000) {
      const obj = await env.R2.get(r2Key);
      if (obj) {
        return new Response(obj.body, {
          headers: {
            "content-type": "image/png",
            "cache-control": "no-cache",
          },
        });
      }
    }
  }

  const html = buildArticleHtml(data, logoDataUrl);

  // Submit to image queue
  const taskId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const message: ImageProcessMessage = {
    taskId,
    type: "html2image",
    payload: {
      html,
      viewportWidth: ARTICLE_WIDTH,
      viewportHeight: 800,
      format: "png",
    },
  };

  await env.KV.put(
    `img-task:${taskId}`,
    JSON.stringify({ taskId, status: "pending" } satisfies ImageProcessResult),
    { expirationTtl: 3600 },
  );
  await env.IMAGE_QUEUE.send(message);

  // Poll for result
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const raw = await env.KV.get(`img-task:${taskId}`);
    if (raw) {
      const result = JSON.parse(raw) as ImageProcessResult;
      if (result.status === "done" && result.url) {
        // Fetch and cache to R2
        const imgRes = await fetch(result.url);
        if (imgRes.ok) {
          const bytes = new Uint8Array(await imgRes.arrayBuffer());
          await env.R2.put(r2Key, bytes, {
            httpMetadata: { contentType: "image/png" },
          });
          return new Response(bytes, {
            headers: {
              "content-type": "image/png",
              "cache-control": "no-cache",
            },
          });
        }
        return c.json({ error: "fetch_rendered_failed" }, 500);
      }
      if (result.status === "error") {
        return c.json({ error: "render_failed", detail: result.error }, 500);
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  return c.json({ error: "render_timeout" }, 504);
}
