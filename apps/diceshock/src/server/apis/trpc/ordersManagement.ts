import db, {
  drizzle,
  tableOccupancyTable,
  tablesTable,
  userInfoTable,
  users,
} from "@lib/db";
import { dashProcedure } from "./baseTRPC";

type StatusFilter = "all" | "active" | "ended";
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
        const info = await tdb.query.userInfoTable.findFirst({
          where: (i, { eq }) => eq(i.id, occ.user_id),
          columns: { nickname: true, uid: true },
        });
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
          table: occ.table,
          user: occ.user,
          nickname: info?.nickname ?? "Anonymous",
          uid: info?.uid ?? null,
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

    const info = await tdb.query.userInfoTable.findFirst({
      where: (i, { eq }) => eq(i.id, occ.user_id),
      columns: { nickname: true, uid: true },
    });

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
      table: occ.table,
      user: occ.user,
      nickname: info?.nickname ?? "Anonymous",
      uid: info?.uid ?? null,
    };
  });

export default {
  list,
  getById,
};
