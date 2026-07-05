import { getAuthUser } from "@hono/auth-js";
import db from "@lib/db";
import { buildStoreLocalePrefix, DEFAULT_LOCALE, DEFAULT_STORE, type LocaleCode, type StoreCode } from "@/shared/store-locale";
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
        and(
          eq(o.user_id, userId),
          eq(o.table_id, table.id),
          ne(o.status, "ended"),
          ne(o.status, "settled"),
        ),
    });

    if (occHere) return next();
    const store = (c.get("StoreCode") ?? DEFAULT_STORE) as StoreCode;
    const locale = (c.get("LocaleCode") ?? DEFAULT_LOCALE) as LocaleCode;
    const prefix = buildStoreLocalePrefix(store, locale);
    return c.redirect(`/${prefix}/ready/${code}`);
  } catch {
    return next();
  }
});

export default seatRedirect;
