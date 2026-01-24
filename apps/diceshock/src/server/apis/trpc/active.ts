import db, {
  activeBoardGamesTable,
  activesTable,
  activeTagMappingsTable,
  activeTagsTable,
  activeTeamsTable,
  boardGamesTable,
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

    // 先获取所有符合条件的数据（不限制数量，以便在内存中排序）
    const allActives = await db(ctx.env.DB).query.activesTable.findMany({
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
    });

    // 当前时间
    const now = new Date();

    // 为每个活动添加过期状态，并排序
    const activesWithExpired = allActives
      .map((active) => {
        const isExpired =
          active.event_date !== null &&
          active.event_date !== undefined &&
          active.event_date < now;
        return {
          ...active,
          isExpired,
        };
      })
      .sort((a, b) => {
        // 先按过期状态排序：未过期的在前（isExpired: false 在前）
        if (a.isExpired !== b.isExpired) {
          return a.isExpired ? 1 : -1;
        }
        // 如果过期状态相同，按 publish_at 降序排序
        const publishAtA = a.publish_at?.getTime() || 0;
        const publishAtB = b.publish_at?.getTime() || 0;
        return publishAtB - publishAtA;
      });

    // 应用分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedActives = activesWithExpired.slice(startIndex, endIndex);

    return paginatedActives;
  });

const getByIdZ = z.object({
  id: z.string(),
});

const getById = publicProcedure
  .input(getByIdZ)
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.id),
      with: {
        tags: {
          with: { tag: true },
        },
        // 移除 boardGames 关系查询，避免 JSON 字段序列化问题
        // boardGames 由前端单独通过 active.boardGames.get 获取
      },
    });

    if (!active) {
      return null;
    }

    // 判断是否过期
    const now = new Date();
    const isExpired =
      active.event_date !== null &&
      active.event_date !== undefined &&
      active.event_date < now;

    return {
      ...active,
      isExpired,
    };
  });

const updateZ = z.object({
  id: z.string(),
  name: z.string().optional(),
  is_published: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
  enable_registration: z.boolean().optional(),
  allow_watching: z.boolean().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  tags: z.string().array().optional(),
  event_date: z.string().optional(), // ISO datetime string
});

