export type CoverageMode = "agent" | "page" | "api" | "queue" | "cron" | "subscription";

export interface VibeJourney {
  id: string;
  name: string;
  actor: "customer" | "staff" | "admin" | "wechat-user" | "system";
  goal: string;
  entrypoints: string[];
  coverage: CoverageMode[];
  realisticPrompt: string;
  acceptance: string[];
}

export interface FeatureItem {
  id: string;
  name: string;
  priority: "P0" | "P1" | "P2" | "P3";
  sourceFiles: string[];
  journeys: VibeJourney[];
}

export const featureCatalog: FeatureItem[] = [
  {
    id: "auth-rbac",
    name: "Auth / RBAC / user identity",
    priority: "P0",
    sourceFiles: [
      "src/server/middlewares/auth.ts",
      "src/server/middlewares/wechatSilentAuth.tsx",
      "src/server/graphql/guards.ts",
      "src/server/graphql/resolvers/auth.ts",
    ],
    journeys: [
      {
        id: "auth-sms-login-staff-dashboard",
        name: "SMS login then staff dashboard access",
        actor: "staff",
        goal: "Log in with SMS, persist session, and access /dash without a 403 screen.",
        entrypoints: ["/api/auth/*", "/graphql", "/dash"],
        coverage: ["page", "api"],
        realisticPrompt: "我是店员，刚换了浏览器，要用手机号验证码登录后台查看今天桌台。",
        acceptance: ["SMS code is verified", "session includes staff/admin role", "dashboard renders navigation"],
      },
      {
        id: "auth-customer-forbidden-dashboard",
        name: "Customer is blocked from dashboard",
        actor: "customer",
        goal: "Verify a normal customer cannot operate staff dashboard pages.",
        entrypoints: ["/dash", "/api/auth/session"],
        coverage: ["page"],
        realisticPrompt: "我是普通顾客，好奇点进后台看看。",
        acceptance: ["/dash shows 403 or redirects", "no admin data is visible"],
      },
    ],
  },
  {
    id: "wechat-ai-agent",
    name: "WeChat official-account AI agent",
    priority: "P0",
    sourceFiles: [
      "src/server/apis/wechat/index.ts",
      "src/server/apis/wechat/messageHandler.ts",
      "src/server/apis/wechat/deepseekClient.ts",
      "src/server/apis/wechat/messagePipeline.ts",
    ],
    journeys: [
      {
        id: "wechat-search-boardgame",
        name: "Customer asks the LLM for board-game stock",
        actor: "wechat-user",
        goal: "A customer asks in natural language whether a game is available and gets a WeChat reply.",
        entrypoints: ["POST /wechat", "DeepSeek tool query", "WeChat customer service API"],
        coverage: ["agent", "api"],
        realisticPrompt: "我今晚想玩卡坦岛，你们光谷店有吗？几个人合适？",
        acceptance: ["WeChat XML is accepted", "agent selects an inventory/query intent", "reply mentions stock or a graceful unavailable state"],
      },
      {
        id: "wechat-create-active",
        name: "Customer asks the LLM to create an activity",
        actor: "wechat-user",
        goal: "A customer describes an activity and the agent routes to mutation flow with confirmation.",
        entrypoints: ["POST /wechat", "mutate tool", "KV pending action"],
        coverage: ["agent", "api"],
        realisticPrompt: "帮我约一个明天下午三点的阿瓦隆局，最多 8 人，在光谷店。",
        acceptance: ["agent extracts game/time/store/player count", "pending action is stored or mutation succeeds", "reply asks for confirmation or reports success"],
      },
    ],
  },
  {
    id: "tables-seats",
    name: "Table management and seat occupancy",
    priority: "P0",
    sourceFiles: [
      "src/server/graphql/resolvers/tables.ts",
      "src/server/durableObjects/SocketDO.ts",
      "src/server/durableObjects/PubSubDO.ts",
      "src/apps/routers/{-$storeLocale}/t/$code.tsx",
    ],
    journeys: [
      {
        id: "table-scan-occupy-leave",
        name: "Scan table QR, occupy seats, then leave",
        actor: "customer",
        goal: "A customer scans a table code, joins the table, sees timer/state, then leaves.",
        entrypoints: ["/t/:code", "/graphql", "/action/seat/:code"],
        coverage: ["page", "api", "subscription"],
        realisticPrompt: "我到店扫桌码入座，两个人一起坐，离店时退出桌台。",
        acceptance: ["table page renders", "occupancy is active", "leave changes occupancy to ended", "seat subscribers receive update"],
      },
    ],
  },
  {
    id: "orders-settlement",
    name: "Orders and settlement",
    priority: "P0",
    sourceFiles: ["src/server/graphql/resolvers/orders.ts", "src/shared/utils/pricing.ts", "src/apps/routers/dash/orders_.settle.tsx"],
    journeys: [
      {
        id: "order-start-pause-settle",
        name: "Start order, pause billing, settle with pricing plan",
        actor: "staff",
        goal: "Staff settles a table after paused billing and verifies the final price.",
        entrypoints: ["/dash/orders", "/dash/orders/settle", "/graphql"],
        coverage: ["page", "api"],
        realisticPrompt: "店员给一桌客人开台，中途暂停 15 分钟，最后按套餐结账。",
        acceptance: ["pause logs are deducted", "pricing snapshot is applied", "final price and breakdown are persisted"],
      },
    ],
  },
  {
    id: "actives-preferences",
    name: "Activities and preference matching",
    priority: "P1",
    sourceFiles: ["src/server/graphql/resolvers/actives.ts", "src/server/cron/preferenceMatching.ts", "src/shared/preferences/index.ts"],
    journeys: [
      {
        id: "active-create-join-leave",
        name: "Create, join, watch, and leave activity",
        actor: "customer",
        goal: "Customers organize and participate in a board-game activity.",
        entrypoints: ["/actives", "/actives/new", "/graphql"],
        coverage: ["page", "api"],
        realisticPrompt: "我想发起一个周日阿瓦隆约局，另一个朋友报名，还有一个朋友先围观。",
        acceptance: ["active is created", "participant registration is stored", "watch registration is stored", "leave removes or updates registration"],
      },
      {
        id: "preference-cron-match",
        name: "Preference cron creates recommendations",
        actor: "system",
        goal: "Scheduled matcher turns compatible preferences into recommended activities/notifications.",
        entrypoints: ["scheduled 0 16 * * *", "KV match queue", "recommended active creator"],
        coverage: ["cron", "queue"],
        realisticPrompt: "系统每天凌晨根据玩家偏好自动撮合约局。",
        acceptance: ["matching returns compatible users", "recommended active is created", "notification queue payload is stored"],
      },
    ],
  },
  {
    id: "inventory",
    name: "Board-game inventory",
    priority: "P1",
    sourceFiles: ["src/apps/routers/{-$storeLocale}/_with-home-lo/inventory.tsx", "src/apps/routers/{-$storeLocale}/_with-home-lo/inventory_.$id.tsx", "src/server/graphql/resolvers/users.ts"],
    journeys: [
      {
        id: "inventory-search-filter-detail",
        name: "Search inventory, filter by players, open detail",
        actor: "customer",
        goal: "A customer finds a game suitable for their group and checks store stock.",
        entrypoints: ["/inventory", "/inventory/:id", "/graphql"],
        coverage: ["page", "api", "agent"],
        realisticPrompt: "我们 4 个人想找 60 分钟以内的策略桌游，看看哪家店有。",
        acceptance: ["search results match query", "player filters narrow results", "detail shows store stock"],
      },
    ],
  },
  {
    id: "mahjong-gsz",
    name: "Riichi mahjong, GSZ sync, leaderboard",
    priority: "P1",
    sourceFiles: ["src/server/graphql/resolvers/mahjong.ts", "src/shared/mahjong/engine.ts", "src/server/utils/gszFetch.ts", "src/server/cron/leaderboard.ts"],
    journeys: [
      {
        id: "mahjong-record-sync-rank",
        name: "Record match, sync GSZ, recompute leaderboard",
        actor: "staff",
        goal: "Staff records a mahjong match, syncs it to GSZ, and leaderboard reflects the result.",
        entrypoints: ["/dash/gsz", "/my-riichi", "/graphql", "leaderboard cron"],
        coverage: ["page", "api", "cron"],
        realisticPrompt: "我录入一桌四麻半庄成绩，并确认同步全国日麻公式站和排行榜。",
        acceptance: ["match scores validate", "GSZ request is attempted", "leaderboard snapshot changes", "my-riichi shows the match"],
      },
    ],
  },
  {
    id: "events-cms",
    name: "Events CMS",
    priority: "P2",
    sourceFiles: ["src/server/graphql/resolvers/admin.ts", "src/apps/routers/dash/events.tsx", "src/apps/routers/{-$storeLocale}/_with-home-lo/events_.$id.tsx"],
    journeys: [
      {
        id: "event-create-publish-view",
        name: "Create event, publish, view detail",
        actor: "staff",
        goal: "Staff publishes store news and customers can read it.",
        entrypoints: ["/dash/events", "/events/:id", "/graphql"],
        coverage: ["page", "api"],
        realisticPrompt: "店员发布本周新活动，顾客从首页点进详情。",
        acceptance: ["draft can be created", "published event appears publicly", "unpublished event stays hidden"],
      },
    ],
  },
  {
    id: "og-cards",
    name: "OG cards and generated images",
    priority: "P2",
    sourceFiles: ["src/server/apis/ogCards", "src/server/apis/imageProcess.ts", "src/server/queue/imageQueueConsumer.tsx"],
    journeys: [
      {
        id: "og-generate-cache-hit",
        name: "Generate social card then serve from R2 cache",
        actor: "system",
        goal: "The app renders share images and reuses cached R2 objects.",
        entrypoints: ["/edge/media/card/*", "IMAGE_QUEUE", "R2"],
        coverage: ["api", "queue"],
        realisticPrompt: "系统为一个约局生成朋友圈分享图，第二次访问直接命中缓存。",
        acceptance: ["first request renders image", "R2 object is written", "second request avoids Browser Rendering"],
      },
    ],
  },
  {
    id: "membership",
    name: "Membership and stored value",
    priority: "P2",
    sourceFiles: ["src/server/graphql/resolvers/membership.ts", "src/server/cron/passExpiration.ts", "src/client/components/diceshock/MembershipBadge.tsx"],
    journeys: [
      {
        id: "membership-topup-settle-expire",
        name: "Create membership, deduct stored value, expire pass",
        actor: "staff",
        goal: "Staff manages customer memberships and stored-value settlement.",
        entrypoints: ["/dash/users/:id", "/graphql", "pass expiration cron"],
        coverage: ["page", "api", "cron"],
        realisticPrompt: "店员给顾客充值储值并开月卡，结账扣储值，月底提醒到期。",
        acceptance: ["membership plan is created", "settlement deducts balance", "expiration cron emits notification"],
      },
    ],
  },
  {
    id: "admin-dashboard",
    name: "Admin dashboard operations",
    priority: "P2",
    sourceFiles: ["src/apps/routers/dash.tsx", "src/apps/routers/dash/users.tsx", "src/apps/routers/dash/media.tsx", "src/apps/routers/dash/crawler.tsx"],
    journeys: [
      {
        id: "admin-user-media-crawler",
        name: "Manage users, upload media, trigger crawler",
        actor: "admin",
        goal: "Admin performs common dashboard operations across modules.",
        entrypoints: ["/dash/users", "/dash/media", "/dash/crawler", "/graphql"],
        coverage: ["page", "api", "queue"],
        realisticPrompt: "管理员查找用户、上传封面图，并手动触发一次爬虫任务。",
        acceptance: ["user table loads", "media upload reaches storage", "crawler queue receives a task"],
      },
    ],
  },
  {
    id: "subscriptions",
    name: "Realtime subscriptions and Durable Objects",
    priority: "P2",
    sourceFiles: ["src/server/graphql/resolvers/subscriptions.ts", "src/server/durableObjects/PubSubDO.ts", "src/server/durableObjects/SocketDO.ts", "src/server/apis/graphqlStream.ts"],
    journeys: [
      {
        id: "subscription-seat-notification-reconnect",
        name: "Subscribe, receive updates, reconnect",
        actor: "customer",
        goal: "Live table and notification updates survive normal disconnects.",
        entrypoints: ["/graphql/stream", "PUBSUB", "SOCKET"],
        coverage: ["subscription", "page", "api"],
        realisticPrompt: "我打开桌台页，朋友入座时实时看到变化，断网后恢复。",
        acceptance: ["subscription connects", "seat update arrives", "disconnect overlay appears", "reconnect resumes updates"],
      },
    ],
  },
  {
    id: "i18n-store-locale",
    name: "i18n and store locale",
    priority: "P2",
    sourceFiles: ["src/shared/i18n", "src/shared/store-locale.ts", "src/client/components/LanguageSelectorModal.tsx", "src/client/components/StoreLocaleDropdown.tsx"],
    journeys: [
      {
        id: "locale-switch-store-filter",
        name: "Switch language and store context",
        actor: "customer",
        goal: "Customer changes language/store and sees localized, store-scoped data.",
        entrypoints: ["/:storeLocale", "/inventory", "/actives"],
        coverage: ["page", "api"],
        realisticPrompt: "我把界面切成 English，并切换到另一家店查看库存。",
        acceptance: ["language changes", "store scoped data changes", "preference persists after reload"],
      },
    ],
  },
  {
    id: "gstone-crawler",
    name: "GStone crawler, document crawl, OCR",
    priority: "P3",
    sourceFiles: ["src/server/cron/gstoneCrawl.ts", "src/server/queue/gstoneCrawlConsumer.ts", "src/server/queue/gstoneDocCrawlConsumer.ts", "src/server/queue/gstoneOcrConsumer.ts"],
    journeys: [
      {
        id: "gstone-cron-to-ocr",
        name: "Cron dispatches crawl, image, document, OCR queues",
        actor: "system",
        goal: "Scheduled crawl pipeline ingests game and rules data.",
        entrypoints: ["scheduled */5 * * * *", "GSTONE_*_QUEUE", "GSTONE_DB", "AI_SEARCH"],
        coverage: ["cron", "queue", "api"],
        realisticPrompt: "系统定时更新桌游资料、图片和规则 OCR，并入库供 AI 查询。",
        acceptance: ["crawl tasks are queued", "consumer writes game data", "OCR result is stored", "AI Search ingest is called"],
      },
    ],
  },
  {
    id: "media-file-serving",
    name: "Media, file serving, fonts, sitemap",
    priority: "P3",
    sourceFiles: ["src/server/apis/fileRoute.tsx", "src/server/apis/fontCss.ts", "src/server/apis/sitemap.ts", "src/server/apis/mediaUpload.ts"],
    journeys: [
      {
        id: "static-sitemap-upload",
        name: "Serve SPA/static assets, sitemap, upload media",
        actor: "customer",
        goal: "Public pages and media infrastructure work in production-like routes.",
        entrypoints: ["/*", "/sitemap.xml", "/fonts/css/:locale.css", "/edge/media/upload"],
        coverage: ["page", "api"],
        realisticPrompt: "顾客打开分享链接，浏览器加载字体和静态资源；店员上传媒体。",
        acceptance: ["SPA fallback returns HTML", "sitemap is XML", "font CSS has cache headers", "upload reaches R2"],
      },
    ],
  },
  {
    id: "shortlinks",
    name: "Shortlinks and ready pages",
    priority: "P3",
    sourceFiles: ["src/server/apis/shortlink.ts", "src/server/apis/shortlinkApi.ts", "src/apps/routers/{-$storeLocale}/ready/$code.tsx"],
    journeys: [
      {
        id: "shortlink-create-redirect-ready",
        name: "Create shortlink, redirect, open ready page",
        actor: "staff",
        goal: "Staff creates shareable short links for ready/table flows.",
        entrypoints: ["/edge/shortlink", "/x/:id", "/ready/:code"],
        coverage: ["api", "page"],
        realisticPrompt: "店员生成一个桌台准备页短链，发给顾客后能正确跳转。",
        acceptance: ["shortlink id is created", "redirect target is safe", "unknown id returns 404", "ready page renders"],
      },
    ],
  },
  {
    id: "runespark",
    name: "Runespark companion app",
    priority: "P3",
    sourceFiles: ["../runespark/src/main.tsx", "../runespark/src/server/apis/graphql/index.ts", "../runespark/src/apps/routers/dash/graphiql.tsx"],
    journeys: [
      {
        id: "runespark-graphiql-introspection",
        name: "Open GraphiQL and run introspection",
        actor: "staff",
        goal: "Companion app GraphQL endpoint and GraphiQL shell are available.",
        entrypoints: ["/graphql", "/dash/graphiql"],
        coverage: ["page", "api"],
        realisticPrompt: "开发者打开 GraphiQL 检查 schema 并跑一个 hello query。",
        acceptance: ["GraphiQL renders", "introspection succeeds", "hello query returns data"],
      },
    ],
  },
  {
    id: "scripts-tooling",
    name: "Scripts and maintenance tooling",
    priority: "P3",
    sourceFiles: ["../../scripts/backfill-store-id.ts", "../../scripts/clean-and-recrawl.ts", "../../scripts/wechat-menu.ts", "scripts/test-agent.ts"],
    journeys: [
      {
        id: "script-dry-run-live-run",
        name: "Maintenance scripts support dry-run and live mode",
        actor: "system",
        goal: "Data maintenance scripts are safe for vibe-coding agents to invoke.",
        entrypoints: ["pnpm backfill", "scripts/wechat-menu.ts", "scripts/test-agent.ts"],
        coverage: ["agent", "api"],
        realisticPrompt: "代理先 dry-run 检查数据迁移，再执行真实修复并输出摘要。",
        acceptance: ["dry-run is side-effect free", "live run changes expected rows", "script exits non-zero on unsafe config"],
      },
    ],
  },
];

export function allJourneys(): VibeJourney[] {
  return featureCatalog.flatMap((feature) => feature.journeys);
}

export function findJourney(id: string): VibeJourney | undefined {
  return allJourneys().find((journey) => journey.id === id);
}
