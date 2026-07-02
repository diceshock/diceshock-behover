import type { Context } from "hono";
import type { ImageProcessMessage } from "../imageProcess";
import { pollForImageResult } from "../imageProcess";
import type { HonoCtxEnv } from "@/shared/types";
import { fetchAsDataUrl, LOGO_URL } from "../ogCards/shared";
import {
  ARTICLE_WIDTH,
  buildArticleHtml,
  fetchActiveArticleData,
  fetchEventArticleData,
} from "./articleCard";
import type { ArticleData } from "./articleCard";
import {
  createDraft,
  submitPublish,
  uploadArticleBodyImage,
  uploadArticleCover,
} from "./wechatApi";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Slice at 1200px height to keep each strip well under WeChat's limits */
const SLICE_HEIGHT = 1200;
const SITE_URL = "https://diceshock.com";

// ─── Public: Full publish pipeline ───────────────────────────────────────────

export interface PublishArticleResult {
  success: boolean;
  draftMediaId?: string;
  publishId?: string;
  imageUrls?: string[];
  error?: string;
}

/**
 * Complete pipeline: render activity → slice → upload to WeChat permanent media
 * → build HTML body from image strips → create draft → optionally publish.
 */
export async function publishActivityArticle(
  c: Context<HonoCtxEnv>,
  opts: {
    type: "active" | "event";
    id: string;
    /** If true, submit draft for immediate publishing */
    autoPublish?: boolean;
  },
): Promise<PublishArticleResult> {
  const env = c.env;
  const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

  // 1. Fetch data
  const data =
    opts.type === "active"
      ? await fetchActiveArticleData(env.DB, opts.id)
      : await fetchEventArticleData(env.DB, opts.id);

  if (!data) {
    return { success: false, error: "not_found" };
  }

  // 2. Render full-page image
  const html = buildArticleHtml(data, logoDataUrl);
  const fullImageUrl = await renderHtmlToImage(env, html);
  if (!fullImageUrl) {
    return { success: false, error: "render_timeout" };
  }

  // 3. Fetch full image, determine slicing
  const fullRes = await fetch(fullImageUrl);
  if (!fullRes.ok) {
    return { success: false, error: "fetch_rendered_image_failed" };
  }

  const fullBuffer = new Uint8Array(await fullRes.arrayBuffer());
  const imgHeight = readPngHeight(fullBuffer);

  let sliceBuffers: Uint8Array[];
  if (!imgHeight || imgHeight <= SLICE_HEIGHT) {
    sliceBuffers = [fullBuffer];
  } else {
    const sliced = await sliceImage(env, fullImageUrl, imgHeight);
    if (!sliced) {
      return { success: false, error: "slicing_failed" };
    }
    sliceBuffers = sliced;
  }

  // 4. Upload each slice as permanent article body image
  const imageUrls: string[] = [];
  for (let i = 0; i < sliceBuffers.length; i++) {
    const url = await uploadArticleBodyImage(
      env,
      sliceBuffers[i],
      `article-${opts.type}-${opts.id}-${i}.png`,
    );
    if (!url) {
      return { success: false, imageUrls, error: `upload_slice_${i}_failed` };
    }
    imageUrls.push(url);
  }

  // 5. Upload first slice as cover thumbnail
  const coverMediaId = await uploadArticleCover(
    env,
    sliceBuffers[0],
    `cover-${opts.type}-${opts.id}.png`,
  );
  if (!coverMediaId) {
    return { success: false, imageUrls, error: "cover_upload_failed" };
  }

  // 6. Build article HTML body from image slices
  const articleBody = imageUrls
    .map(
      (url) =>
        `<p><img src="${url}" style="width:100%;display:block;" /></p>`,
    )
    .join("\n");

  // 7. Create draft
  const contentSourceUrl = buildSourceUrl(opts.type, opts.id);
  const draftMediaId = await createDraft(env, [
    {
      title: data.title,
      author: "Diceshock",
      digest: buildDigest(data),
      content: articleBody,
      thumb_media_id: coverMediaId,
      show_cover_pic: 1,
      content_source_url: contentSourceUrl,
    },
  ]);

  if (!draftMediaId) {
    return { success: false, imageUrls, error: "draft_creation_failed" };
  }

  // 8. Optionally publish
  let publishId: string | undefined;
  if (opts.autoPublish) {
    const pid = await submitPublish(env, draftMediaId);
    if (!pid) {
      return {
        success: false,
        draftMediaId,
        imageUrls,
        error: "publish_failed",
      };
    }
    publishId = pid;
  }

  return { success: true, draftMediaId, publishId, imageUrls };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function renderHtmlToImage(
  env: { R2: R2Bucket; IMAGE_QUEUE: Queue },
  html: string,
): Promise<string | null> {
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

  await env.IMAGE_QUEUE.send(message);

  return pollForImageResult(env, taskId, 45_000);
}

async function sliceImage(
  env: { R2: R2Bucket; IMAGE_QUEUE: Queue },
  fullImageUrl: string,
  imgHeight: number,
): Promise<Uint8Array[] | null> {
  const sliceCount = Math.ceil(imgHeight / SLICE_HEIGHT);
  const buffers: Uint8Array[] = [];

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

    await env.IMAGE_QUEUE.send(sliceMsg);

    const sliceUrl = await pollForImageResult(env, sliceTaskId, 30_000);
    if (!sliceUrl) return null;

    const sliceRes = await fetch(sliceUrl);
    if (!sliceRes.ok) return null;

    buffers.push(new Uint8Array(await sliceRes.arrayBuffer()));
  }

  return buffers;
}

function readPngHeight(buf: Uint8Array): number | null {
  if (buf.length < 24) return null;
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47)
    return null;
  const height =
    (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
  return height > 0 ? height : null;
}

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

function buildSourceUrl(type: string, id: string): string {
  if (type === "active") return `${SITE_URL}/actives/${id}`;
  return `${SITE_URL}/events/${id}`;
}

function buildDigest(data: ArticleData): string {
  if (data.type === "active") {
    const parts = [data.date];
    if (data.storeName) parts.push(data.storeName);
    if (data.gameName) parts.push(data.gameName);
    return parts.join(" · ");
  }
  return data.description?.slice(0, 54) ?? data.title;
}
