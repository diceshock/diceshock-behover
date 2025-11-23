import db, { boardGamesTable, drizzle, pagedZ } from "@lib/db";

import { filterCfgZ } from "@/client/components/diceshock/GameList/Filter";
import { publicProcedure } from "./baseTRPC";

const get = publicProcedure
  .input(pagedZ(filterCfgZ))
  .query(async ({ input, ctx }) => {
    const { page, pageSize, params } = input;

    const trimmedSearchWords = params.searchWords.trim();

    const player_num = params.isBestNumOfPlayers
      ? undefined
      : (params.numOfPlayers ?? undefined);

    const best_player_num = params.isBestNumOfPlayers
      ? (params.numOfPlayers ?? undefined)
      : undefined;

    const games = db(ctx.env.DB).query.boardGamesTable.findMany({
      where: (game, { like, or, and, eq }) =>
        and(
          eq(game.removeDate, new Date(0)),
          trimmedSearchWords
            ? or(
                like(game.sch_name, `%${trimmedSearchWords}%`),
                like(game.eng_name, `%${trimmedSearchWords}%`),
              )
            : undefined,
          params.tags.includes("PARTY")
            ? or(
                like(game.category, "%Party%"),
                like(game.category, "%Puzzle%"),
              )
            : undefined,
          params.tags.includes("RPG")
            ? or(
                like(game.category, "%American-style%"),
                like(game.category, "%Role Playing$"),
              )
            : undefined,
          params.tags.includes("SCORE_RACE")
            ? or(
                like(game.category, "%Euro-style%"),
                like(game.category, "%Abstract%"),
              )
            : undefined,
          player_num === undefined
            ? undefined
            : like(game.player_num, `%${player_num}%`),
          best_player_num === undefined
            ? undefined
            : like(game.player_num, `%${best_player_num}%`),
        ),
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: (game, { desc }) => desc(game.gstone_rating),
    });

    return games;
  });

const getCount = publicProcedure.query(async ({ ctx }) => {
  try {
    const q = db(ctx.env.DB);

    const [{ current }] = await q
      .select({ current: drizzle.count(boardGamesTable.id) })
      .from(boardGamesTable)
      .where(drizzle.eq(boardGamesTable.removeDate, new Date(0)));

    const [{ removed }] = await q
      .select({ removed: drizzle.count(boardGamesTable.id) })
      .from(boardGamesTable)
      .where(drizzle.gt(boardGamesTable.removeDate, new Date(0)));

    return { current, removed };
  } catch (error) {
    console.error("Error fetching board game counts:", error);
    return { current: 0, removed: 0 };
  }
});

export default { get, getCount };
