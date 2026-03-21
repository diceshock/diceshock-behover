import db, { eventsTable } from "@lib/db";
import { publicProcedure } from "./baseTRPC";

const list = publicProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const events = await tdb.query.eventsTable.findMany({
    where: (e, { eq }) => eq(e.is_published, true),
    orderBy: (e, { desc }) => desc(e.create_at),
  });
  return events;
});

export default {
  list,
};
