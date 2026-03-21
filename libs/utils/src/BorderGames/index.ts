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
  console.log("[fetchToDb] START", { pageFrom, pageTo, date });
  const pages = _.range(pageFrom, pageTo);
  console.log("[fetchToDb] pages to fetch:", pages);

  const chunkPromises: Promise<{ data: { game_list: BoardGameCol[] } }>[] =
    pages.map((page) =>
      fetch(
        "https://www.gstonegames.com/app/other_user_get_game/owned_games/",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: "124991", page }),
        }
      ).then(async (r) => {
        console.log("[fetchToDb] fetch page", page, "status:", r.status);
        if (!r.ok) {
          const text = await r.text();
          console.error("[fetchToDb] fetch page", page, "failed:", text.slice(0, 200));
          throw new Error(`Fetch page ${page} failed: ${r.status}`);
        }
        return r.json();
      })
    );

  let chunkResults: { data: { game_list: BoardGameCol[] } }[];
  try {
    chunkResults = await Promise.all(chunkPromises);
  } catch (e) {
    console.error("[fetchToDb] Promise.all failed:", e);
    throw e;
  }

  console.log("[fetchToDb] chunkResults count:", chunkResults.length);
  for (let i = 0; i < chunkResults.length; i++) {
    console.log("[fetchToDb] page", pages[i], "game_list length:", chunkResults[i]?.data?.game_list?.length ?? "NO DATA");
  }

  const fetched = chunkResults.flatMap((c) => c.data.game_list);
  console.log("[fetchToDb] total fetched:", fetched.length);

  if (!fetched.length) {
    console.log("[fetchToDb] no items fetched, returning null");
    return null;
  }

  const q = await db(d1);
  console.log("[fetchToDb] db connection ready, inserting in chunks of 5");

  const chunks = _.chunk(fetched, 5);
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    console.log("[fetchToDb] inserting chunk", ci, "size:", chunk.length, "gstone_ids:", chunk.map(g => g.id));
    try {
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
      console.log("[fetchToDb] chunk", ci, "inserted OK");
    } catch (e) {
      console.error("[fetchToDb] chunk", ci, "insert FAILED:", e);
      throw e;
    }
  }

  console.log("[fetchToDb]", fetched.length, "fetched items add - DONE");

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
