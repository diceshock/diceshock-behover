import type { D1Database } from "@cloudflare/workers-types";
import db, { boardGamesTable, drizzle } from "@lib/db";
import dayjs from "dayjs";
import _ from "lodash";

import type { BoardGameCol } from "./types";

export * from "./types";

const headers = new Headers();
headers.append("Content-Type", "application/x-www-form-urlencoded");

export async function fetchToDb(
  d1: D1Database,
  pageFrom: number,
  pageTo: number,
  date: number
) {
  const pages = _.range(pageFrom, pageTo);

  const chunkPromises: Promise<{ data: { game_list: BoardGameCol[] } }>[] =
    pages.map((page) =>
      fetch(
        "https://www.gstonegames.com/app/other_user_get_game/owned_games/",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: "124991", page }),
        }
      ).then((r) => r.json())
    );

  const chunkResults = await Promise.all(chunkPromises);
  const fetched = chunkResults.flatMap((c) => c.data.game_list);

  if (!fetched.length) return null;

  const q = await db(d1);

  for (const chunk of _.chunk(fetched, 5)) {
    await q.insert(boardGamesTable).values(
      chunk.map((g) => ({
        sch_name: g.sch_name,
        eng_name: g.eng_name,
        gstone_id: g.id,
        gstone_rating: g.gstone_rating,
        category: g.category,
        mode: g.mode,
        player_num: g.player_num
          .map((n, i) => ({ n, i }))
          .filter(({ n }) => n > 0)
          .map(({ i }) => i),
        best_player_num: g.player_num
          .map((n, i) => ({ n, i }))
          .filter(({ n }) => n > 1)
          .map(({ i }) => i),
        content: g,
        removeDate: new Date(date),
      }))
    );
  }

  console.log(fetched.length, " fetched items add");

  return { fetched };
}

export async function setDateToCurry(d1: D1Database, date: number) {
  const q = await db(d1);

  const clean = await q
    .delete(boardGamesTable)
    .where(
      drizzle.and(
        drizzle.gt(boardGamesTable.removeDate, new Date(0)),
        drizzle.lt(
          boardGamesTable.removeDate,
          dayjs().subtract(2, "months").toDate()
        )
      )
    )
    .returning();

  console.log(clean.length, " items clean");

  const hidded = await q
    .update(boardGamesTable)
    .set({ removeDate: new Date(Date.now()) })
    .where(drizzle.eq(boardGamesTable.removeDate, new Date(0)))
    .returning();

  console.log(hidded.length, " items hide");

  const wake = await q
    .update(boardGamesTable)
    .set({ removeDate: new Date(0) })
    .where(drizzle.eq(boardGamesTable.removeDate, new Date(date)))
    .returning();

  return { wake: wake.length, hidded: hidded.length, clean: clean.length };
}
