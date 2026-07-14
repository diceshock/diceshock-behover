import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

export type ImageTaskType = "transcode" | "html2image" | "qrcode";

export interface TranscodePayload {
  sourceUrl: string;
  format: "png" | "jpeg" | "webp";
  quality?: number;
  width?: number;
  height?: number;
}

export interface Html2ImagePayload {
  html: string;
  viewportWidth?: number;
  viewportHeight?: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
}

export interface QrCodePayload {
  data: string;
  size?: number;
  foreground?: string;
  background?: string;
  logoUrl?: string;
  format?: "png" | "jpeg" | "webp";
}

export interface ImageProcessMessage {
  taskId: string;
  type: ImageTaskType;
  payload: TranscodePayload | Html2ImagePayload | QrCodePayload;
}

export interface ImageProcessResult {
  taskId: string;
  status: "pending" | "done" | "error";
  url?: string;
  error?: string;
}

const VALID_TYPES: ImageTaskType[] = ["transcode", "html2image", "qrcode"];
const CDN_BASE = "https://assets.runespark.fun/";
const CDN_PATH = "/cdn/";
const PROCESS_PREFIX = "processed/";
const ERROR_SUFFIX = ".error";

export async function imageProcessSubmit(c: Context<HonoCtxEnv>) {
  const body = await c.req.json<{
    type: ImageTaskType;
    payload: TranscodePayload | Html2ImagePayload | QrCodePayload;
  }>();

  if (!body.type || !body.payload) {
    return c.json({ error: "缺少 type 或 payload 参数" }, 400);
  }

  if (!VALID_TYPES.includes(body.type)) {
    return c.json({ error: `无效的任务类型: ${body.type}` }, 400);
  }

  const taskId = crypto.randomUUID();

  const message: ImageProcessMessage = {
    taskId,
    type: body.type,
    payload: body.payload,
  };

  await c.env.IMAGE_QUEUE.send(message);

  return c.json({ taskId, status: "pending" });
}

export async function imageProcessStatus(c: Context<HonoCtxEnv>) {
  const taskId = c.req.param("taskId");

  // Check if result exists in R2
  const formats = ["png", "jpeg", "webp"];
  for (const fmt of formats) {
    const key = `${PROCESS_PREFIX}${taskId}.${fmt}`;
    const obj = await c.env.R2.head(key);
    if (obj) {
      return c.json({
        taskId,
        status: "done",
        url: `${CDN_PATH}${key}`,
      } satisfies ImageProcessResult);
    }
  }

  // Check if error marker exists
  const errorObj = await c.env.R2.get(`${PROCESS_PREFIX}${taskId}${ERROR_SUFFIX}`);
  if (errorObj) {
    const error = await errorObj.text();
    return c.json({
      taskId,
      status: "error",
      error,
    } satisfies ImageProcessResult);
  }

  return c.json({ taskId, status: "pending" } satisfies ImageProcessResult);
}

/**
 * Poll R2 for image task completion. Used by internal callers (wechat article, membership card).
 */
export async function pollForImageResult(
  env: { R2: R2Bucket },
  taskId: string,
  timeoutMs: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  const formats = ["png", "jpeg", "webp"];

  while (Date.now() < deadline) {
    for (const fmt of formats) {
      const key = `${PROCESS_PREFIX}${taskId}.${fmt}`;
      const obj = await env.R2.head(key);
      if (obj) return `${CDN_BASE}${key}`;
    }

    // Check error marker
    const errorObj = await env.R2.head(`${PROCESS_PREFIX}${taskId}${ERROR_SUFFIX}`);
    if (errorObj) return null;

    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 1500);
    await promise;
  }
  return null;
}
