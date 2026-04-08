import db, { drizzle, orderPauseLogsTable, tableOccupancyTable } from "@lib/db";
import { fetchTableStateForDO, notifySocketDO } from "./seatTimer";

type PauseReason = "manual" | "settlement" | "auto_transfer";

export async function pauseWithReason(
  tdb: ReturnType<typeof db>,
  occupancyId: string,
  reason: PauseReason,
  env?: Parameters<typeof notifySocketDO>[0],
): Promise<void> {
  const now = new Date();

  await tdb
    .update(tableOccupancyTable)
    .set({ status: "paused" })
    .where(drizzle.eq(tableOccupancyTable.id, occupancyId));

  await tdb.insert(orderPauseLogsTable).values({
    occupancy_id: occupancyId,
    paused_at: now,
    pause_reason: reason,
  });

  if (env) {
    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, occupancyId),
      columns: { table_id: true },
    });
    if (occ) {
      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, occ.table_id),
        columns: { id: true, code: true },
      });
      if (table) {
        const fresh = await fetchTableStateForDO(tdb, table.id);
        if (fresh) {
          await notifySocketDO(env, table.code, fresh.table, fresh.occupancies);
        }
      }
    }
  }
}
