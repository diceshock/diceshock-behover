import db, {
  activeRegistrationsTable,
  activesTable,
  drizzle,
  userInfoTable,
} from "@lib/db";
import { z } from "zod/v4";
import dayjs from "@/shared/utils/dayjs-config";
import { protectedProcedure, publicProcedure } from "./baseTRPC";

const createActiveZ = z.object({
  title: z.string().min(1).max(100),
  board_game_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  max_players: z.number().int().min(1).max(100),
  content: z.string().optional(),
  is_game: z.boolean().default(true),
});

const create = protectedProcedure
  .input(createActiveZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const [active] = await tdb
      .insert(activesTable)
      .values({
        creator_id: ctx.userId,
        title: input.title,
        board_game_id: input.board_game_id,
        date: input.date,
        time: input.time,
        max_players: input.max_players,
        content: input.content,
        is_game: input.is_game,
      })
      .returning();
    return active;
  });

const list = publicProcedure
  .input(
    z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
      showExpired: z.boolean().default(false),
    }),
  )
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { limit, showExpired } = input;
    const today = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

    const actives = await tdb.query.activesTable.findMany({
      where: showExpired ? undefined : (a, { gte }) => gte(a.date, today),
      orderBy: (a, { asc, desc }) => (showExpired ? desc(a.date) : asc(a.date)),
      limit: limit + 1,
      with: {
        creator: {
          columns: { id: true, name: true, image: true },
        },
        registrations: {
          columns: { id: true, user_id: true, is_watching: true },
        },
        boardGame: {
          columns: { id: true, sch_name: true, eng_name: true },
        },
      },
    });

    let nextCursor: string | undefined;
    if (actives.length > limit) {
      const last = actives.pop();
      nextCursor = last?.id;
    }

    return { items: actives, nextCursor };
  });

const getById = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.id),
      with: {
        creator: {
          columns: { id: true, name: true, image: true },
        },
        registrations: true,
        boardGame: {
          columns: {
            id: true,
            sch_name: true,
            eng_name: true,
            gstone_rating: true,
            player_num: true,
          },
        },
      },
    });

    if (!active) {
      throw new Error("活动不存在");
    }

    const registrationsWithUserInfo = await Promise.all(
      active.registrations.map(async (reg) => {
        const userInfo = await tdb.query.userInfoTable.findFirst({
          where: (info, { eq }) => eq(info.id, reg.user_id),
          columns: { nickname: true, uid: true },
        });
        return {
          ...reg,
          nickname: userInfo?.nickname ?? "Anonymous",
          uid: userInfo?.uid,
        };
      }),
    );

    return { ...active, registrations: registrationsWithUserInfo };
  });

const join = protectedProcedure
  .input(
    z.object({
      active_id: z.string(),
      is_watching: z.boolean().default(false),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.active_id),
      with: { registrations: true },
    });

    if (!active) throw new Error("活动不存在");

    const existing = active.registrations.find((r) => r.user_id === ctx.userId);

    if (existing) {
      if (existing.is_watching === input.is_watching) {
        return existing;
      }
      const [updated] = await tdb
        .update(activeRegistrationsTable)
        .set({ is_watching: input.is_watching })
        .where(drizzle.eq(activeRegistrationsTable.id, existing.id))
        .returning();
      return updated;
    }

    if (!input.is_watching) {
      const joinedCount = active.registrations.filter(
        (r) => !r.is_watching,
      ).length;
      if (joinedCount >= active.max_players) {
        throw new Error("人数已满");
      }
    }

    const [reg] = await tdb
      .insert(activeRegistrationsTable)
      .values({
        active_id: input.active_id,
        user_id: ctx.userId,
        is_watching: input.is_watching,
      })
      .returning();
    return reg;
  });

const leave = protectedProcedure
  .input(z.object({ active_id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .delete(activeRegistrationsTable)
      .where(
        drizzle.and(
          drizzle.eq(activeRegistrationsTable.active_id, input.active_id),
          drizzle.eq(activeRegistrationsTable.user_id, ctx.userId),
        ),
      );
    return { success: true };
  });

const getParticipants = protectedProcedure
  .input(z.object({ active_id: z.string() }))
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const active = await tdb.query.activesTable.findFirst({
      where: (a, { eq }) => eq(a.id, input.active_id),
      columns: { creator_id: true },
    });

    if (!active) throw new Error("活动不存在");
    if (active.creator_id !== ctx.userId) {
      throw new Error("只有发起者可以查看参与者信息");
    }

    const registrations = await tdb.query.activeRegistrationsTable.findMany({
      where: (reg, { eq }) => eq(reg.active_id, input.active_id),
    });

    const participants = await Promise.all(
      registrations.map(async (reg) => {
        const userInfo = await tdb.query.userInfoTable.findFirst({
          where: (info, { eq }) => eq(info.id, reg.user_id),
        });
        return {
          ...reg,
          nickname: userInfo?.nickname ?? "Anonymous",
          uid: userInfo?.uid,
        };
      }),
    );

    return participants;
  });

export default {
  create,
  list,
  getById,
  join,
  leave,
  getParticipants,
};
