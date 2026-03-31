import db, { mahjongMatchesTable, mahjongRegistrationsTable } from "@lib/db";
import { like } from "drizzle-orm";
import z from "zod/v4";
import { protectedProcedure } from "./baseTRPC";

const saveMatch = protectedProcedure
  .input(
    z.object({
      tableId: z.string().optional(),
      mode: z.enum(["3p", "4p"]),
      format: z.enum(["tonpuu", "hanchan"]),
      startedAt: z.number(),
      endedAt: z.number(),
      terminationReason: z.enum([
        "format_complete",
        "bust",
        "vote",
        "admin_abort",
        "order_invalid",
      ]),
      players: z.array(
        z.object({
          userId: z.string(),
          nickname: z.string(),
          seat: z.string(),
          finalScore: z.number(),
        }),
      ),
      roundHistory: z.array(
        z.object({
          round: z.number(),
          wind: z.string(),
          honba: z.number(),
          dealerUserId: z.string(),
          scores: z.record(z.string(), z.number()),
          result: z.string(),
        }),
      ),
      config: z.object({
        mode: z.string(),
        format: z.string(),
      }),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const [match] = await tdb
      .insert(mahjongMatchesTable)
      .values({
        table_id: input.tableId ?? null,
        mode: input.mode,
        format: input.format,
        started_at: new Date(input.startedAt),
        ended_at: new Date(input.endedAt),
        termination_reason: input.terminationReason,
        players: input.players,
        round_history: input.roundHistory,
        config: input.config,
      })
      .returning();
    return match;
  });

const getMyMatches = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const matches = await tdb.query.mahjongMatchesTable.findMany({
    where: (m) => like(m.players, `%"userId":"${ctx.userId}"%`),
    orderBy: (m, { desc }) => desc(m.created_at),
    limit: 50,
  });
  return matches;
});

const getMatchById = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    return tdb.query.mahjongMatchesTable.findFirst({
      where: (m, { eq }) => eq(m.id, input.id),
    });
  });

const checkRegistration = protectedProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const userInfo = await tdb.query.userInfoTable.findFirst({
    where: (u, { eq }) => eq(u.id, ctx.userId),
    columns: { phone: true },
  });

  const registration = await tdb.query.mahjongRegistrationsTable.findFirst({
    where: (r, { eq }) => eq(r.user_id, ctx.userId),
  });

  return {
    hasPhone: !!userInfo?.phone,
    phone: userInfo?.phone ?? null,
    registered: !!registration,
  };
});

const register = protectedProcedure.mutation(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const userInfo = await tdb.query.userInfoTable.findFirst({
    where: (u, { eq }) => eq(u.id, ctx.userId),
    columns: { phone: true },
  });

  if (!userInfo?.phone) {
    throw new Error("需要先验证手机号");
  }

  const existing = await tdb.query.mahjongRegistrationsTable.findFirst({
    where: (r, { eq }) => eq(r.user_id, ctx.userId),
  });

  if (existing) return existing;

  const [reg] = await tdb
    .insert(mahjongRegistrationsTable)
    .values({
      user_id: ctx.userId,
      phone: userInfo.phone,
    })
    .returning();

  return reg;
});

export default {
  saveMatch,
  getMyMatches,
  getMatchById,
  checkRegistration,
  register,
};
