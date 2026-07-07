## Learnings

### T30 — Real D1-Backed E2E Auth + Dash Orders Seed (2026-06-25)

**Key Findings:**

1. DEV-only `X-Test-Role` bypass should live in both `userInjMiddleware` and `dashGuard`: the guard skips staff/admin redirects, while user injection must load `e2e-test-staff-001` from D1 so SSR/client cross data stays real.
2. The orders dashboard uses `table_occupancy` as its orders source, joined to `tables`, `user`, and `user_info`; seeded order rows should use real `active`, `paused`, and `ended` statuses plus store-linked table rows.
3. The only acceptable Playwright route mock for this E2E layer is `/api/auth/session`, because it replaces the external OAuth/JWT provider while all GraphQL operations continue to hit the local Worker and seeded D1.
4. `wrangler d1 execute diceshock --local` works from `apps/diceshock`, so the seed script can write a temporary SQL file and execute it through the same local D1 path used by the dev server.

**Files Modified:**
- `apps/diceshock/src/server/middlewares/auth.ts` — DEV header bypass injects seeded test user data into cross data.
- `apps/diceshock/scripts/seed-e2e.ts` — idempotent local D1 seed for store, staff/customer users, tables, orders, actives, events, and mahjong matches.
- `apps/diceshock/e2e/fixtures/auth.fixture.ts` — auth fixture now sets `X-Test-Role` and only mocks `/api/auth/session`.
- `apps/diceshock/e2e/fixtures/graphql.fixture.ts` — compatibility no-op; no GraphQL route interception.
- `apps/diceshock/e2e/fullstack/dash-tables.spec.ts` — orders page tests now expect real seeded data.
- `apps/diceshock/package.json` — added `seed:e2e` script.

### T29 — Dash Business + Wet Agent E2E Expectations (2026-06-25)

**System Prompt Skill Recommendations:**

1. The dashboard agent should explicitly know the pricing mutation roots: `savePricingSnapshot`, `publishPricingSnapshot`, and `restorePricingSnapshot`, and should use `mutate_gql` for previews before any pricing change.
2. The agent should know the operational order mutation roots and common intents: `pauseOrder`, `resumeOrder`, `settleOrder`/`settleOrders`, and `createOrder`/`createTableOccupancy`, while avoiding claims of execution until `/api/chat/confirm` succeeds.
3. The agent should aggregate `query_gql` results into staff-friendly summaries: total revenue, active/paused/ended counts, top table by revenue/hours, top user by spending/visits, and period-over-period comparisons.
4. The agent should infer Chinese relative dates for search and reporting: `上周五` maps to the previous Friday, `本周` maps to Monday through today, and `今天/昨天` should generate separate comparable date filters where needed.
5. The agent should preserve permission boundaries for staff/admin: identity management operations such as role changes, account deletion, session/authenticator changes, and dangerous user bulk operations remain blocked even if phrased as business tasks.

### T28 — Deterministic Full-Flow Dash E2E Replacement (2026-06-25)

**Key Findings:**

1. Full-flow dash E2E tests should mock `/graphql`, `/api/chat/stream`, and `/api/chat/confirm` at the Playwright route layer so page behavior is independent from D1 seed data, local auth, DeepSeek, and pending mutation memory.
2. Dash pages use operation names as the stable API seam: `Orders`, `Users`, `ManagedTables`, `ManagedActives`, `ManagedEvents`, `ManagedMahjongMatches`, plus helper queries such as `PublishedPricing`, `ActiveMahjongMatches`, and `MahjongTables`.
3. Chat tool rendering depends on AI SDK data-stream parts: text chunks (`0:`), tool call chunks (`9:`), tool result chunks (`a:`), and finish chunks (`d:`). Mocking these directly gives deterministic coverage for query cards, mutation confirmation cards, search chips, TOTP, and rules cards.
4. Search bridge tests validate the real Jotai pending-search handoff: clicking a `format_search_query` chip updates the shared search input, then each page's `usePendingSearch` effect writes URL state and triggers the table filter path.
5. Existing app UI has no explicit jump-to-page input; E2E coverage verifies direct URL page state and next/previous controls instead of inventing unsupported UI selectors.

**Files Created:**
- `apps/diceshock/e2e/fixtures/graphql.fixture.ts` — operation-name based GraphQL route mocking helper
- `apps/diceshock/e2e/fixtures/chat.fixture.ts` — AI SDK data-stream and confirmation route mocking helpers

**Files Replaced:**
- `apps/diceshock/e2e/fullstack/dash-tables.spec.ts` — comprehensive per-page table coverage across orders, users, tables, actives, events, and GSZ
- `apps/diceshock/e2e/fullstack/dash-chat.spec.ts` — comprehensive AI agent query/mutation/search/TOTP/rules/context/error/mobile coverage
- `apps/diceshock/e2e/fullstack/dash-integration.spec.ts` — cross-page AI/table integration and mobile integration flows

### T19 — Chat Agent Tools + Mutation Confirmation (2026-06-25)

**Key Findings:**

1. Dashboard chat tools should create GraphQL context from the Auth.js staff/admin token and pass `auth: { role, userId }`, `role`, and `preferredStoreId` into the existing WeChat GraphQL executor. This reuses the same field/table permission layer as `/graphql`.
2. `mutate_gql` is preview-only: it validates the operation is a mutation, blocks identity-management roots such as `updateUserRole`, stores a pending mutation in an in-memory `Map`, and returns `{ mutationId, query, variables, description }` without calling `executeGraphQL`.
3. Confirmation is a separate authenticated POST route at `/api/chat/confirm`; it requires the same staff/admin user that created the preview, checks the five-minute TTL, executes through `executeGraphQL`, and removes the preview after execution.
4. The chat stream must instantiate tools per request after resolving identity so every tool call carries the correct user role and preferred store context.
5. Tests mock the GraphQL executor and DB query builder directly for deterministic coverage of preview behavior, permission-context injection, TOTP, AI Search, active participant ownership checks, search syntax formatting, confirmation ownership, and expiry.

**Files Created:**
- `apps/diceshock/src/server/apis/chat/tools.ts` — six AI SDK raw JSON Schema tools plus pending mutation helpers
- `apps/diceshock/src/server/apis/chat/confirmMutation.ts` — confirmation endpoint
- `apps/diceshock/src/server/apis/chat/__tests__/tools.test.ts` — 20 tool and confirmation tests

**Files Modified:**
- `apps/diceshock/src/server/apis/chat/stream.ts` — replaced placeholder tools with request-scoped real tools and updated prompt safety rules
- `apps/diceshock/src/main.tsx` — registered `/api/chat/confirm`

