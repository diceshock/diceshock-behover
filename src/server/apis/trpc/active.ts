import { pagedZ } from "@/shared/types/kits";
import { publicProcedure } from "./trpc";
import db from "@/server/db";
import z4 from "zod/v4";

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
      params: { isDeleted, isPublished, searchWords, tags },
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

export default { get };
