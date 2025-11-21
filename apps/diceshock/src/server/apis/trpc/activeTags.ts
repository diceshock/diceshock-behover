import db, {
  activesTable,
  activeTagMappingsTable,
  activeTagsTable,
  drizzle,
} from "@lib/db";
import { z } from "zod/v4";
import { publicProcedure } from "./baseTRPC";
import { createPortal  } from "react-dom";

const get = publicProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);

  const allTags = await tdb.query.activeTagsTable.findMany();

  return allTags.map((tag) => ({
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

const insert = publicProcedure.input(insertZ).mutation(async ({ input, ctx }) => {
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
    })
  );
});

export default { get, insert };
