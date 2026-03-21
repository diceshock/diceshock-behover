import db, { activeRegistrationsTable, activesTable, drizzle } from "@lib/db";
import { dashProcedure } from "./baseTRPC";

const list = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const actives = await tdb.query.activesTable.findMany({
    orderBy: (a, { desc }) => desc(a.create_at),
    with: {
      creator: { columns: { id: true, name: true } },
      registrations: {
        columns: { id: true, user_id: true, is_watching: true },
      },
      boardGame: { columns: { id: true, sch_name: true, eng_name: true } },
    },
  });
  return actives;
});

const remove = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .delete(activeRegistrationsTable)
      .where(drizzle.eq(activeRegistrationsTable.active_id, input.id));
    await tdb.delete(activesTable).where(drizzle.eq(activesTable.id, input.id));
    return { success: true };
  });

export default {
  list,
  remove,
};
