import { z } from "zod/v4";
import { dashProcedure } from "./baseTRPC";

const UPLOAD_PREFIX = "up/";
const CDN_BASE = "https://assets.diceshock.com/";

const listInputZ = z.object({
  search: z.string().optional(),
  contentTypeFilter: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(1000).default(200),
});

const list = dashProcedure.input(listInputZ).query(async ({ input, ctx }) => {
  const listed = await ctx.env.R2.list({
    prefix: UPLOAD_PREFIX,
    limit: input.limit,
    cursor: input.cursor,
    include: ["httpMetadata", "customMetadata"],
  });

  let items = listed.objects.map((obj) => ({
    key: obj.key,
    name: obj.key.slice(UPLOAD_PREFIX.length),
    contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
    size: obj.size,
    uploaded: obj.uploaded.toISOString(),
    url: `${CDN_BASE}${obj.key}`,
  }));

  if (input.search) {
    const q = input.search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(q));
  }
  if (input.contentTypeFilter) {
    const f = input.contentTypeFilter;
    items = items.filter((i) => i.contentType.startsWith(f));
  }

  return {
    items,
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : undefined,
  };
});

const renameZ = z.object({
  oldKey: z.string(),
  newName: z.string().min(1).max(500),
});

const rename = dashProcedure.input(renameZ).mutation(async ({ input, ctx }) => {
  const src = await ctx.env.R2.get(input.oldKey);
  if (!src) throw new Error("文件不存在");

  const newKey = `${UPLOAD_PREFIX}${input.newName}`;

  const existing = await ctx.env.R2.head(newKey);
  if (existing) throw new Error("目标文件名已存在");

  await ctx.env.R2.put(newKey, src.body, {
    httpMetadata: src.httpMetadata,
    customMetadata: src.customMetadata,
  });
  await ctx.env.R2.delete(input.oldKey);

  return { key: newKey, url: `${CDN_BASE}${newKey}` };
});

const deleteZ = z.object({
  key: z.string(),
});

const remove = dashProcedure.input(deleteZ).mutation(async ({ input, ctx }) => {
  await ctx.env.R2.delete(input.key);
  return { success: true };
});

export default {
  list,
  rename,
  remove,
};
