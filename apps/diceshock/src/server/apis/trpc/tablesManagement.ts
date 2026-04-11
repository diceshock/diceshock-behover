import db, {
  drizzle,
  orderPauseLogsTable,
  tableOccupancyTable,
  tablesTable,
} from "@lib/db";
import { createId } from "@paralleldrive/cuid2";
import { fetchTableStateForDO, notifySocketDO } from "@/server/utils/seatTimer";
import { dashProcedure, unwrapInput } from "./baseTRPC";

const SHORT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateShortCode(len = 6): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(
    arr,
    (b) => SHORT_CODE_CHARS[b % SHORT_CODE_CHARS.length],
  ).join("");
}

async function generateUniqueCode(
  tdb: ReturnType<typeof db>,
  len = 6,
  maxAttempts = 10,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateShortCode(len);
    const existing = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, code),
      columns: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("编号生成失败，请重试");
}

const list = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const tables = await tdb.query.tablesTable.findMany({
    orderBy: (t, { desc }) => desc(t.create_at),
    with: {
      occupancies: {
        where: (o, { ne }) => ne(o.status, "ended"),
        columns: { id: true, user_id: true, start_at: true },
      },
    },
  });
  return tables;
});

const create = dashProcedure
  .input((v: unknown) => {
    const data = unwrapInput<{
      name: string;
      type: "fixed" | "solo";
      scope: "trpg" | "boardgame" | "console" | "mahjong";
      capacity?: number;
      description?: string;
    }>(v);
    if (!data.name?.trim()) throw new Error("name is required");
    if (!data.type) throw new Error("type is required");
    if (!data.scope) throw new Error("scope is required");
    if (data.type !== "solo" && (!data.capacity || data.capacity < 1))
      throw new Error("capacity must be >= 1");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();
    const id = createId();
    const code = await generateUniqueCode(tdb);
    await tdb.insert(tablesTable).values({
      id,
      name: input.name.trim(),
      type: input.type,
      scope: input.scope,
      status: "active",
      capacity: input.type === "solo" ? 0 : input.capacity!,
      description: input.description?.trim() || null,
      code,
      create_at: now,
      update_at: now,
    });
    return { id, code };
  });

const getById = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.id, input.id),
      with: {
        occupancies: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!table) throw new Error("桌台不存在");

    const occupanciesWithUserInfo = await Promise.all(
      table.occupancies.map(async (occ) => {
        let nickname = "Anonymous";
        let uid: string | null = null;
        let phone: string | null = null;

        if (occ.user_id) {
          const userInfo = await tdb.query.userInfoTable.findFirst({
            where: (info, { eq }) => eq(info.id, occ.user_id!),
            columns: { nickname: true, uid: true, phone: true },
          });
          nickname = userInfo?.nickname ?? nickname;
          uid = userInfo?.uid ?? null;
          phone = userInfo?.phone ?? null;
        } else if (occ.temp_id) {
          try {
            const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
              where: (t, { eq }) => eq(t.id, occ.temp_id!),
              columns: { nickname: true },
            });
            nickname = tempInfo?.nickname ?? "Anonymous";
          } catch {}
          uid = `temp:${occ.temp_id}`;
        }

        return {
          ...occ,
          nickname,
          uid,
          phone,
        };
      }),
    );

    return { ...table, occupancies: occupanciesWithUserInfo };
  });

const update = dashProcedure
  .input((v: unknown) => {
    const data = unwrapInput<{
      id: string;
      name?: string;
      type?: "fixed" | "solo";
      scope?: "trpg" | "boardgame" | "console" | "mahjong";
      capacity?: number;
      description?: string | null;
    }>(v);
    if (!data.id) throw new Error("id is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { id, ...fields } = input;
    const updateData: Record<string, unknown> = { update_at: new Date() };
    if (fields.name !== undefined) updateData.name = fields.name.trim();
    if (fields.type !== undefined) updateData.type = fields.type;
    if (fields.scope !== undefined) updateData.scope = fields.scope;
    if (fields.capacity !== undefined) updateData.capacity = fields.capacity;
    if (fields.description !== undefined)
      updateData.description = fields.description;
    await tdb
      .update(tablesTable)
      .set(updateData)
      .where(drizzle.eq(tablesTable.id, id));
    return { success: true };
  });

const toggleStatus = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.id, input.id),
      columns: { status: true },
    });
    if (!table) throw new Error("桌台不存在");
    const newStatus = table.status === "active" ? "inactive" : "active";
    await tdb
      .update(tablesTable)
      .set({ status: newStatus, update_at: new Date() })
      .where(drizzle.eq(tablesTable.id, input.id));
    return { status: newStatus };
  });

