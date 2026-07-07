# tRPC → GraphQL Full Migration

## TL;DR

> 统一所有数据接口为 GraphQL。删除 tRPC + 旧 SSE，只保留三个端点。
>
> **端点架构**:
> - `POST /graphql` — query + mutation
> - `GET /graphql` — GraphiQL playground (staff+)
> - `GET /graphql/stream` — subscriptions over SSE (graphql-sse)
>
> **Deliverables**:
> - 30 tRPC 文件 → custom GQL resolvers (业务逻辑重新设计)
> - 221 前端调用 → Apollo Client hooks (codegen 类型安全)
> - 5 个实时场景 → GQL subscriptions over SSE
> - /sse/seat/:code → subscription seatUpdated
> - tRPC + 旧 SSE 完全删除
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves, max 9 concurrent
> **Critical Path**: Task 1 → 5 → 9 → 16 → 19 → 25 → F1-F4

---

## Context

### Key Decisions
| 项目 | 决定 |
|------|------|
| 迁移策略 | 大爆炸 (一次性切换) |
| 前端客户端 | Apollo Client (normalized cache) |
| Codegen | graphql-codegen (一开始就用) |
| GraphiQL | Staff+ 角色才能访问 |
| 业务逻辑 | 重新设计 API |
| Subscriptions | SSE via graphql-sse 协议 |
| @stream/@defer | 不支持 (graphql-js 16 限制), 保留独立 /sse/* 如需要 |

### Current State
- 30 tRPC route files, 4 auth levels (public/protected/staff/admin)
- 221 frontend call sites (trpcClientPublic.xxx)
- drizzle-graphql auto-generates CRUD schema
- Permission layer wired into executeGraphQL (permissions.ts)
- Agent 100% uses GQL (in-process)
- SSE seat system via SocketDO (Durable Object)
- graphql-js 16.13.1: subscribe() ✅, @stream/@defer ❌

### Metis Findings (addressed)
- Error contract: GQL extensions {code} mapping tRPC error codes
- Input validation: Zod → throw GraphQLError(VALIDATION_ERROR)
- Cache invalidation: Apollo refetchQueries strategy
- Multi-step flows (SMS/TOTP): sequential mutations with KV state
- N+1: drizzle-graphql auto-CRUD may generate multiple D1 queries
- Store context: from auth context preferredStoreId

---

## Work Objectives

### Core Objective
统一数据层为 GraphQL + Subscriptions over SSE, 删除 tRPC 和旧 SSE 端点。

### Definition of Done
- [ ] `pnpm build` 成功, 无 tRPC 依赖
- [ ] `grep -r "@trpc\|trpc" apps/diceshock/src/` = 0 results
- [ ] `/graphql` POST 处理所有 query/mutation
- [ ] `/graphql/stream` 处理所有 subscription (SSE)
- [ ] GraphiQL 仅 staff+ 可访问
- [ ] 5 个 subscription 场景工作 (seat, participants, notifications, leaderboard, orders)
- [ ] 所有页面功能与迁移前一致
- [ ] Agent 16/16 测试通过
- [ ] 无 /apis/*, /edge/*, /sse/seat/* 路由残留

### Must NOT Have
- WebSocket (subscriptions 走 SSE)
- @stream / @defer (graphql-js 16 不支持)
- 数据库 schema 变更
- 性能优化 (先迁移后优化)
- 认证机制变更 (JWT + Auth.js 不动)
- 新业务功能

---

## Verification Strategy

- **Automated tests**: Tests-after (bun test)
- **Frontend**: Playwright 验证关键页面
- **API**: curl 验证 /graphql auth + query + mutation + subscription
- **Agent**: 现有 16 scenario test suite
- **Subscriptions**: 用 curl + EventSource 验证 SSE 推送

---

## Execution Strategy

```
Wave 1 (Foundation — 7 tasks, all parallel):
├── T1: /graphql POST endpoint + GraphiQL (staff+ guard)
├── T2: /graphql/stream SSE endpoint (graphql-sse)
├── T3: Apollo Client + SSELink + Provider
├── T4: graphql-codegen 配置
├── T5: Custom resolver 架构 (types, errors, validation)
├── T6: Schema SDL (queries + mutations + subscriptions 完整设计)
├── T7: PubSub DO (扩展 SocketDO → 通用事件路由)

Wave 2 (Resolvers — 9 tasks, all parallel):
├── T8:  Auth resolvers (SMS, TOTP, profile, preferences)
├── T9:  Actives resolvers (CRUD + participants + management)
├── T10: Orders resolvers (全流程重设计)
├── T11: GSZ/Mahjong resolvers (sync, matches, leaderboard)
├── T12: Tables resolvers (occupy, leave, pause, seat)
├── T13: Membership resolvers (plans CRUD, deduct)
├── T14: Media/Events/Settings/Shortlink/Crawler/WechatTemplate resolvers
├── T15: BusinessCard + Users + Owned resolvers
├── T16: Subscription resolvers (5 场景: seat, participants, notifications, leaderboard, orders)

Wave 3 (Frontend — 8 tasks, all parallel):
├── T17: 公共页面 (inventory, actives list, events, leaderboard)
├── T18: 用户页面 (me, my-riichi, business card, preferences)
├── T19: 约局详情 + 实时参与者 (sub: activeParticipantsChanged)
├── T20: 座位系统 (sub: seatUpdated 替代 /sse/seat/:code)
├── T21: Staff dashboard — 约局/活动/桌面
├── T22: Staff dashboard — 订单(sub: orderStatusChanged)/会员/用户
├── T23: Staff dashboard — GSZ/爬虫/媒体/短链/设置/模板
├── T24: 通知系统 (sub: notificationReceived)

Wave 4 (Cleanup — sequential):
├── T25: 删除 tRPC + 旧 SSE + 依赖
├── T26: E2E Playwright verification
├── T27: Agent test suite
├── T28: Deploy + smoke test

Wave FINAL (4 parallel reviews → user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright)
└── F4: Scope fidelity check (deep)
```

---

## TODOs

- [x] 1. /graphql POST endpoint + GraphiQL (staff+ guard)

  **What to do**:
  - Create `src/server/apis/graphqlEndpoint.ts`
  - GET: serve GraphiQL HTML (CDN: react 18 + graphiql@3). Guard: require staff+ JWT, else 401.
  - POST: parse {query, variables}, resolve auth from getAuthUser → map role (public/authenticated/staff/admin), build GraphQLContext with auth, call executeGraphQL, return JSON {data, errors}
  - Introspection guard: add validation rule blocking __schema/__type for role < staff
  - Register in main.tsx after authInit: `app.all("/graphql", graphqlHandler)`

  **Must NOT do**: No WebSocket, no query complexity limit

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 1 | Blocks: T8-T16 | Blocked By: None

  **References**:
  - `src/server/apis/wechat/graphql/index.ts` — executeGraphQL to reuse
  - `src/server/apis/wechat/graphql/permissions.ts` — Role, AuthContext
  - `src/server/middlewares/auth.ts:293-398` — getAuthUser pattern

  **QA Scenarios**:
  ```
  Scenario: Staff GraphiQL access
    Tool: Bash (curl)
    Steps: GET /graphql with staff JWT cookie → assert 200 + contains "graphiql"
    Evidence: .sisyphus/evidence/task-1-graphiql.txt

  Scenario: Public blocked
    Tool: Bash (curl)
    Steps: GET /graphql no auth → assert 401
    Evidence: .sisyphus/evidence/task-1-blocked.txt

  Scenario: Permission enforcement
    Tool: Bash (curl)
    Steps: POST /graphql query "{ accounts { id } }" with authenticated JWT → assert error "权限不足"
    Evidence: .sisyphus/evidence/task-1-permission.txt
  ```

  **Commit**: `feat(gql): /graphql endpoint with GraphiQL (staff+ only)`

- [x] 2. /graphql/stream SSE endpoint (graphql-sse)

  **What to do**:
  - Install `graphql-sse` (pinned)
  - Create `src/server/apis/graphqlStream.ts`
  - Implement graphql-sse "single connection mode" handler: parse SSE request, authenticate JWT from cookie/header, call graphql subscribe(), pipe AsyncIterator → SSE text/event-stream response
  - Auth: require authenticated role minimum for subscriptions
  - Register: `app.get("/graphql/stream", graphqlStreamHandler)`
  - Heartbeat: send `:ping` every 30s to keep connection alive on CF Workers

  **Must NOT do**: No WebSocket fallback, no multi-tenant isolation yet

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 1 | Blocks: T16 | Blocked By: None

  **References**:
  - graphql-sse docs: https://github.com/enisdenjo/graphql-sse
  - `src/server/durableObjects/SocketDO.ts` — current SSE pattern
  - graphql-js `subscribe()` API

  **QA Scenarios**:
  ```
  Scenario: SSE connection established
    Tool: Bash (curl)
    Steps: curl -N -H "Accept: text/event-stream" /graphql/stream with auth → assert "content-type: text/event-stream"
    Evidence: .sisyphus/evidence/task-2-sse-connect.txt

  Scenario: Unauthenticated rejected
    Tool: Bash (curl)
    Steps: curl /graphql/stream no auth → 401
    Evidence: .sisyphus/evidence/task-2-sse-unauth.txt
  ```

  **Commit**: `feat(gql): /graphql/stream SSE subscription endpoint`

- [x] 3. Apollo Client + SSELink + Provider

  **What to do**:
  - Install `@apollo/client` (pinned)
  - Install `graphql-sse` client (for SSELink)
  - Create `src/client/graphql/client.ts`: ApolloClient with split link — httpLink for query/mutation, sseLink for subscriptions
  - Create `src/client/graphql/provider.tsx`: ApolloProvider wrapper
  - Auth: httpLink attaches session cookie automatically (same-origin), sseLink same
  - Error link: handle 401 → redirect to login, FORBIDDEN → show access denied
  - Cache: InMemoryCache with typePolicies (boardGamesTable, activesTable by id)
  - Integrate into root route layout

  **Must NOT do**: No SSR hydration, no persisted queries

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 1 | Blocks: T17-T24 | Blocked By: None

  **References**:
  - `src/shared/utils/trpc.ts` — current client pattern to replace
  - `src/apps/routers/__root.tsx` — root layout for provider wrapping

  **QA Scenarios**:
  ```
  Scenario: Apollo connects and queries
    Tool: Playwright
    Steps: Open any page → verify no console errors about Apollo → verify network tab shows /graphql POST
    Evidence: .sisyphus/evidence/task-3-apollo-init.png
  ```

  **Commit**: `feat(frontend): Apollo Client + SSELink + Provider`

- [x] 4. graphql-codegen 配置

  **What to do**:
  - Install `@graphql-codegen/cli`, `@graphql-codegen/typescript`, `@graphql-codegen/typescript-operations`, `@graphql-codegen/typescript-react-apollo`
  - Create `apps/diceshock/codegen.ts`: schema source from schema.graphql, documents from `src/client/graphql/operations/**/*.graphql`
  - Output to `src/client/graphql/__generated__/`
  - Add `"codegen": "graphql-codegen"` script to package.json
  - Run initial generation

  **Must NOT do**: No watch mode in CI

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 1 | Blocks: T17-T24 | Blocked By: T6 (needs schema.graphql)

  **References**:
  - `apps/diceshock/package.json` — scripts

  **QA Scenarios**:
  ```
  Scenario: Codegen produces types
    Tool: Bash
    Steps: pnpm codegen → assert __generated__/ has .ts files → tsc --noEmit passes
    Evidence: .sisyphus/evidence/task-4-codegen.txt
  ```

  **Commit**: `feat(gql): graphql-codegen configuration`

- [x] 5. Custom resolver 架构 (types, errors, validation)

  **What to do**:
  - Create `src/server/graphql/` directory (public GQL layer, separate from wechat/graphql agent layer)
  - `src/server/graphql/context.ts`: GQLContext type (db, userId, role, storeId, env)
  - `src/server/graphql/errors.ts`: error factory — notFound(), unauthorized(), forbidden(), validationError(field, msg)
  - `src/server/graphql/guards.ts`: requireAuth(ctx), requireStaff(ctx), requireAdmin(ctx), requireOwner(ctx, row, field)
  - `src/server/graphql/schema.ts`: mergeSchemas — combine drizzle-graphql auto schema + custom type defs + custom resolvers
  - `src/server/graphql/validate.ts`: Zod → GraphQLError adapter
  - Error extensions: `{ code: "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "INTERNAL", field?: string }`

  **Must NOT do**: No actual business resolvers (just framework)

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 1 | Blocks: T8-T16 | Blocked By: None

  **References**:
  - `src/server/apis/wechat/graphql/permissions.ts` — Role, hasRole
  - `src/server/apis/trpc/baseTRPC.ts:35-80` — current guard pattern

  **QA Scenarios**:
  ```
  Scenario: Guards throw correct errors
    Tool: Bash (bun test)
    Steps: Unit test requireAuth/requireStaff with mock contexts
    Evidence: .sisyphus/evidence/task-5-guards.txt
  ```

  **Commit**: `feat(gql): resolver architecture (context, errors, guards, schema merge)`

- [x] 6. Schema SDL (complete design)

  **What to do**:
  - Export drizzle-graphql auto schema as baseline
  - Design ALL custom types, queries, mutations, subscriptions in `apps/diceshock/schema.graphql`:
    - Auth: sendSmsCode, verifyPhone, updateProfile, updatePreferences, totpSecret
    - Actives: createActive, joinActive, leaveActive, watchActive, updateActive(staff), removeActive(staff)
    - Orders: startOrder, endOrder, pauseOrder, resumeOrder, settleOrder, batchSettle, cancelSettlement
    - GSZ: registerGsz, syncToGsz, terminateMatch, updateScore, batchSync
    - Tables: occupyTable, leaveTable, pauseTable, createTable(staff), updateTable(staff)
    - TempIdentity: createTempId, validateTempId, occupyWithTemp, leaveWithTemp, transferSeat
    - Membership: createPlan, updatePlan, removePlan, deductPlan
    - BusinessCard: upsertBusinessCard, getParticipantsCards
    - Users: updateRole(admin), disableUser(staff)
    - Events: createEvent, updateEvent, removeEvent, togglePublish
    - Media: uploadMedia, renameMedia, removeMedia
    - Shortlinks: createShortlink, closeShortlink, updateExpiry
    - Settings: setCaptchaEnabled
    - Subscriptions: seatUpdated(code), activeParticipantsChanged(activeId), notificationReceived(userId), leaderboardUpdated(category), orderStatusChanged(orderId)
  - Computed query types: leaderboard(category, period), matchHistory(userId), heatmap(userId), badges(userId)

  **Must NOT do**: No implementation, SDL only

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 1 | Blocks: T4 (codegen needs it), T8-T16 | Blocked By: None

  **References**:
  - All `src/server/apis/trpc/*.ts` — input/output shapes to map
  - `src/server/apis/wechat/skills/_schema.ts` — table field reference

  **QA Scenarios**:
  ```
  Scenario: SDL parses without error
    Tool: Bash
    Steps: npx graphql-inspector validate schema.graphql → 0 errors
    Evidence: .sisyphus/evidence/task-6-sdl-valid.txt
  ```

  **Commit**: `feat(gql): complete schema SDL (queries + mutations + subscriptions)`

- [x] 7. PubSub DO (扩展 SocketDO → 通用事件路由)

  **What to do**:
  - Refactor `src/server/durableObjects/SocketDO.ts` into generic PubSubDO:
    - Support multiple channel types: `seat:{code}`, `active:{id}`, `user:{id}`, `leaderboard:{category}`, `order:{id}`
    - Subscribe(channel) → add connection to channel set
    - Publish(channel, payload) → broadcast to all subscribers
    - Connection cleanup on disconnect
  - Expose RPC methods: `subscribe(channel)`, `publish(channel, event)`
  - Keep SSE streaming via Response with ReadableStream
  - Wrangler.toml: rename binding or add PubSub DO alongside SocketDO

  **Must NOT do**: No Redis/external pub-sub, keep it pure DO

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 1 | Blocks: T16 | Blocked By: None

  **References**:
  - `src/server/durableObjects/SocketDO.ts` — current DO implementation
  - `wrangler.toml:[[durable_objects]]` — DO binding config

  **QA Scenarios**:
  ```
  Scenario: Publish/Subscribe round-trip
    Tool: Bash
    Steps: Connect SSE to channel "test:1" → publish event to "test:1" → assert event received within 2s
    Evidence: .sisyphus/evidence/task-7-pubsub.txt
  ```

  **Commit**: `feat(gql): PubSub Durable Object for subscription event routing`

- [x] 8. Auth resolvers

  **What to do**:
  - Port `trpc/auth.ts` (410 lines): sendSmsCode, verifyPhone, updateUserInfo, getTotpSecret, verifyTotp
  - Port preferences from `trpc/users.ts:updatePreferences`
  - Redesign: mutation sendSmsCode(phone!) → {success, expiresIn}
  - mutation verifyPhone(phone!, code!) → {success, user}
  - mutation updateProfile(nickname, phone) → User
  - mutation updatePreferences(locale, storeId) → User
  - query totpSecret → {secret, qrUrl}
  - mutation verifyTotp(code!) → {success}
  - KV storage for OTP: same pattern as current

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 2 | Blocks: T18 | Blocked By: T1, T5

  **References**:
  - `src/server/apis/trpc/auth.ts` — full implementation
  - `src/server/apis/wechat/tools/mutate.ts:637-700` — SMS handler

  **QA Scenarios**:
  ```
  Scenario: SMS flow
    Tool: Bash (curl)
    Steps: mutation sendSmsCode(phone) → assert success → mutation verifyPhone(phone, code) → assert user bound
    Evidence: .sisyphus/evidence/task-8-sms.txt

  Scenario: Unauthorized blocked
    Tool: Bash (curl)
    Steps: sendSmsCode without JWT → assert UNAUTHORIZED
    Evidence: .sisyphus/evidence/task-8-unauth.txt
  ```

  **Commit**: `feat(gql): auth resolvers (SMS, TOTP, profile, preferences)`

- [x] 9. Actives resolvers

  **What to do**:
  - Port `trpc/actives.ts` (300 lines) + `trpc/activesManagement.ts` (120 lines)
  - mutation createActive(input: CreateActiveInput!) → Active
  - mutation joinActive(activeId!) → Registration
  - mutation leaveActive(activeId!) → {deleted: Boolean} (creator leaving = delete all)
  - mutation watchActive(activeId!) → Registration
  - query activeParticipants(activeId!) → [Registration] (+ business cards if creator)
  - Staff mutations: updateActive, removeActive, removeRegistration, batchRemove
  - Trigger PubSub on join/leave: publish("active:{id}", {type: "PARTICIPANT_CHANGED"})

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 2 | Blocks: T19, T21 | Blocked By: T1, T5, T7

  **References**:
  - `src/server/apis/trpc/actives.ts`
  - `src/server/apis/trpc/activesManagement.ts`

  **QA Scenarios**:
  ```
  Scenario: Create + join + participants
    Tool: Bash (curl)
    Steps: createActive → joinActive with different user → query participants → assert 2
    Evidence: .sisyphus/evidence/task-9-active-flow.txt
  ```

  **Commit**: `feat(gql): actives resolvers (CRUD + participants + pub events)`

- [x] 10. Orders resolvers (redesign)

  **What to do**:
  - Redesign `trpc/ordersManagement.ts` (1400 lines):
    - mutation startOrder(tableId!, userId?, planId?) → Order
    - mutation endOrder(orderId!) → Order
    - mutation pauseOrder(orderId!) → Order
    - mutation resumeOrder(orderId!) → Order
    - mutation settleOrder(orderId!, method!) → Settlement
    - mutation batchSettle(orderIds!, method!) → [Settlement]
    - mutation cancelSettlement(orderId!) → Order
    - query orders(filter, pagination) → OrderConnection
    - query order(id!) → Order
    - query settlementPreview(orderId!) → Preview
  - Computed fields on Order type: duration, amount, status (state machine)
  - Trigger PubSub on state change: publish("order:{id}", {status})
  - Staff-only all mutations

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 2 | Blocks: T22 | Blocked By: T1, T5, T7

  **References**:
  - `src/server/apis/trpc/ordersManagement.ts`
  - `src/server/apis/trpc/pricingPlansManagement.ts`

  **QA Scenarios**:
  ```
  Scenario: Order lifecycle
    Tool: Bash (curl)
    Steps: startOrder → pauseOrder → resumeOrder → settleOrder → verify final state
    Evidence: .sisyphus/evidence/task-10-order-lifecycle.txt
  ```

  **Commit**: `feat(gql): orders resolvers (full lifecycle redesign)`

- [x] 11. GSZ/Mahjong resolvers

  **What to do**:
  - Port `trpc/gszManagement.ts` (700 lines), `trpc/mahjong.ts`, `trpc/leaderboard.ts`, `trpc/gsz.ts`
  - Queries: leaderboard(category, period), matchHistory(userId, limit), heatmap(userId), badges(userId), myRankings, myPPStats
  - Mutations: saveMatch, register, registerGsz, syncToGsz, batchSync, terminateMatch, updateScore
  - Trigger PubSub on match end: publish("leaderboard:{category}", {updated: true})

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 2 | Blocks: T17, T18 | Blocked By: T1, T5, T7

  **References**:
  - `src/server/apis/trpc/gszManagement.ts`, `trpc/mahjong.ts`, `trpc/leaderboard.ts`, `trpc/gsz.ts`, `trpc/gszApi.ts`

  **Commit**: `feat(gql): GSZ/mahjong/leaderboard resolvers`

- [x] 12. Tables resolvers

  **What to do**:
  - Port `trpc/tables.ts` (250 lines), `trpc/tablesManagement.ts` (350 lines), `trpc/tempIdentity.ts` (270 lines)
  - Queries: tableByCode(code), myActiveOccupancy
  - Mutations: occupyTable, leaveTable, pauseTable, createTempIdentity, validateTempId, occupyWithTemp, leaveWithTemp, transferSeat
  - Staff: createTable, updateTable, removeTable, toggleStatus, regenerateCode, addOccupancy, removeOccupancy
  - Trigger PubSub on occupy/leave: publish("seat:{code}", {occupants})

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 2 | Blocks: T20, T21 | Blocked By: T1, T5, T7

  **References**:
  - `src/server/apis/trpc/tables.ts`, `trpc/tablesManagement.ts`, `trpc/tempIdentity.ts`

  **Commit**: `feat(gql): tables + seat resolvers (occupy/leave/temp identity)`

- [x] 13. Membership resolvers

  **What to do**:
  - Port `trpc/membershipPlans.ts` (270 lines)
  - Queries: myPlans, plansByUser(userId) (staff)
  - Mutations: createPlan(staff), updatePlan(staff), removePlan(staff), deductPlan(staff)

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 2 | Blocks: T18, T22 | Blocked By: T1, T5

  **References**:
  - `src/server/apis/trpc/membershipPlans.ts`

  **Commit**: groups with T14

- [x] 14. Media/Events/Settings/Shortlink/Crawler/WechatTemplate resolvers

  **What to do**:
  - Port remaining staff/admin routes:
    - `trpc/eventsManagement.ts` (100 lines): CRUD + togglePublish
    - `trpc/events.ts`: list, getById (public)
    - `trpc/mediaManagement.ts` (80 lines): list, rename, remove
    - `trpc/settingsManagement.ts`: getCaptchaEnabled, setCaptchaEnabled, getWechatOpenConfig
    - `trpc/shortlinkManagement.ts` (170 lines): CRUD + close + updateExpiry
    - `trpc/crawlerManagement.ts`: getStats, getErrors, resetCrawl
    - `trpc/wechatTemplateAdmin.ts`: listTemplates, listSlots, assignSlot, addFromLibrary, removeTemplate, sendTest
    - `trpc/rules.ts`: searchRules (public, uses AI_SEARCH)
    - `trpc/storeScope.ts`: any store-scoped logic

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 2 | Blocks: T21, T23 | Blocked By: T1, T5

  **References**:
  - All referenced trpc files above

  **Commit**: `feat(gql): media/events/settings/shortlink/crawler/template resolvers`

- [x] 15. BusinessCard + Users + Owned resolvers

  **What to do**:
  - Port `trpc/businessCard.ts` (196 lines): getMyCard, upsert, getByUserId, getParticipantsCards
  - Port `trpc/users.ts` (340 lines): list(staff), getById(staff), disable(staff), updateRole(admin)
  - Port `trpc/owned.ts`, `trpc/ownedManagement.ts`: boardgame ownership queries + sync

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 2 | Blocks: T18, T22 | Blocked By: T1, T5

  **References**:
  - `src/server/apis/trpc/businessCard.ts`, `trpc/users.ts`, `trpc/owned.ts`, `trpc/ownedManagement.ts`

  **Commit**: `feat(gql): businessCard + users + owned resolvers`

- [x] 16. Subscription resolvers (5 scenarios)

  **What to do**:
  - Define subscription type resolvers using graphql-js subscribe() API:
    - `subscription seatUpdated(code: String!) { type, occupants, userId }`
    - `subscription activeParticipantsChanged(activeId: ID!) { type, participant, count }`
    - `subscription notificationReceived(userId: ID!) { type, title, body, activeId? }`
    - `subscription leaderboardUpdated(category: String!) { category, topN }`
    - `subscription orderStatusChanged(orderId: ID!) { orderId, status, updatedAt }`
  - Each resolver: connect to PubSub DO channel → return AsyncIterator
  - Auth: all require authenticated. orderStatusChanged requires staff.
  - Subscribe function creates fetch to DO → DO returns SSE → adapter wraps as AsyncIterator

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 2 | Blocks: T19, T20, T22, T24 | Blocked By: T2, T5, T7

  **References**:
  - `src/server/durableObjects/SocketDO.ts` — current DO SSE implementation
  - graphql-js subscribe() docs

  **QA Scenarios**:
  ```
  Scenario: Seat subscription receives event
    Tool: Bash (curl + background)
    Steps:
      1. Start SSE connection to /graphql/stream with subscription seatUpdated(code:"A1")
      2. Trigger occupyTable(code:"A1") via mutation
      3. Assert SSE event received within 3s with type "OCCUPY"
    Evidence: .sisyphus/evidence/task-16-seat-sub.txt

  Scenario: Active participants subscription
    Tool: Bash
    Steps:
      1. SSE subscribe activeParticipantsChanged(activeId:"xxx")
      2. joinActive(activeId:"xxx")
      3. Assert event with type "JOIN"
    Evidence: .sisyphus/evidence/task-16-active-sub.txt
  ```

  **Commit**: `feat(gql): subscription resolvers (seat, participants, notifications, leaderboard, orders)`

- [x] 17. Frontend: 公共页面

  **What to do**:
  - Replace all tRPC calls in: inventory pages, actives list, events list, leaderboard
  - Write .graphql operations in `src/client/graphql/operations/`
  - Run codegen to get typed hooks
  - Use `useQuery` / `useSuspenseQuery` from generated hooks
  - Maintain exact same UI, just swap data source

  **Must NOT do**: No component refactors, no UI changes

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T9, T11, T14

  **References**:
  - grep `trpcClientPublic.owned\|trpcClientPublic.actives.list\|trpcClientPublic.events\|trpcClientPublic.leaderboard`

  **Commit**: `refactor(frontend): migrate public pages to Apollo GQL`

- [x] 18. Frontend: 用户页面

  **What to do**:
  - Replace calls in /me, /my-riichi/:userId, business card modal
  - Use useMutation for profile/card updates
  - Cache invalidation: refetchQueries after mutations

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T8, T13, T15

  **Commit**: `refactor(frontend): migrate user pages to Apollo GQL`

- [x] 19. Frontend: 约局详情 + 实时参与者

  **What to do**:
  - Replace active detail page data fetching
  - Add `useSubscription(ACTIVE_PARTICIPANTS_CHANGED, {activeId})` for real-time participant updates
  - On subscription event: update Apollo cache (cache.modify or refetchQueries)
  - Join/leave mutations trigger subscription events to other viewers

  **Recommended Agent Profile**: `visual-engineering`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T9, T16

  **Commit**: `refactor(frontend): actives detail + real-time participants subscription`

- [x] 20. Frontend: 座位系统 (subscription 替代 /sse/seat)

  **What to do**:
  - Replace current custom EventSource(/sse/seat/:code) with Apollo useSubscription(SEAT_UPDATED, {code})
  - Same UI behavior: real-time seat occupancy updates
  - Remove all /sse/seat client-side code

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T12, T16

  **Commit**: `refactor(frontend): seat system uses GQL subscription`

- [x] 21. Frontend: Staff dashboard — 约局/活动/桌面

  **What to do**:
  - Replace tRPC calls in /dash/actives, /dash/events, /dash/tables
  - Staff CRUD via mutations
  - List views via queries with pagination

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T9, T12, T14

  **Commit**: `refactor(frontend): staff dashboard (actives/events/tables) to GQL`

- [x] 22. Frontend: Staff dashboard — 订单/会员/用户 + 实时

  **What to do**:
  - Replace /dash/orders (+ subscription orderStatusChanged for live status), /dash/users, /dash/pricing
  - Order settlement flow via GQL
  - useSubscription for order status changes on dashboard

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T10, T13, T15, T16

  **Commit**: `refactor(frontend): staff orders/users/pricing + order subscription`

- [x] 23. Frontend: Staff dashboard — remaining

  **What to do**:
  - Replace remaining: GSZ management, crawler, media, shortlinks, settings, wechat templates
  - Last batch of tRPC → GQL

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T11, T14

  **Commit**: `refactor(frontend): remaining dashboard pages to GQL`

- [x] 24. Frontend: 通知系统

  **What to do**:
  - Create notification UI component (toast/bell)
  - useSubscription(NOTIFICATION_RECEIVED, {userId}) — show real-time push
  - Notification types: active_reminder, participant_joined, system_announcement
  - Store last-seen notification in localStorage for badge count

  **Recommended Agent Profile**: `visual-engineering`
  **Parallelization**: Wave 3 | Blocks: T25 | Blocked By: T3, T4, T16

  **Commit**: `feat(frontend): notification system via GQL subscription`

- [x] 25. 删除 tRPC + 旧 SSE + 依赖

  **What to do**:
  - Delete `src/server/apis/trpc/` (30 files)
  - Delete `src/server/middlewares/trpcServerPublic.ts`, `trpcServerDash.ts`
  - Delete `src/shared/utils/trpc.ts`
  - Remove from main.tsx: trpcServerPublic, trpcServerDash, /apis/*, /edge/*, /sse/seat/:code routes
  - Remove from package.json: @trpc/server, @trpc/client, @trpc/react-query, @hono/trpc-server
  - Remove old SocketDO if fully replaced by PubSubDO
  - `pnpm install` to clean lockfile
  - Verify build

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4, sequential | Blocks: T26-T28 | Blocked By: T17-T24

  **QA Scenarios**:
  ```
  Scenario: Zero tRPC remnants
    Tool: Bash
    Steps: grep -r "trpc\|@trpc\|/apis/\|/edge/" src/ → assert 0 results
    Evidence: .sisyphus/evidence/task-25-clean.txt
  ```

  **Commit**: `chore: remove tRPC + old SSE entirely`

- [x] 26. E2E Playwright verification

  **What to do**:
  - Write Playwright tests:
    - Public: inventory page loads, actives list loads, leaderboard renders
    - Auth: login → /me loads, business card modal works
    - Actives: create → join → see participants update (subscription)
    - Seat: occupy → real-time update on other tab (subscription)
    - Staff: dashboard loads, create event, settle order
  - Run against deployed preview

  **Recommended Agent Profile**: `unspecified-high`, Skills: [`playwright`]
  **Parallelization**: Wave 4 | Blocks: Final | Blocked By: T25

  **Commit**: `test: E2E Playwright post-migration verification`

- [x] 27. Agent test suite verification

  **What to do**:
  - Run 16-scenario test suite
  - Verify agent in-process GQL unaffected by public endpoint changes
  - Verify permission layer doesn't break agent (role=agent bypasses all)

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4 | Blocks: Final | Blocked By: T25

  **Commit**: NO (verification only)

- [x] 28. Deploy + production smoke test

  **What to do**:
  - `npx nx run diceshock:deploy`
  - Verify: /graphql GET (staff), POST (query), /graphql/stream (subscription)
  - Verify: all public pages, /me, dashboard
  - Verify: WeChat agent responds
  - Monitor logs 10 minutes for errors

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4, final | Blocked By: T26, T27

  **Commit**: NO (deploy only)

---

## Final Verification Wave

- [x] F1. Plan Compliance Audit — oracle
  Read plan. For each Must Have: verify exists. For each Must NOT Have: search for forbidden patterns. Check evidence files. Compare deliverables.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT`

- [x] F2. Code Quality Review — unspecified-high
  Run tsc + linter + bun test. Review for as any, empty catches, console.log in prod, unused imports, AI slop.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N/N] | VERDICT`

- [x] F3. Real Manual QA — unspecified-high + playwright
  Execute all QA scenarios. Test cross-task integration. Test subscriptions end-to-end.
  Output: `Scenarios [N/N] | Subscriptions [N/N] | VERDICT`

- [x] F4. Scope Fidelity Check — deep
  For each task: read spec, read diff. Verify 1:1 compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- Wave 1: `feat(gql): /graphql endpoint + stream + Apollo + codegen + resolver arch + PubSub DO`
- Wave 2: `feat(gql): all custom resolvers (auth, actives, orders, gsz, tables, membership, subscriptions)`
- Wave 3: `refactor(frontend): migrate all pages to Apollo GQL + subscriptions`
- Wave 4: `chore: remove tRPC + old SSE, E2E verify, deploy`

---

## Success Criteria

```bash
pnpm nx run diceshock:build              # zero tRPC, zero errors
grep -r "@trpc\|trpc" apps/diceshock/src # zero results
curl POST /graphql '{boardGamesTable(limit:1){id}}'  # 200 + data
curl GET /graphql/stream 'subscription{seatUpdated(code:"A1"){...}}'  # SSE events
npx tsx scripts/test-agent.ts            # 16/16
```
