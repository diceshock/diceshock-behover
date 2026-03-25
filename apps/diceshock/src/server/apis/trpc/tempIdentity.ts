import db, {
  drizzle,
  tableOccupancyTable,
  tablesTable,
  tempIdentitiesTable,
} from "@lib/db";
import { createId } from "@paralleldrive/cuid2";
import z from "zod/v4";
import { genNickname } from "@/server/utils/auth";
import {
  fetchTableStateForDO,
  notifySeatTimerDO,
} from "@/server/utils/seatTimer";
import { generateTotpSecret } from "@/shared/utils/totp";
import { publicProcedure } from "./baseTRPC";

const TEMP_IDENTITY_TTL_MS = 24 * 60 * 60 * 1000;

const create = publicProcedure.mutation(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);

  const id = createId();
  const nickname = genNickname();
  const totpSecret = generateTotpSecret();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TEMP_IDENTITY_TTL_MS);

  await tdb.insert(tempIdentitiesTable).values({
    id,
    nickname,
    totp_secret: totpSecret,
    created_at: now,
    expires_at: expiresAt,
  });

  return {
    id,
    nickname,
    totpSecret,
    expiresAt: expiresAt.getTime(),
  };
});

const validate = publicProcedure
  .input(z.object({ tempId: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    let row: typeof tempIdentitiesTable.$inferSelect | undefined;
    try {
      row = await tdb.query.tempIdentitiesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.tempId),
      });
    } catch {
      return { valid: false as const };
    }

    if (!row) return { valid: false as const };

    const expiresAt =
      row.expires_at instanceof Date
        ? row.expires_at.getTime()
        : Number(row.expires_at ?? 0);

    if (Date.now() > expiresAt) return { valid: false as const };

    return {
      valid: true as const,
      id: row.id,
      nickname: row.nickname ?? "Anonymous",
      totpSecret: row.totp_secret ?? "",
      expiresAt,
    };
  });

const occupy = publicProcedure
  .input(z.object({ tempId: z.string(), code: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const seats = 1;

    let tempRow: typeof tempIdentitiesTable.$inferSelect | undefined;
    try {
      tempRow = await tdb.query.tempIdentitiesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.tempId),
      });
    } catch {
      throw new Error("临时身份不可用");
    }
    if (!tempRow) throw new Error("临时身份不存在");

    const expiresAt =
      tempRow.expires_at instanceof Date
        ? tempRow.expires_at.getTime()
        : Number(tempRow.expires_at ?? 0);
    if (Date.now() > expiresAt) throw new Error("临时身份已过期");

    const existingOccupancy = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq, ne, and }) =>
        and(eq(o.temp_id, input.tempId), ne(o.status, "ended")),
      with: { table: { columns: { code: true, name: true } } },
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

    const totalOccupied = table.occupancies.reduce(
      (sum, o) => sum + (o.seats ?? 1),
      0,
    );
    if (totalOccupied + seats > table.capacity) {
      throw new Error(
        `桌台不足，当前已使用 ${totalOccupied}/${table.capacity}`,
      );
    }

    const id = createId();
    await tdb.insert(tableOccupancyTable).values({
      id,
      table_id: table.id,
      temp_id: input.tempId,
      seats: seats,
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

const leave = publicProcedure
  .input(
    z.object({ tempId: z.string(), occupancyId: z.string(), code: z.string() }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.occupancyId),
    });
    if (!occ) throw new Error("使用记录不存在");
    if (occ.temp_id !== input.tempId) throw new Error("只能取消自己的使用");

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

const transfer = publicProcedure
  .input(z.object({ tempId: z.string(), userId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const activeOccupancies = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq, ne, and }) =>
        and(eq(o.temp_id, input.tempId), ne(o.status, "ended")),
      with: { table: { columns: { code: true, id: true } } },
    });

    if (!activeOccupancies) return { transferred: false };

    await tdb
      .update(tableOccupancyTable)
      .set({ user_id: input.userId, temp_id: null })
      .where(drizzle.eq(tableOccupancyTable.id, activeOccupancies.id));

    const fresh = await fetchTableStateForDO(tdb, activeOccupancies.table.id);
    if (fresh) {
      await notifySeatTimerDO(
        ctx.env,
        activeOccupancies.table.code,
        fresh.table,
        fresh.occupancies,
      );
    }

    return { transferred: true, occupancyId: activeOccupancies.id };
  });

export default { create, validate, occupy, leave, transfer };
