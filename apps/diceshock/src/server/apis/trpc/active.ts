import db, {
  activesTable,
  activeTagMappingsTable,
  activeTagsTable,
  drizzle,
  pagedZ,
} from "@lib/db";
import z4, { z } from "zod/v4";
import { publicProcedure } from "./baseTRPC";

export const getFilterZ = z4.object({
  searchWords: z4.string().nonempty().optional(),
  isPublished: z4.boolean().optional(),
  isDeleted: z4.boolean().optional(),
  tags: z4.array(z4.string()).optional(),
});

const get = publicProcedure
  .input(pagedZ(getFilterZ))
  .query(async ({ input, ctx }) => {
    const {
      page,
      pageSize,
      params: { isDeleted = false, isPublished, searchWords, tags },
    } = input;

    const actives = await db(ctx.env.DB).query.activesTable.findMany({
      where: (acitve, { or, and, like, eq }) =>
        and(
          searchWords
            ? or(
                like(acitve.name, `%${searchWords}%`),
                like(acitve.description, `%${searchWords}%`),
              )
            : undefined,
          isPublished !== undefined
            ? eq(acitve.is_published, isPublished)
            : undefined,
          isDeleted !== undefined
            ? eq(acitve.is_deleted, isDeleted)
            : undefined,
        ),
      with: {
        tags: {
          with: { tag: true },
          where: (tag, { inArray }) =>
            tags ? inArray(tag.tag_id, tags) : undefined,
        },
      },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: (actives, { desc }) => desc(actives.publish_at),
    });

    return actives;
  });

const getByIdZ = z.object({
  id: z.string(),
});

const getById = publicProcedure
  .input(getByIdZ)
  .query(async ({ input, ctx }) => {
    const active = await db(ctx.env.DB).query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.id),
      with: {
        tags: {
          with: { tag: true },
        },
      },
    });

    return active;
  });

const updateZ = z.object({
  id: z.string(),
  name: z.string().optional(),
  is_published: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  tags: z.string().array().optional(),
});

const insertZ = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  tags: z.string().array(),
});

// 将 updateZ 放在前面，因为它有 id 字段，更容易区分
export const postInputZ = z.union([updateZ, insertZ]);

const update = async (env: Cloudflare.Env, input: z.infer<typeof updateZ>) => {
  const tdb = db(env.DB);

  const {
    id,
    name,
    is_deleted,
    is_published,
    description,
    content,
    cover_image,
    tags: tagIds,
  } = input;

  // 如果正在发布活动，先查询当前状态
  let currentActive: { is_published: boolean | null; publish_at: Date | null } | null = null;
  if (is_published === true) {
    currentActive = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, id),
      columns: { is_published: true, publish_at: true },
    });
  }

  // 构建更新对象，只包含已定义的字段
  const updateData: {
    name?: string;
    is_deleted?: boolean;
    is_published?: boolean;
    description?: string;
    content?: string;
    cover_image?: string | null;
    publish_at?: Date;
  } = {};

  if (name !== undefined) updateData.name = name;
  if (is_deleted !== undefined) updateData.is_deleted = is_deleted;
  if (is_published !== undefined) updateData.is_published = is_published;
  if (description !== undefined) updateData.description = description;
  if (content !== undefined) updateData.content = content;
  if (cover_image !== undefined) {
    // 如果 cover_image 是 null，直接设置为 null；如果是字符串，trim 后如果为空则设为 null，否则设为 trim 后的值
    const processedCoverImage =
      cover_image === null
        ? null
        : typeof cover_image === "string" && cover_image.trim()
          ? cover_image.trim()
          : null;
    updateData.cover_image = processedCoverImage;
    console.log("更新 cover_image:", {
      original: cover_image,
      processed: processedCoverImage,
    });
  }

  // 如果正在发布活动，且之前未发布过，则设置发布时间为当前时间
  if (
    is_published === true &&
    currentActive &&
    !currentActive.is_published &&
    (!currentActive.publish_at || currentActive.publish_at.getTime() === 0)
  ) {
    updateData.publish_at = new Date();
  }

  // 如果没有要更新的字段，直接返回（或者只处理标签）
  if (Object.keys(updateData).length === 0 && !tagIds) {
    return await tdb.query.activesTable.findMany({
      where: (a, { eq }) => eq(a.id, id),
    });
  }

  console.log("updateData:", JSON.stringify(updateData, null, 2));
  const acitves =
    Object.keys(updateData).length > 0
      ? await tdb
          .update(activesTable)
          .set(updateData)
          .where(drizzle.eq(activesTable.id, id))
          .returning()
      : await tdb.query.activesTable.findMany({
          where: (a, { eq }) => eq(a.id, id),
        });
  console.log("更新后的 acitves:", JSON.stringify(acitves, null, 2));

  if (!acitves.length || !tagIds) return acitves;

  await tdb
    .delete(activeTagMappingsTable)
    .where(drizzle.eq(activeTagMappingsTable.active_id, id));

  const tags = await tdb.query.activeTagsTable.findMany({
    where: (t, { inArray }) => inArray(t.id, tagIds),
  });

  if (tags.length > 0) {
    await tdb
      .insert(activeTagMappingsTable)
      .values(tags.map((t) => ({ active_id: id, tag_id: t.id })));
  }

  // 删除未被任何活动使用的标签
  const allMappings = await tdb.query.activeTagMappingsTable.findMany();
  const usedTagIds = new Set(allMappings.map((m) => m.tag_id));

  const allTags = await tdb.query.activeTagsTable.findMany();
  const unusedTagIds = allTags
    .filter((tag) => !usedTagIds.has(tag.id))
    .map((tag) => tag.id);

  if (unusedTagIds.length > 0) {
    await tdb
      .delete(activeTagsTable)
      .where(drizzle.inArray(activeTagsTable.id, unusedTagIds));
  }

  return acitves;
};

