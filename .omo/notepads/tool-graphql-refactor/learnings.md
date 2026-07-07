# Learnings: Tool GraphQL Refactor

## Wave 1: mutateActions.ts (2026-06-19)

### Created
- `apps/diceshock/src/server/apis/wechat/graphql/mutateActions.ts`

### Key decisions
- Param interfaces use camelCase names (e.g., `activeId`, `gameId`, `maxPlayers`) for the GraphQL layer, not the snake_case used by existing OpenAI tool params
- `UpdateActiveParams` has a `fields` sub-object with `UpdateActiveFields` interface — only the fields actually updateable in `mutations.ts` (title, date, time, max_players, board_game_id)
- `MUTATE_ACTIONS` array uses `as const satisfies MutateAction[]` for type-safe enum usage in the tool definition
- The `MutateArgs` discriminated union includes a `description` field on every variant for user-facing summaries

### Sources
- `propose.ts` — existing propose tool param schemas and SUMMARIES
- `mutations.ts` — existing executeAction with all 9 action type handlers
- `pendingAction.ts` — PendingActionType union (8-action union)
## Wave 1 - Query Validation

### Created Files
- `apps/diceshock/src/server/apis/wechat/graphql/queryValidation.ts`

### Changes Made
- Added `graphql@^16.13.1` to `apps/diceshock/package.json` dependencies (was only in runespark before)
- Ran `pnpm install` to link the dependency

### Implementation Notes
- Uses `parse` from graphql-js for AST parsing
- Depth counting explicitly skips `__schema`, `__type`, `__typename` introspection fields
- Operation type checked on ALL definitions (handles multi-operation docs)
- `QUERY_TOOL_DEFINITION` follows existing project format from boardgame.ts

### Verification
- LSP diagnostics: clean (0 errors in the new file)
- Smoke tested 7 scenarios: valid query, mutation rejection, subscription rejection, syntax error, depth > 3, introspection depth bypass, depth = 3 passes

## Wave 2: drizzle-graphql Table Coverage Spike (2026-06-19)

### Test File
- `apps/diceshock/src/server/apis/wechat/__tests__/graphql-spike.test.ts` — 7 tests, all passing

### Key Finding: ALL 14 required tables ARE exposed

drizzle-graphql's `buildSchema()` exposes **all 22 schema tables** with full CRUD (findMany, findFirst, insert, insertSingle, update, delete per table). Result: **14/14 required tables confirmed**.

### Schema Stats
- 22 tables → 44 Query fields, 88 Mutation fields, 733 total GraphQL type definitions
- drizzle-graphql preserves JS variable names from schema exports (e.g., `users` not `usersTable` for the `users` variable)
- Relations are deeply nested in generated types

### GraphQL Execution Caveat
- Calling `graphql()` from a direct `graphql` import fails due to pnpm duplicate module — drizzle-graphql bundles its own `graphql@16.13.1`, creating separate module instances
- runespark production code avoids this by using `@graphql-tools/schema`'s `mergeSchemas` + `@hono/graphql-server` instead of `graphql()`
- `buildSchema()` itself works fine — schema exposes valid Query/Mutation types with all expected fields

### Dependencies
- Added `drizzle-graphql@0.8.5` as devDependency to `apps/diceshock` for spike testing
- `graphql@16.13.1` already available transitively

## Wave 3: WeChat GraphQL Executor Module (2026-06-19)

### Created Files
- `apps/diceshock/src/server/apis/wechat/graphql/index.ts`

### Key Findings
- Current pnpm layout resolves `graphql` from both `apps/diceshock` and `drizzle-graphql` to the same `graphql@16.13.1` package path, so in-process `execute()` can consume the schema without cross-instance errors.
- `@graphql-tools/schema` is not installed in the Diceshock workspace; it was not needed because the package instance issue is resolved by dependency layout.
- `drizzle-graphql` types still disagree with the app Drizzle type because of private Drizzle members, so the implementation isolates that mismatch behind a local `buildDrizzleSchema` wrapper.

### Implementation Notes
- Schema output is cached in a module-level `WeakMap` by request-scoped Drizzle DB instance to avoid rebuilding for repeated calls with the same binding-backed DB.
- A custom GraphQL validation rule blocks root `Query`/`Mutation` fields for auth-sensitive tables: `accounts`, `sessions`, `verificationTokens`, `authenticators`.
- Root findMany query fields are detected by the presence of a `limit` arg and capped to 50 by AST rewriting; variable-based limits are capped before execution, with response array slicing as a fallback.

## TOTP Tool Ported (Wave 1)

**File**: `apps/diceshock/src/server/apis/wechat/tools/totp.ts`

