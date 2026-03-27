import db, { drizzle, tableOccupancyTable, tablesTable } from "@lib/db";
import { createId } from "@paralleldrive/cuid2";
import {
  fetchTableStateForDO,
  notifySeatTimerDO,
} from "@/server/utils/seatTimer";
import { protectedProcedure, publicProcedure } from "./baseTRPC";

const getByCode = publicProcedure
  .input((v: unknown) => {
    const { code } = v as { code: string };
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
          seats: occ.seats ?? 1,
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
      status: table.status,
      capacity: table.capacity,
      code: table.code,
      description: table.description,
      occupancies: occupanciesWithUserInfo,
    };
  });

const occupy = protectedProcedure
  .input((v: unknown) => {
    const data = v as { code: string; seats: number };
    if (!data.code) throw new Error("code is required");
    if (!data.seats || data.seats < 1) throw new Error("seats must be >= 1");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const existingOccupancy = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq, ne, and }) =>
        and(eq(o.user_id, ctx.userId), ne(o.status, "ended")),
      with: {
        table: { columns: { code: true, name: true } },
      },
    });
    if (existingOccupancy) {
      throw new Error(
        `ALREADY_OCCUPIED:${existingOccupancy.table.code}:${existingOccupancy.table.name}`,
      );
    }

    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, input.code),
      with: {
        occupancies: {
          where: (o, { ne }) => ne(o.status, "ended"),
          columns: { seats: true },
        },
      },
    });
    if (!table) throw new Error("桌台不存在");
    if (table.status === "inactive") throw new Error("桌台已下架");

    const isSolo = table.type === "solo";
    const effectiveSeats = isSolo ? 1 : input.seats;

    if (!isSolo) {
      const totalOccupied = table.occupancies.reduce(
        (sum, o) => sum + (o.seats ?? 1),
        0,
      );
      if (totalOccupied + effectiveSeats > table.capacity) {
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
      seats: effectiveSeats,
      start_at: new Date(),
    });

    const fresh = await fetchTableStateForDO(tdb, table.id);
    if (fresh) {
      await notifySeatTimerDO(
        ctx.env,
        input.code,
        fresh.table,
        fresh.occupancies,
      );
    }

    return { id };
  });

const leave = protectedProcedure
  .input((v: unknown) => {
    const data = v as { occupancyId: string; code: string };
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
        await notifySeatTimerDO(
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
    const data = v as { occupancyId: string; code: string };
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

    await tdb
      .update(tableOccupancyTable)
      .set({ status: "paused" })
      .where(drizzle.eq(tableOccupancyTable.id, input.occupancyId));

    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, input.code),
    });
    if (table) {
      const fresh = await fetchTableStateForDO(tdb, table.id);
      if (fresh) {
        await notifySeatTimerDO(
          ctx.env,
          input.code,
          fresh.table,
          fresh.occupancies,
        );
      }
    }

    return { success: true };
  });

export default {
  getByCode,
  occupy,
  leave,
  pause,
};
