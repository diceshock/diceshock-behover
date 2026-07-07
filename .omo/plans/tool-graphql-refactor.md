# WeChat Agent Tool → GraphQL Refactor

## TL;DR

> **Quick Summary**: Consolidate 32 fine-grained WeChat AI agent tools into 4 (query, mutate, load_skill, generate_totp) backed by an in-process drizzle-graphql schema. Simultaneously restructure skills into a directory-mode architecture where the system prompt holds a skill index and the agent loads full skill content on-demand. Remove intent router.
> 
> **Deliverables**:
> - In-process GraphQL schema module (drizzle-graphql, table allowlist, cached)
> - 4 new tool implementations (query with variables + validation, mutate with enum dispatch, load_skill for on-demand skill injection, generate_totp)
> - Restructured skill files (business context + tool usage guidance, registered in directory)
> - Slim system prompt with skill directory (keywords + descriptions per skill)
> - Vitest unit tests for all new tools
> - Removal of: 10 old tool files, intent router, propose→confirm KV flow, skill-based tool subsetting
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (validate schema) → Task 3 (schema module) → Task 5 (query tool) → Task 9 (rewire deepseekClient) → Task 13 (remove old code) → Final Verification

---

## Context

### Original Request
User wants to refactor all agent tools to use GraphQL (query/mutate pattern), consolidating many overlapping tools into fewer, more powerful ones. Agent needs more freedom. Runespark already has a working drizzle-graphql setup to reference.

### Interview Summary
**Key Discussions**:
- Agent writes raw GraphQL query strings (maximum freedom)
- Mutate is enumerated actions with typed params (not raw GraphQL mutations)
- Diceshock gets its own independent GraphQL instance (两清 with Runespark)
- Schema discovery via standard GraphQL introspection (__schema, __type)
- Skills contain business context + tool guidance, NOT API schema docs
- Intent router removed entirely — all 3 tools always available
- Basic context (time/user/nickname) auto-injected; detailed info via query tool
- Testing: Vitest unit tests + live WeChat testing
- Propose→confirm flow removed; mutate executes directly
- SMS/phone/GSZ folded into mutate enum

**Research Findings**:
- Runespark uses `buildSchema(db(env.DB))` from `drizzle-graphql` → full CRUD auto-generation
- Auto-schema provides: findMany, findFirst, insertOne, updateOne, deleteOne per table
- Filter syntax: `{where: {field: {eq/ilike/gt/lt/in: value}}}` + orderBy + limit
- tRPC (~60 procedures) NOT used by agent tools — only frontend. Zero coupling.
- Shared `@lib/db` Drizzle layer with 18+ tables

### Metis Review
**Identified Gaps** (addressed in plan):
- `buildSchema()` table coverage UNVALIDATED → Added spike test as Task 1
- In-process `graphql()` execution UNTESTED in codebase → Included in spike
- Query tool must reject mutations → Guardrail with parse validation
- Need `variables` support to prevent injection → Added as requirement
- `findMany` needs limit cap → Schema-level enforcement
- `query_my_pp_stats` has in-memory computation → Custom computed field added
- Old conversation history has old tool names → System prompt note to agent
- Must preserve: mem0, linkRegistry, status messages, conversation storage, final synthesis call

---

## Work Objectives

### Core Objective
Replace 32 fragmented tools with 4 well-defined tools (query, mutate, load_skill, generate_totp) backed by GraphQL, giving the agent maximum query freedom, safe enumerated mutations, and on-demand skill loading via a directory pattern.

### Concrete Deliverables
- `apps/diceshock/src/server/apis/wechat/graphql/` — new module (schema, execution, allowlist)
- `apps/diceshock/src/server/apis/wechat/tools/query.ts` — GraphQL query tool
- `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` — enumerated mutation tool
- `apps/diceshock/src/server/apis/wechat/tools/loadSkill.ts` — on-demand skill loader tool
- `apps/diceshock/src/server/apis/wechat/tools/totp.ts` — preserved special tool
- `apps/diceshock/src/server/apis/wechat/skills/` — restructured skill files with directory registration
- `apps/diceshock/src/server/apis/wechat/__tests__/` — Vitest test suite

### Definition of Done
- [ ] `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/` → all pass
- [ ] `npx nx run diceshock:deploy` → succeeds
- [ ] 5 regression scenarios work in live WeChat (manual verification)
- [ ] Zero old tool files remain in `tools/` directory (except query.ts, mutate.ts, loadSkill.ts, totp.ts, index.ts)

### Must Have
- Query tool: raw GraphQL string + variables param + mutation rejection + limit enforcement
- Mutate tool: all 10 current action types preserved, typed params, NL description field
- load_skill tool: agent calls with skill name, returns full skill content for that domain
- generate_totp: identical behavior to current
- In-process GraphQL execution (no HTTP round-trip)
- Table allowlist (exclude auth.js internals)
- Schema caching (build once per isolate, not per request)
- Auto-injected context (time, userId, openId, nickname, location)
- Agent can introspect schema via query tool
- System prompt contains skill directory: keyword + one-line description per skill
- Skills contain: store info, services, hours, address, behavioral rules, tool usage examples
- Vitest tests for: schema generation, query validation, mutate dispatch, regression scenarios

### Must NOT Have (Guardrails)
- No custom resolvers EXCEPT computed fields for PP stats (necessary for parity)
- No tRPC modifications
- No mem0 changes
- No conversation history migration
- No DELETE operations exposed via query tool
- No HTTP-exposed GraphQL endpoint (agent-only, in-process)
- No frontend changes
- No Runespark changes
- No new capabilities beyond current 32-tool parity
- No AI personality/behavioral changes (structure only, same content)
- Agent cannot query: `accounts`, `sessions`, `verificationTokens`, `authenticators` tables

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** for unit tests. Live WeChat testing is separate manual verification.

### Test Decision
- **Infrastructure exists**: YES (Vitest already configured)
- **Automated tests**: YES (tests-after — implement then test)
- **Framework**: Vitest (already in use)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **GraphQL/Tools**: Use Bash (vitest) — run test suites, assert pass
- **Deployment**: Use Bash (nx deploy) — assert clean deploy
- **Live regression**: Manual WeChat testing by user (documented scenarios)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately, all parallel):
├── Task 1: Validate drizzle-graphql table coverage (spike test) [quick]
├── Task 2: Define mutate action enum + typed params interface [quick]
├── Task 3: GraphQL schema module (allowlist, build, cache, execute) [deep]
└── Task 4: Define query tool interface + validation logic [quick]

Wave 2 (Core tools — after Wave 1):
├── Task 5: Implement query tool (depends: 3, 4) [unspecified-high]
├── Task 6: Implement mutate tool (depends: 2, 3) [unspecified-high]
├── Task 7: Port generate_totp (depends: none from Wave 1) [quick]
├── Task 8: Implement load_skill tool + skill directory (depends: 9) [quick]
└── Task 9: Restructure skills — business context + tool guidance (depends: 2, 4) [writing]

Wave 3 (Integration — after Wave 2):
├── Task 10: Rewire deepseekClient (depends: 5, 6, 7, 8, 9) [deep]
├── Task 11: Update messageHandler — remove confirm flow (depends: 6, 10) [unspecified-high]
├── Task 12: Update context injection — auto basic (depends: 5, 9) [quick]
├── Task 13: Slim system prompt (depends: 8, 9) [quick]
└── Task 14: Remove old code — tools/, intent router, propose flow (depends: 10, 11, 12, 13) [quick]

