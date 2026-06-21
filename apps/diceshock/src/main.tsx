import type { D1Database } from "@cloudflare/workers-types";
import { authHandler } from "@hono/auth-js";
import { Hono } from "hono";
import apisRoot from "@/server/apis/apisRoot";
import { boardGameCard } from "@/server/apis/boardGameCard";
import fileRoute from "@/server/apis/fileRoute";
import { fontCss } from "@/server/apis/fontCss";
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
import { siteOgCard } from "@/server/apis/ogCards/siteOgCard";
import sitemap from "@/server/apis/sitemap";
import {
  wechatCreateMenu,
  wechatMessage,
  wechatVerify,
} from "@/server/apis/wechat";
import type { HonoCtxEnv } from "@/shared/types";
import seatRedirect from "./server/middlewares/seatRedirect";
import "@/shared/utils/dayjs-config";
import aliyunInj from "./server/middlewares/aliyunInj";
import {
  authGuard,
  authInit,
  dashGuard,
  userInjMiddleware,
} from "./server/middlewares/auth";
import requestEndpoint from "./server/middlewares/requestEndpoint";
import serverMetaInj from "./server/middlewares/serverMetaInj";
import storeLocaleMiddleware from "./server/middlewares/storeLocale";
import trpcServerDash from "./server/middlewares/trpcServerDash";
import trpcServerPublic from "./server/middlewares/trpcServerPublic";
import { wechatSilentAuth } from "./server/middlewares/wechatSilentAuth";

export { SocketDO } from "./server/durableObjects/SocketDO";

export const app = new Hono<HonoCtxEnv>();

app.use(requestEndpoint);
app.use(aliyunInj);

app.get("/wechat", wechatVerify);
app.post("/wechat", wechatMessage);
app.post("/wechat/menu", wechatCreateMenu);

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
app.get("/edge/media/card/site-og", siteOgCard);

app.use("/edge/*", trpcServerDash);
app.use("/apis/*", trpcServerPublic);

app.use("/api/auth/*", authHandler());

app.use("*", wechatSilentAuth);

app.get("/sitemap.xml", sitemap);
app.get("/fonts/css/:locale.css", fontCss);

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
app.use("*", storeLocaleMiddleware);
app.use("*", authGuard);

app.use("/t/:code", seatRedirect);

app.use("/dash/*", dashGuard);
app.use("/dash", dashGuard);

app.get("/*", fileRoute);

app.get("/apis/*", apisRoot);
app.post("/apis/*", apisRoot);
app.put("/apis/*", apisRoot);
app.delete("/apis/*", apisRoot);

export default {
  fetch: app.fetch,
  scheduled: async (
    event: ScheduledEvent,
    env: HonoCtxEnv["Bindings"],
    _ctx: ExecutionContext,
  ) => {
    const { dispatchGstoneCrawl, dispatchGstoneDocCrawl, dispatchGstoneOcr } =
      await import("./server/cron/gstoneCrawl");
    await dispatchGstoneCrawl({
      GSTONE_DB: env.GSTONE_DB,
      GSTONE_CRAWL_QUEUE: env.GSTONE_CRAWL_QUEUE,
    });
    await dispatchGstoneDocCrawl({
      GSTONE_DB: env.GSTONE_DB,
      GSTONE_DOC_CRAWL_QUEUE: env.GSTONE_DOC_CRAWL_QUEUE,
    });
    await dispatchGstoneOcr({
      GSTONE_DB: env.GSTONE_DB,
      GSTONE_OCR_QUEUE: env.GSTONE_OCR_QUEUE,
    });

    if (event.cron === "0 4-22 * * *") {
      const { computeLeaderboards } = await import("./server/cron/leaderboard");
      await computeLeaderboards({ DB: env.DB as unknown as D1Database });

      const { checkPassExpiration } = await import(
        "./server/cron/passExpiration"
      );
      await checkPassExpiration({ DB: env.DB, KV: env.KV });
    }
  },
  async queue(
    batch: MessageBatch<unknown>,
    env: HonoCtxEnv["Bindings"],
    _ctx: ExecutionContext,
  ): Promise<void> {
    const queueName = (batch as any).queue;
    if (queueName === "diceshock-notifications") {
      const { handleNotificationQueue } = await import(
        "./server/queue/notificationConsumer"
      );
      await handleNotificationQueue(batch as any, env as any);
      return;
    }
    if (queueName === "diceshock-gstone-crawl") {
      const { handleGstoneCrawlQueue } = await import(
        "./server/queue/gstoneCrawlConsumer"
      );
      await handleGstoneCrawlQueue(batch as any, env as any);
      return;
    }
    if (queueName === "diceshock-gstone-images") {
      const { handleGstoneImageQueue } = await import(
        "./server/queue/gstoneCrawlConsumer"
      );
      await handleGstoneImageQueue(batch as any, env as any);
      return;
    }
    if (queueName === "diceshock-gstone-doc-crawl") {
      const { handleGstoneDocCrawlQueue } = await import(
        "./server/queue/gstoneDocCrawlConsumer"
      );
      await handleGstoneDocCrawlQueue(batch as any, env as any);
      return;
    }
    if (queueName === "diceshock-gstone-ocr") {
      const { handleGstoneOcrQueue } = await import(
        "./server/queue/gstoneOcrConsumer"
      );
      await handleGstoneOcrQueue(batch as any, env as any);
      return;
    }
    const { handleImageQueue } = await import(
      "./server/queue/imageQueueConsumer"
    );
    await handleImageQueue(batch as MessageBatch<any>, env);
  },
};