### Wave 0 — AI SDK + DeepSeek Spike (2026-06-24)

**Key Findings:**

1. **Provider Compatibility Issue:** `@ai-sdk/deepseek@1.x` uses `ProviderV2` / `LanguageModelV2`, but `ai@4.3.19` expects `ProviderV1` / `LanguageModelV1`. Incompatible. Workaround: use `@ai-sdk/openai@1.x` (ProviderV1) with DeepSeek's OpenAI-compatible API endpoint via `createOpenAI({ baseURL, compatibility: "compatible" })`.

2. **Zod v4 Compatibility:** The project uses Zod v4 (4.3.6). `ai@4.3.19` has a peer dep on `zod@^3.23.8` and internally uses `zod-to-json-schema@3.25.2` which doesn't support zod v4. For raw JSON Schema tool parameters (not zod schemas), this causes `TypeError: undefined is not an object (evaluating 'def.typeName')` during schema conversion. The stream still produces a response. Use raw JSON Schema (`{ type: "object", properties: {...}, required: [...] }`) instead of `z.object(...)` for tools to avoid this.

3. **CF AI Gateway:** DeepSeek routes through `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek` when `CF_AI_GATEWAY_ID` is set. Otherwise falls back to `https://api.deepseek.com/v1`.

4. **Hono env access in tests:** `c.env` is undefined in unit tests (not in CF Workers runtime). Must guard with `(c.env as any) ?? {}` and check for API key existence before proceeding. For integration tests with `app.request()`, pass env bindings as the third argument: `app.request(path, init, { DEEPSEEK_API_KEY: key })`.

5. **streamText response:** `result.toDataStreamResponse()` returns `text/plain; charset=utf-8` with `X-Vercel-AI-Data-Stream: v1` header. Errors are streamed in-band, so HTTP status is 200 even if the LLM call fails.

**Files Created:**
- `apps/diceshock/src/server/apis/chat/spike.ts` — Hono route, POST `/api/chat/spike`
- `apps/diceshock/src/server/apis/chat/spike.test.ts` — 4 Vitest tests, all passing

**Packages Installed in apps/diceshock:**
- `ai@^4.3.19`
- `@ai-sdk/openai@^1.3.24` (replaces `@ai-sdk/deepseek` due to V1/V2 mismatch)
- `@ai-sdk/react@^1.2.12`

**Recommendation:** When upgrading to `ai@5.x` (beta), `@ai-sdk/deepseek@1.x` will work natively. Also evaluate zod v4 compatibility at that time.

### Wave 1 — Unified Dash Search Parser (2026-06-24)

**Key Findings:**

1. `OrderListInput` supports `search`, `status`, `storeId`, sort/group/pagination. It does not currently expose dedicated table/user/date fields, so parser-to-GQL mapping keeps table/user as search terms and maps date to start/end-style keys for future consumers.
2. `MahjongManagementListInput` is the richest match for structured filters: `search`, `mode`, `format`, `completion`, `gszSync`, `tableId`, `startDate`, `endDate`, `storeId`.
3. `UserSearchInput` only has `searchWords` and pagination in the current schema; role/store are still parsed as strict grammar fields for future page-level filtering.
4. Vitest include pattern requires tests under `apps/**/src/**/__tests__/**/*.test.ts`; the parser tests live in `apps/diceshock/src/client/lib/__tests__/searchParser.test.ts`.

**Files Created:**
- `apps/diceshock/src/client/lib/searchParser.ts` — strict grammar parser, serializer, helpers, table grammars, GraphQL variable mapper
- `apps/diceshock/src/client/lib/__tests__/searchParser.test.ts` — 25 Vitest cases covering parser, validation, serializer round-trip, autocomplete keys, and GQL mapping

### Wave 2 — Shared Dash Table Components (2026-06-24)

**Key Findings:**

1. Existing `/dash` pages use DaisyUI `table table-lg table-pin-rows table-pin-cols` with table-level loading/empty rows; the shared wrapper preserves that structure and keeps entity-specific cells/actions outside the component.
2. `BatchActionBar` remains page-composed: `DashTable` only emits controlled `Set<string>` row selection changes, so page-level batch actions can continue to own action semantics.
3. TanStack Table v8 works cleanly with controlled sorting via `useReactTable`, `getCoreRowModel`, `getSortedRowModel`, and explicit sorting state passed from URL/page state.
4. Toolbar quick filters can update the controlled search string generically by parsing current input, replacing/removing one `eq` filter, and serializing through the T3 parser helpers.

**Files Created:**
- `apps/diceshock/src/client/components/dash/DashTable.tsx` — generic TanStack Table wrapper with DaisyUI rendering, controlled sorting/pagination/selection, loading/empty states, and action column support
- `apps/diceshock/src/client/components/dash/SearchBar.tsx` — grammar-aware search input with parser error chips and Enter-submit parsing
- `apps/diceshock/src/client/components/dash/TableToolbar.tsx` — shared toolbar that composes `SearchBar`, quick filter pills, `AdminStoreFilter`, and extra content
- `apps/diceshock/src/client/components/dash/__tests__/DashTable.test.tsx` — TDD coverage for table rendering, state helpers, search validation, and toolbar composition

### Wave 3 — Unified Filter Input Types (2026-06-24)

**Key Findings:**

1. `SortOrder` enum already existed at line 39 of schema.graphql — skipped duplication.
2. `PaginationInput` and `CursorPaginationInput` already exist (lines 5-13) — reused in new filter inputs.
3. Existing managed queries use different patterns: some have no input arg (`managedEvents`, `managedTables`, `managedActives`), some have existing input types (`orders`, `managedUsers`, `managedMahjongMatches`).
4. Safe approach: added optional `filter` arg to all 6 managed queries without modifying existing input types or return types. This is fully backward compatible — existing callers with no `filter` arg continue to work.
5. Codegen (`graphql-codegen --config codegen.ts`) successfully generates TypeScript types for all 6 new filter inputs plus the optional `filter` query args.
6. `bunx tsc --noEmit` shows zero new errors — all pre-existing errors are TanStack Router params, import naming, and implicit `any` type issues.

**Files Modified:**
- `apps/diceshock/schema.graphql` — appended 6 new input types (EventFilterInput, TableFilterInput, ActiveFilterInput, UserFilterInput, MahjongFilterInput, OrderFilterInput) + added optional `filter` arg to 6 managed queries

