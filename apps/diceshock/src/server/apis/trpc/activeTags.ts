import db, {
  activesTable,
  activeTagMappingsTable,
  activeTagsTable,
} from "@lib/db";
import * as drizzle from "drizzle-orm";
import { z } from "zod/v4";
import { publicProcedure } from "./baseTRPC";

const get = publicProcedure.query(async ({ ctx }) =>
  db(ctx.env.DB).transaction(async (tx) =>
    tx
      .select({
        id: activeTagsTable.id,
        title: activeTagsTable.title,
      })
      .from(activeTagsTable)
      .leftJoin(
        activeTagMappingsTable,
        drizzle.eq(activeTagsTable.id, activeTagMappingsTable.tag_id),
      )
      .leftJoin(
        activesTable,
        drizzle.eq(activeTagMappingsTable.active_id, activesTable.id),
      )
      .where(drizzle.eq(activesTable.is_deleted, false))
      .groupBy(activeTagsTable.id),
  ),
);

export const activeTagTitleZ = z.object({
  tx: z.emoji().nonempty(),
  emoji: z.string().nonempty(),
});
const insertZ = z
  .object({ activeId: z.string(), title: activeTagTitleZ })
  .array();

const insert = publicProcedure.input(insertZ).mutation(async ({ input, ctx }) =>
  db(ctx.env.DB).transaction(async (tx) =>
    Promise.all(
      input.map(async ({ activeId, title }) => {
        const active = await tx.query.activesTable.findFirst({
          where: (a, { eq }) => eq(a.id, activeId),
        });

        if (!active) return { message: "Active not found", ok: false } as const;

        const [tag] = await tx
          .insert(activeTagsTable)
          .values({ title })
          .returning();

        if (tag) return { message: "Tag creation failed", ok: false } as const;

        const [relation] = await tx
          .insert(activeTagMappingsTable)
          .values({
            active_id: activeId,
            tag_id: tag,
          })
          .returning();

        if (!relation)
          return {
            message: "Tag mapping creation failed",
            ok: false,
            tag,
          } as const;

        return tag;
      }),
    ),
  ),
);

export default { get, insert };
