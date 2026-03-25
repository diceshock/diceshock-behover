import db, {
  drizzle,
  pricingSnapshotsTable,
  tableOccupancyTable,
  tablesTable,
  userInfoTable,
  users,
} from "@lib/db";
import {
  fetchTableStateForDO,
  notifySeatTimerDO,
} from "@/server/utils/seatTimer";
import { calculatePrice, type SnapshotData } from "@/shared/utils/pricing";
import { dashProcedure } from "./baseTRPC";

type StatusFilter = "all" | "active" | "paused" | "ended";
type SortBy = "start_at" | "end_at" | "seats";
type SortOrder = "asc" | "desc";
type GroupBy = "table" | "user" | "date" | "none";

const list = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      search?: string;
      status?: StatusFilter;
      sortBy?: SortBy;
      sortOrder?: SortOrder;
      groupBy?: GroupBy;
      page?: number;
      pageSize?: number;
    };
    return {
      search: data.search ?? "",
      status: data.status ?? "all",
      sortBy: data.sortBy ?? "start_at",
      sortOrder: data.sortOrder ?? "desc",
      groupBy: data.groupBy ?? "none",
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 50,
    };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const allOccupancies = await tdb.query.tableOccupancyTable.findMany({
      with: {
        table: {
          columns: { id: true, name: true, type: true, code: true },
        },
        user: {
          columns: { id: true, name: true },
        },
      },
      orderBy: (o, { asc, desc }) => {
        const dir = input.sortOrder === "asc" ? asc : desc;
        switch (input.sortBy) {
          case "end_at":
            return dir(o.end_at);
          case "seats":
            return dir(o.seats);
          default:
            return dir(o.start_at);
        }
      },
    });

    const enriched = await Promise.all(
      allOccupancies.map(async (occ) => {
        let nickname = "Anonymous";
        let uid: string | null = null;

        if (occ.user_id) {
          const info = await tdb.query.userInfoTable.findFirst({
            where: (i, { eq }) => eq(i.id, occ.user_id!),
            columns: { nickname: true, uid: true },
          });
          nickname = info?.nickname ?? nickname;
          uid = info?.uid ?? null;
        } else if (occ.temp_id) {
          try {
            const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
              where: (t, { eq }) => eq(t.id, occ.temp_id!),
              columns: { nickname: true },
            });
            nickname = tempInfo?.nickname ?? nickname;
          } catch {}
          uid = `temp:${occ.temp_id}`;
        }

        return {
          id: occ.id,
          table_id: occ.table_id,
          user_id: occ.user_id,
          seats: occ.seats,
          status: occ.status,
          start_at:
            occ.start_at instanceof Date
              ? occ.start_at.getTime()
              : Number(occ.start_at),
          end_at: occ.end_at
            ? occ.end_at instanceof Date
              ? occ.end_at.getTime()
              : Number(occ.end_at)
            : null,
          final_price: occ.final_price ?? null,
          pricing_snapshot_id: occ.pricing_snapshot_id ?? null,
          price_breakdown: occ.price_breakdown ?? null,
          table: occ.table,
          user: occ.user,
          nickname,
          uid,
        };
      }),
    );

    let filtered = enriched;
    if (input.status !== "all") {
      filtered = filtered.filter((o) => o.status === input.status);
    }

    if (input.search.trim()) {
      const q = input.search.trim().toLowerCase();
      filtered = filtered.filter((o) => {
        return (
          o.id.toLowerCase().includes(q) ||
          (o.table?.name ?? "").toLowerCase().includes(q) ||
          (o.table?.code ?? "").toLowerCase().includes(q) ||
          (o.user?.name ?? "").toLowerCase().includes(q) ||
          o.nickname.toLowerCase().includes(q) ||
          (o.uid ?? "").toLowerCase().includes(q)
        );
      });
    }

    const total = filtered.length;

    const start = (input.page - 1) * input.pageSize;
    const items = filtered.slice(start, start + input.pageSize);

    return {
      items,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  });

