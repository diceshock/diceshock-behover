import type db from "@lib/db";

interface OccupancyInfo {
  id: string;
  user_id: string;
  nickname: string;
  uid: string | null;
  seats: number;
  start_at: number;
}

interface TableInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  capacity: number;
  code: string;
}

export async function fetchTableStateForDO(
  tdb: ReturnType<typeof db>,
  tableId: string,
): Promise<{ table: TableInfo; occupancies: OccupancyInfo[] } | null> {
  const table = await tdb.query.tablesTable.findFirst({
    where: (t, { eq }) => eq(t.id, tableId),
    with: { occupancies: true },
  });
  if (!table) return null;

  const occupancies = await Promise.all(
    table.occupancies.map(async (occ) => {
      const info = await tdb.query.userInfoTable.findFirst({
        where: (i, { eq }) => eq(i.id, occ.user_id),
        columns: { nickname: true, uid: true },
      });
      return {
        id: occ.id,
        user_id: occ.user_id,
        nickname: info?.nickname ?? "Anonymous",
        uid: info?.uid ?? null,
        seats: occ.seats ?? 1,
        start_at:
          occ.start_at instanceof Date
            ? occ.start_at.getTime()
            : Number(occ.start_at),
      };
    }),
  );

  return {
    table: {
      id: table.id,
      name: table.name,
      type: table.type,
      status: table.status,
      capacity: table.capacity,
      code: table.code,
    },
    occupancies,
  };
}

export async function notifySeatTimerDO(
  env: Cloudflare.Env,
  code: string,
  table: TableInfo,
  occupancies: OccupancyInfo[],
): Promise<void> {
  const doId = env.SEAT_TIMER.idFromName(code);
  const stub = env.SEAT_TIMER.get(doId);
  await stub.fetch(
    new Request("https://do/update-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, occupancies }),
    }),
  );
}