**Changes**:
- Removed Hono `Context<HonoCtxEnv>` dependency — replaced with minimal `ToolContext` interface
- `resolveUserId` now accepts `(d1: D1Database, openId: string)` instead of `(c: Context, openId)`
- All TOTP generation logic (crypto, KV, URL building) preserved identically
- New exports: `TOTP_TOOL_DEFINITION` (matching QUERY_TOOL_DEFINITION format) and `executeGenerateTotp(args, context)`

**ToolContext** defined as:
```ts
interface ToolContext {
  env: { DB: D1Database; KV: KVNamespace };
  openId: string;
}
```

**Impact**: `tools/index.ts` imports `generateTotpMessage` from `./totp` — will need updating in dispatcher refactor task.

## Wave 2: Skill Files Restructured (2026-06-19)

### Files Rewritten
All 8 skill files in `apps/diceshock/src/server/apis/wechat/skills/`:
- `general.ts` → exports `GENERAL_SKILL_CONTENT` (store info, addresses, contact)
- `boardgame.ts` → exports `BOARDGAME_SKILL_CONTENT` (inventory queries, categories, create flow)
- `active.ts` → exports `ACTIVE_SKILL_CONTENT` (activity queries, mutations)
- `mahjong.ts` → exports `MAHJONG_SKILL_CONTENT` (riichi data, PP, GSZ binding)
- `event.ts` → exports `EVENT_SKILL_CONTENT` (published events/news)
- `account.ts` → exports `ACCOUNT_SKILL_CONTENT` (membership, phone, biz card)
- `trpg.ts` → exports `TRPG_SKILL_CONTENT` (paid TRPG, GM/PC flow, char creation)
- `clocktower.ts` → exports `CLOCKTOWER_SKILL_CONTENT` (Blood on Clocktower, storyteller)

### Key Decisions
- Each skill exports a single string constant (no more `SkillDefinition` objects)
- Every skill has 3 sections: [业务背景], [工具使用], [行为规则]
- Tool references use new names: `query` (GraphQL), `mutate` (mutations), `load_skill` (skill loading)
- Removed: tool arrays, `SkillId` types, OpenAI tool JSON, `SkillDefinition` imports
- All business info preserved (addresses, pricing, PP system, tournament types, GM/PC flow, categories, etc.)
- GraphQL examples use actual drizzle export variable names (e.g., `boardGamesTable`, `activesTable`, `mahjongMatchesTable`)
- Content well under 2000 chars per skill (largest ~1178 chars)
- All files: LSP diagnostics clean (0 errors)
- `skills/index.ts` NOT modified (scheduled for Task 13) — will have import errors until then

### Table Name Reference
From `libs/db/src/schema.ts` exports (used in skill query examples):
- `boardGamesTable` — board game inventory
- `activesTable` + `activeRegistrationsTable` — activities
- `eventsTable` — published events
- `users` + `userInfoTable` + `userMembershipPlansTable` + `userBusinessCardTable` — account
- `mahjongMatchesTable` + `leaderboardSnapshotsTable` + `userBadgesTable` — mahjong
- `tablesTable` + `tableOccupancyTable` — physical tables

## Wave 4: query.ts — GraphQL Query Tool Executor (2026-06-19)

### Created
- `apps/diceshock/src/server/apis/wechat/tools/query.ts`

### Key decisions
- `ToolContext` defined locally (not imported from `totp.ts`) because it adds `userId: string | null` — the `totp.ts` ToolContext only has `env` and `openId`. Avoiding cross-tool coupling until a unified ToolContext refactor.
- `validateQueryString` from `../graphql/queryValidation` handles mutation/subscription rejection and depth checking before execution.
- `executeGraphQL` from `../graphql/index` handles auth-blocked tables, limit capping, and in-process execution via its internal validation pipeline.
- Truncation at 4000 chars with item count when top-level value is an array — matches agent-friendly response sizing.
- Chinese error messages: `查询错误: ...`, `查询无返回数据`, `[结果已截断, 共N条记录]`

### Implementation Notes
- Step order: validate → build context → execute → error check → empty check → truncate
- `executeGraphQL` returns `{ data?: unknown; errors?: string[] }` — errors are already stringified with Chinese prefix (`GraphQL 执行错误:` / `GraphQL 语法错误:`)
- `null` data is handled as its own edge case (`查询无返回数据`), distinct from errors

### Verification
- LSP diagnostics: clean (0 errors on query.ts)
- All pre-existing errors in other files (auth.ts, __root.tsx, main.tsx) are unrelated

## Wave 5: mutate.ts — Mutate Tool Executor (2026-06-19)

