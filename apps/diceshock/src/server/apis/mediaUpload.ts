import { createId } from "@paralleldrive/cuid2";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

const UPLOAD_PREFIX = "up/";
const CDN_BASE = "https://assets.diceshock.com/";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default async function mediaUpload(c: Context<HonoCtxEnv>) {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "未选择文件" }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: "文件大小超过 100MB 限制" }, 400);
  }

  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const id = createId();
  const key = `${UPLOAD_PREFIX}${id}${ext}`;

  await c.env.R2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
    customMetadata: {
      originalName: file.name,
    },
  });

  return c.json({
    key,
    name: `${id}${ext}`,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    url: `${CDN_BASE}${key}`,
  });
}
