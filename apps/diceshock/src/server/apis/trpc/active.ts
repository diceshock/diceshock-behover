import * as drizzle from 'drizzle-orm';
import z4, { z } from 'zod/v4';

import { publicProcedure } from './baseTRPC';

import db, {
  pagedZ,
  activesTable,
  activeTagMappingsTable,
  activeTagsTable,
} from '@lib/db';

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

    const actives = db(ctx.env.DB).query.activesTable.findMany({
      where: (acitve, { or, and, like, eq }) =>
        and(
          searchWords
            ? or(
                like(acitve.name, `%${searchWords}%`),
                like(acitve.description, `%${searchWords}%`)
              )
            : undefined,
          isPublished !== undefined
            ? eq(acitve.is_published, isPublished)
            : undefined,
          isDeleted !== undefined ? eq(acitve.is_deleted, isDeleted) : undefined
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

const updateZ = z.object({
  id: z.string(),
  name: z.string().optional(),
  is_published: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  tags: z.string().array().optional(),
});

const insertZ = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  tags: z.string().array(),
});

export const postInputZ = insertZ.or(updateZ);

const update = async (env: Cloudflare.Env, input: z.infer<typeof updateZ>) => {
  const tdb = db(env.DB);

  const {
    id,
    name,
    is_deleted,
    is_published,
    description,
    content,
    tags: tagIds,
  } = input;

  return await tdb.transaction(async (tx) => {
    const acitves = await tx
      .update(activesTable)
      .set({ name, is_deleted, is_published, description, content })
      .where(drizzle.eq(activesTable.id, id))
      .returning();

    if (!acitves.length || !tagIds) return acitves;

    await tx
      .delete(activeTagMappingsTable)
      .where(drizzle.eq(activeTagMappingsTable.active_id, id));

    const tags = await tx.query.activeTagsTable.findMany({
      where: (t, { inArray }) => inArray(t.id, tagIds),
    });

    await tx
      .insert(activeTagMappingsTable)
      .values(tags.map((t) => ({ active_id: id, tag_id: t.id })));

    await tx
      .delete(activeTagsTable)
      .where(
        drizzle.notInArray(
          activesTable.id,
          tx
            .select({ tag_id: activeTagMappingsTable.tag_id })
            .from(activeTagMappingsTable)
            .groupBy(activeTagMappingsTable.tag_id)
        )
      );

    return acitves;
  });
};

const insert = async (env: Cloudflare.Env, input: z.infer<typeof insertZ>) => {
  const tdb = db(env.DB);

  const { name, description, content, tags: tagIds } = input;

  return await tdb.transaction(async (tx) => {
    const tags = await tx.query.activeTagsTable.findMany({
      where: (t, { inArray }) => inArray(t.id, tagIds),
    });

    const newActive = await tx
      .insert(activesTable)
      .values({ name, description, content })
      .returning();

    await tx
      .insert(activeTagMappingsTable)
      .values(
        newActive.flatMap(({ id: active_id }) =>
          tags.map(({ id: tag_id }) => ({ active_id, tag_id }))
        )
      );

    return newActive;
  });
};

const mutation = publicProcedure
  .input(postInputZ)
  .mutation(async ({ input, ctx }) => {
    if ('id' in input) return update(ctx.env, input);
    return insert(ctx.env, input);
  });

export default { get, mutation };
