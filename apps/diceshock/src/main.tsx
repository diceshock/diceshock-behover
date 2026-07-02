import type { D1Database } from "@cloudflare/workers-types";
import { authHandler } from "@hono/auth-js";
import { Hono } from "hono";
import apisRoot from "@/server/apis/apisRoot";
import { avatarCard } from "@/server/apis/avatarCard";
import avatarUpload from "@/server/apis/avatarUpload";
import { boardGameCard } from "@/server/apis/boardGameCard";
import confirmMutation from "@/server/apis/chat/confirmMutation";
import chatSessions from "@/server/apis/chat/sessions";
import chatSpike from "@/server/apis/chat/spike";
import chatStream from "@/server/apis/chat/stream";
import fileRoute from "@/server/apis/fileRoute";
import { fontCss } from "@/server/apis/fontCss";
import { graphqlHandler } from "@/server/apis/graphqlEndpoint";
import { graphqlStreamHandler } from "@/server/apis/graphqlStream";
import type { ImageProcessMessage } from "@/server/apis/imageProcess";
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
import {
  shortlinkRedirect,
  shortlinkReferenceData,
} from "@/server/apis/shortlink";
import { shortlinkCreate } from "@/server/apis/shortlinkApi";
import sitemap from "@/server/apis/sitemap";
import {
  wechatCreateMenu,
  wechatMessage,
  wechatVerify,
} from "@/server/apis/wechat";
import { articlePreview } from "@/server/apis/wechat/articlePreview";
import type {
  GstoneCrawlMessage,
  GstoneImageMessage,
} from "@/server/queue/gstoneCrawlConsumer";
import type {
  GstoneDocCrawlMessage,
  GstoneOcrMessage,
} from "@/server/queue/gstoneDocCrawlConsumer";
import type { NotificationMessage } from "@/server/queue/notificationConsumer";
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
import { wechatSilentAuth } from "./server/middlewares/wechatSilentAuth";

export { DsSubscriptionDO } from "./server/durableObjects/DsSubscriptionDO";
export { PubSubDO } from "./server/durableObjects/PubSubDO";
export { WechatAgentDO } from "./server/durableObjects/WechatAgentDO";

export const app = new Hono<HonoCtxEnv>();

app.use(requestEndpoint);
app.use(aliyunInj);

app.get("/wechat", wechatVerify);
app.post("/wechat", wechatMessage);
app.post("/wechat/menu", wechatCreateMenu);

// Spike: AI SDK + DeepSeek V4 Pro streaming test endpoint
app.route("/api/chat/spike", chatSpike);

