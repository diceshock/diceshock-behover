import { getAuthUser } from "@hono/auth-js";
import db from "@lib/db";
import { FACTORY } from "../factory";

const seatRedirect = FACTORY.createMiddleware(async (c, next) => {
  const code = c.req.param("code");
  if (!code) return next();

  const authUser = await getAuthUser(c);
  const userId = authUser?.token?.sub || authUser?.user?.id;

  if (!userId) return next();

  try {
    const tdb = db(c.env.DB);

    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, code),
      columns: { id: true },
    });
    if (!table) return next();

    const occHere = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq, ne, and }) =>
        and(eq(o.user_id, userId), eq(o.table_id, table.id), ne(o.status, "ended")),
    });

    if (occHere) return next();
    return c.redirect(`/ready/${code}`);
  } catch {
    return next();
  }
});

export default seatRedirect;
