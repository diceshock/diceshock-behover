import type { D1Database } from "@cloudflare/workers-types";
import db, { boardGamesTable, drizzle } from "@lib/db";
import dayjs from "dayjs";
import _ from "lodash";

import { sleep } from "..";
import type { BoardGameCol } from "./types";

export * from "./types";

const headers = new Headers();
headers.append("Content-Type", "application/x-www-form-urlencoded");

export async function syncDb(d1: D1Database) {
  const fetched: BoardGameCol[] = [];

  for await (const games of fetchOwnedBoardGames()) {
    fetched.push(...games);
  }

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
      }))
    );
  }

  console.log(fetched.length, " fetched items add");

  return { fetched, clean_count: clean.length, hidded_count: hidded.length };
}

export async function* fetchOwnedBoardGames() {
  const page = _.range(0, 100);
  const reqChunks = _.chunk(page, 20);

  for (const chunk of reqChunks) {
    const chunkPromises: Promise<{ data: { game_list: BoardGameCol[] } }>[] =
      chunk.map((page) =>
        fetch(
          "https://www.gstonegames.com/app/other_user_get_game/owned_games/",
          {
            method: "POST",
            headers,
            body: JSON.stringify({ user_id: "124991", page }),
          }
        ).then((r) => r.json())
      );

    console.log("已发送请求的ID段: ", chunk[0], " ~ ", chunk[chunk.length - 1]);

    const chunkResults = await Promise.all(chunkPromises);

    for (const result of chunkResults) {
      const games = result?.data?.game_list;

      yield games ?? [];

      if (games.length) continue;

      console.log("所有游戏数据已获取完毕。");

      return;
    }

    await sleep(200);
  }
}
