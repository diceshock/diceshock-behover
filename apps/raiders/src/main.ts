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

app.get("/", page);

const scheduled: ExportedHandlerScheduledHandler<Cloudflare.Env> = async (
  _controller,
  env,
  _ctx
) => {
  await BoardGame.syncDb(env.DB);
};

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Cloudflare.Env>;
