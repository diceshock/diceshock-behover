import db, {
  activeTagMappingsTable,
  activeTagsTable,
} from "@lib/db";
import { z } from "zod/v4";
import { publicProcedure } from "./baseTRPC";

const get = publicProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);

  // 先找到所有已发布且未删除的活动
  const publishedActives = await tdb.query.activesTable.findMany({
    where: (a, { and, eq }) =>
      and(eq(a.is_published, true), eq(a.is_deleted, false)),
    columns: { id: true },
  });

  const publishedActiveIds = publishedActives.map((a) => a.id);

  // 如果没有已发布的活动，返回空数组
  if (publishedActiveIds.length === 0) {
    return [];
  }

  // 找到这些活动使用的标签ID
  const tagMappings = await tdb.query.activeTagMappingsTable.findMany({
    where: (m, { inArray }) => inArray(m.active_id, publishedActiveIds),
    columns: { tag_id: true },
  });

  const usedTagIds = [...new Set(tagMappings.map((m) => m.tag_id))];

  // 如果没有使用的标签，返回空数组
  if (usedTagIds.length === 0) {
    return [];
  }

  // 返回这些标签
  const tags = await tdb.query.activeTagsTable.findMany({
    where: (t, { inArray }) => inArray(t.id, usedTagIds),
  });

  return tags.map((tag) => ({
    id: tag.id,
    title: tag.title,
  }));
});

export const activeTagTitleZ = z.object({
  tx: z.string().nonempty(),
  emoji: z.string().nonempty(),
});
const insertZ = z
  .object({ activeId: z.string(), title: activeTagTitleZ })
  .array();

const insert = publicProcedure
  .input(insertZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    return Promise.all(
      input.map(async ({ activeId, title }) => {
        const active = await tdb.query.activesTable.findFirst({
          where: (a, { eq }) => eq(a.id, activeId),
        });

        if (!active) return { message: "Active not found", ok: false } as const;

        const [tag] = await tdb
          .insert(activeTagsTable)
          .values({ title })
          .returning();

        if (!tag) return { message: "Tag creation failed", ok: false } as const;

        const [relation] = await tdb
          .insert(activeTagMappingsTable)
          .values({
            active_id: activeId,
            tag_id: tag.id,
          })
          .returning();

        if (!relation)
          return {
            message: "Tag mapping creation failed",
            ok: false,
          } as const;

        return tag;
      }),
    );
  });

export default { get, insert };
