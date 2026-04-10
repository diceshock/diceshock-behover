import db, { drizzle, eventsTable } from "@lib/db";
import { z } from "zod/v4";
import { dashProcedure, unwrapInput } from "./baseTRPC";

const list = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const events = await tdb.query.eventsTable.findMany({
    orderBy: (e, { desc }) => desc(e.create_at),
  });
  return events;
});

const createEventZ = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  cover_image_url: z.string().url().optional(),
  content: z.string().optional(),
});

const create = dashProcedure
  .input(createEventZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const [event] = await tdb
      .insert(eventsTable)
      .values({
        title: input.title,
        description: input.description ?? null,
        cover_image_url: input.cover_image_url ?? null,
        content: input.content ?? null,
        is_published: false,
      })
      .returning();
    return event;
  });

const updateEventZ = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  cover_image_url: z.string().url().optional(),
  content: z.string().optional(),
});

const update = dashProcedure
  .input(updateEventZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const [event] = await tdb
      .update(eventsTable)
      .set({
        title: input.title,
        description: input.description ?? null,
        cover_image_url: input.cover_image_url ?? null,
        content: input.content ?? null,
        update_at: new Date(Date.now()),
      })
      .where(drizzle.eq(eventsTable.id, input.id))
      .returning();
    return event;
  });

const remove = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb.delete(eventsTable).where(drizzle.eq(eventsTable.id, input.id));
    return { success: true };
  });

const togglePublish = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const event = await tdb.query.eventsTable.findFirst({
      where: (e, { eq }) => eq(e.id, input.id),
    });
    if (!event) throw new Error("活动不存在");
    const [updated] = await tdb
      .update(eventsTable)
      .set({
        is_published: !event.is_published,
        update_at: new Date(Date.now()),
      })
      .where(drizzle.eq(eventsTable.id, input.id))
      .returning();
    return updated;
  });

const getById = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const event = await tdb.query.eventsTable.findFirst({
      where: (e, { eq }) => eq(e.id, input.id),
    });
    if (!event) throw new Error("活动不存在");
    return event;
  });

export default {
  list,
  create,
  update,
  remove,
  togglePublish,
  getById,
};
