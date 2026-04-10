import db, { eventsTable } from "@lib/db";
import { publicProcedure, unwrapInput } from "./baseTRPC";

const list = publicProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const events = await tdb.query.eventsTable.findMany({
    where: (e, { eq }) => eq(e.is_published, true),
    orderBy: (e, { desc }) => desc(e.create_at),
  });
  return events;
});

const getById = publicProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const event = await tdb.query.eventsTable.findFirst({
      where: (e, { and, eq }) =>
        and(eq(e.id, input.id), eq(e.is_published, true)),
    });
    if (!event) throw new Error("活动不存在");
    return event;
  });

export default {
  list,
  getById,
};