const insert = async (env: Cloudflare.Env, input: z.infer<typeof insertZ>) => {
  const tdb = db(env.DB);

  const { name, description, content, cover_image, tags: tagIds } = input;

  // 先创建活动
  const newActive = await tdb
    .insert(activesTable)
    .values({ name, description, content, cover_image })
    .returning();

  // 如果有标签，创建标签映射
  if (tagIds && tagIds.length > 0) {
    const tags = await tdb.query.activeTagsTable.findMany({
      where: (t, { inArray }) => inArray(t.id, tagIds),
    });

    if (tags.length > 0) {
      await tdb
        .insert(activeTagMappingsTable)
        .values(
          newActive.flatMap(({ id: active_id }) =>
            tags.map(({ id: tag_id }) => ({ active_id, tag_id })),
          ),
        );
    }
  }

  return newActive;
};

const deleteZ = z.object({
  id: z.string(),
});

const deleteActive = async (
  env: Cloudflare.Env,
  input: z.infer<typeof deleteZ>,
) => {
  const tdb = db(env.DB);
  const { id } = input;

  // 删除活动的标签映射
  await tdb
    .delete(activeTagMappingsTable)
    .where(drizzle.eq(activeTagMappingsTable.active_id, id));

  // 删除活动本身
  await tdb.delete(activesTable).where(drizzle.eq(activesTable.id, id));

  // 清理未被任何活动使用的标签
  const allMappings = await tdb.query.activeTagMappingsTable.findMany();
  const usedTagIds = new Set(allMappings.map((m) => m.tag_id));

  const allTags = await tdb.query.activeTagsTable.findMany();
  const unusedTagIds = allTags
    .filter((tag) => !usedTagIds.has(tag.id))
    .map((tag) => tag.id);

  if (unusedTagIds.length > 0) {
    await tdb
      .delete(activeTagsTable)
      .where(drizzle.inArray(activeTagsTable.id, unusedTagIds));
  }

  return { success: true };
};

const mutation = publicProcedure
  .input(postInputZ)
  .mutation(async ({ input, ctx }) => {
    console.log("mutation 输入:", { hasId: "id" in input, input });
    if ("id" in input) {
      console.log("调用 update");
      return update(ctx.env, input);
    }
    console.log("调用 insert");
    return insert(ctx.env, input);
  });

const deleteMutation = publicProcedure
  .input(deleteZ)
  .mutation(async ({ input, ctx }) => {
    return deleteActive(ctx.env, input);
  });

export default { get, getById, mutation, delete: deleteMutation };