Wave 4 (Testing — after Wave 3):
├── Task 15: Vitest — GraphQL schema + query tool tests (depends: 5, 14) [unspecified-high]
├── Task 16: Vitest — mutate tool tests (depends: 6, 14) [unspecified-high]
├── Task 17: Vitest — end-to-end regression scenarios (depends: 10, 14) [deep]
└── Task 18: Deploy + live verification (depends: 15, 16, 17) [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 3 |
| 2 | — | 6, 9 |
| 3 | 1 | 5, 6 |
| 4 | — | 5, 9 |
| 5 | 3, 4 | 10, 15 |
| 6 | 2, 3 | 10, 11, 16 |
| 7 | — | 10 |
| 8 | 9 | 10, 13 |
| 9 | 2, 4 | 8, 10, 12, 13 |
| 10 | 5, 6, 7, 8, 9 | 11, 14, 17 |
| 11 | 6, 10 | 14 |
| 12 | 5, 9 | 14 |
| 13 | 8, 9 | 14 |
| 14 | 10, 11, 12, 13 | 15, 16, 17 |
| 15 | 5, 14 | 18 |
| 16 | 6, 14 | 18 |
| 17 | 10, 14 | 18 |
| 18 | 15, 16, 17 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1 → `quick`, T2 → `quick`, T3 → `deep`, T4 → `quick`
- **Wave 2**: 4 tasks — T5 → `unspecified-high`, T6 → `unspecified-high`, T7 → `quick`, T8 → `writing`
- **Wave 3**: 5 tasks — T9 → `deep`, T10 → `unspecified-high`, T11 → `quick`, T12 → `quick`, T13 → `quick`
- **Wave 4**: 4 tasks — T14 → `unspecified-high`, T15 → `unspecified-high`, T16 → `deep`, T17 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Validate drizzle-graphql Table Coverage (Spike Test)

  **What to do**:
  - Create a temporary test file that imports `buildSchema` from `drizzle-graphql` and `db` from `@lib/db`
  - Call `buildSchema(db(env.DB))` with a mock D1 binding (use miniflare or `@cloudflare/vitest-pool-workers`)
  - Inspect the returned schema: print all type names, verify these tables are present:
    - `activesTable`, `activeRegistrationsTable`, `boardGamesTable`, `eventsTable`
    - `userInfoTable`, `usersTable`, `userMembershipPlansTable`, `userBadgesTable`
    - `mahjongMatchesTable`, `leaderboardSnapshotsTable`, `tablesTable`, `tableOccupancyTable`
    - `userBusinessCardTable`, `pricingSnapshotsTable`
  - Verify each table has: `findMany`, `findFirst` queries and `insertOne`, `updateOne` mutations
  - Test in-process execution: `import { graphql } from 'graphql'; await graphql({schema, source: '{ __typename }'})`
  - Document which tables are NOT auto-exposed (if any) → these need manual resolvers or schema workarounds

  **Must NOT do**:
  - Don't create a production file — this is a spike test only
  - Don't add custom resolvers yet
  - Don't modify any existing code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 3 (schema module depends on knowing which tables work)
  - **Blocked By**: None

  **References**:
  - `apps/runespark/src/server/middlewares/graphql.ts` — existing buildSchema usage pattern, shows how Runespark merges drizzle-graphql with Pothos
  - `libs/db/src/schema.ts` — complete Drizzle schema with all table definitions and relations
  - `libs/db/src/index.ts` — db() factory function pattern
  - `node_modules/drizzle-graphql/` — check package exports for `buildSchema` signature

  **Acceptance Criteria**:
  - [ ] Test file runs without errors
  - [ ] Output documents exactly which tables are/aren't exposed
  - [ ] `graphql({schema, source: '{ __typename }'})` returns `{data: {__typename: "Query"}}`

  **QA Scenarios**:
  ```
  Scenario: buildSchema exposes all required tables
    Tool: Bash (vitest)
    Preconditions: vitest configured, @lib/db importable
    Steps:
      1. Run `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/graphql-spike.test.ts`
      2. Assert test passes — output contains all 14 required table type names
      3. Assert in-process graphql() execution returns valid response
    Expected Result: All 14 tables present in schema, in-process execution works
    Failure Indicators: Missing table types in schema output, graphql() throws error
    Evidence: .sisyphus/evidence/task-1-schema-spike.txt
  ```

  **Commit**: NO (spike test, may be deleted after validation)

- [x] 2. Define Mutate Action Enum + Typed Params Interface

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/graphql/mutateActions.ts`
  - Define a TypeScript enum/union of all mutation action types:
    ```
    type MutateAction = 
      | 'create_active' | 'update_active' | 'join_active' | 'leave_active' | 'watch_active'
      | 'send_sms_code' | 'verify_phone' | 'bind_gsz' | 'upsert_business_card'
    ```
  - For each action, define typed params interface (extract from current `propose.ts` + `mutations.ts`):
    - `create_active`: `{title, gameId?, date, startTime, endTime?, maxPlayers, location?, description?}`
    - `join_active`: `{activeId}`
    - `watch_active`: `{activeId}`
    - `update_active`: `{activeId, fields: Partial<ActiveFields>}`
    - `leave_active`: `{activeId}`
    - `send_sms_code`: `{phone}`
    - `verify_phone`: `{phone, code}`
    - `bind_gsz`: `{gszId}`
    - `upsert_business_card`: `{nickname?, avatar?, bio?, wechatId?, phone?, tags?}`
  - Define the OpenAI function-calling tool definition for `mutate`:
    ```
    {name: "mutate", parameters: {action: enum, params: object, description: string}}
    ```
  - Export both the types AND the tool definition

  **Must NOT do**:
  - Don't implement the action handlers yet (that's Task 6)
  - Don't create the tool executor yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 6, 8
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools/propose.ts` — current propose tool definitions with param schemas
  - `apps/diceshock/src/server/apis/wechat/tools/mutations.ts` — current mutation executor with all action type handling
  - `apps/diceshock/src/server/apis/wechat/tools/active.ts` — active-related tool definitions for param reference

  **Acceptance Criteria**:
  - [ ] File compiles without TypeScript errors
  - [ ] All 9 action types defined with typed params
  - [ ] OpenAI tool definition exported and valid JSON schema
  - [ ] Params match current tool parameter signatures exactly

  **QA Scenarios**:
  ```
  Scenario: Type definitions compile and are importable
    Tool: Bash (tsc)
    Preconditions: File created at correct path
    Steps:
      1. Run `npx tsc --noEmit apps/diceshock/src/server/apis/wechat/graphql/mutateActions.ts`
      2. Import and log the tool definition JSON
    Expected Result: Zero type errors, valid JSON schema output
    Failure Indicators: TypeScript errors, missing action types
    Evidence: .sisyphus/evidence/task-2-mutate-types.txt
  ```

  **Commit**: YES (groups with Task 3, 4)
  - Message: `feat(wechat): define GraphQL module types and interfaces`
  - Files: `graphql/mutateActions.ts`

- [x] 3. GraphQL Schema Module (Allowlist, Build, Cache, Execute)

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/graphql/index.ts`
  - Import `buildSchema` from `drizzle-graphql` and `db` from `@lib/db`
  - Build schema with the full DB (drizzle-graphql generates from Drizzle schema automatically)
  - Implement table allowlist as a post-processing step: wrap resolvers to reject queries/mutations on blocked tables (`accounts`, `sessions`, `verificationTokens`, `authenticators`)
  - Cache the built schema at module level (Workers reuse isolates — schema is static, only DB binding changes)
  - Export an `executeGraphQL(source: string, variables?: Record<string, unknown>, context?: GraphQLContext)` helper that:
    1. Uses the cached schema
    2. Calls `graphql()` from `graphql-js` in-process
    3. Passes context (which includes `db` instance, `userId`, `openId`)
    4. Enforces `limit` cap: if any `findMany` query lacks a `limit` argument or exceeds 50, inject/cap it
    5. Returns `{data, errors}` — format errors as human-readable strings for the agent
  - Define `GraphQLContext` type: `{db: DrizzleDB, userId: string | null, openId: string}`
  - Handle the case where buildSchema doesn't expose certain tables (from Task 1 findings): document workarounds

  **Must NOT do**:
  - No HTTP endpoint
  - No custom resolvers (except limit enforcement middleware)
  - No Pothos types
  - No subscription support

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (but depends on Task 1 results for table list confirmation)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 1 (needs validation results)

  **References**:
  - `apps/runespark/src/server/middlewares/graphql.ts:1-45` — buildSchema usage, schema merging pattern
  - `libs/db/src/schema.ts` — all table exports (import by name for allowlist)
  - `libs/db/src/index.ts` — db() factory, how to get a Drizzle instance
  - `node_modules/graphql/index.js` — `graphql()` function signature: `graphql({schema, source, variableValues, contextValue})`
  - Task 1 output — which tables are actually exposed

  **Acceptance Criteria**:
  - [ ] `executeGraphQL('{ __typename }', {}, ctx)` returns `{data: {__typename: "Query"}, errors: undefined}`
  - [ ] `executeGraphQL('mutation { ... }', ...)` executes successfully (mutation execution is allowed at schema level — query tool will reject at tool level)
  - [ ] Queries against blocked tables return error message (not data)
  - [ ] `findMany` without limit returns max 50 results
  - [ ] Schema is built once (module-level cache), not per-call

  **QA Scenarios**:
  ```
  Scenario: In-process execution returns valid data
    Tool: Bash (vitest)
    Preconditions: Schema module created, mock D1 available
    Steps:
      1. Import executeGraphQL from graphql module
      2. Call with introspection query: `{ __schema { queryType { name } } }`
      3. Assert response.data.__schema.queryType.name === "Query"
      4. Call with a table query: `{ activesTable(limit: 5) { id } }` (may need correct field name from Task 1)
    Expected Result: Valid JSON responses without errors
    Failure Indicators: graphql() throws, schema missing expected types
    Evidence: .sisyphus/evidence/task-3-schema-module.txt

  Scenario: Blocked table query returns error
    Tool: Bash (vitest)
    Preconditions: Schema module with allowlist active
    Steps:
      1. Call executeGraphQL with query against `accounts` table
      2. Assert response contains error message mentioning "not accessible" or similar
    Expected Result: Error returned, no data for blocked table
    Failure Indicators: Data returned for blocked table
    Evidence: .sisyphus/evidence/task-3-blocked-table.txt
  ```

  **Commit**: YES (groups with Task 2, 4)
  - Message: `feat(wechat): add GraphQL schema module with in-process execution`
  - Files: `graphql/index.ts`

- [x] 4. Define Query Tool Interface + Validation Logic

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/graphql/queryValidation.ts`
  - Implement `validateQueryString(source: string): {valid: boolean, error?: string}`:
    1. Parse the GraphQL string with `parse()` from `graphql-js`
    2. Reject if operation type is `mutation` or `subscription` — return error: "Use the mutate tool for write operations"
    3. Reject if query depth exceeds 3 levels (prevent recursive relation traversal)
    4. Accept `query` operations and schema introspection (`__schema`, `__type`)
  - Define the OpenAI function-calling tool definition for `query`:
    ```
    {
      name: "query",
      description: "Execute a GraphQL query against the database. Supports introspection (__schema, __type) for schema discovery. Use variables for dynamic values.",
      parameters: {
        type: "object",
        properties: {
          graphql: {type: "string", description: "GraphQL query string"},
          variables: {type: "object", description: "Query variables (optional)"}
        },
        required: ["graphql"]
      }
    }
    ```
  - Export both `validateQueryString` and the tool definition

  **Must NOT do**:
  - Don't implement the full tool executor (that's Task 5)
  - Don't add business logic or response formatting

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 5, 8
  - **Blocked By**: None

  **References**:
  - `node_modules/graphql/language/parser.js` — `parse()` function
  - `node_modules/graphql/language/ast.js` — `OperationDefinitionNode` type with `operation` field
  - Current tool definitions in `apps/diceshock/src/server/apis/wechat/tools/boardgame.ts:1-30` — OpenAI tool definition format

  **Acceptance Criteria**:
  - [ ] `validateQueryString('{ activesTable { id } }')` → `{valid: true}`
  - [ ] `validateQueryString('mutation { insert(...) { id } }')` → `{valid: false, error: "..."}`
  - [ ] `validateQueryString('{ a { b { c { d { e } } } } }')` → `{valid: false, error: "depth exceeded"}`
  - [ ] `validateQueryString('{ __schema { types { name } } }')` → `{valid: true}`
  - [ ] Tool definition JSON is valid OpenAI function schema

  **QA Scenarios**:
  ```
  Scenario: Query validation accepts valid queries and rejects mutations
    Tool: Bash (vitest)
    Preconditions: queryValidation.ts created
    Steps:
      1. Test valid query → assert valid: true
      2. Test mutation string → assert valid: false with descriptive error
      3. Test deep nested query (4+ levels) → assert valid: false
      4. Test introspection query → assert valid: true
      5. Test malformed GraphQL syntax → assert valid: false with parse error
    Expected Result: All 5 assertions pass
    Failure Indicators: Mutations accepted, valid queries rejected
    Evidence: .sisyphus/evidence/task-4-query-validation.txt
  ```

  **Commit**: YES (groups with Tasks 2, 3)
  - Message: `feat(wechat): define GraphQL module types and interfaces`
  - Files: `graphql/queryValidation.ts`