**Generated (by codegen):**
- `apps/diceshock/src/client/graphql/__generated__/index.ts` — TypeScript types for all new filter inputs and updated query signatures with `filter?: InputMaybe<...>`

### T7 — managedTables resolver with DB-level filtering (2026-06-24)

**Key Findings:**

1. The `managedTables` resolver pattern follows the same approach as `managedEvents` from T6: when `filter` is present, use the SQL builder API (`.select().from().$dynamic()`) with compound WHERE conditions; when absent, fall back to the legacy `findMany` API.
2. `TableFilterInput` supports `search` (like on name), `type` (inArray on db type column — GQL FIXED/SOLO mapped to lowercase), `status` (inArray on db status column — GQL ACTIVE/INACTIVE mapped to lowercase), `store` (eq on store_id, combined with args.storeId and ctx.preferredStoreId), `sortBy` (allowed: name, type, status, code, capacity, update_at, create_at), `sortOrder`, and `pagination` (limit/offset).
3. Drizzle `inArray` requires typed arrays: `dbTypes as ("fixed" | "solo")[]` and `dbStatuses as ("active" | "inactive")[]`. The column is enum-typed so raw `string[]` won't compile.
4. Added `inArray` import to drizzle-orm imports in tables.ts (was not previously used in this file).
5. The filter path fetches rows via SQL builder, then does a second `findMany` query to fetch occupancies in bulk (mapped by table ID). This avoids N+1 occupancy queries.
6. TypeDefs in tables.ts were updated to include the `TableFilterInput` definition and `filter: TableFilterInput` arg on `managedTables`.

**Files Modified:**
- `apps/diceshock/src/server/graphql/resolvers/tables.ts` — added `and/asc/desc/eq/inArray/like` drizzle-orm imports, `TableFilterInput` typeDef, `filter` arg on `managedTables`, and filter-aware resolver implementation

**Files Created:**
 - `apps/diceshock/src/server/graphql/resolvers/__tests__/tables.test.ts` — 20 Vitest tests covering auth guard, legacy path, search, type, status, store, sort, pagination, combined filters, and edge cases. All passing.

### T9 — managedUsers resolver with DB-level filtering (2026-06-24)

**Key Findings:**

1. The `managedUsers` resolver uses a dual-path approach: when `filter` is provided, SQL builder + relational query API with COUNT for accurate `PageInfo.total`; when `filter` is absent, the existing legacy `UserSearchInput` behavior is preserved.
2. `UserFilterInput` supports `search` (LIKE on name, email, phone, uid, nickname), `role` (inArray on the `users.role` enum column), `store` (eq on `userInfo.preferred_store_id`), `sortBy` (allowed: name), `sortOrder` (ASC/DESC), and `pagination` (offset/limit).
3. Cross-table filtering (phone on `userInfoTable`, name on `users`) required a pre-query pattern: query `userInfoTable` for matching IDs first, then filter `users` by those IDs combined with direct name/email LIKE conditions.
4. The `drizzle.count()` COUNT query uses the SQL builder API (`.select({ count: drizzle.count() }).from(users).$dynamic()`) while the main query uses the relational API (`findMany` with `with: { userInfo, membershipPlans }`). Both replicate the same WHERE conditions — the SQL builder with `drizzle.like`/`drizzle.inArray` and the relational API with callback operators.
5. When `filter.store` and `filter.search` are both provided, their pre-queried userInfo IDs are intersected (both must match). When only one is provided, that single filter determines the ID set.
6. The legacy path carries forward the 8+ char direct ID match behavior: if `searchWords` length >= 8, the search string itself is added to `matchingIds` (handles direct user ID lookups).
7. The `role` column in the `users` table is typed as `"customer" | "staff" | "admin"` by Drizzle, so `inArray` values must be cast appropriately for both the SQL builder (`as "customer" | "staff" | "admin"`) and the relational callback.

**Files Modified:**
- `apps/diceshock/src/server/graphql/resolvers/users.ts` — added `userFilterSchema` Zod schema, `filter: UserFilterInput` arg on `managedUsers` typeDef, and dual-path resolver implementation with COUNT
- `apps/diceshock/src/server/graphql/resolvers/__tests__/users.test.ts` — 16 Vitest tests covering auth guard, legacy path with searchWords/pagination, filter defaults, search/role/store/sortBy/sortOrder, combined filters, and backward compatibility. All passing.

### T8 — managedActives resolver with DB-level filtering (2026-06-24)

**Key Findings:**

1. Unlike `events` and `tables`, the `activesTable` has no `status` column — "status" is derived from date comparison at DB level: `active` = `date >= todayStr`, `expired` = `date < todayStr`. Used `gte`/`lt` operators for this.
2. `ActiveFilterInput` uses `CursorPaginationInput` (cursor+limit) instead of `PaginationInput` (offset+limit). Implemented via `gt(activesTable.id, cursor)` in the relational query `where` callback.
3. Used the **relational query API** (`findMany` with dynamic `where`/`orderBy` callbacks) instead of SQL builder (`select().from().$dynamic()`). This preserves the `with: { creator, registrations }` relation loading without needing separate bulk queries.
4. `filter.type` maps to `is_game` boolean column: `type === "game"` → `is_game = true`.
5. Store filter combines `filter.store || args.storeId`, mirroring the event resolver pattern.
6. The `gt` operator (for cursor pagination) is available in Drizzle's relational query operators alongside `eq`, `like`, `gte`, `lt`, etc.
7. When both `"active"` and `"expired"` statuses are selected (or neither), no status condition is applied — since all actives fall into one of these two buckets.

**Files Modified:**
- `apps/diceshock/src/server/graphql/resolvers/actives.ts` — updated typeDefs (added `filter: ActiveFilterInput` arg), refactored `managedActives` resolver with dual-path (legacy + filtered)

**Files Created:**
- `apps/diceshock/src/server/graphql/resolvers/__tests__/actives.test.ts` — 19 Vitest tests covering auth guard, legacy path, search, status (active/expired/both), store, type, creator, sort (ASC/DESC/fallback), cursor pagination, default pagination, empty filter, and combined filters. All passing.

### T10 — managedMahjongMatches resolver with DB-level filtering (2026-06-24)

**Key Findings:**

1. The existing `managedMahjongMatches` resolver performed ALL filtering in JavaScript memory — pulling every row via `findMany`, then filtering with `.filter()`. The refactor adds a DB-level SQL builder path when `filter: MahjongFilterInput` is provided, while keeping the legacy `input: MahjongManagementListInput` path unchanged.

