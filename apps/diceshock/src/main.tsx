import type { D1Database } from "@cloudflare/workers-types";
import { authHandler } from "@hono/auth-js";
import { Hono } from "hono";
import apisRoot from "@/server/apis/apisRoot";
import { boardGameCard } from "@/server/apis/boardGameCard";
import fileRoute from "@/server/apis/fileRoute";
import {
  imageProcessStatus,
  imageProcessSubmit,
} from "@/server/apis/imageProcess";
import mediaUpload from "@/server/apis/mediaUpload";
import { activeCard } from "@/server/apis/ogCards/activeCard";
import { activesListCard } from "@/server/apis/ogCards/activesListCard";
import { eventCard } from "@/server/apis/ogCards/eventCard";
import { inventoryCard } from "@/server/apis/ogCards/inventoryCard";
import { riichiRankingCard } from "@/server/apis/ogCards/riichiRanking";
import { riichiStatsCard } from "@/server/apis/ogCards/riichiStats";
import sitemap from "@/server/apis/sitemap";
import { wechatMessage, wechatVerify } from "@/server/apis/wechat";
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
import { wechatSilentAuth } from "./server/middlewares/wechatSilentAuth";

export { SocketDO } from "./server/durableObjects/SocketDO";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use(requestEndpoint);

app.get("/wechat", wechatVerify);
app.post("/wechat", wechatMessage);

app.use(aliyunInj);
app.use(authInit);

app.use(serverMetaInj);

app.post("/edge/media/upload", mediaUpload);
app.post("/edge/media/process", imageProcessSubmit);
app.get("/edge/media/process/:taskId", imageProcessStatus);
app.get("/edge/media/card/board-game/:id", boardGameCard);
app.get("/edge/media/card/riichi-ranking", riichiRankingCard);
app.get("/edge/media/card/riichi-stats/:userId", riichiStatsCard);
app.get("/edge/media/card/active/:id", activeCard);
app.get("/edge/media/card/actives", activesListCard);
app.get("/edge/media/card/event/:id", eventCard);
app.get("/edge/media/card/inventory", inventoryCard);

app.use("/edge/*", trpcServerDash);
app.use("/apis/*", trpcServerPublic);

app.use("/api/auth/*", authHandler());

app.use("*", wechatSilentAuth);

app.get("/sitemap.xml", sitemap);

app.get("/MP_verify_yvnJDKhKIBUZ0DgN.txt", (c) => c.text("yvnJDKhKIBUZ0DgN"));

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

export default {
  fetch: app.fetch,
  scheduled: async (
    _event: ScheduledEvent,
    env: HonoCtxEnv["Bindings"],
    _ctx: ExecutionContext,
  ) => {
    const { computeLeaderboards } = await import("./server/cron/leaderboard");
    await computeLeaderboards({ DB: env.DB as unknown as D1Database });
  },
  async queue(
    batch: MessageBatch<unknown>,
    env: HonoCtxEnv["Bindings"],
    _ctx: ExecutionContext,
  ): Promise<void> {
    const { handleImageQueue } = await import(
      "./server/queue/imageQueueConsumer"
    );
    await handleImageQueue(batch as MessageBatch<any>, env);
  },
};