### Created
- `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

### Key Decisions
- Uses `ToolContext` from `./totp` — shared interface with `env.DB`, `env.KV`, `openId`
- Extended env via local `MutateEnv` interface that adds `aliyunClient?`, `GSZ_TOKEN?`, `DEV_SMS_CODE?`
- `resolveUserId` ported from `mutations.ts` — adapted to accept `(d1: D1Database, openId)` like totp.ts pattern
- Param validation via `REQUIRED_PARAMS` map indexed by `MutateAction` — checks for undefined, null, or empty
- Invalid action returns error listing all valid actions from `MUTATE_ACTIONS`
- Missing required params returns error naming the specific missing field
- `handleCreateActive`: added auto-registration of creator in `activeRegistrationsTable` per task spec
- `handleVerifyPhone`: accounts insert uses `as any` (drizzle-orm strict typing incompatible with dynamic fields)
- `handleBindGsz`: restructured search/register flow with proper optional chaining to avoid TS strict null errors
- GSZ handler renamed from `executeBindGsz` → `handleBindGsz` for consistency with other handlers
- `send_sms_code` and `bind_gsz` preserve dynamic imports (`nanoid`, `@alicloud/dysmsapi20170525`)
- Section separator comments match totp.ts convention; inline comments removed

### Function Signature
```ts
export async function executeMutateTool(
  args: MutateArgs,  // discriminated union
  context: ToolContext
): Promise<string>   // Chinese messages, never throws
```

### Verification
- LSP diagnostics: 0 errors on mutate.ts
- All 9 action types dispatch in switch statement
- Error returns: invalid action, missing params, user not found, per-handler errors
- Success returns: Chinese messages matching original mutations.ts notifications

## Wave 6: deepseekClient.ts — Four Tool Architecture (2026-06-19)

### Changed
- `apps/diceshock/src/server/apis/wechat/deepseekClient.ts`

### Key Decisions
- Removed skill tool subsetting and now always sends exactly four tool definitions to DeepSeek: `query`, `mutate`, `load_skill`, `generate_totp`.
- Kept the battle-tested `for (;;)` loop with `MAX_TOOL_CALLS = 10`, final `tool_choice: "none"` call, 15s abort timeout, and `synthesizeFromToolResults` fallback.
- Replaced the old `executeTool` dispatcher with direct executor dispatch for the four new tools.
- Built a `ToolContext` bridge from Hono context: D1/KV/env bindings, optional Aliyun client, `openId`, and resolved `userId`.
- Used an inline slim system prompt because `skills/index.ts` still references pre-refactor skill exports and is scheduled for a later task.

### Verification
- LSP diagnostics: clean (0 errors on `deepseekClient.ts`).

## Wave 6: Context Injection Helper (2026-06-19)

### Created
- `apps/diceshock/src/server/apis/wechat/contextInjection.ts`

### Key Decisions
- Replaces the `get_current_context` tool with a lightweight automatic injection — no tool call needed
- Single DB query resolves userId + nickname via LEFT JOIN on accounts + userInfoTable, preferring `wechat-mp` over `wechat-mp-silent` in JS memory (not an extra query)
- KV read fetches last known location from `wechat:location:{openId}`
- Time uses manual Asia/Shanghai offset calculation (not `Intl.DateTimeFormat.formatToParts`) because formatToParts is unreliable for constructing ISO strings with correct timezone offsets
- Output is a compact multi-line string with `[当前上下文]` header, designed to be prepended to the AI's first user message
- `Env` interface uses `D1Database` from `@cloudflare/workers-types` — no Hono context dependency

### Function Signature
```ts
export async function buildAutoContext(
  env: { DB: D1Database; KV: KVNamespace },
  openId: string
): Promise<string>
```

### Output Format
```
[当前上下文]
时间: 2025-01-15T19:30:00+08:00 (周三)
用户OpenID: oXXXX
用户ID: usr_XXXX (或 "null (未绑定)")
昵称: 张三 (无绑定则省略此行列)
最近位置: lat, lng (无位置数据则省略)

