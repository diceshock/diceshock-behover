import db, {
  orderPauseLogsTable,
  tableOccupancyTable,
} from "@lib/db";
import { eq, or } from "drizzle-orm";

/**
 * Auto-close orders that exceed business hours.
 *
 * Business hours: 12:00 (noon) to 06:00 (next day), Shanghai time.
 * This cron runs at 06:00 Shanghai (22:00 UTC) and settles all
 * still-active/paused orders with note "超时关闭".
 */
export async function closeOvertimeOrders(env: {
  DB: D1Database;
}): Promise<{ closed: number }> {
  const tdb = db(env.DB);
  const now = new Date();

  // Find all active or paused orders
  const openOrders = await tdb.query.tableOccupancyTable.findMany({
    where: (o, { and }) =>
      and(or(eq(o.status, "active"), eq(o.status, "paused"))),
    with: { pauseLogs: true },
  });

  if (openOrders.length === 0) return { closed: 0 };

  let closed = 0;
  for (const order of openOrders) {
    // Close any open pause log
    const openPauseLog = order.pauseLogs?.find((log) => !log.resumed_at);
    if (openPauseLog) {
      await tdb
        .update(orderPauseLogsTable)
        .set({ resumed_at: now })
        .where(eq(orderPauseLogsTable.id, openPauseLog.id));
    }

    // Settle the order with note "超时关闭"
    await tdb
      .update(tableOccupancyTable)
      .set({
        status: "settled",
        end_at: now,
        settled_at: now,
        note: "超时关闭",
      })
      .where(eq(tableOccupancyTable.id, order.id));

    closed++;
  }

  console.log(`[overtime-auto-close] Settled ${closed} orders at closing time`);
  return { closed };
}
