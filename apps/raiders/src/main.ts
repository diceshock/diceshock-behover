import { type Env, Hono } from "hono";
import page from "./apis/page";

const app = new Hono<{ Bindings: Cloudflare.Env }>();

export interface HonoCtxEnv extends Env {
  Bindings: Cloudflare.Env;
}

app.get("/", page);

const scheduled: ExportedHandlerScheduledHandler<Cloudflare.Env> = async (
  _controller,
  _ctx,
) => {};

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Cloudflare.Env>;
