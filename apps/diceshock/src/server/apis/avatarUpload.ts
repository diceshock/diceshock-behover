import dbFactory, { drizzle, userInfoTable } from "@lib/db";
import { createId } from "@paralleldrive/cuid2";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { cfAvatarUrl } from "@/shared/utils/cfImage";

const AVATAR_PREFIX = "avatars/";
const CDN_BASE = "https://assets.runespark.fun/";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default async function avatarUpload(c: Context<HonoCtxEnv>) {
  const session = c.get("authSession" as any) as
    | { user?: { id?: string } }
    | undefined;
  const userId = session?.user?.id;
  if (!userId) {
    return c.json({ error: "未登录" }, 401);
  }

  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "未选择文件" }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: "仅支持 JPG、PNG、WebP 格式" }, 400);
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return c.json({ error: "头像大小不能超过 2MB" }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const moderationPassed = await moderateImage(c.env.AI, uint8);
  if (!moderationPassed) {
    return c.json({ error: "图片内容不合规，请更换头像" }, 400);
  }

  const ext =
    file.type === "image/png"
      ? ".png"
      : file.type === "image/webp"
        ? ".webp"
        : ".jpg";
  const id = createId();
  const key = `${AVATAR_PREFIX}${userId}/${id}${ext}`;

  await c.env.R2.put(key, uint8, {
    httpMetadata: { contentType: file.type },
  });

  const rawUrl = `${CDN_BASE}${key}`;
  const avatarUrl = cfAvatarUrl(rawUrl);

  const tdb = dbFactory(c.env.DB);
  await tdb
    .update(userInfoTable)
    .set({ avatar_url: rawUrl })
    .where(drizzle.eq(userInfoTable.id, userId));

  await c.env.R2.delete(`card/avatar/${userId}.png`).catch(() => {});

  return c.json({ url: avatarUrl, rawUrl });
}

async function moderateImage(ai: Ai, imageData: Uint8Array): Promise<boolean> {
  try {
    const result = (await ai.run("@cf/microsoft/resnet-50" as any, {
      image: [...imageData],
    })) as { result?: Array<{ label: string; score: number }> };

    const classifications = result.result ?? [];

    const nsfwKeywords = [
      "bikini",
      "brassiere",
      "miniskirt",
      "maillot",
      "swimsuit",
    ];

    const nsfwScore = classifications
      .filter((c) =>
        nsfwKeywords.some((kw) => c.label.toLowerCase().includes(kw)),
      )
      .reduce((max, c) => Math.max(max, c.score), 0);

    if (nsfwScore > 0.7) {
      return false;
    }

    return true;
  } catch (error) {
    // fail-open: AI moderation failure should not block avatar upload
    console.error("Avatar moderation error:", error);
    return true;
  }
}
