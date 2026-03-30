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
    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq, ne, and }) =>
        and(eq(o.user_id, userId), ne(o.status, "ended")),
      with: { table: { columns: { code: true } } },
    });

    if (occ) {
      if (occ.table.code === code) {
        return next();
      }
      return c.redirect(
        `/t/${occ.table.code}?from=${encodeURIComponent(code)}`,
      );
    }

    return c.redirect(`/ready/${code}`);
  } catch {
    return next();
  }
});

export default seatRedirect;