const insertZ = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  tags: z.string().array(),
  event_date: z.string().optional(), // ISO datetime string
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
    enable_registration,
    allow_watching,
    description,
    content,
    cover_image,
    tags: tagIds,
    event_date,
  } = input;

  // 如果正在发布活动、开启报名或修改观望设置，先查询当前状态
  let currentActive: {
    is_published: boolean | null;
    publish_at: Date | null;
    enable_registration: boolean | null;
    allow_watching: boolean | null;
  } | null = null;
  if (
    is_published === true ||
    enable_registration !== undefined ||
    allow_watching !== undefined
  ) {
    currentActive =
      (await tdb.query.activesTable.findFirst({
        where: (a, { eq }) => eq(a.id, id),
        columns: {
          is_published: true,
          publish_at: true,
          enable_registration: true,
          allow_watching: true,
        },
      })) ?? null;
  }

  // 构建更新对象，只包含已定义的字段
  const updateData: {
    name?: string;
    is_deleted?: boolean;
    is_published?: boolean;
    enable_registration?: boolean;
    allow_watching?: boolean;
    description?: string;
    content?: string;
    cover_image?: string | null;
    publish_at?: Date;
    event_date?: Date | null;
  } = {};

  if (name !== undefined) updateData.name = name;
  if (is_deleted !== undefined) updateData.is_deleted = is_deleted;
  if (is_published !== undefined) updateData.is_published = is_published;
  if (enable_registration !== undefined)
    updateData.enable_registration = enable_registration;
  if (allow_watching !== undefined) {
    // 只有开启报名时才能开启观望
    if (allow_watching) {
      // 检查是否开启了报名（可能是本次更新开启，也可能是之前已开启）
      const shouldEnableRegistration =
        enable_registration === true ||
        (enable_registration === undefined &&
          currentActive?.enable_registration);
      if (!shouldEnableRegistration) {
        throw new Error("需要先开启报名功能才能开启观望");
      }
    }
    updateData.allow_watching = allow_watching;
    // 如果关闭报名，自动关闭观望
    if (enable_registration === false) {
      updateData.allow_watching = false;
    }
  }
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
  if (event_date !== undefined) {
    // 将 ISO datetime string 转换为 Date 对象，如果为空字符串则设为 null
    updateData.event_date = event_date?.trim() ? new Date(event_date) : null;
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

  // 如果开启报名功能，且之前未开启，则创建默认队伍
  if (
    enable_registration === true &&
    currentActive &&
    !currentActive.enable_registration
  ) {
    // 检查是否已有队伍
    const existingTeams = await tdb.query.activeTeamsTable.findMany({
      where: (team, { eq }) => eq(team.active_id, id),
    });

    // 如果没有队伍，创建默认队伍
    if (existingTeams.length === 0) {
      await tdb.insert(activeTeamsTable).values({
        active_id: id,
        name: "默认队伍",
        max_participants: null, // 无上限
      });
    }
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

  const {
    name,
    description,
    content,
    cover_image,
    tags: tagIds,
    event_date,
  } = input;

  // 先创建活动
  const newActive = await tdb
    .insert(activesTable)
    .values({
      name,
      description,
      content,
      cover_image,
      event_date: event_date?.trim() ? new Date(event_date) : null,
    })
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

// 桌游相关接口
const getBoardGamesZ = z.object({
  active_id: z.string(),
  includeRemoved: z.boolean().optional().default(false), // 是否包含失效的桌游（编辑页面使用）
});

const getBoardGames = publicProcedure
  .input(getBoardGamesZ)
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const mappings = await tdb.query.activeBoardGamesTable.findMany({
      where: (m, { eq }) => eq(m.active_id, input.active_id),
      orderBy: (m, { desc }) => desc(m.create_at),
    });

    // 使用 gstone_id 查找对应的 board games
    const gstoneIds = mappings.map((m) => m.board_game_id);
    if (gstoneIds.length === 0) {
      return [];
    }

    const games = await tdb.query.boardGamesTable.findMany({
      where: (game, { and, inArray, eq }) =>
        and(
          inArray(game.gstone_id, gstoneIds),
          // 如果不包含失效的桌游，只返回有效的（removeDate === new Date(0)）
          input.includeRemoved ? undefined : eq(game.removeDate, new Date(0)),
        ),
    });

    // 返回格式：{ gstone_id: number; content: BoardGame.BoardGameCol | null; isRemoved: boolean }
    return games.map((game) => ({
      gstone_id: game.gstone_id ?? 0,
      content: game.content ?? null,
      isRemoved: Boolean(
        game.removeDate && game.removeDate.getTime() > new Date(0).getTime(),
      ),
    }));
  });

const addBoardGameZ = z.object({
  active_id: z.string(),
  board_game_id: z.number(), // 改为 number，因为使用 gstone_id
});

const addBoardGame = publicProcedure
  .input(addBoardGameZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { active_id, board_game_id } = input;

    // 先通过 gstone_id 查找对应的 board game，确保存在
    const boardGame = await tdb.query.boardGamesTable.findFirst({
      where: (game, { eq }) => eq(game.gstone_id, board_game_id),
    });

    if (!boardGame) {
      return { success: false, message: "桌游不存在" };
    }

    // 检查是否已存在
    const existing = await tdb.query.activeBoardGamesTable.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.active_id, active_id), eq(m.board_game_id, board_game_id)),
    });

    if (existing) {
      return { success: true, message: "桌游已存在" };
    }

    // 添加关联（使用 gstone_id）
    await tdb.insert(activeBoardGamesTable).values({
      active_id,
      board_game_id,
    });

    return { success: true };
  });

const removeBoardGameZ = z.object({
  active_id: z.string(),
  board_game_id: z.number(), // 改为 number，因为使用 gstone_id
});

const removeBoardGame = publicProcedure
  .input(removeBoardGameZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { active_id, board_game_id } = input;

    await tdb
      .delete(activeBoardGamesTable)
      .where(
        drizzle.and(
          drizzle.eq(activeBoardGamesTable.active_id, active_id),
          drizzle.eq(activeBoardGamesTable.board_game_id, board_game_id),
        ),
      );

    return { success: true };
  });

export default {
  get,
  getById,
  mutation,
  delete: deleteMutation,
  boardGames: {
    get: getBoardGames,
    add: addBoardGame,
    remove: removeBoardGame,
  },
};
