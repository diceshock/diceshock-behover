import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import z from "zod/v4";
import { KV_PREFIX, type ShortlinkData } from "../shortlink";
import { staffProcedure } from "./baseTRPC";

const ALLOWED_HOSTS = new Set([
  "diceshock.com",
  "www.diceshock.com",
  "runespark.fun",
  "www.runespark.fun",
  "origin.runespark.fun",
]);

const KV_INDEX_PREFIX = "shortlink-index:";

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

const SLUG_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

const createInputZ = z.object({
  url: z.string().url(),
  slug: z
    .string()
    .regex(SLUG_REGEX, "Slug 只允许字母、数字、下划线和短横线，1~64 字符")
    .optional(),
  expiresIn: z.number().int().positive().optional(),
});

const create = staffProcedure
  .input(createInputZ)
  .mutation(async ({ input, ctx }) => {
    if (!isAllowedHost(input.url)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `不允许的目标域名，仅支持: ${[...ALLOWED_HOSTS].join(", ")}`,
      });
    }

    const slug = input.slug || nanoid(8);

    const existing = await ctx.env.KV.get(`${KV_PREFIX}${slug}`);
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `短链接 "${slug}" 已被占用`,
      });
    }

    const now = Date.now();
    const data: ShortlinkData = {
      url: input.url,
      createdAt: now,
      ...(input.expiresIn ? { expiresAt: now + input.expiresIn * 1000 } : {}),
    };

    const kvOptions: KVNamespacePutOptions = {};
    if (input.expiresIn) {
      kvOptions.expirationTtl = input.expiresIn;
    }

    await ctx.env.KV.put(
      `${KV_PREFIX}${slug}`,
      JSON.stringify(data),
      kvOptions,
    );

    await ctx.env.KV.put(
      `${KV_INDEX_PREFIX}${slug}`,
      JSON.stringify({
        slug,
        url: input.url,
        createdAt: now,
        expiresAt: data.expiresAt,
      }),
    );

    return {
      slug,
      shortUrl: `https://diceshock.com/x/${slug}`,
      url: input.url,
      expiresAt: data.expiresAt ?? null,
      createdAt: now,
    };
  });

const list = staffProcedure
  .input(z.object({ cursor: z.string().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const result = await ctx.env.KV.list({
      prefix: KV_INDEX_PREFIX,
      cursor: input?.cursor,
      limit: 100,
    });

    const items = await Promise.all(
      result.keys.map(async (key) => {
        const indexRaw = await ctx.env.KV.get(key.name);
        if (!indexRaw) return null;

        const index = JSON.parse(indexRaw) as {
          slug: string;
          url: string;
          createdAt: number;
          expiresAt?: number;
        };

        const dataRaw = await ctx.env.KV.get(`${KV_PREFIX}${index.slug}`);
        const active = !!dataRaw;

        return { ...index, active };
      }),
    );

    return {
      items: items.filter(Boolean) as Array<{
        slug: string;
        url: string;
        createdAt: number;
        expiresAt?: number;
        active: boolean;
      }>,
      cursor: result.list_complete ? undefined : result.cursor,
    };
  });

const close = staffProcedure
  .input(z.object({ slug: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await ctx.env.KV.delete(`${KV_PREFIX}${input.slug}`);

    const indexRaw = await ctx.env.KV.get(`${KV_INDEX_PREFIX}${input.slug}`);
    if (indexRaw) {
      const index = JSON.parse(indexRaw);
      index.expiresAt = Date.now();
      await ctx.env.KV.put(
        `${KV_INDEX_PREFIX}${input.slug}`,
        JSON.stringify(index),
      );
    }

    return { success: true };
  });

const updateExpiry = staffProcedure
  .input(
    z.object({
      slug: z.string(),
      expiresIn: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const raw = await ctx.env.KV.get(`${KV_PREFIX}${input.slug}`);
    if (!raw) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "短链接不存在或已失效",
      });
    }

    const data: ShortlinkData = JSON.parse(raw);
    const now = Date.now();

    if (input.expiresIn) {
      data.expiresAt = now + input.expiresIn * 1000;
    } else {
      delete data.expiresAt;
    }

    const kvOptions: KVNamespacePutOptions = {};
    if (input.expiresIn) {
      kvOptions.expirationTtl = input.expiresIn;
    }

    await ctx.env.KV.put(
      `${KV_PREFIX}${input.slug}`,
      JSON.stringify(data),
      kvOptions,
    );

    const indexRaw = await ctx.env.KV.get(`${KV_INDEX_PREFIX}${input.slug}`);
    if (indexRaw) {
      const index = JSON.parse(indexRaw);
      index.expiresAt = data.expiresAt;
      await ctx.env.KV.put(
        `${KV_INDEX_PREFIX}${input.slug}`,
        JSON.stringify(index),
      );
    }

    return { slug: input.slug, expiresAt: data.expiresAt ?? null };
  });

export default { create, list, close, updateExpiry };
export { isAllowedHost, KV_INDEX_PREFIX, SLUG_REGEX };
