import db, { boardGamesTable } from "@lib/db";
import { BoardGame } from "@lib/utils";
import dayjs from "dayjs";
import * as drizzle from "drizzle-orm";
import { type Env, Hono } from "hono";
import page from "./apis/page";

const app = new Hono<{ Bindings: Cloudflare.Env }>();

export interface HonoCtxEnv extends Env {
  Bindings: Cloudflare.Env;
}

app.get("/owned", async (c) => {
  const all: BoardGame.BoardGameCol[] = [];

  for await (const games of BoardGame.fetchOwnedBoardGames()) {
    all.push(...games);
  }

  db(c.env.DB).transaction(async (tx) => {
    await tx
      .delete(boardGamesTable)
      .where(
        drizzle.lt(
          boardGamesTable.removeDate,
          dayjs().subtract(2, "months").valueOf()
        )
      );

    await tx
      .update(boardGamesTable)
      .set({ removeDate: Date.now() })
      .where(drizzle.eq(boardGamesTable.removeDate, 0));

    for (const g of all) {
      await tx.insert(boardGamesTable).values({
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
      });
    }
  });

  return c.json({
    count: all.length,
    names: all.map((g) => g.sch_name ?? g.eng_name),
  });
});

app.get("/", page);

const scheduled: ExportedHandlerScheduledHandler<Cloudflare.Env> = async (
  _controller,
  env,
  _ctx
) => {
  db(env.DB).transaction(async (tx) => {});
};

export default {
  fetch: app.fetch,
  // scheduled,
} satisfies ExportedHandler<Cloudflare.Env>;