- [x] 5. Implement Query Tool

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/tools/query.ts`
  - Implement `executeQueryTool(args: {graphql: string, variables?: object}, context: ToolContext): Promise<string>`:
    1. Call `validateQueryString(args.graphql)` — if invalid, return error message (not throw)
    2. Call `executeGraphQL(args.graphql, args.variables, gqlContext)` from the schema module
    3. If GraphQL returns errors, format them as readable Chinese text for the agent
    4. If successful, return `JSON.stringify(result.data)` (the agent reads the raw response)
    5. Add response size check: if > 4000 chars, truncate with "[结果已截断, 共N条记录]"
  - Handle the `ToolContext` → `GraphQLContext` mapping (extract db, userId, openId from Hono context)
  - Generate status message for WeChat: "正在查询数据..." (generic, replaces per-tool messages)

  **Must NOT do**:
  - Don't format/prettify results (agent handles presentation)
  - Don't add business logic beyond validation + execution + truncation
  - Don't cache query results

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6, 7, 8 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 14
  - **Blocked By**: Tasks 3, 4

  **References**:
  - `apps/diceshock/src/server/apis/wechat/graphql/index.ts` (Task 3) — executeGraphQL function
  - `apps/diceshock/src/server/apis/wechat/graphql/queryValidation.ts` (Task 4) — validateQueryString
  - `apps/diceshock/src/server/apis/wechat/tools/boardgame.ts` — current tool execution pattern (args, context, return string)
  - `apps/diceshock/src/server/apis/wechat/tools/index.ts:executeTool()` — how tools are dispatched (will be rewritten in Task 9)

  **Acceptance Criteria**:
  - [ ] Valid query returns JSON data string
  - [ ] Mutation string returns error message (not throws)
  - [ ] GraphQL errors return Chinese-readable error message
  - [ ] Response > 4000 chars is truncated with count
  - [ ] Introspection queries work and return schema info
  - [ ] Variables are passed through correctly (e.g., `$name` in query + `{name: "三国杀"}` in variables)

  **QA Scenarios**:
  ```
  Scenario: Query tool executes valid GraphQL and returns data
    Tool: Bash (vitest)
    Preconditions: Schema module + query validation + query tool all created, mock D1 with test data
    Steps:
      1. Call executeQueryTool({graphql: '{ __schema { queryType { name } } }'}, ctx)
      2. Assert result is valid JSON containing schema info
      3. Call with table query + variables: `query($limit: Int) { boardGamesTable(limit: $limit) { id schName } }` + {limit: 5}
      4. Assert result contains board game data array
    Expected Result: Both queries return valid JSON data
    Failure Indicators: Errors thrown, empty results, variables not bound
    Evidence: .sisyphus/evidence/task-5-query-tool.txt

  Scenario: Query tool rejects mutations gracefully
    Tool: Bash (vitest)
    Steps:
      1. Call executeQueryTool({graphql: 'mutation { insertIntoActivesTable(...) { id } }'}, ctx)
      2. Assert result is an error message string (not JSON data)
      3. Assert error mentions "mutate tool" or equivalent guidance
    Expected Result: Error message returned, no data mutation occurred
    Failure Indicators: Mutation executed, error thrown instead of returned
    Evidence: .sisyphus/evidence/task-5-query-rejects-mutation.txt
  ```

  **Commit**: YES (groups with Task 6, 7)
  - Message: `feat(wechat): implement query and mutate tool executors`
  - Files: `tools/query.ts`

- [x] 6. Implement Mutate Tool

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`
  - Import action types and params from `graphql/mutateActions.ts` (Task 2)
  - Implement `executeMutateTool(args: {action: string, params: object, description: string}, context: ToolContext): Promise<string>`:
    1. Validate `action` against the enum — if invalid, return error with list of valid actions
    2. Validate `params` against the typed interface for that action — if missing required fields, return error
    3. Dispatch to action handler (port logic from current `mutations.ts`):
       - `create_active`: INSERT into activesTable + auto-register creator
       - `join_active` / `watch_active`: INSERT into activeRegistrationsTable
       - `update_active`: UPDATE activesTable WHERE id = params.activeId AND creatorId = userId
       - `leave_active`: DELETE from activeRegistrationsTable (+ cascade delete active if creator and no other participants)
       - `send_sms_code`: Generate code → store in KV → call Aliyun SMS API
       - `verify_phone`: Check KV code → UPDATE userInfo phone field + CREATE account link
       - `bind_gsz`: Call GSZ API → INSERT into mahjongRegistrationsTable
       - `upsert_business_card`: UPSERT into userBusinessCardTable
    4. Return success message with created/updated entity summary (Chinese)
    5. On error: return Chinese error message (not throw)
  - Port ALL logic from `tools/mutations.ts` — this is the single source of truth for write operations
  - `description` param is stored in conversation history (for user context) but NOT parsed by code

  **Must NOT do**:
  - Don't add new mutation types beyond the current 9
  - Don't implement batch mutations yet (future enhancement)
  - Don't add a dryRun/preview mode
  - Don't add propose→confirm flow

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5, 7, 8 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10, 15
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools/mutations.ts` — ALL action handler logic to port (this is the primary reference)
  - `apps/diceshock/src/server/apis/wechat/tools/propose.ts` — param validation patterns and WeChat notification text
  - `apps/diceshock/src/server/apis/wechat/graphql/mutateActions.ts` (Task 2) — type definitions
  - `apps/diceshock/src/server/apis/wechat/wechatApi.ts` — sendText/sendNews for success notifications

  **Acceptance Criteria**:
  - [ ] All 9 action types dispatch correctly
  - [ ] Invalid action returns error with valid action list
  - [ ] Missing required params returns specific error (which param is missing)
  - [ ] `create_active` creates DB record and auto-registers creator
  - [ ] `leave_active` cascades delete if creator leaves empty active
  - [ ] `send_sms_code` calls external SMS API and stores code in KV
  - [ ] Each action returns Chinese success message with entity summary

  **QA Scenarios**:
  ```
  Scenario: Create active mutation produces correct DB state
    Tool: Bash (vitest)
    Preconditions: Mock D1, mock KV, userId in context
    Steps:
      1. Call executeMutateTool({action: "create_active", params: {title: "测试活动", date: "2025-01-15", startTime: "19:00", maxPlayers: 4}, description: "创建测试活动"}, ctx)
      2. Assert D1 received INSERT into activesTable with correct fields
      3. Assert D1 received INSERT into activeRegistrationsTable (auto-register creator)
      4. Assert return message contains "活动已创建" or similar
    Expected Result: Two DB inserts, Chinese success message
    Failure Indicators: Missing auto-registration, wrong table, error thrown
    Evidence: .sisyphus/evidence/task-6-mutate-create.txt

  Scenario: Invalid action enum returns helpful error
    Tool: Bash (vitest)
    Steps:
      1. Call executeMutateTool({action: "delete_user", params: {}, description: ""}, ctx)
      2. Assert result contains error message
      3. Assert error lists all 9 valid action types
    Expected Result: Error with valid action list
    Failure Indicators: Error thrown instead of returned, missing action list
    Evidence: .sisyphus/evidence/task-6-mutate-invalid.txt
  ```

  **Commit**: YES (groups with Task 5, 7)
  - Message: `feat(wechat): implement query and mutate tool executors`
  - Files: `tools/mutate.ts`

- [x] 7. Port generate_totp Tool

  **What to do**:
  - Keep `apps/diceshock/src/server/apis/wechat/tools/totp.ts` largely as-is
  - Update the tool definition to match new tool format conventions (consistent with query/mutate)
  - Ensure it works independently without the old `executeTool` dispatcher
  - Export both the tool definition and the executor function directly

  **Must NOT do**:
  - Don't change TOTP logic
  - Don't rename the tool (keep `generate_totp`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 8 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools/totp.ts` — current implementation (preserve entirely)

  **Acceptance Criteria**:
  - [ ] Tool definition exported in same format as query/mutate tools
  - [ ] Executor function works with same ToolContext interface
  - [ ] TOTP generation produces valid OTP URL + QR code data

  **QA Scenarios**:
  ```
  Scenario: TOTP tool generates valid verification data
    Tool: Bash (vitest)
    Preconditions: Mock KV, mock env with TOTP secrets
    Steps:
      1. Call generateTotp executor with context containing valid userId
      2. Assert result contains OTP URL or QR code data
      3. Assert KV received a write (storing the secret)
    Expected Result: Valid TOTP data returned, KV updated
    Evidence: .sisyphus/evidence/task-7-totp.txt
  ```

  **Commit**: YES (groups with Tasks 5, 6)
  - Message: `feat(wechat): implement query and mutate tool executors`
  - Files: `tools/totp.ts`

