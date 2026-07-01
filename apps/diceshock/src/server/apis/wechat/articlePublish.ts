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
import {
  sendCustomerImageMessage,
  uploadImageToWechat,
} from "./wechatApi";

// ─── Constants ───────────────────────────────────────────────────────────────

/** WeChat image message max size ~10MB; we slice at ~1200px height to keep each
 *  strip under 2MB as PNG at 750px width. */
const SLICE_HEIGHT = 1200;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Render an active/event as a mobile-optimized long image, slice it,
 * upload each slice to WeChat, and send to user as image messages.
 */
export async function renderAndSendArticle(
  c: Context<HonoCtxEnv>,
  opts: {
    type: "active" | "event";
    id: string;
    openId: string;
  },
): Promise<{ success: boolean; slices: number; error?: string }> {
  const env = c.env;
  const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

  // 1. Fetch data
  const data =
    opts.type === "active"
      ? await fetchActiveArticleData(env.DB, opts.id)
      : await fetchEventArticleData(env.DB, opts.id);

  if (!data) {
    return { success: false, slices: 0, error: "not_found" };
  }

  // 2. Build HTML
  const html = buildArticleHtml(data, logoDataUrl);

  // 3. Render full-page image via queue
  const taskId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const message: ImageProcessMessage = {
    taskId,
    type: "html2image",
    payload: {
      html,
      viewportWidth: ARTICLE_WIDTH,
      viewportHeight: 800, // initial viewport; fullPage captures everything
      format: "png",
    },
  };

  await env.KV.put(
    `img-task:${taskId}`,
    JSON.stringify({ taskId, status: "pending" } satisfies ImageProcessResult),
    { expirationTtl: 3600 },
  );
  await env.IMAGE_QUEUE.send(message);

  // 4. Poll for result
  const fullImageUrl = await pollForResult(env, taskId, 45_000);
  if (!fullImageUrl) {
    return { success: false, slices: 0, error: "render_timeout" };
  }

  // 5. Fetch full image and slice
  const fullRes = await fetch(fullImageUrl);
  if (!fullRes.ok) {
    return { success: false, slices: 0, error: "fetch_failed" };
  }

  const fullBuffer = new Uint8Array(await fullRes.arrayBuffer());

  // Determine image dimensions from PNG header (IHDR chunk)
  const imgHeight = readPngHeight(fullBuffer);
  if (!imgHeight) {
    // Single image, no slicing needed
    const mediaId = await uploadImageToWechat(env, fullImageUrl);
    if (!mediaId) {
      return { success: false, slices: 0, error: "upload_failed" };
    }
    await sendCustomerImageMessage(env, opts.openId, mediaId);
    return { success: true, slices: 1 };
  }

  const sliceCount = Math.ceil(imgHeight / SLICE_HEIGHT);

  if (sliceCount <= 1) {
    // Image fits in one slice
    const mediaId = await uploadImageToWechat(env, fullImageUrl);
    if (!mediaId) {
      return { success: false, slices: 0, error: "upload_failed" };
    }
    await sendCustomerImageMessage(env, opts.openId, mediaId);
    return { success: true, slices: 1 };
  }

  // 6. Slice via separate html2image tasks (CSS clip approach)
  const sliceUrls: string[] = [];
  for (let i = 0; i < sliceCount; i++) {
    const offsetY = i * SLICE_HEIGHT;
    const thisHeight = Math.min(SLICE_HEIGHT, imgHeight - offsetY);

    const sliceHtml = buildSliceHtml(fullImageUrl, offsetY, thisHeight);
    const sliceTaskId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

    const sliceMsg: ImageProcessMessage = {
      taskId: sliceTaskId,
      type: "html2image",
      payload: {
        html: sliceHtml,
        viewportWidth: ARTICLE_WIDTH,
        viewportHeight: thisHeight,
        format: "png",
      },
    };

    await env.KV.put(
      `img-task:${sliceTaskId}`,
      JSON.stringify({
        taskId: sliceTaskId,
        status: "pending",
      } satisfies ImageProcessResult),
      { expirationTtl: 3600 },
    );
    await env.IMAGE_QUEUE.send(sliceMsg);

    const sliceUrl = await pollForResult(env, sliceTaskId, 30_000);
    if (!sliceUrl) {
      return {
        success: false,
        slices: sliceUrls.length,
        error: `slice_${i}_timeout`,
      };
    }
    sliceUrls.push(sliceUrl);
  }

  // 7. Upload and send each slice sequentially
  for (const url of sliceUrls) {
    const mediaId = await uploadImageToWechat(env, url);
    if (!mediaId) {
      return {
        success: false,
        slices: sliceUrls.indexOf(url),
        error: "upload_failed",
      };
    }
    await sendCustomerImageMessage(env, opts.openId, mediaId);
  }

  return { success: true, slices: sliceUrls.length };
}

