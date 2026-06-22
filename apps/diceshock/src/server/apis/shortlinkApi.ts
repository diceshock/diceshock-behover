import type { Context } from "hono";
import { nanoid } from "nanoid";
import type { HonoCtxEnv } from "@/shared/types";
import {
  isAllowedHost,
  KV_INDEX_PREFIX,
  KV_PREFIX,
  type ShortlinkData,
  SLUG_REGEX,
} from "./shortlink";

export async function shortlinkCreate(c: Context<HonoCtxEnv>) {
  const body = await c.req.json<{
    url?: string;
    slug?: string;
    expiresIn?: number;
  }>();

  if (!body.url || typeof body.url !== "string") {
    return c.json({ error: "url is required" }, 400);
  }

  if (!isAllowedHost(body.url)) {
    return c.json({ error: "target host not allowed" }, 400);
  }

  if (body.slug && !SLUG_REGEX.test(body.slug)) {
    return c.json({ error: "slug must be 1-64 chars of [a-zA-Z0-9_-]" }, 400);
  }

  if (body.expiresIn !== undefined) {
    if (
      typeof body.expiresIn !== "number" ||
      body.expiresIn <= 0 ||
      !Number.isInteger(body.expiresIn)
    ) {
      return c.json(
        { error: "expiresIn must be a positive integer (seconds)" },
        400,
      );
    }
  }

  const slug = body.slug || nanoid(8);

  const existing = await c.env.KV.get(`${KV_PREFIX}${slug}`);
  if (existing) {
    return c.json({ error: `slug "${slug}" already exists` }, 409);
  }

  const now = Date.now();
  const data: ShortlinkData = {
    url: body.url,
    createdAt: now,
    ...(body.expiresIn ? { expiresAt: now + body.expiresIn * 1000 } : {}),
  };

  const kvOptions: KVNamespacePutOptions = {};
  if (body.expiresIn) {
    kvOptions.expirationTtl = body.expiresIn;
  }

  await c.env.KV.put(`${KV_PREFIX}${slug}`, JSON.stringify(data), kvOptions);
  await c.env.KV.put(
    `${KV_INDEX_PREFIX}${slug}`,
    JSON.stringify({
      slug,
      url: body.url,
      createdAt: now,
      expiresAt: data.expiresAt,
    }),
  );

  return c.json({
    slug,
    shortUrl: `https://diceshock.com/x/${slug}`,
    url: body.url,
    expiresAt: data.expiresAt ?? null,
    createdAt: now,
  });
}