- [x] 8. Implement load_skill Tool + Skill Directory

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/tools/loadSkill.ts`
  - Define a skill directory (registry) with entries per skill:
    ```
    {id: "boardgame", keywords: ["桌游", "游戏", "库存", "搜索"], description: "桌游库存查询、推荐、详情"}
    {id: "active", keywords: ["约局", "活动", "参加", "创建"], description: "约局创建、参加、查看"}
    {id: "mahjong", keywords: ["日麻", "战绩", "PP", "段位", "排行"], description: "日麻数据、PP排行、战绩查询"}
    {id: "account", keywords: ["会员", "手机", "绑定", "名片"], description: "会员状态、手机绑定、名片管理"}
    {id: "event", keywords: ["赛事", "比赛", "活动公告"], description: "赛事活动公告查询"}
    {id: "general", keywords: ["营业", "地址", "价格", "服务"], description: "店铺信息、营业时间、服务价格"}
    {id: "trpg", keywords: ["TRPG", "跑团", "DM", "角色扮演"], description: "TRPG跑团服务"}
    {id: "clocktower", keywords: ["血染", "钟楼", "clocktower"], description: "血染钟楼服务"}
    ```
  - The skill directory is exported and included in the system prompt (see Task 12)
  - Implement `executeLoadSkillTool(args: {skill: string}, context: ToolContext): Promise<string>`:
    1. Validate `skill` against known skill IDs — if invalid, return error listing available skills
    2. Load the full content of the requested skill file (already in memory as imports)
    3. Return the skill content string (agent receives it as tool result, adding to its context)
  - The system prompt tells the agent: "查看技能目录, 在回答前先加载相关技能获取完整业务知识和工具使用示例"
  - Define the OpenAI function-calling tool definition:
    ```
    {name: "load_skill", description: "加载指定技能的完整业务知识. 系统提示词中有技能目录.", parameters: {skill: {type: "string", enum: [...skill ids]}}}
    ```

  **Must NOT do**:
  - Don't load multiple skills per call (agent can call multiple times)
  - Don't auto-load skills (agent decides based on directory)
  - Don't include full skill content in tool definition description

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 12
  - **Blocked By**: Task 9's skill content (Task 9_skills below)

  **References**:
  - `apps/diceshock/src/server/apis/wechat/skills/` — current skill files (content to be served by this tool)
  - `apps/diceshock/src/server/apis/wechat/skills/index.ts` — current skill registration pattern (replace with directory)

  **Acceptance Criteria**:
  - [ ] Skill directory exported with all 8 skills (id, keywords, description)
  - [ ] `executeLoadSkillTool({skill: "boardgame"}, ctx)` returns full boardgame skill content
  - [ ] Invalid skill ID returns error with list of valid IDs
  - [ ] Tool definition has enum constraint on skill parameter
  - [ ] Each skill content is < 2000 chars (concise but complete)

  **QA Scenarios**:
  ```
  Scenario: load_skill returns correct content
    Tool: Bash (vitest)
    Steps:
      1. Call executeLoadSkillTool({skill: "boardgame"}, ctx)
      2. Assert result contains "桌游" and mentions query tool usage
      3. Call executeLoadSkillTool({skill: "invalid_skill"}, ctx)
      4. Assert error message lists all 8 valid skill IDs
    Expected Result: Valid skill returns content, invalid returns helpful error
    Evidence: .sisyphus/evidence/task-8-load-skill.txt
  ```

  **Commit**: YES (groups with Task 9_skills)
  - Message: `feat(wechat): implement load_skill tool with skill directory`
  - Files: `tools/loadSkill.ts`

- [x] 9. Restructure Skills — Business Context + Tool Guidance

  **What to do**:
  - Rewrite ALL skill files in `apps/diceshock/src/server/apis/wechat/skills/`:
    - `general.ts` → Store info, address, hours, services, general policies, pricing overview
    - `boardgame.ts` → Board game library description, how to use query tool for games, example queries
    - `active.ts` → What 约局 is, how to create/join/leave using mutate tool, activity rules
    - `mahjong.ts` → Mahjong services, PP system explanation, how to query stats
    - `event.ts` → What events are, how to query upcoming events
    - `account.ts` → Membership tiers, how to query membership status, phone binding flow
    - `trpg.ts` → TRPG services description (no tools, just info)
    - `clocktower.ts` → Blood on the Clocktower service info (no tools, just info)
  - Each skill file should contain:
    1. **Business context**: What this domain is about in our store (Chinese)
    2. **Tool usage guidance**: How to use query/mutate for this domain (example GraphQL queries, mutate actions)
    3. **Behavioral rules**: Domain-specific response guidelines
  - Skills should NOT contain:
    - GraphQL schema field definitions
    - Filter syntax documentation
    - Complete API references (agent discovers via introspection)
  - Remove tool arrays from skills (no more `BOARDGAME_TOOLS` exports) — all 3 tools always available
  - Remove `SkillId` type and skill registration system
  - Keep skill content in Chinese (matching current)

  **Must NOT do**:
  - Don't change AI personality/tone
  - Don't add new behavioral rules
  - Don't include full schema documentation in skills
  - Don't remove any business information currently in skills

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 11, 12
  - **Blocked By**: Tasks 2, 4 (needs to know tool definitions to write usage guidance)

  **References**:
  - `apps/diceshock/src/server/apis/wechat/skills/` — ALL current skill files (preserve business content, restructure format)
  - `apps/diceshock/src/server/apis/wechat/skills/index.ts` — current skill registration, BASE_SYSTEM_PROMPT, MAX_TOOL_CALLS
  - Task 2 output — mutate action enum names (for tool usage examples)
  - Task 4 output — query tool definition (for usage examples)

  **Acceptance Criteria**:
  - [ ] All 8 skill files exist with business context + tool guidance
  - [ ] No skill file contains GraphQL field names or filter syntax
  - [ ] No skill file exports tool arrays
  - [ ] All business information from old skills preserved (nothing lost)
  - [ ] Tool usage examples use correct tool names (query, mutate, generate_totp)
  - [ ] Content is in Chinese

  **QA Scenarios**:
  ```
  Scenario: Skills contain correct structure
    Tool: Bash (grep + manual review)
    Steps:
      1. Grep all skill files for "findMany" or "findFirst" → assert 0 matches (no schema in skills)
      2. Grep for "BOARDGAME_TOOLS" or "ACTIVE_TOOLS" → assert 0 matches (no tool arrays)
      3. Grep for "query" and "mutate" → assert matches in tool guidance sections
      4. Verify each skill mentions store-specific business info (address, hours, etc. where relevant)
    Expected Result: Structure validated, no API docs in skills
    Evidence: .sisyphus/evidence/task-8-skills-structure.txt
  ```

  **Commit**: YES (groups with Task 9)
  - Message: `refactor(wechat): restructure skills for GraphQL architecture`
  - Files: `skills/*.ts`

- [x] 9. Rewire deepseekClient to 3-Tool Architecture

  **What to do**:
  - Rewrite `apps/diceshock/src/server/apis/wechat/deepseekClient.ts`:
    1. Remove skill-dependent tool injection — always provide exactly 3 tool definitions: query, mutate, generate_totp
    2. Remove intent router call — no longer needed
    3. Keep the tool loop structure: `for(;;)` with `MAX_TOOL_CALLS` budget
    4. Update tool dispatch: match tool name → call executeQueryTool / executeMutateTool / generateTotp
    5. Keep the final synthesis call with `tool_choice: "none"` and `AbortSignal.timeout(15s)`
    6. Keep the `synthesizeFromToolResults` fallback
    7. Keep status message sending during tool execution (generic: "正在查询..." / "正在执行操作...")
    8. Update system prompt construction: slim base prompt + selected skill content (based on what?)
  - **Skill selection strategy** (replacing intent router):
    - Option A: Include ALL skills in system prompt (may be too many tokens)
    - Option B: Simple keyword match to select 1-2 relevant skills (lighter than full intent router)
    - Option C: Always include `general` + let agent introspect for domain-specific knowledge
    - **Decision needed from user** — flag as [DECISION NEEDED] in plan
  - Preserve: mem0 memory injection, conversation history loading, linkRegistry

  **Must NOT do**:
  - Don't change the DeepSeek API call pattern (model, gateway URL, headers)
  - Don't modify mem0 integration
  - Don't change conversation history loading
  - Don't modify the response parsing (parseAgentOutput)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (critical path, depends on all Wave 2 outputs)
  - **Parallel Group**: Wave 3 (sequential dependency)
  - **Blocks**: Tasks 10, 13, 16
  - **Blocked By**: Tasks 5, 6, 7, 8

  **References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts` — current implementation (rewrite, preserve patterns)
  - `apps/diceshock/src/server/apis/wechat/tools/query.ts` (Task 5) — query tool executor
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` (Task 6) — mutate tool executor
  - `apps/diceshock/src/server/apis/wechat/tools/totp.ts` (Task 7) — totp tool executor
  - `apps/diceshock/src/server/apis/wechat/skills/index.ts` (Task 8) — restructured skills

  **Acceptance Criteria**:
  - [ ] Only 3 tools passed to DeepSeek API
  - [ ] Tool dispatch correctly routes to query/mutate/totp executors
  - [ ] Tool loop budget (MAX_TOOL_CALLS=10) enforced
  - [ ] Final synthesis call preserved with timeout + fallback
  - [ ] mem0 memory still injected into messages
  - [ ] Conversation history still loaded
  - [ ] No import of intent router or old tool definitions

  **QA Scenarios**:
  ```
  Scenario: deepseekClient dispatches tools correctly
    Tool: Bash (vitest)
    Preconditions: Mock DeepSeek API returning tool_calls, mock D1/KV
    Steps:
      1. Mock API response with tool_call: {name: "query", arguments: {graphql: "{ __typename }"}}
      2. Assert executeQueryTool was called with correct args
      3. Mock API response with tool_call: {name: "mutate", arguments: {action: "create_active", ...}}
      4. Assert executeMutateTool was called
      5. Mock API response with no tool_calls (text response)
      6. Assert loop exits and returns text
    Expected Result: Correct dispatch for all 3 tool types + clean exit on text
    Evidence: .sisyphus/evidence/task-9-deepseek-rewire.txt

  Scenario: Tool budget exhaustion triggers synthesis
    Tool: Bash (vitest)
    Steps:
      1. Mock API to always return tool_calls (10+ times)
      2. Assert loop breaks at MAX_TOOL_CALLS
      3. Assert final synthesis call made with tool_choice: "none"
    Expected Result: Loop terminates, synthesis call made
    Evidence: .sisyphus/evidence/task-9-budget-exhaustion.txt
  ```

  **Commit**: YES
  - Message: `refactor(wechat): rewire deepseekClient to 3-tool architecture`
  - Files: `deepseekClient.ts`

- [x] 10. Update messageHandler — Remove Confirm Flow + Old Dispatch

  **What to do**:
  - Edit `apps/diceshock/src/server/apis/wechat/messageHandler.ts`:
    1. Remove the `checkPendingAction()` call at the start of message handling
    2. Remove confirmation/cancellation word detection (14 confirm words, 8 cancel words)
    3. Remove `PendingAction` KV read/write logic
    4. Remove `executePendingAction()` dispatch
    5. Keep: dedup check, rate limiting, conversation context loading, mem0 search, agent call, response dispatch
    6. Keep: `parseAgentOutput` call and message sending loop
    7. Keep: empty message fallback guarantee
  - Delete `apps/diceshock/src/server/apis/wechat/pendingAction.ts` (or mark for deletion in Task 13)

  **Must NOT do**:
  - Don't change the message receiving/parsing logic
  - Don't change the response sending logic (wechatApi calls)
  - Don't change dedup or rate limiting
  - Don't modify parseAgentOutput

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 12 in Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 6, 9

  **References**:
  - `apps/diceshock/src/server/apis/wechat/messageHandler.ts` — current handler with confirm flow
  - `apps/diceshock/src/server/apis/wechat/pendingAction.ts` — KV state machine to remove

  **Acceptance Criteria**:
  - [ ] No `PendingAction` or `checkPendingAction` references remain
  - [ ] No confirmation word arrays remain
  - [ ] Message flow: receive → dedup → rate limit → context → agent → respond
  - [ ] File compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Messages route directly to agent without confirm check
    Tool: Bash (vitest)
    Steps:
      1. Send "确认" (was a confirm word) to messageHandler
      2. Assert it goes to the agent (not to pending action executor)
      3. Assert no KV read for `wechat:pending:*`
    Expected Result: "确认" treated as normal message
    Evidence: .sisyphus/evidence/task-10-no-confirm.txt
  ```

  **Commit**: YES (groups with Task 9)
  - Message: `refactor(wechat): rewire deepseekClient to 3-tool architecture`
  - Files: `messageHandler.ts`

- [x] 11. Update Context Injection — Auto Basic + Query Guidance

  **What to do**:
  - In the message construction (likely in `deepseekClient.ts` or a new `context.ts` helper):
    1. Auto-inject basic context into the first user message or system prompt:
       - Current time (ISO + Chinese day-of-week)
       - User's openId
       - User's userId (if linked)
       - User's nickname (from userInfo table)
       - Last known location (from KV, if available)
    2. Remove the `get_current_context` tool entirely
    3. Add a note in system prompt: "如需更详细的用户信息（会员状态、战绩等），请使用 query 工具查询"
  - Port the context-fetching logic from current `tools/context.ts` into the auto-injection function

  **Must NOT do**:
  - Don't add new context fields beyond what current `get_current_context` provides
  - Don't make expensive DB queries for auto-injection (keep it fast: 1 query for userInfo + 1 KV read for location)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 12 in Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 5, 8

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools/context.ts` — current context fetching logic to port
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts` — where context gets injected into messages

  **Acceptance Criteria**:
  - [ ] First message to DeepSeek contains: time, openId, userId, nickname, location
  - [ ] No `get_current_context` tool in tool definitions
  - [ ] Context auto-injection takes < 100ms (1 DB query + 1 KV read)

  **QA Scenarios**:
  ```
  Scenario: Context auto-injected into agent messages
    Tool: Bash (vitest)
    Steps:
      1. Mock D1 with userInfo record, mock KV with location
      2. Call the context injection function
      3. Assert output contains time, openId, userId, nickname, location
    Expected Result: All 5 context fields present
    Evidence: .sisyphus/evidence/task-11-context-inject.txt
  ```

  **Commit**: YES (groups with Task 12)
  - Message: `refactor(wechat): slim system prompt and auto-inject context`
  - Files: context injection code

- [x] 12. Slim System Prompt

  **What to do**:
  - Rewrite `BASE_SYSTEM_PROMPT` in `skills/index.ts`:
    1. Keep: AI personality (friendly board game store assistant), language (Chinese), response format rules
    2. Keep: MAX_TOOL_CALLS reminder ("你最多调用${MAX_TOOL_CALLS}次工具...")
    3. Keep: Multi-message output format (JSON array of messages)
    4. Remove: Tool-specific instructions (those move to skills)
    5. Remove: Domain-specific knowledge (moves to skills)
    6. Add: "使用 query 工具的 introspection 查询来发现可用数据" (guide to self-discovery)
    7. Add: "对话历史中可能包含旧工具名称（如 query_actives_list），请忽略" (old history note)
    8. Target: < 500 tokens total for base system prompt
  - Update the prompt composition: `BASE_SYSTEM_PROMPT + selected_skill_content + auto_context`

  **Must NOT do**:
  - Don't change AI personality or tone
  - Don't remove the JSON output format instructions
  - Don't remove MAX_TOOL_CALLS constraint

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11 in Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 13
  - **Blocked By**: Task 8

  **References**:
  - `apps/diceshock/src/server/apis/wechat/skills/index.ts` — current BASE_SYSTEM_PROMPT (very long, ~2000 tokens)
  - Task 8 output — restructured skills (some content moves there)

  **Acceptance Criteria**:
  - [ ] System prompt < 500 tokens
  - [ ] Contains: personality, language, response format, tool budget, self-discovery hint, old history note
  - [ ] Does NOT contain: tool-specific instructions, domain knowledge, API documentation

  **QA Scenarios**:
  ```
  Scenario: System prompt is concise and complete
    Tool: Bash (word count + content check)
    Steps:
      1. Import BASE_SYSTEM_PROMPT, count tokens (approximate: chars / 2 for Chinese)
      2. Assert < 1000 chars (≈ 500 tokens)
      3. Assert contains "query" and "mutate" tool names
      4. Assert contains MAX_TOOL_CALLS number
      5. Assert does NOT contain specific table names or field names
    Expected Result: Concise prompt with all required elements
    Evidence: .sisyphus/evidence/task-12-system-prompt.txt
  ```

  **Commit**: YES (groups with Task 11)
  - Message: `refactor(wechat): slim system prompt and auto-inject context`
  - Files: `skills/index.ts`

- [x] 13. Remove Old Code — Tools, Intent Router, Propose Flow

  **What to do**:
  - Delete these files:
    - `tools/account.ts` (replaced by query tool)
    - `tools/active.ts` (replaced by query tool)
    - `tools/boardgame.ts` (replaced by query tool)
    - `tools/event.ts` (replaced by query tool)
    - `tools/mahjong.ts` (replaced by query tool)
    - `tools/context.ts` (replaced by auto-injection)
    - `tools/propose.ts` (replaced by mutate tool)
    - `tools/mutations.ts` (logic ported to mutate.ts)
    - `pendingAction.ts` (confirm flow removed)
    - `intentRouter.ts` (removed)
  - Rewrite `tools/index.ts`:
    - Remove the giant switch/case dispatcher
    - Export only: `executeQueryTool`, `executeMutateTool`, `generateTotp` + their tool definitions
    - Keep `MAX_TOOL_CALLS` export (or move to `skills/index.ts`)
  - Remove all imports of deleted files from `deepseekClient.ts`, `messageHandler.ts`
  - Remove unused type exports (`SkillId`, `PendingActionType`, etc.)

  **Must NOT do**:
  - Don't delete `tools/totp.ts` (kept)
  - Don't delete test files
  - Don't remove `wechatApi.ts`, `messagePipeline.ts`, `memory.ts`, `linkRegistry.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (must be after all rewiring is done)
  - **Parallel Group**: Wave 3 (end)
  - **Blocks**: Tasks 14, 15, 16
  - **Blocked By**: Tasks 9, 10, 11, 12

  **References**:
  - All files listed above for deletion
  - `apps/diceshock/src/server/apis/wechat/` — verify no remaining imports reference deleted files

  **Acceptance Criteria**:
  - [ ] All 10 files listed above are deleted
  - [ ] `tools/` contains only: `index.ts`, `query.ts`, `mutate.ts`, `totp.ts`
  - [ ] No TypeScript errors in remaining files (no broken imports)
  - [ ] `npx nx run diceshock:build` succeeds
  - [ ] No references to `intentRouter`, `PendingAction`, `executeTool` (old dispatcher), `SkillId` remain

  **QA Scenarios**:
  ```
  Scenario: Build succeeds after deletion
    Tool: Bash (nx build)
    Steps:
      1. Run `npx nx run diceshock:build`
      2. Assert exit code 0
      3. Grep remaining .ts files for "intentRouter" → assert 0 matches
      4. Grep for "PendingAction" → assert 0 matches
      5. Grep for "propose_" → assert 0 matches
    Expected Result: Clean build, no orphaned references
    Evidence: .sisyphus/evidence/task-13-cleanup.txt
  ```

  **Commit**: YES
  - Message: `refactor(wechat): remove old tools, intent router, propose flow`
  - Files: (10 deleted files) + `tools/index.ts` rewrite

- [x] 14. Vitest — GraphQL Schema + Query Tool Tests

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/__tests__/query.test.ts`
  - Test the GraphQL schema module:
    1. Schema builds successfully from Drizzle schema
    2. Introspection query returns table types
    3. Blocked tables (accounts, sessions) return errors
    4. findMany limit enforcement (> 50 capped)
  - Test the query tool:
    1. Valid query returns JSON data
    2. Mutation string rejected with error message
    3. Deep nested query (depth > 3) rejected
    4. Variables passed correctly
    5. Large response truncated with count message
    6. Malformed GraphQL returns parse error (not crash)
  - Use mock D1 database with seed data (a few board games, actives, users)
  - Follow existing test patterns from `apps/diceshock/src/server/apis/wechat/__tests__/`

  **Must NOT do**:
  - Don't test against production D1
  - Don't test DeepSeek API integration (that's Task 16)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15, 16 in Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 5, 13

  **References**:
  - `apps/diceshock/src/server/apis/wechat/__tests__/` — existing test patterns and setup
  - `apps/diceshock/src/server/apis/wechat/graphql/index.ts` (Task 3) — schema module under test
  - `apps/diceshock/src/server/apis/wechat/tools/query.ts` (Task 5) — query tool under test
  - `vitest.config.ts` or `package.json` — vitest configuration

  **Acceptance Criteria**:
  - [ ] All tests pass: `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/query.test.ts`
  - [ ] Covers: schema generation, introspection, table blocking, limit cap, mutation rejection, depth check, variables, truncation, parse errors
  - [ ] At least 10 test cases

  **QA Scenarios**:
  ```
  Scenario: Query test suite passes
    Tool: Bash (vitest)
    Steps:
      1. Run `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/query.test.ts`
      2. Assert all tests pass (exit code 0)
      3. Assert output shows >= 10 tests passed
    Expected Result: All tests green
    Failure Indicators: Any test failure, import errors, mock issues
    Evidence: .sisyphus/evidence/task-14-query-tests.txt
  ```

  **Commit**: YES (groups with Task 15)
  - Message: `test(wechat): add vitest suite for GraphQL query and mutate tools`
  - Files: `__tests__/query.test.ts`

- [x] 15. Vitest — Mutate Tool Tests

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/__tests__/mutate.test.ts`
  - Test each of 9 mutation actions:
    1. `create_active` — correct DB inserts (active + auto-registration)
    2. `join_active` — registration insert, rejects duplicate join
    3. `watch_active` — registration insert with watch type
    4. `update_active` — only updates if user is creator
    5. `leave_active` — removes registration, cascades if creator leaves empty active
    6. `send_sms_code` — KV write + external API call mock
    7. `verify_phone` — KV read + DB update
    8. `bind_gsz` — external API call mock + DB insert
    9. `upsert_business_card` — DB upsert
  - Test error cases:
    1. Invalid action enum → error with valid list
    2. Missing required params → specific error
    3. Permission denied (update active not owned) → error
  - Mock: D1 database, KV store, external APIs (Aliyun SMS, GSZ API)

  **Must NOT do**:
  - Don't test against production services
  - Don't test the full agent flow (that's Task 16)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14, 16 in Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 6, 13

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` (Task 6) — mutate tool under test
  - `apps/diceshock/src/server/apis/wechat/tools/mutations.ts` — old mutation logic (for expected behavior reference)
  - `apps/diceshock/src/server/apis/wechat/__tests__/` — existing test setup

  **Acceptance Criteria**:
  - [ ] All tests pass: `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/mutate.test.ts`
  - [ ] Covers all 9 actions + 3 error cases = at least 12 test cases
  - [ ] Each action test verifies correct DB state changes

  **QA Scenarios**:
  ```
  Scenario: Mutate test suite passes
    Tool: Bash (vitest)
    Steps:
      1. Run `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/mutate.test.ts`
      2. Assert all tests pass (exit code 0)
      3. Assert output shows >= 12 tests passed
    Expected Result: All tests green
    Failure Indicators: Any test failure, mock configuration errors
    Evidence: .sisyphus/evidence/task-15-mutate-tests.txt
  ```

  **Commit**: YES (groups with Task 14)
  - Message: `test(wechat): add vitest suite for GraphQL query and mutate tools`
  - Files: `__tests__/mutate.test.ts`

- [x] 16. Vitest — End-to-End Regression Scenarios

  **What to do**:
  - Create `apps/diceshock/src/server/apis/wechat/__tests__/regression.test.ts`
  - Test the full pipeline: user message → deepseekClient → tool calls → response
  - Mock DeepSeek API to return predetermined tool_calls sequences:
    1. **"今天有什么活动"** → API returns `query` tool call with actives GraphQL → assert response contains activity list
    2. **"搜索三国杀"** → API returns `query` tool call with boardgame filter → assert response contains game data
    3. **"查一下我的会员"** → API returns `query` with membership query → assert membership info in response
    4. **"帮我创建一个活动"** → API returns `mutate` with create_active → assert DB insert + success message
    5. **Tool budget exhaustion** → API returns 10+ tool calls → assert synthesis fallback triggers
  - Each test verifies: correct tool dispatch, correct response shape, no crashes

  **Must NOT do**:
  - Don't call real DeepSeek API (mock it)
  - Don't test WeChat message sending (mock wechatApi)
  - Don't test dedup/rate limiting (separate concern)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14, 15 in Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 9, 13

  **References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts` (Task 9) — rewired client under test
  - `apps/diceshock/src/server/apis/wechat/messageHandler.ts` (Task 10) — updated handler
  - `apps/diceshock/src/server/apis/wechat/__tests__/` — existing test infrastructure

  **Acceptance Criteria**:
  - [ ] All 5 regression scenarios pass
  - [ ] Tests verify: tool dispatch, response content, error handling
  - [ ] Budget exhaustion scenario correctly triggers synthesis fallback

  **QA Scenarios**:
  ```
  Scenario: Regression suite passes
    Tool: Bash (vitest)
    Steps:
      1. Run `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/regression.test.ts`
      2. Assert all 5 tests pass
      3. Verify no unhandled promise rejections in output
    Expected Result: All regression scenarios green
    Failure Indicators: Tool dispatch errors, response shape mismatches
    Evidence: .sisyphus/evidence/task-16-regression.txt
  ```

  **Commit**: YES
  - Message: `test(wechat): add end-to-end regression test scenarios`
  - Files: `__tests__/regression.test.ts`

- [x] 17. Deploy + Live Verification

  **What to do**:
  - Run full test suite: `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/`
  - If all pass, deploy: `npx nx run diceshock:deploy`
  - Document deployment status
  - Provide 5 live regression test scenarios for user to execute in WeChat:
    1. Send "今天有什么活动" → expect activity list response
    2. Send "搜索三国杀" → expect board game search results
    3. Send "查一下我的会员" → expect membership status
    4. Send "我的战绩" → expect mahjong PP stats
    5. Send "帮我创建一个明天的活动，标题叫测试" → expect activity created confirmation
  - Note any deployment warnings or issues

  **Must NOT do**:
  - Don't deploy if tests fail
  - Don't modify code during this task (fix in earlier tasks)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (final deployment gate)
  - **Parallel Group**: Wave 4 (end)
  - **Blocks**: Final Verification
  - **Blocked By**: Tasks 14, 15, 16

  **References**:
  - `apps/diceshock/project.json` — nx deploy target configuration
  - Previous deployment pattern: `npx nx run diceshock:deploy`

  **Acceptance Criteria**:
  - [ ] `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/` → all pass
  - [ ] `npx nx run diceshock:deploy` → success (no errors)
  - [ ] 5 live regression scenarios documented for user

  **QA Scenarios**:
  ```
  Scenario: Deploy succeeds
    Tool: Bash (nx)
    Steps:
      1. Run `npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/` → assert all pass
      2. Run `npx nx run diceshock:deploy`
      3. Assert output contains success message (no FATAL or ERROR)
    Expected Result: Clean deploy to Cloudflare Workers
    Failure Indicators: Build errors, deployment timeout, binding issues
    Evidence: .sisyphus/evidence/task-17-deploy.txt
  ```

  **Commit**: NO (deployment only, no code changes)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` (in wechat/ scope) + `bun test`. Review all changed files for: `as any`, empty catches, console.log in prod, commented-out code. Check for orphaned imports from deleted tool files.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Deploy to production. Execute these 5 regression scenarios in actual WeChat:
  1. "今天有什么活动" → lists actives with details
  2. "搜索三国杀" → board game search results
  3. "查一下我的会员" → membership status
  4. "我的战绩" → mahjong PP stats
  5. "帮我创建一个活动" → mutate creates active
  Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/5 pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", compare to actual diff. Verify nothing beyond spec was built. Check "Must NOT do" compliance. Detect: tRPC changes, mem0 changes, frontend changes, new capabilities, custom resolvers beyond PP stats.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message | Files |
|------|---------------|-------|
| 1-2 | `feat(wechat): add GraphQL schema module and new tool implementations` | graphql/*, tools/query.ts, tools/mutate.ts, tools/totp.ts |
| 3 | `refactor(wechat): rewire deepseekClient to 3-tool architecture` | deepseekClient.ts, messageHandler.ts, skills/* |
| 3 | `refactor(wechat): remove intent router, old tools, propose flow` | tools/*.ts (deleted), intentRouter.ts (deleted) |
| 4 | `test(wechat): add vitest suite for GraphQL tools` | __tests__/* |

---

## Success Criteria

### Verification Commands
```bash
npx vitest run apps/diceshock/src/server/apis/wechat/__tests__/  # Expected: all pass
npx nx run diceshock:deploy  # Expected: clean deploy, no errors
```

### Final Checklist
- [ ] Only 4 files in tools/: index.ts, query.ts, mutate.ts, totp.ts
- [ ] No `intentRouter` import anywhere in wechat/
- [ ] No `propose_` or `PendingAction` references in active code
- [ ] All 10 mutate actions produce correct DB state
- [ ] Query tool rejects mutation strings
- [ ] Agent can introspect schema via query tool
- [ ] Skills contain zero API field/filter documentation
- [ ] System prompt < 500 tokens (behavioral only)
- [ ] All vitest tests pass
- [ ] Deploys successfully
- [ ] 5 live WeChat regression scenarios work