如需更详细信息(会员状态、战绩等)请使用 query 工具查询。
```

### Verification
- LSP diagnostics: 0 errors on contextInjection.ts
- 1 DB query + 1 KV read max (matches spec)

## Task: Rewrite skills/index.ts (2026-06-19)

### Changes
- `apps/diceshock/src/server/apis/wechat/skills/index.ts` — rewritten (102→65 lines)
- Removed: 8 skill file imports, `skillRegistry` map, `registerSkill()`, `getSkillById()`, registration calls
- Kept: `ToolDefinition`, `SkillDefinition` interfaces (deepseekClient.ts + 8 tool files import them)
- Kept: `MAX_TOOL_CALLS = 10`
- Added: `SKILL_DIRECTORY` import from `../tools/loadSkill`
- `BASE_SYSTEM_PROMPT` rewired: skill directory dynamically injected via template literal, full skill content removed
- System prompt condensed: ~1500 chars (was ~1800), preserves all critical JSON output format rules

### Breaking Changes (for later tasks)
- `intentRouter.ts` — imports `skillRegistry` (removed)
- `messageHandler.ts` — imports `getSkillById` (removed)

### Verification
- LSP diagnostics: 0 errors on skills/index.ts
- Fixed copy-paste bug: line 38 bullet format now correctly says `· ` (not duplicated `- `)

## Wave 7: messageHandler.ts — Remove Propose→Confirm KV Flow (2026-06-19)

### Changed
- `apps/diceshock/src/server/apis/wechat/messageHandler.ts`

### Removed imports
- `clearPendingAction`, `getPendingAction`, `isCancellation`, `isConfirmation` from `./pendingAction`
- `executeAction` from `./tools/mutations`
- `detectIntent` from `./intentRouter`
- `getSkillById` from `./skills`
- `getRelatedLinks` from `./linkRegistry`

### Removed logic blocks
- **Pending action check**: KV read of `wechat:pending:{openId}`, confirmation word matching (14 Chinese + 3 English words), cancellation word matching (8 words), `executeAction()` call. Messages like "确认" or "取消" now flow directly to the agent as normal user messages.
- **Intent detection + skill lookup**: `detectIntent()` / `getSkillById()` block with error handler. Agent now determines skill context via its `load_skill` tool instead.
- **Related links injection**: `getRelatedLinks(intent.skillId)` block that appended skill-specific links. These are now surfaced naturally through the agent's tool calls.
- **KV variable**: `const kv = env.KV as KVNamespace` removed from `processMessage` (only used for pending actions).
- **Metadata**: `saveMessage` calls now use `"{}"` instead of `JSON.stringify({skillId, confidence})`.

### Preserved (unchanged)
- `handleTextMessage`: dedup check, "清理上下文" command, rate limiting, `waitUntil` pattern
- `processMessage`: `getRecentHistory`, `searchMemory`, `searchKnowledgeBase`, `recordTokenUsage`, `parseAgentOutput`, empty message fallback, `dispatchMessages`, `addMemory`, error handling with `sendCustomerTextMessage`
- All menu event handlers (`handleMenuEvent`, `buildInventoryReply`, `buildRiichiReply`, `buildActivesReply`)
- `clearAllContext`: still clears conversation history and memories, just no longer clears pending KV action

### Updated
- `chatWithAgent` call: `skill` parameter removed (agent uses `load_skill` tool instead)
- `clearAllContext`: removed `clearPendingAction(kv, openId)` and `const kv = env.KV as KVNamespace`

### Message flow (after)
```
receive → dedup → rate limit → context (history + mem0 + RAG) → agent (4 tools) → parse → respond
```

### Verification
- LSP diagnostics: 0 errors on messageHandler.ts
- File reduced from 396 to 328 lines (-68 lines, -17%)

## Task: Remove old tool files and rewrite tools/index.ts (2026-06-19)

### Deleted (11 files)
- `tools/account.ts`, `tools/active.ts`, `tools/boardgame.ts`, `tools/event.ts`, `tools/mahjong.ts`, `tools/context.ts`, `tools/propose.ts`, `tools/mutations.ts` (8 old tool executors)
- `pendingAction.ts` (KV-based propose→confirm workflow)
- `intentRouter.ts` (skill-based intent routing)
- `__tests__/intentRouter.test.ts` (dead test for deleted module)

### Rewritten
- `tools/index.ts` — 13-line barrel export (from 180 lines with executeTool dispatcher)
  - Re-exports tool definitions: `QUERY_TOOL_DEFINITION` (from graphql/queryValidation), `MUTATE_TOOL_DEFINITION` (from graphql/mutateActions), `LOAD_SKILL_TOOL_DEFINITION`, `TOTP_TOOL_DEFINITION`
  - Re-exports executors: `executeQueryTool`, `executeMutateTool`, `executeLoadSkillTool`, `executeGenerateTotp`

### Remaining in tools/
- `index.ts`, `query.ts`, `mutate.ts`, `loadSkill.ts`, `totp.ts` (5 files, down from 13)

### Stale prompt fix
- `skills/index.ts` line 46-53: Replaced `propose_xxx` / "确认/取消" confirmation flow with direct `mutate` tool instructions

### Verification
- `npx nx run diceshock:build` — SUCCESS (both client + server builds)
- No imports of deleted files found anywhere in wechat/ directory
- Only benign reference: JSDoc comment in `graphql/mutateActions.ts` mentioning `PendingActionType`
- `SkillId` type preserved in `types.ts` (still used by `linkRegistry.ts`)