2. **Drizzle `inArray` type strictness**: `inArray`/`notInArray` require column-typed arrays (not plain `string[]`). The column's enum type determines the accepted array element type. For `mahjongMatchesTable.mode` (typed as `"3p" | "4p"`), the array must be `("3p" | "4p")[]`. For `termination_reason` (typed as `"score_complete" | "vote" | "admin_abort" | "order_invalid"`), the array must be typed accordingly. Cast with `as Type[]` at the call site.

3. **GQL enum → DB value mapping**: `MahjongFilterInput` uses GQL enum values: `THREE_PLAYER`/`FOUR_PLAYER` → DB `"3p"`/`"4p"`; `TONPUU`/`HANCHAN` → DB `"tonpuu"`/`"hanchan"`. The `completion` field uses `notInArray` for COMPLETED (exclude admin_abort/order_invalid) and `inArray` for INCOMPLETE. The `syncStatus` field uses `eq(m.gsz_synced, true)` for SYNCED and `and(eq(match_type, "tournament"), eq(gsz_synced, false))` for UNSYNCED — since only tournament matches sync to GSZ.

4. **Multi-select filter axes**: `mode`, `format`, `completion`, and `syncStatus` all accept arrays `[String!]`. For mode/format, single values use `eq()` and multiple use `inArray()`. For completion/syncStatus, single values use the direct condition, both use `or(...)`.

5. **tableCode resolution**: `filter.tableCode` references the `code` column in `tablesTable`, not `mahjongMatchesTable`. A pre-query resolves it to `table_id` via `findFirst({ where: eq(code, ...) })`. If no matching table, returns empty result immediately.

6. **COUNT query**: Uses `tdb.select({ count: drizzle.count() }).from(mahjongMatchesTable).$dynamic()` with the same WHERE clause as the data query, providing accurate `PageInfo.total`.

7. **Search**: Uses `or(eq(m.id, s), like(m.players, `%${s}%`))` — exact match ID OR players JSON substring (searches nicknames). The legacy path additionally searches table name/code, but those require a join and are not in the DB-level filter for simplicity.

8. **Sort columns**: `started_at`, `ended_at`, `mode`, `format` are valid; unknown values fall back to `created_at DESC` (default). Sort direction uses `asc`/`desc` based on `filter.sortOrder`.

**Files Modified:**
- `apps/diceshock/src/server/graphql/resolvers/mahjong.ts` — added `and/asc/gte/inArray/lte/notInArray/or` drizzle-orm imports, `mahjongFilterSchema` Zod schema, and dual-path `managedMahjongMatches` resolver (SQL builder for filter, legacy `findMany` + in-memory filtering for input)

**Files Created:**
- `apps/diceshock/src/server/graphql/resolvers/__tests__/mahjong.test.ts` — 21 Vitest tests covering auth guard, legacy path, mode (FOUR_PLAYER/THREE_PLAYER), format (HANCHAN/TONPUU), completion (COMPLETED/INCOMPLETE), syncStatus (SYNCED/UNSYNCED), tableCode, date range, store, search, sortBy/sortOrder (ASC/DESC/fallback), pagination defaults, combined filters, and empty filter. All passing.

### T11 — orders resolver with DB-level filtering (2026-06-24)

**Key Findings:**