/**
 * Render article and store sliced images to R2.
 * Returns R2 keys for all slices (for batch operations like draft publish).
 */
export async function renderArticleToR2(
  c: Context<HonoCtxEnv>,
  opts: { type: "active" | "event"; id: string },
): Promise<{ keys: string[]; error?: string }> {
  const env = c.env;
  const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

  const data =
    opts.type === "active"
      ? await fetchActiveArticleData(env.DB, opts.id)
      : await fetchEventArticleData(env.DB, opts.id);

  if (!data) return { keys: [], error: "not_found" };

  const html = buildArticleHtml(data, logoDataUrl);
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

  const fullImageUrl = await pollForResult(env, taskId, 45_000);
  if (!fullImageUrl) return { keys: [], error: "render_timeout" };

  // Store full image in R2
  const r2Base = `article/${opts.type}/${opts.id}`;
  const fullRes = await fetch(fullImageUrl);
  if (!fullRes.ok) return { keys: [], error: "fetch_failed" };

  const fullBuffer = new Uint8Array(await fullRes.arrayBuffer());
  await env.R2.put(`${r2Base}/full.png`, fullBuffer, {
    httpMetadata: { contentType: "image/png" },
  });

  const imgHeight = readPngHeight(fullBuffer);
  if (!imgHeight || imgHeight <= SLICE_HEIGHT) {
    return { keys: [`${r2Base}/full.png`] };
  }

  // Slice and store each
  const sliceCount = Math.ceil(imgHeight / SLICE_HEIGHT);
  const keys: string[] = [];

  for (let i = 0; i < sliceCount; i++) {
    const offsetY = i * SLICE_HEIGHT;
    const thisHeight = Math.min(SLICE_HEIGHT, imgHeight - offsetY);

    const sliceHtml = buildSliceHtml(fullImageUrl, offsetY, thisHeight);
    const sliceTaskId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

    const sliceMsg: ImageProcessMessage = {
      taskId: sliceTaskId,
      type: "html2image",
      payload: {
        html: sliceHtml,
        viewportWidth: ARTICLE_WIDTH,
        viewportHeight: thisHeight,
        format: "png",
      },
    };

    await env.KV.put(
      `img-task:${sliceTaskId}`,
      JSON.stringify({
        taskId: sliceTaskId,
        status: "pending",
      } satisfies ImageProcessResult),
      { expirationTtl: 3600 },
    );
    await env.IMAGE_QUEUE.send(sliceMsg);

    const sliceUrl = await pollForResult(env, sliceTaskId, 30_000);
    if (!sliceUrl) return { keys, error: `slice_${i}_timeout` };

    const sliceRes = await fetch(sliceUrl);
    if (!sliceRes.ok) return { keys, error: `slice_${i}_fetch_failed` };

    const sliceKey = `${r2Base}/slice-${i}.png`;
    await env.R2.put(sliceKey, new Uint8Array(await sliceRes.arrayBuffer()), {
      httpMetadata: { contentType: "image/png" },
    });
    keys.push(sliceKey);
  }

  return { keys };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function pollForResult(
  env: { KV: KVNamespace },
  taskId: string,
  timeoutMs: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const raw = await env.KV.get(`img-task:${taskId}`);
    if (raw) {
      const result = JSON.parse(raw) as ImageProcessResult;
      if (result.status === "done" && result.url) return result.url;
      if (result.status === "error") return null;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

/** Read PNG height from IHDR chunk (bytes 20-23, big-endian u32) */
function readPngHeight(buf: Uint8Array): number | null {
  // PNG header: 8 bytes signature, then IHDR chunk
  // IHDR starts at offset 8 (4 len + 4 type + 4 width + 4 height)
  if (buf.length < 24) return null;
  // Verify PNG signature
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47)
    return null;
  // Height is at offset 20 (after 8 sig + 4 length + 4 "IHDR" + 4 width)
  const height =
    (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
  return height > 0 ? height : null;
}

/** Build a minimal HTML page that crops a full-length image at a given offset */
function buildSliceHtml(
  imageUrl: string,
  offsetY: number,
  height: number,
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; }
body { width:${ARTICLE_WIDTH}px; height:${height}px; overflow:hidden; }
img { position:absolute; top:-${offsetY}px; left:0; width:${ARTICLE_WIDTH}px; }
</style>
</head>
<body>
<img id="src" src="${imageUrl}" />
<script>
const img = document.getElementById("src");
if (img.complete && img.naturalWidth > 0) { window.__ready = true; }
else { img.onload = () => { window.__ready = true; }; img.onerror = () => { window.__ready = true; }; }
</script>
</body></html>`;
}
