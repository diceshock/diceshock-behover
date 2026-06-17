import { createId } from "@paralleldrive/cuid2";
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
  status: "pending" | "processing" | "done" | "error";
  url?: string;
  error?: string;
}

const VALID_TYPES: ImageTaskType[] = ["transcode", "html2image", "qrcode"];

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

  const taskId = createId();

  const message: ImageProcessMessage = {
    taskId,
    type: body.type,
    payload: body.payload,
  };

  await c.env.KV.put(
    `img-task:${taskId}`,
    JSON.stringify({ taskId, status: "pending" } satisfies ImageProcessResult),
    { expirationTtl: 3600 },
  );

  await c.env.IMAGE_QUEUE.send(message);

  return c.json({ taskId, status: "pending" });
}

export async function imageProcessStatus(c: Context<HonoCtxEnv>) {
  const taskId = c.req.param("taskId");

  const raw = await c.env.KV.get(`img-task:${taskId}`);
  if (!raw) {
    return c.json({ error: "任务不存在或已过期" }, 404);
  }

  return c.json(JSON.parse(raw) as ImageProcessResult);
}
