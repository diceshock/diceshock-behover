import db, { activeTagMappingsTable, activeTagsTable, drizzle } from "@lib/db";
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
    keywords: tag.keywords,
    is_pinned: tag.is_pinned,
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

const updateZ = z.object({
  id: z.string(),
  title: activeTagTitleZ,
  keywords: z.string().optional(),
  is_pinned: z.boolean().optional(),
});

const update = publicProcedure
  .input(updateZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { id, title, keywords, is_pinned } = input;

    const updateData: {
      title: typeof title;
      keywords?: string | null;
      is_pinned?: boolean;
    } = {
      title,
    };
    if (keywords !== undefined) {
      updateData.keywords = keywords || null;
    }
    if (is_pinned !== undefined) {
      updateData.is_pinned = is_pinned;
    }

    const [updatedTag] = await tdb
      .update(activeTagsTable)
      .set(updateData)
      .where(drizzle.eq(activeTagsTable.id, id))
      .returning();

    if (!updatedTag) {
      throw new Error("标签更新失败");
    }

    return updatedTag;
  });

// 获取所有约局标签（不限制于已发布的活动）
// 注意：这里返回所有标签，因为约局标签管理页面应该显示所有标签
// 如果需要在其他地方只显示名称包含"约局"的标签，可以在前端过滤
const getGameTags = publicProcedure
  .input(
    z
      .object({
        search: z.string().optional(),
        onlyPinned: z.boolean().optional(), // 是否只返回置顶标签
      })
      .optional(),
  )
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const searchQuery = input?.search?.trim().toLowerCase();
    const onlyPinned = input?.onlyPinned;

    // 获取所有标签
    let allTags = await tdb.query.activeTagsTable.findMany();

    // 如果只返回置顶标签，先过滤
    if (onlyPinned) {
      allTags = allTags.filter((tag) => tag.is_pinned === true);
    }

    // 如果有搜索查询，进行模糊匹配
    let filteredTags = allTags;
    if (searchQuery) {
      filteredTags = allTags.filter((tag) => {
        const title = tag.title?.tx?.toLowerCase() || "";
        const keywords = tag.keywords?.toLowerCase() || "";
        const emoji = tag.title?.emoji || "";

        return (
          title.includes(searchQuery) ||
          keywords.includes(searchQuery) ||
          emoji.includes(searchQuery)
        );
      });
    }

    // 排序：置顶的在前，然后按 id 排序
    filteredTags.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return a.id.localeCompare(b.id);
    });

    return filteredTags.map((tag) => ({
      id: tag.id,
      title: tag.title,
      keywords: tag.keywords,
      is_pinned: tag.is_pinned,
    }));
  });

// 创建约局标签（不需要关联活动）
const createGameTagZ = z.object({
  title: activeTagTitleZ,
  keywords: z.string().optional(),
  is_pinned: z.boolean().optional(),
});

const createGameTag = publicProcedure
  .input(createGameTagZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { title, keywords, is_pinned } = input;

    // 检查是否已存在相同的标签
    const existing = await tdb.query.activeTagsTable.findFirst({
      where: (tag, { eq }) => eq(tag.title, title),
    });

    if (existing) {
      throw new Error("标签已存在");
    }

    const [newTag] = await tdb
      .insert(activeTagsTable)
      .values({
        title,
        keywords: keywords || null,
        is_pinned: is_pinned || false,
      })
      .returning();

    if (!newTag) {
      throw new Error("标签创建失败");
    }

    return newTag;
  });

// 删除标签（同时删除所有引用关系）
const deleteZ = z.object({
  id: z.string(),
});

const deleteTag = publicProcedure
  .input(deleteZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { id } = input;

    // 先删除所有引用该标签的映射关系
    await tdb
      .delete(activeTagMappingsTable)
      .where(drizzle.eq(activeTagMappingsTable.tag_id, id));

    // 然后删除标签本身
    const [deletedTag] = await tdb
      .delete(activeTagsTable)
      .where(drizzle.eq(activeTagsTable.id, id))
      .returning();

    if (!deletedTag) {
      throw new Error("标签删除失败");
    }

    return deletedTag;
  });

// 批量导入标签
const importTagsZ = z.object({
  tags: z
    .array(
      z.object({
        name: z.string(),
        emoji: z.string().optional(),
        keywords: z.string().optional(),
        is_pinned: z.boolean().optional(),
      }),
    )
    .min(1),
  rewrite: z.boolean().optional().default(false),
});

const importTags = publicProcedure
  .input(importTagsZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { tags, rewrite } = input;

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const tagData of tags) {
      try {
        // 获取所有标签，检查是否有相同名称的标签
        const allTags = await tdb.query.activeTagsTable.findMany();
        const existing = allTags.find(
          (tag) => tag.title?.tx === tagData.name.trim(),
        );

        if (existing) {
          if (rewrite) {
            // 如果启用 rewrite，更新现有标签（优先使用 TOML 中的数据）
            const updateData: {
              title: { tx: string; emoji: string };
              keywords?: string | null;
              is_pinned?: boolean;
            } = {
              title: {
                tx: tagData.name.trim(),
                emoji: tagData.emoji?.trim() || existing.title?.emoji || "🎲",
              },
            };

            // 如果 TOML 中提供了 keywords，使用 TOML 的值；否则保持现有值
            if (tagData.keywords !== undefined) {
              updateData.keywords = tagData.keywords.trim() || null;
            }

            // 如果 TOML 中提供了 is_pinned，使用 TOML 的值；否则保持现有值
            if (tagData.is_pinned !== undefined) {
              updateData.is_pinned = tagData.is_pinned;
            }

            await tdb
              .update(activeTagsTable)
              .set(updateData)
              .where(drizzle.eq(activeTagsTable.id, existing.id));

            results.updated++;
          } else {
            results.skipped++;
          }
          continue;
        }

        // 创建新标签
        await tdb.insert(activeTagsTable).values({
          title: {
            tx: tagData.name.trim(),
            emoji: tagData.emoji?.trim() || "🎲",
          },
          keywords: tagData.keywords?.trim() || null,
          is_pinned: tagData.is_pinned || false,
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `标签 "${tagData.name}" 导入失败: ${
            error instanceof Error ? error.message : "未知错误"
          }`,
        );
      }
    }

    return results;
  });

export default {
  get,
  insert,
  update,
  getGameTags,
  createGameTag,
  delete: deleteTag,
  importTags,
};
