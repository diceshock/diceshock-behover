import db, {
  activeRegistrationsTable,
  activesTable,
  boardGamesTable,
  drizzle,
} from "@lib/db";
import { z } from "zod/v4";
import dayjs from "@/shared/utils/dayjs-config";
import { protectedProcedure, publicProcedure } from "./baseTRPC";

function parseBoardGameId(raw: string | null): string[] {
  if (!raw) return [];
  return [raw];
}

async function resolveBoardGames(
  tdb: ReturnType<typeof db>,
  ids: string[],
): Promise<{ id: string; sch_name: string | null; eng_name: string | null }[]> {
  if (ids.length === 0) return [];
  return tdb.query.boardGamesTable.findMany({
    where: (g, { inArray }) => inArray(g.id, ids),
    columns: { id: true, sch_name: true, eng_name: true },
  });
}

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
        board_game_id: input.board_game_id ?? null,
        date: input.date,
        time: input.time,
        max_players: input.max_players,
        content: input.content,
        is_game: input.is_game,
      })
      .returning();
    return active;
  });

const dateRangeZ = z.enum(["today", "week", "month", "year"]).optional();

const list = publicProcedure
  .input(
    z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
      showExpired: z.boolean().default(false),
      dateRange: dateRangeZ,
    }),
  )
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { limit, showExpired, dateRange } = input;
    const now = dayjs().tz("Asia/Shanghai");
    const today = now.format("YYYY-MM-DD");

    let dateStart: string | undefined;
    let dateEnd: string | undefined;

    if (dateRange) {
      switch (dateRange) {
        case "today":
          dateStart = today;
          dateEnd = today;
          break;
        case "week":
          dateStart = now.startOf("week").format("YYYY-MM-DD");
          dateEnd = now.endOf("week").format("YYYY-MM-DD");
          break;
        case "month":
          dateStart = now.startOf("month").format("YYYY-MM-DD");
          dateEnd = now.endOf("month").format("YYYY-MM-DD");
          break;
        case "year":
          dateStart = now.startOf("year").format("YYYY-MM-DD");
          dateEnd = now.endOf("year").format("YYYY-MM-DD");
          break;
      }
    }

    const actives = await tdb.query.activesTable.findMany({
      where: (a, { gte, lte, lt, and }) => {
        const conditions = [];
        if (showExpired) {
          conditions.push(lt(a.date, today));
        } else if (!dateRange) {
          conditions.push(gte(a.date, today));
        }
        if (dateStart) conditions.push(gte(a.date, dateStart));
        if (dateEnd) conditions.push(lte(a.date, dateEnd));
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      orderBy: (a, { asc, desc }) => (showExpired ? desc(a.date) : asc(a.date)),
      limit: limit + 1,
      with: {
        creator: {
          columns: { id: true, name: true, image: true },
        },
        registrations: {
          columns: { id: true, user_id: true, is_watching: true },
        },
      },
    });

    const allGameIds = [
      ...new Set(actives.flatMap((a) => parseBoardGameId(a.board_game_id))),
    ];
    const games = await resolveBoardGames(tdb, allGameIds);
    const gameMap = new Map(games.map((g) => [g.id, g]));

    let nextCursor: string | undefined;
    if (actives.length > limit) {
      const last = actives.pop();
      nextCursor = last?.id;
    }

    const items = actives.map((a) => ({
      ...a,
      boardGames: parseBoardGameId(a.board_game_id)
        .map((id) => gameMap.get(id))
        .filter(Boolean),
    }));

    return { items, nextCursor };
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
      },
    });

    if (!active) {
      throw new Error("活动不存在");
    }

    const boardGames = await resolveBoardGames(
      tdb,
      parseBoardGameId(active.board_game_id),
    );

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

    return { ...active, boardGames, registrations: registrationsWithUserInfo };
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

    if (active.creator_id === ctx.userId) {
      throw new Error("发起者不能加入或观望自己发起的活动");
    }

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