if (import.meta.env.DEV) {
  app.use("/api/auth/session", async (c, next) => {
    const testRole = c.req.header("X-Test-Role");
    if (testRole === "staff" || testRole === "admin") {
      return c.json({
        user: {
          id: "e2e-test-staff-001",
          name: "测试店员",
          email: "e2e@test.local",
          role: testRole,
          preferredStoreId: "store-e2e-gg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
    }
    return next();
  });
}

app.use(authInit);

app.route("/api/chat/stream", chatStream);
app.route("/api/chat/confirm", confirmMutation);
app.route("/api/chat/sessions", chatSessions);

app.use(serverMetaInj);

app.get("/graphql", graphqlHandler);
app.post("/graphql", graphqlHandler);
app.get("/graphql/stream", graphqlStreamHandler);

app.post("/edge/media/upload", mediaUpload);
app.post("/edge/media/avatar", avatarUpload);
app.post("/edge/media/process", imageProcessSubmit);
app.get("/edge/media/process/:taskId", imageProcessStatus);
app.post("/edge/shortlink", shortlinkCreate);
app.get("/edge/media/card/board-game/:id", boardGameCard);
app.get("/edge/media/card/riichi-ranking", riichiRankingCard);
app.get("/edge/media/card/riichi-stats/:userId", riichiStatsCard);
app.get("/edge/media/card/active/:id", activeCard);
app.get("/edge/media/card/actives", activesListCard);
app.get("/edge/media/card/event/:id", eventCard);
app.get("/edge/media/card/inventory", inventoryCard);
app.get("/edge/media/card/site-og", siteOgCard);
app.get("/edge/media/card/avatar/:userId", avatarCard);
app.get("/edge/media/article/:type/:id", articlePreview);

app.use("/api/auth/*", authHandler());

app.use("*", wechatSilentAuth);

app.get("/sitemap.xml", sitemap);
app.get("/fonts/css/:locale.css", fontCss);

app.get("/edge/shortlink/:id/data", shortlinkReferenceData);

app.get("/x/:id", async (c, next) => {
  const result = await shortlinkRedirect(c);
  if (result) return result;
  return next();
});

app.get("/MP_verify_yvnJDKhKIBUZ0DgN.txt", (c) => c.text("yvnJDKhKIBUZ0DgN"));

app.post("/action/seat/:code", async (c) => {
  const code = c.req.param("code");
  const id = c.env.DS_SUBSCRIPTION.idFromName(code);
  const stub = c.env.DS_SUBSCRIPTION.get(id);
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
    const {
      dispatchGstoneCrawl,
      dispatchGstoneDocCrawl,
      dispatchGstoneOcr,
      dispatchGstoneDocImages,
    } = await import("./server/cron/gstoneCrawl");
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
    await dispatchGstoneDocImages({
      GSTONE_DB: env.GSTONE_DB,
      GSTONE_DOC_IMAGE_QUEUE: env.GSTONE_DOC_IMAGE_QUEUE,
    });

    if (event.cron === "0 4-22 * * *") {
      const { computeLeaderboards } = await import("./server/cron/leaderboard");
      await computeLeaderboards({ DB: env.DB });

      const { checkPassExpiration } = await import(
        "./server/cron/passExpiration"
      );
      await checkPassExpiration(env);

      // Dispatch preference notifications during push window
      const { dispatchPreferenceNotifications } = await import(
        "./server/cron/notificationDispatcher"
      );
      await dispatchPreferenceNotifications({
        DB: env.DB,
        KV: env.KV,
        NOTIFICATION_QUEUE: env.NOTIFICATION_QUEUE,
        WECHAT_MP_APP_ID: env.WECHAT_MP_APP_ID,
        WECHAT_MP_APP_SECRET: env.WECHAT_MP_APP_SECRET,
      });
    }

    // Midnight matching (0:00 Shanghai = 16:00 UTC)
    if (event.cron === "0 16 * * *") {
      const { runPreferenceMatching } = await import(
        "./server/cron/preferenceMatching"
      );
      const { createRecommendedActive } = await import(
        "./server/cron/recommendedActiveCreator"
      );
      const { storeMatchQueue } = await import(
        "./server/cron/notificationDispatcher"
      );

      const matches = await runPreferenceMatching({
        DB: env.DB,
      });

      // Create recommended actives for cross-matches
      for (const match of matches.filter(
        (m) => m.type === "preference_cross",
      )) {
        await createRecommendedActive(env, match);
      }

      // Store results in KV for later dispatch
      await storeMatchQueue({ KV: env.KV }, matches);
    }
  },
  async queue(
    batch: MessageBatch<unknown>,
    env: HonoCtxEnv["Bindings"],
    _ctx: ExecutionContext,
  ): Promise<void> {
    const queueName = batch.queue;
    if (queueName === "diceshock-notifications") {
      const { handleNotificationQueue } = await import(
        "./server/queue/notificationConsumer"
      );
      await handleNotificationQueue(
        batch as MessageBatch<NotificationMessage>,
        env,
      );
      return;
    }
    if (queueName === "diceshock-gstone-crawl") {
      const { handleGstoneCrawlQueue } = await import(
        "./server/queue/gstoneCrawlConsumer"
      );
      await handleGstoneCrawlQueue(
        batch as MessageBatch<GstoneCrawlMessage>,
        env,
      );
      return;
    }
    if (queueName === "diceshock-gstone-images") {
      const { handleGstoneImageQueue } = await import(
        "./server/queue/gstoneCrawlConsumer"
      );
      await handleGstoneImageQueue(
        batch as MessageBatch<GstoneImageMessage>,
        env,
      );
      return;
    }
    if (queueName === "diceshock-gstone-doc-crawl") {
      const { handleGstoneDocCrawlQueue } = await import(
        "./server/queue/gstoneDocCrawlConsumer"
      );
      await handleGstoneDocCrawlQueue(
        batch as MessageBatch<GstoneDocCrawlMessage>,
        env,
      );
      return;
    }
    if (queueName === "diceshock-gstone-ocr") {
      const { handleGstoneOcrQueue } = await import(
        "./server/queue/gstoneOcrConsumer"
      );
      await handleGstoneOcrQueue(batch as MessageBatch<GstoneOcrMessage>, env);
      return;
    }
    if (queueName === "diceshock-gstone-doc-images") {
      const { handleGstoneDocImageQueue } = await import(
        "./server/queue/gstoneDocImageConsumer"
      );
      await handleGstoneDocImageQueue(
        batch as MessageBatch<{ document_id: number }>,
        env,
      );
      return;
    }
    const { handleImageQueue } = await import(
      "./server/queue/imageQueueConsumer"
    );
    await handleImageQueue(batch as MessageBatch<ImageProcessMessage>, env);
  },
};
