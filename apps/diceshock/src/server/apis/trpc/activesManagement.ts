import db, { activeRegistrationsTable, activesTable, drizzle } from "@lib/db";
import { dashProcedure } from "./baseTRPC";

const list = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const actives = await tdb.query.activesTable.findMany({
    orderBy: (a, { desc }) => desc(a.create_at),
    with: {
      creator: { columns: { id: true, name: true } },
      registrations: {
        columns: { id: true, user_id: true, is_watching: true },
      },
      boardGame: { columns: { id: true, sch_name: true, eng_name: true } },
    },
  });
  return actives;
});

const getById = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.id),
      with: {
        creator: { columns: { id: true, name: true } },
        registrations: true,
        boardGame: { columns: { id: true, sch_name: true, eng_name: true } },
      },
    });

    if (!active) throw new Error("约局不存在");

    const registrationsWithUser = await Promise.all(
      active.registrations.map(async (reg) => {
        const userInfo = await tdb.query.userInfoTable.findFirst({
          where: (info, { eq }) => eq(info.id, reg.user_id),
          columns: { nickname: true, uid: true },
        });
        return {
          ...reg,
          nickname: userInfo?.nickname ?? "Anonymous",
          uid: userInfo?.uid ?? null,
        };
      }),
    );

    return { ...active, registrations: registrationsWithUser };
  });

const update = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      id: string;
      title?: string;
      date?: string;
      time?: string | null;
      max_players?: number;
      board_game_id?: string | null;
      content?: string | null;
      is_game?: boolean;
    };
    if (!data.id) throw new Error("id is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { id, ...fields } = input;
    await tdb
      .update(activesTable)
      .set({ ...fields, update_at: new Date() })
      .where(drizzle.eq(activesTable.id, id));
    return { success: true };
  });

const remove = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .delete(activeRegistrationsTable)
      .where(drizzle.eq(activeRegistrationsTable.active_id, input.id));
    await tdb.delete(activesTable).where(drizzle.eq(activesTable.id, input.id));
    return { success: true };
  });

const removeRegistration = dashProcedure
  .input((v: unknown) => {
    const { registrationId } = v as { registrationId: string };
    if (!registrationId) throw new Error("registrationId is required");
    return { registrationId };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .delete(activeRegistrationsTable)
      .where(drizzle.eq(activeRegistrationsTable.id, input.registrationId));
    return { success: true };
  });

const batchRemove = dashProcedure
  .input((v: unknown) => {
    const { ids } = v as { ids: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      throw new Error("ids is required");
    return { ids };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .delete(activeRegistrationsTable)
      .where(drizzle.inArray(activeRegistrationsTable.active_id, input.ids));
    await tdb
      .delete(activesTable)
      .where(drizzle.inArray(activesTable.id, input.ids));
    return { success: true };
  });

export default {
  list,
  getById,
  update,
  remove,
  removeRegistration,
  batchRemove,
};