const remove = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();
    const activeOccs = await tdb.query.tableOccupancyTable.findMany({
      where: (o, { eq, ne, and }) =>
        and(eq(o.table_id, input.id), ne(o.status, "ended")),
      columns: { id: true },
    });
    for (const occ of activeOccs) {
      const openLog = await tdb.query.orderPauseLogsTable.findFirst({
        where: (l, { eq, and, isNull }) =>
          and(eq(l.occupancy_id, occ.id), isNull(l.resumed_at)),
        orderBy: (l, { desc }) => desc(l.paused_at),
      });
      if (openLog) {
        await tdb
          .update(orderPauseLogsTable)
          .set({ resumed_at: now })
          .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
      }
      await tdb
        .update(tableOccupancyTable)
        .set({ status: "ended", end_at: now })
        .where(drizzle.eq(tableOccupancyTable.id, occ.id));
    }
    await tdb.delete(tablesTable).where(drizzle.eq(tablesTable.id, input.id));
    return { success: true };
  });

const regenerateCode = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const newCode = await generateUniqueCode(tdb);
    await tdb
      .update(tablesTable)
      .set({ code: newCode, update_at: new Date() })
      .where(drizzle.eq(tablesTable.id, input.id));
    return { code: newCode };
  });

const addOccupancy = dashProcedure
  .input((v: unknown) => {
    const data = unwrapInput<{ table_id: string; user_id: string }>(v);
    if (!data.table_id) throw new Error("table_id is required");
    if (!data.user_id) throw new Error("user_id is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.id, input.table_id),
      columns: { id: true, status: true, code: true },
    });
    if (!table) throw new Error("桌台不存在");
    if (table.status === "inactive") throw new Error("桌台已下架，无法使用");
    const id = createId();
    await tdb.insert(tableOccupancyTable).values({
      id,
      table_id: input.table_id,
      user_id: input.user_id,
      seats: 1,
      start_at: new Date(),
    });

    const fresh = await fetchTableStateForDO(tdb, table.id);
    if (fresh) {
      await notifySocketDO(ctx.env, table.code, fresh.table, fresh.occupancies);
    }

    return { id };
  });

const removeOccupancy = dashProcedure
  .input((v: unknown) => {
    const { id } = unwrapInput<{ id: string }>(v);
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.id),
      columns: { table_id: true },
    });

    await tdb
      .update(tableOccupancyTable)
      .set({ status: "ended", end_at: new Date() })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));

    if (occ) {
      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, occ.table_id),
        columns: { id: true, code: true },
      });
      if (table) {
        const fresh = await fetchTableStateForDO(tdb, table.id);
        if (fresh) {
          await notifySocketDO(
            ctx.env,
            table.code,
            fresh.table,
            fresh.occupancies,
          );
        }
      }
    }

    return { success: true };
  });

const getOccupancyByUserId = dashProcedure
  .input((v: unknown) => {
    const { userId } = unwrapInput<{ userId: string }>(v);
    if (!userId) throw new Error("userId is required");
    return { userId };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const occupancies = await tdb.query.tableOccupancyTable.findMany({
      where: (o, { eq, ne, and }) => and(eq(o.user_id, input.userId)),
      with: {
        table: { columns: { id: true, name: true, type: true, status: true } },
      },
    });
    return occupancies;
  });

const getByCode = dashProcedure
  .input((v: unknown) => {
    const { code } = unwrapInput<{ code: string }>(v);
    if (!code) throw new Error("code is required");
    return { code };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const table = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, input.code),
      columns: { id: true, name: true, type: true, status: true },
    });
    if (!table) throw new Error("桌台不存在");
    return table;
  });

export default {
  list,
  create,
  getById,
  getByCode,
  update,
  toggleStatus,
  remove,
  regenerateCode,
  addOccupancy,
  removeOccupancy,
  getOccupancyByUserId,
};
