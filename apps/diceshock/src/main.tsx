import type { D1Database } from "@cloudflare/workers-types";
import { authHandler } from "@hono/auth-js";
import { Hono } from "hono";
import apisRoot from "@/server/apis/apisRoot";
import fileRoute from "@/server/apis/fileRoute";
import mediaUpload from "@/server/apis/mediaUpload";
import sitemap from "@/server/apis/sitemap";
import type { HonoCtxEnv } from "@/shared/types";
import seatRedirect from "./server/middlewares/seatRedirect";
import "@/shared/utils/dayjs-config";
import aliyunInj from "./server/middlewares/aliyunInj";
import {
  authGuard,
  authInit,
  userInjMiddleware,
} from "./server/middlewares/auth";
import requestEndpoint from "./server/middlewares/requestEndpoint";
import serverMetaInj from "./server/middlewares/serverMetaInj";
import trpcServerDash from "./server/middlewares/trpcServerDash";
import trpcServerPublic from "./server/middlewares/trpcServerPublic";

export { SocketDO } from "./server/durableObjects/SocketDO";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use(requestEndpoint);

app.use(aliyunInj);
app.use(authInit);

app.use(serverMetaInj);

app.post("/edge/media/upload", mediaUpload);

app.use("/edge/*", trpcServerDash);
app.use("/apis/*", trpcServerPublic);

app.use("/api/auth/*", authHandler());

app.get("/sitemap.xml", sitemap);

app.get("/sse/seat/:code", async (c) => {
  const code = c.req.param("code");
  const id = c.env.SOCKET.idFromName(code);
  const stub = c.env.SOCKET.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set("code", code);
  return stub.fetch(
    new Request(`${url.origin}/sse?${url.searchParams.toString()}`, {
      headers: c.req.raw.headers,
    }),
  );
});

app.post("/action/seat/:code", async (c) => {
  const code = c.req.param("code");
  const id = c.env.SOCKET.idFromName(code);
  const stub = c.env.SOCKET.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set("code", code);
  return stub.fetch(
    new Request(`${url.origin}/action?${url.searchParams.toString()}`, {
      method: "POST",
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    }),
  );
});

app.use("*", userInjMiddleware);
app.use("*", authGuard);

app.use("/t/:code", seatRedirect);

app.get("/*", fileRoute);

app.get("/apis/*", apisRoot);
app.post("/apis/*", apisRoot);
app.put("/apis/*", apisRoot);
app.delete("/apis/*", apisRoot);

export async function scheduled(
  _event: ScheduledEvent,
  env: HonoCtxEnv["Bindings"],
  _ctx: ExecutionContext,
) {
  const { computeLeaderboards } = await import("./server/cron/leaderboard");
  await computeLeaderboards({ DB: env.DB as unknown as D1Database });
}

export default app;