const getById = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.id),
      with: {
        table: {
          columns: { id: true, name: true, type: true, code: true },
        },
        user: {
          columns: { id: true, name: true },
        },
      },
    });

    if (!occ) throw new Error("订单不存在");

    let nickname = "Anonymous";
    let uid: string | null = null;

    if (occ.user_id) {
      const info = await tdb.query.userInfoTable.findFirst({
        where: (i, { eq }) => eq(i.id, occ.user_id!),
        columns: { nickname: true, uid: true },
      });
      nickname = info?.nickname ?? nickname;
      uid = info?.uid ?? null;
    } else if (occ.temp_id) {
      try {
        const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
          where: (t, { eq }) => eq(t.id, occ.temp_id!),
          columns: { nickname: true },
        });
        nickname = tempInfo?.nickname ?? nickname;
      } catch {}
      uid = `temp:${occ.temp_id}`;
    }

    return {
      id: occ.id,
      table_id: occ.table_id,
      user_id: occ.user_id,
      seats: occ.seats,
      status: occ.status,
      start_at:
        occ.start_at instanceof Date
          ? occ.start_at.getTime()
          : Number(occ.start_at),
      end_at: occ.end_at
        ? occ.end_at instanceof Date
          ? occ.end_at.getTime()
          : Number(occ.end_at)
        : null,
      final_price: occ.final_price ?? null,
      pricing_snapshot_id: occ.pricing_snapshot_id ?? null,
      price_breakdown: occ.price_breakdown ?? null,
      table: occ.table,
      user: occ.user,
      nickname,
      uid,
    };
  });

async function notifyDOForOrder(
  tdb: ReturnType<typeof db>,
  env: Parameters<typeof notifySeatTimerDO>[0],
  occupancyId: string,
) {
  const occ = await tdb.query.tableOccupancyTable.findFirst({
    where: (o, { eq }) => eq(o.id, occupancyId),
    columns: { table_id: true },
  });
  if (!occ) return;
  const table = await tdb.query.tablesTable.findFirst({
    where: (t, { eq }) => eq(t.id, occ.table_id),
    columns: { id: true, code: true },
  });
  if (!table) return;
  const fresh = await fetchTableStateForDO(tdb, table.id);
  if (fresh) {
    await notifySeatTimerDO(env, table.code, fresh.table, fresh.occupancies);
  }
}

const endOrder = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.id),
      with: { table: { columns: { type: true } } },
    });
    if (!occ) throw new Error("订单不存在");

    const publishedSnapshot = await tdb.query.pricingSnapshotsTable.findFirst({
      where: (s, { eq }) => eq(s.status, "published"),
      orderBy: (s, { desc }) => desc(s.created_at),
    });

    const startAt =
      occ.start_at instanceof Date
        ? occ.start_at.getTime()
        : Number(occ.start_at);
    const endAt = now.getTime();
    const snapshotData = publishedSnapshot?.data as SnapshotData | null;
    const tableType = occ.table?.type ?? "boardgame";

    const breakdown = calculatePrice(startAt, endAt, tableType, snapshotData);

    await tdb
      .update(tableOccupancyTable)
      .set({
        status: "ended",
        end_at: now,
        final_price: breakdown?.finalPrice ?? null,
        pricing_snapshot_id: publishedSnapshot?.id ?? null,
        price_breakdown: breakdown,
      })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));

    await notifyDOForOrder(tdb, ctx.env, input.id);
    return { success: true, price: breakdown?.finalPrice ?? null };
  });

const pauseOrder = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .update(tableOccupancyTable)
      .set({ status: "paused" })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));
    await notifyDOForOrder(tdb, ctx.env, input.id);
    return { success: true };
  });

const resumeOrder = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .update(tableOccupancyTable)
      .set({ status: "active" })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));
    await notifyDOForOrder(tdb, ctx.env, input.id);
    return { success: true };
  });

export default {
  list,
  getById,
  endOrder,
  pauseOrder,
  resumeOrder,
};