1. The canonical `OrderFilterInput` lives at the end of `apps/diceshock/schema.graphql` and uses free-form fields: `status: [String!]`, `tableCode`, `store`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`, `groupBy`, and nested `pagination`. The embedded resolver typeDefs were stale and needed to match this shape.
2. The filtered path is opt-in only: `filter != null` uses SQL builder queries with COUNT + LIMIT/OFFSET, while no `filter` preserves the legacy `OrderListInput` in-memory behavior for existing callers.
3. `table_occupancy` has no `store_id` or `created_at` column. Store and table-code filtering require joining `tables`; `created_at` sort falls back to the closest actual order timestamp (`start_at`).
4. GraphQL status is partly derived: `ACTIVE`/`PAUSED` map directly to DB status values, `ENDED` means DB `ended` without settlement fields, and `SETTLED` means `final_price` or `settlement_snapshot` is present.
5. Search now executes at DB level across order IDs/user IDs/temp IDs plus joined table code/name and user/user_info fields.
6. Relation display requirements are preserved by first querying filtered IDs with SQL joins, then using the relational query API with `with: { table: true, pauseLogs: true }` and reordering rows to match the paginated SQL result.

**Files Modified:**
- `apps/diceshock/src/server/graphql/resolvers/orders.ts` — added `OrderFilterInput` SQL path with DB-level status/table/store/date/search/sort/pagination plus legacy path preservation.
- `apps/diceshock/src/server/graphql/resolvers/__tests__/orders.test.ts` — 20 Vitest tests covering auth, legacy compatibility, status variants, tableCode/store/date/search, sort, pagination, groupBy, and combined filters.

### T12 — Events dash page using DashTable + SearchBar + TableToolbar (2026-06-25)

**Key Findings:**

1. `EventFilterInput` schema uses `dateFrom`/`dateTo`/`store` (not `startDate`/`endDate`/`storeId`) — built a dedicated `buildFilter` helper in the page component to map from parsed search to the schema's expected field names.
2. DashTable uses offset-based pagination (0-based), but URL state is page-based (1-based). Mapping: `offset = (page - 1) * PAGE_SIZE`.
3. The `TableToolbar` composes `SearchBar`, `AdminStoreFilter`, and an `extra` slot — used `extra` for the "Create Event" button, with `DashBackButton` above the toolbar.
4. All existing mutations (create, togglePublish, remove) preserved with `refetchQueries: ["ManagedEvents"]` for automatic list refresh after mutations.
5. Actions column rendered via DashTable's `renderActions` prop — mobile (dropdown) and desktop (inline buttons) layouts both preserved.
6. `vi.mock` for `@tanstack/react-router` had hoisting issues in the test file — resolved by testing only the pure `buildFilter` function. The `createFileRoute` side-effect in the module makes full component rendering tests complex with vitest mocks.
7. Codegen must run after `.graphql` file changes: `pnpm codegen` in `apps/diceshock`.

**Files Modified:**
- `apps/diceshock/src/client/graphql/operations/dash-events.graphql` — added `$filter: EventFilterInput` variable to `ManagedEvents` query
- `apps/diceshock/src/client/graphql/__generated__/index.ts` — regenerated with `EventFilterInput`, updated query signatures
- `apps/diceshock/src/apps/routers/dash/events.tsx` — rewritten from raw HTML table (385 lines) to DashTable + TableToolbar + URL search state (340 lines)

**Files Created:**
- `apps/diceshock/src/apps/routers/dash/__tests__/events.test.tsx` — 9 Vitest tests covering `buildFilter` for all search grammar keys (status, type, date, store, sort, pagination). All passing.

### T13 — Tables dash page using DashTable + TableToolbar (2026-06-25)

**Key Findings:**

1. `TableFilterInput` schema uses `type: [String!]`, `status: [String!]`, `store`, `search`, `sortBy`, `sortOrder`, and nested `pagination`. The `buildFilter` helper maps TABLE_SEARCH_GRAMMAR to these GQL field names — using uppercase arrays for type/status enum filters and combining freeText + name filter into the `search` field.

2. Same approximate pagination pattern as events: `total = tables.length`, `hasMore = tables.length === PAGE_SIZE` since the resolver returns `[Table!]!` without a separate count.

3. Quick filter pills cover all TABLE_SEARCH_GRAMMAR enum keys: `type:fixed`, `type:solo`, `status:active`, `status:inactive`. The `TableToolbar` handles toggle-on/toggle-off via `parseSearch` + `serialize` round-trip on the search input.

4. All existing mutations preserved: `useCreateTableMutation`, `useToggleTableStatusMutation`, `useRemoveTableMutation`, all with `refetchQueries: ["ManagedTables"]`.

5. Actions column rendered via DashTable's `renderActions` prop — mobile dropdown (DotsThreeVerticalIcon) and desktop inline buttons, with QR code link, edit link, toggle status, and delete. Added `QrCodeIcon` import for the view QR action.

6. Columns: code (mono, truncated to 8 chars), name (bold), type (badge with color), status (badge success/ghost), capacity (count/capacity or ∞ for solo), scope (badge outline), createdAt (formatted). Sortable columns: name, type, status, capacity, createdAt.

7. The `typeLabel` helper was refactored to accept `t` as the first argument since it's used in both the column definitions and the delete dialog (different scopes). The original broken generic signature was replaced with a simple `(t: (key: string) => string, value: string)` signature.

8. Codegen command: `pnpm codegen` in `apps/diceshock`.

**Files Modified:**
- `apps/diceshock/src/client/graphql/operations/dash-tables.graphql` — added `$filter: TableFilterInput` to `ManagedTables` query
- `apps/diceshock/src/client/graphql/__generated__/index.ts` — regenerated with `TableFilterInput` variable support
- `apps/diceshock/src/apps/routers/dash/tables.tsx` — rewritten from raw HTML table (632 lines) to DashTable + TableToolbar + URL search state (689 lines)

**Files Created:**
- `apps/diceshock/src/apps/routers/dash/__tests__/tables.test.tsx` — 10 Vitest tests covering `buildFilter` for all search grammar keys (type, status, store, name, sort, pagination, empty filter). All passing.

### T14 — Actives dash page using DashTable + TableToolbar (2026-06-25)

**Key Findings:**

1. `ActiveFilterInput` uses `CursorPaginationInput` (cursor + limit) instead of `PaginationInput` (offset + limit). Implemented via Apollo `fetchMore` with `updateQuery` for Load More pattern — appending new results to the accumulated array.

2. `NetworkStatus.fetchMore` (value 3) distinguishes Load More loading from initial loading — used for button disabled state. Imported from `@apollo/client`.

3. Status filter is now server-side via `filter.status` array (T8). Quick filter pills set `status:active` and `status:expired` via the SearchBar + TableToolbar round-trip. The `route.validateSearch` was simplified to just `{ q }` — removing the client-side `status` URL param since it's now encoded in the search string.

4. The `buildFilter` function for actives maps `ParsedSearch` to `ActiveFilterInput`: `search` ← freeText, `status` ← array from filters, `type` ← type filter, `creator` ← creator filter, `store` ← store filter, `pagination` ← `{ cursor, limit: 20 }`. Unlike events, type does NOT go into the search field — it maps to the `is_game` boolean column in the resolver.

5. Checkbox-based batch delete uses DashTable's `enableRowSelection` + `selectedRows`/`onSelectedRowsChange` (controlled from page-level `Set<string>` state). The `BatchActionBar` renders below the table when selection is non-empty.

6. DashTable `paginationMode="none"` hides built-in prev/next buttons — a custom "Load More" button renders below the table when `hasMore` is true.

7. Status badge display is still derived client-side from date comparison (`date < shanghaiToday`) for the badge cell, even though filtering is now server-side.

8. New i18n keys added to all 9 locales: `type`, `typeGame`, `typeNotGame`, `store`, `loadMore`, `noMoreData` under `dashActives`.

**Files Modified:**
- `apps/diceshock/src/client/graphql/operations/dash-actives.graphql` — added `$filter: ActiveFilterInput` variable to `ManagedActives` query
- `apps/diceshock/src/client/graphql/__generated__/index.ts` — regenerated with `ManagedActivesQueryVariables` supporting `filter`
- `apps/diceshock/src/apps/routers/dash/actives.tsx` — rewritten from raw HTML table (564 lines) to DashTable + TableToolbar + cursor pagination (437 lines)
- `apps/diceshock/src/shared/i18n/locales/*.json` — all 9 locales updated with new dashActives keys

**Files Created:**
- `apps/diceshock/src/apps/routers/dash/__tests__/actives.test.tsx` — 9 Vitest tests covering `buildFilter` for all search grammar keys (status, type, creator, store, cursor pagination, empty filter, combined). All passing.

### T15 — Users dash page using DashTable + TableToolbar (2026-06-25)

**Key Findings:**

1. `UserFilterInput` schema uses `search` (LIKE on name/email/phone/uid/nickname), `role: [String!]`, `store` (preferred_store_id), `sortBy`, `sortOrder`, and nested `pagination`. The `buildFilter` helper maps `USER_SEARCH_GRAMMAR` keys to these GQL fields — combining freeText + name filter into `search`, mapping role to uppercase arrays, and passing store directly.

2. The `managedUsers` resolver (T9) returns `{ items: UserProfile[], pageInfo: PageInfo }` — `total` comes from `pageInfo.total` (accurate COUNT from the DB) and `hasMore` from `pageInfo.hasMore`. Used these for DashTable pagination instead of approximating from array length.

3. Phone masking for non-admin staff users uses `useSession()` from `@hono/auth-js/react` to check `session?.user?.role === "admin"`. Since the Auth.js `User` type doesn't include custom role fields, used `(session?.user as any)?.role` type assertion.

4. Quick filter pills cover `USER_SEARCH_GRAMMAR` enum keys: `role:admin`, `role:staff`, `role:authenticated`. The `TableToolbar` handles toggle-on/toggle-off via `parseSearch` + `serialize` round-trip.

5. The dash parent route's `beforeLoad` checks role via `fetch("/api/auth/session")` and throws ForbiddenError for non-admin/non-staff. The users page additionally checks admin role for phone unmasking.

6. Columns: ID (with copy-to-clipboard + hover tooltip), Avatar (image/avatarUrl or fallback initial), Nickname, Name, Role (color-coded badges), Phone (masked `***` for non-admin), Membership plan icons, Stored balance (¥), Points, Store (truncated preferredStoreId), UID, Created At (formatted), Actions (view details + disable).

7. All existing mutations preserved: `useDisableUserMutation` with `refetchQueries: ["Users"]`. Actions column via DashTable's `renderActions` — mobile dropdown, desktop inline buttons, both linking to `/dash/users/$id`.

8. The original `UserSearchInput` pattern (`searchWords` + pagination) was fully replaced by `filter: UserFilterInput`. The `.graphql` file was updated from `query Users($input: UserSearchInput = {})` to `query Users($filter: UserFilterInput)`.

9. Sortable column: `name` only (matches T9 resolver's allowed sortBy value).

10. Codegen command: `pnpm codegen` in `apps/diceshock`.

**Files Modified:**
- `apps/diceshock/src/client/graphql/operations/dash-users.graphql` — changed `Users` query to use `$filter: UserFilterInput` instead of `$input: UserSearchInput`
- `apps/diceshock/src/client/graphql/__generated__/index.ts` — regenerated with updated `UsersQueryVariables` supporting `filter?: InputMaybe<UserFilterInput>`
- `apps/diceshock/src/apps/routers/dash/users.tsx` — rewritten from raw HTML table (415 lines) to DashTable + TableToolbar + URL search state + phone masking (333 lines)

**Files Created:**
- `apps/diceshock/src/apps/routers/dash/__tests__/users.test.tsx` — 10 Vitest tests covering `buildFilter` for all search grammar keys (free text, name, role single/multi, store, sortBy/sortOrder, pagination, empty filter, combined). All passing.

### T16 — GSZ dash page using DashTable + TableToolbar (2026-06-25)

**Key Findings:**

1. The GSZ page was the most complex migration — 940 lines of raw HTML table with 4 filter axes (mode/format/completion/sync), table dropdown, date range inputs, batch sync with checkbox selection, active matches section, and multi-row sync actions per row.

2. `MahjongFilterInput` uses `mode: [String!]`, `format: [String!]`, `syncStatus: [String!]`, `completion: [String!]`, `tableCode`, `dateFrom`, `dateTo`, `search`, `sortBy`, `sortOrder`, and nested `pagination`. The `buildFilter` helper maps `GSZ_SEARCH_GRAMMAR` keys (mode/format/sync/completion/table/date) to these GQL fields — converting user-facing abbreviations (3p/4p, tonpuu/hanchan, synced/unsynced, completed/incomplete) to GQL enum values (THREE_PLAYER/FOUR_PLAYER, TONPUU/HANCHAN, SYNCED/UNSYNCED, COMPLETED/INCOMPLETE).

3. Quick filter pills cover all 4 axes with 8 pills (2 each): `mode:3p`, `mode:4p`, `format:tonpuu`, `format:hanchan`, `sync:synced`, `sync:unsynced`, `completion:completed`, `completion:incomplete`. The `TableToolbar` picker is `GSZ_SEARCH_GRAMMAR`-aware and the pills toggle between active/inactive.

4. The table dropdown was moved to the `extra` slot in `TableToolbar`. It maps to the `table` grammar key (`tableCode` in GQL). Dropdown values use table `code` (not `id`) since `MahjongFilterInput.tableCode` resolves by code in the T10 resolver.

5. Batch sync uses DashTable's `enableRowSelection` + `selectedRows`/`onSelectedRowsChange` (controlled from page-level `Set<string>` state). A custom batch action bar renders below the toolbar when selection is non-empty, with a "Sync N" button and selection count.

6. The `sync` column is one of the most complex columns — it renders differently based on `matchType` (non-tournament shows `—`), `gszSynced` status (success badge vs warning badge + sync button + unsyncable warning), and includes inline action handlers for sync and unsyncable dialog.

7. `handleSync` must be `useCallback` wrapped since it's referenced in the columns `useMemo` dependency array. The columns dep array includes `[t, syncingId, handleSync]`.

8. Route `validateSearch` was simplified from a complex object (mode/format/completion/gszSync/table/startDate/endDate/page) to just `{ q, page }` — all filters are encoded in the search string via the grammar parser/serializer.

9. The `ActiveMahjongMatch` type is NOT directly exported from the generated module; instead, types are derived using `ReturnType<typeof useActiveMahjongMatchesQuery>["data"]` pattern, same as events.tsx.

10. Date range is handled entirely through search syntax (`date:start..end`) — no separate date input fields needed. The `buildFilter` function extracts date from parsed search and maps to `dateFrom`/`dateTo`.

11. Pre-existing links to `/dash/gsz` in `index.tsx` and `tables_.$id.tsx` needed `search={{ q: "", page: 1 }}` added since the new route requires explicit search params for TanStack Router's `MakeRequiredSearchParams`.

12. Codegen command: `pnpm codegen` in `apps/diceshock`.

**Files Modified:**
- `apps/diceshock/src/client/graphql/operations/dash-gsz.graphql` — changed `$input: MahjongManagementListInput` to `$filter: MahjongFilterInput` and query arg from `input: $input` to `filter: $filter`
- `apps/diceshock/src/client/graphql/__generated__/index.ts` — regenerated with `ManagedMahjongMatchesQueryVariables` supporting `filter?: InputMaybe<MahjongFilterInput>`
- `apps/diceshock/src/apps/routers/dash/gsz.tsx` — rewritten from raw HTML table (940 lines) to DashTable + TableToolbar + URL search state (775 lines)
- `apps/diceshock/src/apps/routers/dash/index.tsx` — updated `search={{}}` to `search={{ q: "", page: 1 }}` for GSZ link
- `apps/diceshock/src/apps/routers/dash/tables_.$id.tsx` — added `search={{ q: "", page: 1 }}` to GSZ link

**Files Created:**
- `apps/diceshock/src/apps/routers/dash/__tests__/gsz.test.tsx` — 16 Vitest tests covering `buildFilter` for all search grammar keys (mode 3p/4p, format tonpuu/hanchan, sync synced/unsynced, completion completed/incomplete, table, date eq/range, sortBy/sortOrder, pagination, empty filter, combined). All passing.

### T17 — Orders dash page using DashTable + TableToolbar (2026-06-25)

**Key Findings:**

1. `OrderFilterInput` uses free-form string fields (`status`, `tableCode`, `store`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`, `groupBy`, `pagination`) rather than legacy `OrderListInput` enums. The page now sends `filter` and leaves the legacy `input` default intact for backward compatibility.
2. Orders status tabs are best represented through `ORDER_SEARCH_GRAMMAR` by serializing `status:active|paused|ended` into `q`; this keeps route URL state to `{ q, page, sortBy, sortOrder, groupBy }` while still applying server-side status filtering.
3. The `ended` UI/search state maps to `SETTLED` to preserve the previous page behavior, which showed settled orders under the ended label.
4. Table code maps to `filter.tableCode`; user search has no dedicated filter field, so it is combined with free text into `filter.search` for the resolver's broad DB-level search.
5. Grouping remains client-side after the server returns the sorted/paginated page. Grouped mode renders section headers plus one DashTable per group with shared selection state and custom page-level pagination.
6. Real-time order updates keep the existing subscription hook and refetch the filtered query on subscription events; mutations also refetch after pause/resume/batch operations.
7. Existing pricing snapshot parsing and `calculatePrice`/`formatPrice` logic is preserved for unsettled live estimates.

**Files Modified:**
- `apps/diceshock/src/client/graphql/operations/dash-orders.graphql` — added `$filter: OrderFilterInput` variable to `Orders` query while preserving `$input` default and subscription.
- `apps/diceshock/src/client/graphql/__generated__/index.ts` — regenerated with updated `Orders` variables.
- `apps/diceshock/src/apps/routers/dash/orders.tsx` — rewritten from raw HTML table to DashTable + TableToolbar with server-side filter/sort/pagination, client-side grouping, subscription refetch, batch actions, and pricing display.

**Files Created:**
- `apps/diceshock/src/apps/routers/dash/__tests__/orders.test.tsx` — tests for `buildFilter` covering free text/user, status/is, table/store, date comparison/range, sorting, grouping, pagination, and empty fields.

### T24-T26 — AI Panel ↔ Table Integration Layer (2026-06-25)

**Key Findings:**

1. The `pendingSearchAtom` pattern uses a Jotai atom as a one-shot signal: the AI chip sets the atom value, each dash page watches it via `usePendingSearch()`, applies the search, and immediately clears the atom to prevent re-triggering on re-renders.
2. `SearchQueryChip` was changed from a `<span>` to a `<button>` with `useSetAtom(pendingSearchAtom)` — the onClick sets the atom value directly without needing prop drilling or context.
3. Apollo cache refresh after mutation confirmation uses `apolloClient.refetchQueries({ include: "active" })` — this refetches all active watched queries (Orders, ManagedUsers, ManagedTables, etc.) in one call, avoiding per-entity refetch arrays.
4. `useChat` from `@ai-sdk/react` already persists message state within a session since ChatPanel is mounted at the layout level (`dash.tsx`) and doesn't unmount on route changes. The `chatMessagesAtom` provides an additional persistence layer in case of component tree rebuilds, and caps at 100 messages.
5. The `chatContextAtom` tracks `{ page, filters }` and updates whenever `currentPath` changes — useful for AI context injection without passing props.
6. Vitest cannot run with the Cloudflare Vite plugin active (`@cloudflare/vite-plugin` rejects `resolve.external` set by vitest environments) — tests are written but must run in an environment without the CF plugin.

**Files Created:**
- `apps/diceshock/src/client/components/dash/SearchBridge.tsx` — `usePendingSearch()` hook wrapping `pendingSearchAtom`
- `apps/diceshock/src/client/hooks/useChatMutation.ts` — `useChatMutation()` hook for Apollo cache refresh after confirm

**Files Modified:**
- `apps/diceshock/src/client/components/dash/chatAtoms.ts` — added `pendingSearchAtom`, `chatMessagesAtom`, `chatContextAtom`
- `apps/diceshock/src/client/components/dash/ToolResultRenderer.tsx` — SearchQueryChip uses `useSetAtom(pendingSearchAtom)` + `<button>`; MutationConfirmCard uses `useChatMutation` for Apollo refetch
- `apps/diceshock/src/client/components/dash/ChatPanel.tsx` — syncs messages to `chatMessagesAtom` (cap 100), updates `chatContextAtom` on route change, passes `initialMessages` to `useChat`
- `apps/diceshock/src/apps/routers/dash/orders.tsx` — added `usePendingSearch` effect
- `apps/diceshock/src/apps/routers/dash/events.tsx` — added `usePendingSearch` effect
- `apps/diceshock/src/apps/routers/dash/tables.tsx` — added `usePendingSearch` effect
- `apps/diceshock/src/apps/routers/dash/actives.tsx` — added `usePendingSearch` effect
- `apps/diceshock/src/apps/routers/dash/users.tsx` — added `usePendingSearch` effect
- `apps/diceshock/src/apps/routers/dash/gsz.tsx` — added `usePendingSearch` effect
- `apps/diceshock/src/client/components/dash/__tests__/ChatPanel.test.tsx` — added 8 atom tests + search chip as button test + tool invocation rendering test



**Key Findings:**

1. The production endpoint can reuse the T1 DeepSeek/OpenAI-compatible setup: `createOpenAI({ baseURL, compatibility: "compatible" })`, model `deepseek-reasoner`, and `result.toDataStreamResponse()` for Vercel AI SDK `useChat` compatibility.
2. Auth is resolved via `getAuthUser(c)` from Auth.js JWT session. The stream endpoint requires `token.role` to be `admin` or `staff`, returning JSON 401 before request validation or provider setup.
3. Rate limiting is intentionally in-memory per user ID: a 60-second sliding window with 10 timestamps per user. It returns 429 plus `Retry-After` and resets on Worker cold start as expected.
4. Store context is best-effort: use `token.preferredStoreId`, then `user_info.preferred_store_id`, then fetch `stores` metadata for prompt injection. If no store is found, the prompt still includes an explicit unknown/unbound store context.
5. Tool definitions should stay as raw JSON Schema parameters with placeholder execute functions returning `Tool not yet implemented`, keeping full execution deferred to T19 and avoiding Zod v4 conversion issues.

**Files Modified:**
- `apps/diceshock/src/main.tsx` — mounted `chatStream` at `/api/chat/stream` while keeping `/api/chat/spike`.

**Files Created:**
- `apps/diceshock/src/server/apis/chat/stream.ts` — production Hono route with auth, per-user rate limiting, request validation, page-aware system prompt, placeholder tools, DeepSeek provider setup, and AI SDK data stream response.
- `apps/diceshock/src/server/apis/chat/__tests__/stream.test.ts` — Vitest coverage for auth guard, role guard, missing API key, invalid JSON/body/context, rate limiting, response headers, provider setup, prompt content, conversation forwarding, and raw JSON Schema tools.

### E2E Integration Tests — Dash Tables + AI Chat + Bridge (2026-06-25)

**Key Findings:**

1. **Auth Mocking:** Dash pages require staff/admin role via `/api/auth/session`. Created a `page.route()` fixture that returns a mock session JSON — avoids needing real OAuth flow or storageState files. The fixture supports `mockStaffSession`, `mockAdminSession`, and `mockAnonymousSession` variants, all `auto: false` so tests opt in explicitly.

2. **Selector Strategy:** Components use DaisyUI classes without `data-testid` attributes. Key selectors:
   - DashTable: `table.table` (DaisyUI `table table-lg table-pin-rows table-pin-cols`)
   - Search input: `input[type="search"]`
   - Quick filter pills: `button.btn.btn-xs` with `btn-primary` for active
   - Column sort buttons: `table.table thead th button`
   - Row checkboxes: `table.table tbody input[type='checkbox']`
   - BatchActionBar: `.fixed.bottom-0.left-0.right-0.z-50`
   - Pagination: `.join` container with `btn-sm` "Previous"/"Next"
   - ChatPanel (desktop): `.hidden.lg\\:block.fixed` wrapper with chat toggle button and `"AI 助手"` header text
   - MobileChatSheet: `.btn-circle.btn-primary` FAB, `.lg\\:hidden` wrapper
   - Chat input: `textarea[placeholder="输入消息..."]`
   - Chat send: `form button.btn-primary.btn-square`
   - Loading indicator: `.loading.loading-dots`
   - Error retry: `button` with text `"重试"`
   - SearchQueryChip: `button.badge-primary` with `MagnifyingGlassIcon`
   - MutationConfirmCard: `button.btn-success` with `"确认执行"` + `"取消"` buttons

3. **API Mocking for Chat Tests:** The AI SDK data stream uses `text/plain` with `X-Vercel-AI-Data-Stream: v1` header and newline-delimited streaming protocol. Tool invocations use prefix `9:` (tool-call) and `a:` (tool-result). The `useChat` hook reads this client-side. Tests mock `/api/chat/stream` to simulate search chips (`format_search_query`), mutation cards (`mutate_gql`), and error states.

4. **Integration Bridge Testing:** The `pendingSearchAtom` pattern (chip click → atom write → page effect reads and clears) is tested by: mock stream returns `format_search_query` tool result → badge renders → click badge → search input value changes → URL updates. Mutation confirmation follows: `mutate_gql` tool result → confirm button renders → click → mock `/api/chat/confirm` → "已执行" badge appears.

5. **Playwright project setup:** The existing config already has `chromium` (Desktop Chrome) and `mobile-chrome` (Pixel 7) projects. Mobile tests use `test.use({ viewport: { width: 375, height: 812 } })` or rely on the `mobile-chrome` project's device emulation. Tests follow the `e2e/fullstack/` directory convention.

6. **Test resilience:** No hard waits — all assertions use auto-waiting `expect(...).toBeVisible()` with generous timeouts (15-20s for table loads, 5-10s for UI interactions). Conditional checks (`.catch(() => false)`) handle cases where data may be empty (no rows, single-page, etc.).

**Files Created:**
- `apps/diceshock/e2e/fixtures/auth.fixture.ts` — Auth mock fixture with `mockStaffSession`/`mockAdminSession`/`mockAnonymousSession`
- `apps/diceshock/e2e/fullstack/dash-tables.spec.ts` — 14 tests across 7 dash pages + anonymous guard + mobile viewport
- `apps/diceshock/e2e/fullstack/dash-chat.spec.ts` — 12 tests covering desktop panel, mobile FAB/sheet, streaming, error state, input validation
- `apps/diceshock/e2e/fullstack/dash-integration.spec.ts` — 7 tests covering search chip → table bridge, mutation confirmation flow, context persistence, mobile integration

### Business Scenario E2E + Wet Tests (2026-06-25)

**Files Created:**
- `apps/diceshock/e2e/fullstack/dash-business-scenarios.spec.ts` — 30+ mocked deterministic business workflow tests
- `apps/diceshock/e2e/fullstack/dash-wet-test.spec.ts` — 20 wet tests (real agent, gated by VIBE_TEST_LLM_ENDPOINT)
- `apps/diceshock/e2e/fixtures/business-scenarios.ts` — shared mock data + scenario definitions

**Skill Optimization Recommendations (from wet-test design):**

System prompt should be enhanced with:
1. **Pricing domain knowledge**: Agent should know exact mutations — `savePricingSnapshot(input: { name, data: { config, plans } })`, `publishPricingSnapshot(storeId)`, `restorePricingSnapshot(id)`. Currently only generic tool descriptions exist.
2. **Order operations vocabulary**: `pauseOrder(id)`, `resumeOrder(id)`, `settleOrders(ids: [ID!]!)`, `createTableOccupancy(input: { tableId, userId })` — these field names should be in the system prompt so the agent constructs correct GQL.
3. **Date inference rules**: "今天" = today's ISO date, "昨天" = yesterday, "上周五" = last Friday, "本周" = Monday..today. The system prompt should include date interpretation examples.
4. **Revenue aggregation pattern**: Agent should know to query `orders(filter: { status: ["ENDED"], dateFrom, dateTo })` then SUM the amount field for revenue calculations.
5. **Multi-step operations**: "修改并发布价格" requires 2 tool calls (savePricingSnapshot → publishPricingSnapshot). System prompt should indicate multi-step operations are supported.
6. **Batch safety**: For bulk mutations (settle all orders, delete all activities), the agent should always show count and ask for confirmation even before generating the mutate_gql preview.

**Wet Test Workflow:**
```bash
# Run wet tests locally (requires running dev server + DeepSeek API key)
VIBE_TEST_LLM_ENDPOINT=1 pnpm test:e2e -- --grep "Wet Agent"

# Review results
cat e2e/artifacts/wet-test-results/*.json | jq
```

Review cycle: run wet tests → check which scenarios fail → adjust system prompt in stream.ts → re-run → iterate until all scenarios pass.
