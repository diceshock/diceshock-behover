import db, { drizzle, tableOccupancyTable, tablesTable } from "@lib/db";
import { createId } from "@paralleldrive/cuid2";
import { pauseWithReason } from "@/server/utils/pauseOrder";
import { fetchTableStateForDO, notifySocketDO } from "@/server/utils/seatTimer";
import { protectedProcedure, publicProcedure, unwrapInput } from "./baseTRPC";

const getByCode = publicProcedure
  .input((v: unknown) => {
    const { code } = unwrapInput<{ code: string }>(v);
    if (!code) throw new Error("code is required");
    return { code };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, input.code),
      with: {
        occupancies: {
          where: (o, { ne }) => ne(o.status, "ended"),
          with: {
            user: { columns: { id: true, name: true } },
          },
        },
      },
    });

    if (!table) throw new Error("桌台不存在");
    if (table.status === "inactive") throw new Error("桌台已下架");

    const occupanciesWithUserInfo = await Promise.all(
      table.occupancies.map(async (occ) => {
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
          user_id: occ.user_id ?? occ.temp_id ?? "",
          temp_id: occ.temp_id ?? null,
          nickname,
          uid,
          start_at:
            occ.start_at instanceof Date
              ? occ.start_at.getTime()
              : Number(occ.start_at),
        };
      }),
    );

    return {
      id: table.id,
      name: table.name,
      type: table.type,
      scope: table.scope,
      status: table.status,
      capacity: table.capacity,
      code: table.code,
      description: table.description,
      occupancies: occupanciesWithUserInfo,
    };
  });

const occupy = protectedProcedure
  .input((v: unknown) => {
    const data = unwrapInput<{ code: string }>(v);
    if (!data.code) throw new Error("code is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const existingOccupancy = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq, ne, and }) =>
        and(eq(o.user_id, ctx.userId), ne(o.status, "ended")),
      with: {
        table: { columns: { code: true, name: true, id: true } },
      },
    });

    // If user has an existing occupancy on THIS table, throw (can't double-occupy same table)
    if (existingOccupancy && existingOccupancy.table.code === input.code) {
      throw new Error("你已经在此桌台使用中");
    }

    // If user has an active occupancy on a DIFFERENT table, auto-pause it
    if (existingOccupancy && existingOccupancy.status === "active") {
      await pauseWithReason(
        tdb,
        existingOccupancy.id,
        "auto_transfer",
        ctx.env,
      );
    }

    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, input.code),
      with: {
        occupancies: {
          where: (o, { ne }) => ne(o.status, "ended"),
          columns: { id: true },
        },
      },
    });
    if (!table) throw new Error("桌台不存在");
    if (table.status === "inactive") throw new Error("桌台已下架");

    if (table.type !== "solo") {
      const totalOccupied = table.occupancies.length;
      if (totalOccupied + 1 > table.capacity) {
        throw new Error(
          `桌台不足，当前已使用 ${totalOccupied}/${table.capacity}`,
        );
      }
    }

    const id = createId();
    await tdb.insert(tableOccupancyTable).values({
      id,
      table_id: table.id,
      user_id: ctx.userId,
      seats: 1,
      start_at: new Date(),
    });

    const fresh = await fetchTableStateForDO(tdb, table.id);
    if (fresh) {
      await notifySocketDO(ctx.env, input.code, fresh.table, fresh.occupancies);
    }

    return { id };
  });

const leave = protectedProcedure
  .input((v: unknown) => {
    const data = unwrapInput<{ occupancyId: string; code: string }>(v);
    if (!data.occupancyId) throw new Error("occupancyId is required");
    if (!data.code) throw new Error("code is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.occupancyId),
    });
    if (!occ) throw new Error("使用记录不存在");
    if (occ.user_id !== ctx.userId) throw new Error("只能取消自己的使用");

    await tdb
      .update(tableOccupancyTable)
      .set({ status: "ended", end_at: new Date() })
      .where(drizzle.eq(tableOccupancyTable.id, input.occupancyId));

    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, input.code),
    });
    if (table) {
      const fresh = await fetchTableStateForDO(tdb, table.id);
      if (fresh) {
        await notifySocketDO(
          ctx.env,
          input.code,
          fresh.table,
          fresh.occupancies,
        );
      }
    }

    return { success: true };
  });

const pause = protectedProcedure
  .input((v: unknown) => {
    const data = unwrapInput<{ occupancyId: string; code: string }>(v);
    if (!data.occupancyId) throw new Error("occupancyId is required");
    if (!data.code) throw new Error("code is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.occupancyId),
    });
    if (!occ) throw new Error("使用记录不存在");
    if (occ.user_id !== ctx.userId) throw new Error("只能暂停自己的使用");
    if (occ.status !== "active") throw new Error("只能暂停进行中的使用");

    await pauseWithReason(tdb, input.occupancyId, "manual", ctx.env);

    return { success: true };
  });

const getMyActiveOccupancy = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const occs = await tdb.query.tableOccupancyTable.findMany({
    where: (o, { eq, ne, and }) =>
      and(eq(o.user_id, ctx.userId), ne(o.status, "ended")),
    with: { table: { columns: { code: true, name: true } } },
  });
  return occs.map((occ) => ({
    code: occ.table.code,
    name: occ.table.name,
    status: occ.status,
  }));
});

export default {
  getByCode,
  occupy,
  leave,
  pause,
  getMyActiveOccupancy,
};
