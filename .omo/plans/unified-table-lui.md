# 统一 Table GUI + LUI (Agent 对话) 系统

## TL;DR

> **Quick Summary**: 将 /dash 6 个表格页面迁移到 TanStack Table 并统一搜索/排序/筛选设计，同时新增右侧全局 AI 对话面板，以 GQL 作为 GUI 和 LUI 的统一数据协议。Agent 所有变更操作展示 GQL 查询让店员确认后执行。
> 
> **Deliverables**:
> - 共享 DashTable 组件系统（TanStack Table + 统一搜索语法解析器）
> - 6 个 resolver 重构为 DB-level pagination/filter
> - 6 个 /dash 表格页面迁移
> - 全局 AI 对话面板（Vercel AI SDK + DeepSeek V4 Pro）
> - Agent 后台 streaming endpoint + tool confirmation UI
> 
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: T1 (验证 spike) → T2-T5 (基础设施) → T6-T11 (resolver + table infra) → T12-T17 (页面迁移) → T18-T23 (AI panel) → T24-T27 (集成) → F1-F4 (验证)

---

## Context

### Original Request
/dash 页面大量使用 table 设计，希望迁移到 TanStack Table 并统一搜索语法、排序、时间段、状态、快捷操作设计。新增右侧 AI 对话栏（镜像左侧 sidebar），使用 Vercel AI SDK。Agent 复用 WeChat 能力但有后台专属 skill，所有修改展示 GQL 查询让店员确认。

### Interview Summary
**Key Discussions**:
- 搜索语法: GitHub style `is:active status:paid date:>2024-01`
- AI 面板: 全局常驻 Copilot style，收起为窄条
- Resolver: 从 in-memory 改 DB-level (D1 SQL)
- Form: 只统一 Table 列表页，Detail 页不动
- Test: TDD with Vitest
- AI SDK: useChat + streaming UI + 自定义 tool result 渲染

**Research Findings**:
- 当前 6 个表格页全部用 raw HTML `<table>` + DaisyUI class，零共享组件
- Layout: 左侧 `w-16 hover:w-56`，main `lg:pl-16`
- WeChat agent: DeepSeek V4 Flash + 5 tools + D1 conversation history + mem0ai + RAG
- SSE via Durable Objects (PubSubDO, DsSubscriptionDO)
- Apollo Client 3.13 + codegen，offset pagination (PageInfo)
- 部分 resolver in-memory 全量取再 JS 过滤（orders, users）

### Metis Review
**Identified Gaps** (addressed):
- Vercel AI SDK CF Workers 兼容性: Web Streams API 原生支持，Wave 1 包含验证
- GQL schema additive-only 约束: 防止破坏 WeChat bot
- AI tool list 必须枚举: 6 tools 确定
- Apollo cache + AI mutations: network-only + refetchQueries
- Mobile AI panel: FAB → bottom sheet overlay
- Optimistic lock: mutation 前检查 version/updatedAt

---

## Work Objectives

### Core Objective
以 GQL 为统一数据协议，构建 GUI (TanStack Table + 统一搜索) 和 LUI (Agent 对话面板) 双入口系统。

### Concrete Deliverables
- `src/client/components/dash/DashTable.tsx` — 共享 TanStack Table 组件
- `src/client/components/dash/SearchBar.tsx` — 统一搜索语法解析/输入组件
- `src/client/components/dash/ChatPanel.tsx` — 全局 AI 对话面板
- `src/client/components/dash/ToolResultRenderer.tsx` — GQL 确认 UI + tool 结果渲染
- `src/server/apis/chat/` — AI streaming endpoint (Hono route)
- 6 个重构后的 resolver (DB-level pagination/filter)
- 6 个迁移后的 /dash 页面
- 完整 Vitest 测试覆盖

### Definition of Done
- [x] 所有 6 个 table 页面使用 DashTable 组件渲染
- [x] 统一搜索语法在所有页面工作（per-table grammar）
- [x] AI 面板能执行 query/mutate 并展示 GQL 确认
- [x] `bun test` 全部通过
- [x] `tsc --noEmit` 无新增错误
- [x] 现有 WeChat bot 功能不受影响

### Must Have
- TanStack Table 驱动所有 6 个 table 页面
- 统一搜索语法（GitHub style per-table grammar）
- AI 面板全局常驻，streaming 输出
- GQL mutation 确认 UI（展示查询 + 影响行数）
- 所有迁移保持现有功能不丢失（batch actions, filters, real-time）
- URL search state 兼容（TanStack Router validateSearch）
- Staff/Admin 权限在 AI 中正确执行

### Must NOT Have (Guardrails)
- ❌ Inline row editing — 不在 scope
- ❌ GQL schema breaking changes — 仅 additive
- ❌ AI 身份管理操作
- ❌ AI bulk dangerous mutations 无确认直接执行
- ❌ AI 对话分享/协作
- ❌ Voice input
- ❌ AI 导出/报表生成
- ❌ Form 统一化（Detail 页不动）
- ❌ Column visibility/reorder 持久化
- ❌ Direct D1 access from AI — 必须经过 GQL 层
- ❌ 过度抽象：避免为"未来可能"添加不必要的 abstraction layers

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright)
- **Automated tests**: TDD
- **Framework**: Vitest (unit/integration), Playwright (E2E for AI panel)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Bash (bun test) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Validation Spike — MUST complete first):
└── Task 1: Vercel AI SDK + CF Workers compatibility spike [quick]

Wave 1 (Foundation — after spike validates):
├── Task 2: Install dependencies + TanStack Table + AI SDK [quick]
├── Task 3: Unified search syntax parser + types [deep]
├── Task 4: DashTable shared component (columns, pagination, sort, filter, loading, empty) [deep]
├── Task 5: GQL schema additive extensions (unified filter inputs) [unspecified-high]

Wave 2 (Resolver Refactor — parallel, after schema):
├── Task 6: Events resolver → DB-level [quick]
├── Task 7: Tables resolver → DB-level [quick]
├── Task 8: Actives resolver → DB-level + cursor pagination [unspecified-high]
├── Task 9: Users resolver → DB-level [unspecified-high]
├── Task 10: GSZ/Mahjong resolver → DB-level [unspecified-high]
├── Task 11: Orders resolver → DB-level + sort + status filter [deep]

Wave 3 (Page Migration — parallel after resolver + DashTable):
├── Task 12: Events page migration [quick]
├── Task 13: Tables page migration [quick]
├── Task 14: Actives page migration [unspecified-high]
├── Task 15: Users page migration [unspecified-high]
├── Task 16: GSZ/Mahjong page migration [unspecified-high]
├── Task 17: Orders page migration (most complex: groupBy + SSE + batch) [deep]

Wave 4 (AI Panel — parallel with Wave 3 after Wave 1):
├── Task 18: Chat streaming endpoint (Hono + AI SDK + DeepSeek) [deep]
├── Task 19: AI tool definitions + GQL executor [deep]
├── Task 20: Chat panel layout + UI (right side, collapsible) [visual-engineering]
├── Task 21: useChat integration + message rendering [unspecified-high]
├── Task 22: Tool result renderer (GQL query display + confirm/reject) [visual-engineering]
├── Task 23: Mobile FAB + bottom sheet overlay [visual-engineering]

Wave 5 (Integration — after Wave 3 + 4):
├── Task 24: AI ↔ Search bridge (format_search_query tool → populate search bar) [unspecified-high]
├── Task 25: AI mutation → Apollo cache invalidation + refetch [unspecified-high]
├── Task 26: Conversation state persistence (Jotai + route transitions) [quick]
├── Task 27: E2E integration tests (Playwright) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2-5, 18-23 |
| 2 | 1 | 3-5, 18-23 |
| 3 | 2 | 4, 12-17, 24 |
| 4 | 2, 3 | 12-17 |
| 5 | 2 | 6-11 |
| 6-11 | 5 | 12-17 |
| 12-17 | 4, 6-11 (respective) | 24-27 |
| 18 | 1, 2 | 19, 21 |
| 19 | 18 | 22, 24, 25 |
| 20 | 2 | 21, 23 |
| 21 | 18, 20 | 22, 26 |
| 22 | 19, 21 | 24, 25 |
| 23 | 20 | — |
| 24 | 3, 19, 22 | 27 |
| 25 | 19, 22 | 27 |
| 26 | 21 | 27 |
| 27 | 24, 25, 26, 12-17 | F1-F4 |

### Agent Dispatch Summary

- **Wave 0**: 1 — T1 → `quick`
- **Wave 1**: 4 — T2 → `quick`, T3 → `deep`, T4 → `deep`, T5 → `unspecified-high`
- **Wave 2**: 6 — T6-T7 → `quick`, T8-T10 → `unspecified-high`, T11 → `deep`
- **Wave 3**: 6 — T12-T13 → `quick`, T14-T16 → `unspecified-high`, T17 → `deep`
- **Wave 4**: 6 — T18-T19 → `deep`, T20/T22/T23 → `visual-engineering`, T21 → `unspecified-high`
- **Wave 5**: 4 — T24-T25 → `unspecified-high`, T26 → `quick`, T27 → `unspecified-high`
- **FINAL**: 4 — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Vercel AI SDK + CF Workers Compatibility Spike

  **What to do**:
  - Create minimal Hono route `/api/chat/test` that uses `@ai-sdk/deepseek` + `streamText` to stream a response
  - Verify Web Streams API (`ReadableStream`) works in wrangler dev
  - Confirm `useChat` hook connects and receives streaming tokens
  - Test tool calling round-trip (single tool: echo back input)
  - Document any workarounds needed (polyfills, env vars, etc.)
  - If FAILS: pivot plan to raw `ReadableStream` + custom hook (pattern already exists in WeChat bot)

  **Must NOT do**:
  - Build full chat UI — this is validation only
  - Add to production routes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 (solo)
  - **Blocks**: T2-T5, T18-T23
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts` — existing DeepSeek integration pattern (raw fetch + streaming)
  - `apps/diceshock/src/main.tsx` — Hono app route registration
  - `apps/diceshock/wrangler.toml` — AI bindings, env var config
  - External: https://sdk.vercel.ai/providers/ai-sdk-providers/deepseek
  - External: https://sdk.vercel.ai/docs/getting-started/cloudflare

  **Acceptance Criteria**:
  - [ ] `bun test src/server/apis/chat/test.test.ts` → PASS
  - [ ] Streaming tokens arrive incrementally (not buffered)
  - [ ] Tool call executes and result streams back

  **QA Scenarios**:
  ```
  Scenario: Streaming works end-to-end
    Tool: Bash (curl)
    Preconditions: wrangler dev running on localhost:5173
    Steps:
      1. curl -N -X POST http://localhost:5173/api/chat/test -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hello"}]}'
      2. Observe chunked transfer-encoding response
      3. Assert response contains streamed text chunks (not single JSON blob)
    Expected Result: Multiple SSE data lines with incremental text
    Failure Indicators: Single response blob, 500 error, timeout
    Evidence: .sisyphus/evidence/task-1-streaming-spike.txt

  Scenario: Tool calling works
    Tool: Bash (curl)
    Preconditions: wrangler dev running, test tool registered
    Steps:
      1. POST to /api/chat/test with message "use the echo tool with input 'test123'"
      2. Assert response includes tool call result
    Expected Result: Response contains "test123" echoed back via tool
    Failure Indicators: No tool invocation, stream hangs
    Evidence: .sisyphus/evidence/task-1-tool-calling.txt
  ```

  **Commit**: YES
  - Message: `spike(dash): validate Vercel AI SDK on CF Workers`
  - Files: `src/server/apis/chat/test.ts`, `src/server/apis/chat/test.test.ts`

- [x] 2. Install Dependencies + Configure

  **What to do**:
  - Install: `@tanstack/react-table`, `ai`, `@ai-sdk/deepseek`, `@ai-sdk/react`
  - Verify no version conflicts with existing React 19 + Apollo Client
  - Add TanStack Table type imports to tsconfig paths if needed
  - Update codegen config if new GQL operations added

  **Must NOT do**:
  - Start building components — just deps and config

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T3, T4, T5)
  - **Blocks**: T3, T4, T5, T18-T23
  - **Blocked By**: T1

  **References**:
  - `apps/diceshock/package.json` — current deps (React 19.2.4, Apollo 3.13.9)
  - `package.json` (root) — workspace config
  - `apps/diceshock/tsconfig.json` — path aliases

  **Acceptance Criteria**:
  - [ ] `pnpm install` succeeds with no peer dep errors
  - [ ] `bunx tsc --noEmit` passes (no new type errors from deps)
  - [ ] `import { useReactTable } from '@tanstack/react-table'` resolves
  - [ ] `import { useChat } from '@ai-sdk/react'` resolves

  **QA Scenarios**:
  ```
  Scenario: Deps install cleanly
    Tool: Bash
    Preconditions: Clean node_modules (pnpm install from scratch)
    Steps:
      1. Run `pnpm install`
      2. Run `bunx tsc --noEmit` in apps/diceshock
      3. Check for peer dependency warnings
    Expected Result: 0 errors, 0 peer dep conflicts
    Failure Indicators: peer dep warnings for react/react-dom version mismatch
    Evidence: .sisyphus/evidence/task-2-deps-install.txt
  ```

  **Commit**: YES
  - Message: `chore(dash): install tanstack-table + ai-sdk dependencies`
  - Files: `package.json`, `apps/diceshock/package.json`, `pnpm-lock.yaml`

- [x] 3. Unified Search Syntax Parser + Types

  **What to do**:
  - Design and implement a GitHub-style search parser: `src/client/lib/searchParser.ts`
  - Grammar: `key:value` pairs + free text (fuzzy match)
  - Supported operators: `is:`, `status:`, `date:>`, `date:<`, `date:YYYY-MM-DD..YYYY-MM-DD`, `table:`, `type:`, `user:`, `store:`
  - Per-table field whitelist type: `SearchGrammar<Entity>` — defines which keys valid per page
  - Parser output: `{ freeText: string, filters: Record<string, FilterValue> }` → maps to GQL input variables
  - Serializer: filters → URL search string (for TanStack Router `validateSearch`)
  - Auto-complete support: export `getAvailableKeys(grammar)` for future suggestion UI
  - TDD: Write tests first for parser (valid inputs, invalid inputs, edge cases)

  **Must NOT do**:
  - Build the UI input component (that's T4)
  - Implement AI-to-search bridge (that's T24)
  - Make it "parse anything" — fixed grammar per table only

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T4, T5)
  - **Blocks**: T4, T12-T17, T24
  - **Blocked By**: T2

  **References**:
  - `apps/diceshock/src/apps/routers/dash/orders.tsx` — existing URL search state pattern (`Route.useSearch()`, `validateSearch`)
  - `apps/diceshock/src/apps/routers/dash/gsz.tsx` — most complex filter pattern (multi-axis)
  - `apps/diceshock/schema.graphql` — filter input types: `OrderListInput`, `MahjongManagementListInput`, `UserSearchInput`
  - External ref: GitHub search syntax docs for inspiration

  **Acceptance Criteria**:
  - [ ] `bun test src/client/lib/searchParser.test.ts` → PASS (20+ test cases)
  - [ ] Parses: `status:active date:>2024-06-01 table:A1 张三` → `{ freeText: "张三", filters: { status: "active", date: { gt: "2024-06-01" }, table: "A1" } }`
  - [ ] Invalid key on wrong page returns parse error (not crash)
  - [ ] Round-trip: parse → serialize → parse === original

  **QA Scenarios**:
  ```
  Scenario: Complex search string parses correctly
    Tool: Bash (bun test)
    Preconditions: Test file exists
    Steps:
      1. Run `bun test src/client/lib/searchParser.test.ts`
      2. Verify all 20+ test cases pass including: empty string, single key:value, multiple, free text only, mixed, date ranges, invalid keys, unicode names
    Expected Result: All tests pass, 0 failures
    Failure Indicators: Any test failure, parser crash on malformed input
    Evidence: .sisyphus/evidence/task-3-parser-tests.txt

  Scenario: Serialization round-trip
    Tool: Bash (bun test)
    Preconditions: Tests include round-trip assertions
    Steps:
      1. Parse "is:active status:paid date:>2024-01 张三"
      2. Serialize result back to string
      3. Parse serialized string
      4. Assert deep-equal to step 1 result
    Expected Result: Identical parsed output
    Evidence: .sisyphus/evidence/task-3-roundtrip.txt
  ```

  **Commit**: YES
  - Message: `feat(dash): unified search syntax parser`
  - Files: `src/client/lib/searchParser.ts`, `src/client/lib/searchParser.test.ts`, `src/client/lib/searchTypes.ts`

- [x] 4. DashTable Shared Component

  **What to do**:
  - Build `src/client/components/dash/DashTable.tsx` — generic TanStack Table wrapper
  - Features: column definitions, sorting (click header), pagination controls, loading skeleton, empty state, row selection (checkbox), responsive (mobile card view / desktop table)
  - Build `src/client/components/dash/SearchBar.tsx` — unified search input with syntax highlighting + error indicator
  - Build `src/client/components/dash/TableToolbar.tsx` — contains SearchBar + quick filters (status tabs, date range picker) + AdminStoreFilter integration
  - Preserve existing DaisyUI styling (`table table-lg table-pin-rows`)
  - Integrate with TanStack Router URL search state (`useSearch` / `navigate`)
  - Support server-side vs client-side pagination/sort modes
  - TDD: Test rendering, sorting behavior, filter application, selection state

  **Must NOT do**:
  - Implement per-page specific logic (that's T12-T17)
  - Build inline editing
  - Add column visibility/reorder persistence
  - Over-abstract: keep it practical, not a "framework"

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T5)
  - **Blocks**: T12-T17
  - **Blocked By**: T2, T3

  **References**:
  - `apps/diceshock/src/apps/routers/dash/orders.tsx:1-100` — existing table structure, DaisyUI classes, column pattern
  - `apps/diceshock/src/client/components/diceshock/BatchActionBar.tsx` — existing batch action bar to integrate with
  - `apps/diceshock/src/client/components/AdminStoreFilter.tsx` — store filter to preserve
  - `apps/diceshock/src/apps/routers/dash/gsz.tsx:1-50` — pagination UI pattern
  - External: https://tanstack.com/table/latest/docs/framework/react/examples/basic

  **Acceptance Criteria**:
  - [ ] `bun test src/client/components/dash/DashTable.test.tsx` → PASS
  - [ ] DashTable renders columns, sorts on header click, paginates
  - [ ] SearchBar parses input and calls `onFilterChange` with parsed result
  - [ ] Loading state shows DaisyUI skeleton
  - [ ] Empty state renders "No data" message
  - [ ] Checkbox selection works, integrates with BatchActionBar

  **QA Scenarios**:
  ```
  Scenario: Table renders with sort
    Tool: Playwright
    Preconditions: Storybook or test page with DashTable + mock data
    Steps:
      1. Navigate to test page
      2. Assert table renders 10 rows
      3. Click "Date" column header
      4. Assert rows reorder (first row date < last row date)
      5. Click again → descending
    Expected Result: Rows sort ascending then descending on header clicks
    Failure Indicators: No sort indicator, rows don't reorder
    Evidence: .sisyphus/evidence/task-4-table-sort.png

  Scenario: Search bar parses and filters
    Tool: Playwright
    Preconditions: DashTable with SearchBar rendered
    Steps:
      1. Type "status:active 张三" in search bar
      2. Press Enter
      3. Assert URL updates to include search params
      4. Assert table data reflects filter
    Expected Result: URL contains encoded filter, table shows filtered results
    Failure Indicators: URL doesn't update, filter not applied
    Evidence: .sisyphus/evidence/task-4-search-filter.png
  ```

  **Commit**: YES
  - Message: `feat(dash): DashTable shared component`
  - Files: `src/client/components/dash/DashTable.tsx`, `src/client/components/dash/SearchBar.tsx`, `src/client/components/dash/TableToolbar.tsx`, `src/client/components/dash/DashTable.test.tsx`

- [x] 5. GQL Schema Additive Extensions (Unified Filter Inputs)

  **What to do**:
  - Extend `schema.graphql` with unified filter input types that all list resolvers can adopt
  - Add `UnifiedFilterInput { search: String, status: [String], dateFrom: DateTime, dateTo: DateTime, sortBy: String, sortOrder: SortOrder, pagination: PaginationInput }` as base
  - Per-entity extensions: `OrderFilterInput extends UnifiedFilterInput { tableCode: String, groupBy: OrderGroupBy }`, etc.
  - Add `SortOrder` enum if not exists (`ASC`, `DESC`)
  - Ensure existing queries remain unchanged (additive) — new filter inputs are optional alternatives
  - Run codegen to generate new TypeScript types
  - TDD: Schema validation tests

  **Must NOT do**:
  - Remove or rename existing input types (backward compat for WeChat bot)
  - Implement resolvers (that's T6-T11)
  - Change existing query signatures — add new optional args only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4)
  - **Blocks**: T6-T11
  - **Blocked By**: T2

  **References**:
  - `apps/diceshock/schema.graphql:489-510` — existing `OrderListInput`, `PaginationInput`
  - `apps/diceshock/schema.graphql:707-720` — existing `UserSearchInput`
  - `apps/diceshock/schema.graphql:1130-1160` — existing `MahjongManagementListInput`
  - `apps/diceshock/codegen.ts` — codegen config to regenerate types

  **Acceptance Criteria**:
  - [ ] `bunx tsc --noEmit` passes after schema change
  - [ ] Codegen runs successfully: `pnpm graphql-codegen`
  - [ ] Existing queries still compile unchanged
  - [ ] New input types appear in generated TypeScript

  **QA Scenarios**:
  ```
  Scenario: Schema is valid and backward compatible
    Tool: Bash
    Preconditions: Schema extended with new types
    Steps:
      1. Run graphql-codegen (pnpm graphql-codegen or equivalent)
      2. Run `bunx tsc --noEmit`
      3. Verify existing dash-*.graphql operations still compile
    Expected Result: Zero errors, all existing operations untouched
    Failure Indicators: Type errors in existing code, codegen failure
    Evidence: .sisyphus/evidence/task-5-schema-compat.txt

  Scenario: New types generated correctly
    Tool: Bash (grep)
    Preconditions: Codegen completed
    Steps:
      1. Check __generated__/index.ts for `OrderFilterInput` type
      2. Check for `UnifiedFilterInput` type
      3. Verify all per-entity input types present
    Expected Result: All new types exist with correct fields
    Evidence: .sisyphus/evidence/task-5-types-generated.txt
  ```

  **Commit**: YES
  - Message: `feat(gql): add unified filter input types`
  - Files: `schema.graphql`, `src/client/graphql/__generated__/index.ts`

- [x] 6. Events Resolver → DB-level Pagination/Filter

  **What to do**:
  - Refactor `managedEvents` resolver from "fetch all, return array" to DB-level query with `WHERE` + `LIMIT/OFFSET`
  - Accept new `EventFilterInput` (extends UnifiedFilterInput): `search`, `status`, `dateFrom/dateTo`, `pagination`, `sortBy/sortOrder`
  - Implement Drizzle query with `.where()` conditions + `.limit()` + `.offset()` + `.orderBy()`
  - Return `{ items: Event[], pageInfo: PageInfo }` (same shape as Orders/Users)
  - Keep old `managedEvents` query signature working (no args = return all, for backward compat)
  - TDD: Test resolver with mock D1 queries

  **Must NOT do**:
  - Modify the frontend page (that's T12)
  - Break WeChat bot queries

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7-T11)
  - **Blocks**: T12
  - **Blocked By**: T5

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/` — existing resolver patterns
  - `apps/diceshock/src/client/graphql/operations/dash-events.graphql` — current query shape
  - `apps/diceshock/schema.graphql` — `managedEvents` query definition
  - `apps/diceshock/src/server/graphql/resolvers/orders.ts:670-710` — example of pagination implementation (but in-memory — rewrite to DB)

  **Acceptance Criteria**:
  - [ ] `bun test src/server/graphql/resolvers/events.test.ts` → PASS
  - [ ] Resolver uses Drizzle `.where()` + `.limit()` + `.offset()` (not JS slice)
  - [ ] Old query with no args still returns all events (backward compat)
  - [ ] New query with filter input returns correct filtered subset

  **QA Scenarios**:
  ```
  Scenario: Filtered query returns correct subset
    Tool: Bash (curl)
    Preconditions: wrangler dev running, test events in D1
    Steps:
      1. POST GraphQL query: `managedEvents(input: { dateFrom: "2024-06-01", pagination: { offset: 0, limit: 5 } })`
      2. Assert response has `items` array with ≤5 items
      3. Assert all items have date ≥ 2024-06-01
      4. Assert `pageInfo.hasMore` is correct
    Expected Result: Filtered, paginated response with correct pageInfo
    Failure Indicators: All events returned, wrong dates, missing pageInfo
    Evidence: .sisyphus/evidence/task-6-events-filter.txt

  Scenario: Backward compatibility
    Tool: Bash (curl)
    Preconditions: Same as above
    Steps:
      1. POST GraphQL query: `managedEvents` (no input arg)
      2. Assert same response shape as before migration
    Expected Result: All events returned (legacy behavior)
    Evidence: .sisyphus/evidence/task-6-events-compat.txt
  ```

  **Commit**: YES
  - Message: `refactor(resolver): events DB-level pagination`
  - Files: `src/server/graphql/resolvers/events.ts`, `src/server/graphql/resolvers/events.test.ts`

- [x] 7. Tables Resolver → DB-level Pagination/Filter

  **What to do**:
  - Same pattern as T6 but for `managedTables` resolver
  - Accept `TableFilterInput`: `search` (name match), `type` (fixed/solo), `status` (active/inactive), `store`, `pagination`, `sortBy/sortOrder`
  - Drizzle query with compound WHERE (type + status + name LIKE)
  - Return `{ items: Table[], pageInfo: PageInfo }`

  **Must NOT do**: Modify frontend (T13)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T8-T11)
  - **Blocks**: T13
  - **Blocked By**: T5

  **References**:
  - `apps/diceshock/src/apps/routers/dash/tables.tsx` — current client-side filter logic to replicate server-side
  - `apps/diceshock/src/client/graphql/operations/dash-tables.graphql` — current query
  - `schema.graphql` — `managedTables` definition

  **Acceptance Criteria**:
  - [ ] `bun test src/server/graphql/resolvers/tables.test.ts` → PASS
  - [ ] Filter by type + status + name search works at DB level
  - [ ] Backward compat: no-arg call returns all

  **QA Scenarios**:
  ```
  Scenario: Multi-filter combination
    Tool: Bash (curl)
    Steps:
      1. Query with `{ search: "A", type: "FIXED", status: "ACTIVE" }`
      2. Assert all returned tables match all 3 criteria
    Expected Result: Only active fixed tables with "A" in name
    Evidence: .sisyphus/evidence/task-7-tables-filter.txt
  ```

  **Commit**: YES
  - Message: `refactor(resolver): tables DB-level pagination`
  - Files: `src/server/graphql/resolvers/tables.ts`, `src/server/graphql/resolvers/tables.test.ts`

- [x] 8. Actives Resolver → DB-level + Cursor Pagination

  **What to do**:
  - Refactor `managedActives` from flat array to DB-level with cursor pagination (already defined in schema)
  - Accept `ActiveFilterInput`: `search`, `status` (active/expired — based on date comparison), `store`, `pagination` (cursor-based), `sortBy/sortOrder`
  - Status filter: `WHERE end_date > NOW()` for active, `WHERE end_date <= NOW()` for expired
  - Implement cursor pagination using `id` as cursor (existing `CursorPaginationInput`)
  - Add batch delete support verification (ensure IDs still accessible)

  **Must NOT do**: Modify frontend (T14)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6-T7, T9-T11)
  - **Blocks**: T14
  - **Blocked By**: T5

  **References**:
  - `apps/diceshock/src/apps/routers/dash/actives.tsx` — current client-side status filter (date comparison logic)
  - `schema.graphql:201` — existing cursor pagination definition
  - `apps/diceshock/src/client/graphql/operations/dash-actives.graphql` — current query

  **Acceptance Criteria**:
  - [ ] `bun test src/server/graphql/resolvers/actives.test.ts` → PASS
  - [ ] Status filter uses SQL date comparison (not JS)
  - [ ] Cursor pagination returns correct `nextCursor` and `hasMore`

  **QA Scenarios**:
  ```
  Scenario: Status filter at DB level
    Tool: Bash (curl)
    Steps:
      1. Query `managedActives(input: { status: "ACTIVE", pagination: { limit: 10 } })`
      2. Assert all items have end_date > current timestamp
    Expected Result: Only non-expired actives returned
    Evidence: .sisyphus/evidence/task-8-actives-status.txt

  Scenario: Cursor pagination
    Tool: Bash (curl)
    Steps:
      1. Query with `{ pagination: { limit: 3 } }` → get nextCursor
      2. Query with `{ pagination: { cursor: nextCursor, limit: 3 } }`
      3. Assert no overlap between page 1 and page 2 items
    Expected Result: Non-overlapping pages, correct cursor progression
    Evidence: .sisyphus/evidence/task-8-actives-cursor.txt
  ```

  **Commit**: YES
  - Message: `refactor(resolver): actives DB-level cursor pagination`
  - Files: `src/server/graphql/resolvers/actives.ts`, `src/server/graphql/resolvers/actives.test.ts`

- [x] 9. Users Resolver → DB-level

  **What to do**:
  - Refactor `managedUsers` resolver: current pattern fetches all then slices in JS
  - Move search (name/phone LIKE) + pagination to Drizzle `.where()` + `.limit()` + `.offset()`
  - Accept `UserFilterInput`: `search` (searchWords), `store`, `role`, `pagination`, `sortBy` (name/createdAt/lastActive), `sortOrder`
  - Preserve `searchWords` backward compat for WeChat bot `query` tool
  - Count query for `total` in PageInfo

  **Must NOT do**: Modify frontend (T15), expose sensitive fields

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6-T8, T10-T11)
  - **Blocks**: T15
  - **Blocked By**: T5

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/users.ts` — current resolver (in-memory pagination)
  - `apps/diceshock/src/client/graphql/operations/dash-users.graphql` — current query with `searchWords` param
  - `apps/diceshock/src/server/apis/wechat/graphql/permissions.ts` — field masking (phone, meta)

  **Acceptance Criteria**:
  - [ ] `bun test src/server/graphql/resolvers/users.test.ts` → PASS
  - [ ] Search uses SQL LIKE (not JS .filter())
  - [ ] `total` count is accurate (separate COUNT query or COUNT OVER)
  - [ ] Existing `searchWords` param still works

  **QA Scenarios**:
  ```
  Scenario: Search at DB level
    Tool: Bash (curl)
    Steps:
      1. Query `managedUsers(input: { search: "张", pagination: { offset: 0, limit: 5 } })`
      2. Assert all returned users have "张" in name or phone
      3. Assert `pageInfo.total` reflects all matching users, not just page
    Expected Result: Correct filtered subset with accurate total
    Evidence: .sisyphus/evidence/task-9-users-search.txt
  ```

  **Commit**: YES
  - Message: `refactor(resolver): users DB-level pagination`
  - Files: `src/server/graphql/resolvers/users.ts`, `src/server/graphql/resolvers/users.test.ts`

- [x] 10. GSZ/Mahjong Resolver → DB-level

  **What to do**:
  - Refactor `managedMahjongMatches` resolver: already has server-side pagination but add DB-level multi-axis filtering
  - Accept `MahjongFilterInput`: `search`, `mode` (3p/4p), `format` (tonpuu/hanchan), `completion`, `syncStatus`, `tableCode`, `dateFrom/dateTo`, `pagination`, `sortBy/sortOrder`
  - Build compound Drizzle WHERE from filter combination
  - Preserve existing response shape

  **Must NOT do**: Modify frontend (T16), change sync logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6-T9, T11)
  - **Blocks**: T16
  - **Blocked By**: T5

  **References**:
  - `apps/diceshock/src/apps/routers/dash/gsz.tsx:1-100` — current 4-axis filter implementation (shows what SQL needs to support)
  - `apps/diceshock/src/client/graphql/operations/dash-gsz.graphql` — current query
  - `schema.graphql:1141` — `MahjongManagementListInput` existing definition

  **Acceptance Criteria**:
  - [ ] `bun test src/server/graphql/resolvers/mahjong.test.ts` → PASS
  - [ ] All 4 filter axes work individually and combined at DB level
  - [ ] Date range filter uses SQL comparison
  - [ ] Table code filter works

  **QA Scenarios**:
  ```
  Scenario: Combined multi-axis filter
    Tool: Bash (curl)
    Steps:
      1. Query with `{ mode: "FOUR_PLAYER", format: "HANCHAN", completion: "COMPLETED", dateFrom: "2024-06-01" }`
      2. Assert all matches satisfy ALL filter criteria
    Expected Result: Only 4p hanchan completed matches after June 1st
    Evidence: .sisyphus/evidence/task-10-gsz-multifilter.txt
  ```

  **Commit**: YES
  - Message: `refactor(resolver): mahjong DB-level pagination`
  - Files: `src/server/graphql/resolvers/mahjong.ts`, `src/server/graphql/resolvers/mahjong.test.ts`

- [x] 11. Orders Resolver → DB-level + Sort + Status Filter

  **What to do**:
  - Most complex resolver refactor: Orders currently fetches ALL occupancy rows then JS-filters
  - Move to Drizzle with: compound WHERE (status, store, dateRange, search, tableCode), ORDER BY (sortBy + sortOrder), LIMIT/OFFSET
  - Preserve `groupBy` as a response-level transformation (after DB query — cannot GROUP BY in D1 easily for this use case)
  - Preserve real-time subscription integration (no change needed — subscription is separate)
  - Add `OrderFilterInput`: `search`, `status` (active/paused/ended), `tableCode`, `store`, `dateFrom/dateTo`, `sortBy` (start_at/end_at/amount), `sortOrder`, `pagination`, `groupBy`
  - For `total` count: run parallel COUNT query

  **Must NOT do**: Modify frontend (T17), change subscription logic, change pricing calculation

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6-T10)
  - **Blocks**: T17
  - **Blocked By**: T5

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/orders.ts:670-710` — current in-memory implementation
  - `apps/diceshock/src/apps/routers/dash/orders.tsx:1-150` — shows all filter/sort/group combinations used
  - `schema.graphql:489` — `orders` query + `OrderListInput`
  - `apps/diceshock/src/client/graphql/operations/dash-orders.graphql` — current query with nested relations

  **Acceptance Criteria**:
  - [ ] `bun test src/server/graphql/resolvers/orders.test.ts` → PASS
  - [ ] Status filter, date range, table code, search all at DB level
  - [ ] Sort by start_at/end_at/amount works
  - [ ] `groupBy` still works (client-side transformation on server response)
  - [ ] Performance: <200ms for paginated query on largest dataset
  - [ ] Existing subscription unaffected

  **QA Scenarios**:
  ```
  Scenario: Full filter + sort + pagination
    Tool: Bash (curl)
    Steps:
      1. Query `orders(input: { status: ACTIVE, sortBy: "start_at", sortOrder: DESC, pagination: { offset: 0, limit: 10 } })`
      2. Assert all items have ACTIVE status
      3. Assert items sorted by start_at descending
      4. Assert pageInfo correct
    Expected Result: Filtered, sorted, paginated with correct metadata
    Evidence: .sisyphus/evidence/task-11-orders-full.txt

  Scenario: GroupBy still works
    Tool: Bash (curl)
    Steps:
      1. Query with `{ groupBy: TABLE, pagination: { offset: 0, limit: 50 } }`
      2. Assert response includes group headers/structure
    Expected Result: Grouped results with table headers
    Evidence: .sisyphus/evidence/task-11-orders-group.txt
  ```

  **Commit**: YES
  - Message: `refactor(resolver): orders DB-level pagination + sort`
  - Files: `src/server/graphql/resolvers/orders.ts`, `src/server/graphql/resolvers/orders.test.ts`

- [x] 12. Events Page Migration to DashTable

  **What to do**:
  - Replace raw `<table>` in `dash/events.tsx` with `<DashTable>` component
  - Define column config: name, date, status, type, location, capacity, actions
  - Wire up search bar (even though Events had no search before — add it using unified grammar)
  - Wire pagination from T6 resolver
  - Preserve existing action buttons (edit, delete, view details)
  - Preserve AdminStoreFilter integration
  - Use URL search state via TanStack Router `validateSearch`
  - TDD: Test page renders correctly with mock Apollo data

  **Must NOT do**:
  - Change detail page (`events_.$id.tsx`)
  - Add inline editing
  - Modify resolver logic (done in T6)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T13-T17)
  - **Blocks**: T27
  - **Blocked By**: T4, T6

  **References**:
  - `apps/diceshock/src/apps/routers/dash/events.tsx` — current implementation (385 lines to replace)
  - `apps/diceshock/src/client/graphql/operations/dash-events.graphql` — GQL operation
  - `src/client/components/dash/DashTable.tsx` (from T4) — the shared component to use

  **Acceptance Criteria**:
  - [ ] `bun test src/apps/routers/dash/events.test.tsx` → PASS
  - [ ] Events page renders via DashTable
  - [ ] Search works with events grammar (`status:`, `date:`, `type:`)
  - [ ] Pagination works (server-side from T6)
  - [ ] All existing actions preserved

  **QA Scenarios**:
  ```
  Scenario: Events page loads with DashTable
    Tool: Playwright
    Steps:
      1. Navigate to /dash/events
      2. Assert DashTable renders with column headers
      3. Assert row count matches expected data
      4. Click action button → verify navigation to detail
    Expected Result: Table renders, actions work
    Evidence: .sisyphus/evidence/task-12-events-page.png

  Scenario: Search filters events
    Tool: Playwright
    Steps:
      1. Navigate to /dash/events
      2. Type "status:active" in search bar, press Enter
      3. Assert URL updates
      4. Assert only active events shown
    Expected Result: Filtered view with URL state
    Evidence: .sisyphus/evidence/task-12-events-search.png
  ```

  **Commit**: YES
  - Message: `refactor(dash): migrate events page to DashTable`
  - Files: `src/apps/routers/dash/events.tsx`, `src/apps/routers/dash/events.test.tsx`

- [x] 13. Tables Page Migration to DashTable

  **What to do**:
  - Replace raw `<table>` in `dash/tables.tsx` with `<DashTable>`
  - Define columns: code, name, type, status, capacity, store, actions
  - Wire search bar with tables grammar (`type:fixed`, `status:active`, `name:`)
  - Wire server-side filter/pagination from T7 resolver
  - Preserve action buttons (view QR, edit, toggle status)
  - Preserve AdminStoreFilter

  **Must NOT do**: Change detail page, add inline editing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12, T14-T17)
  - **Blocks**: T27
  - **Blocked By**: T4, T7

  **References**:
  - `apps/diceshock/src/apps/routers/dash/tables.tsx` — current (632 lines)
  - `apps/diceshock/src/client/graphql/operations/dash-tables.graphql`
  - `src/client/components/dash/DashTable.tsx` (from T4)

  **Acceptance Criteria**:
  - [ ] Tables page renders via DashTable with server-side filtering
  - [ ] Type/status quick filter tabs work
  - [ ] Search parses `type:fixed status:active` correctly
  - [ ] All actions preserved (QR, edit, toggle)

  **QA Scenarios**:
  ```
  Scenario: Type filter works
    Tool: Playwright
    Steps:
      1. Navigate to /dash/tables
      2. Type "type:fixed" in search bar
      3. Assert only fixed tables displayed
    Expected Result: Filtered to fixed type only
    Evidence: .sisyphus/evidence/task-13-tables-filter.png
  ```

  **Commit**: YES
  - Message: `refactor(dash): migrate tables page to DashTable`
  - Files: `src/apps/routers/dash/tables.tsx`, `src/apps/routers/dash/tables.test.tsx`

- [x] 14. Actives Page Migration to DashTable

  **What to do**:
  - Replace raw `<table>` in `dash/actives.tsx` with `<DashTable>`
  - Define columns: title, type, date range, status (active/expired), store, participants, creator, actions
  - Wire search + status filter (server-side from T8)
  - Wire cursor pagination
  - Preserve batch delete with checkbox selection + BatchActionBar
  - Preserve AdminStoreFilter

  **Must NOT do**: Change detail page, modify batch delete logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12-T13, T15-T17)
  - **Blocks**: T27
  - **Blocked By**: T4, T8

  **References**:
  - `apps/diceshock/src/apps/routers/dash/actives.tsx` — current (564 lines)
  - `apps/diceshock/src/client/components/diceshock/BatchActionBar.tsx` — integrate with DashTable selection
  - `apps/diceshock/src/client/graphql/operations/dash-actives.graphql`

  **Acceptance Criteria**:
  - [ ] Actives page renders via DashTable with cursor pagination
  - [ ] Status tabs (all/active/expired) work as server-side filter
  - [ ] Batch select + delete via BatchActionBar works
  - [ ] Cursor pagination "load more" works

  **QA Scenarios**:
  ```
  Scenario: Batch delete flow
    Tool: Playwright
    Steps:
      1. Navigate to /dash/actives
      2. Check 3 rows via checkbox
      3. Assert BatchActionBar appears with count "3"
      4. Click delete button
      5. Confirm dialog
      6. Assert 3 rows removed from table
    Expected Result: Batch delete works, table refreshes
    Evidence: .sisyphus/evidence/task-14-actives-batch.png

  Scenario: Cursor pagination
    Tool: Playwright
    Steps:
      1. Navigate to /dash/actives
      2. Scroll to end / click "Load more"
      3. Assert new rows appended (not replaced)
    Expected Result: Incremental loading, no duplicates
    Evidence: .sisyphus/evidence/task-14-actives-cursor.png
  ```

  **Commit**: YES
  - Message: `refactor(dash): migrate actives page to DashTable`
  - Files: `src/apps/routers/dash/actives.tsx`, `src/apps/routers/dash/actives.test.tsx`

- [x] 15. Users Page Migration to DashTable

  **What to do**:
  - Replace raw `<table>` in `dash/users.tsx` with `<DashTable>`
  - Define columns: avatar, name, phone (masked for non-admin), role, store, membership, last active, points, actions
  - Wire search (server-side from T9, `search:` field)
  - Wire offset pagination
  - Preserve action buttons (view details, edit role [admin only])
  - Preserve ID copy-to-clipboard pattern (now as DashTable utility)

  **Must NOT do**: Change detail page, expose phone to non-admin

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12-T14, T16-T17)
  - **Blocks**: T27
  - **Blocked By**: T4, T9

  **References**:
  - `apps/diceshock/src/apps/routers/dash/users.tsx` — current (412 lines)
  - `apps/diceshock/src/client/graphql/operations/dash-users.graphql`
  - `apps/diceshock/src/server/apis/wechat/graphql/permissions.ts` — field masking rules

  **Acceptance Criteria**:
  - [ ] Users page renders via DashTable with offset pagination
  - [ ] Search works server-side
  - [ ] Phone column masked for non-admin users
  - [ ] Pagination shows correct page info

  **QA Scenarios**:
  ```
  Scenario: Search and paginate users
    Tool: Playwright
    Steps:
      1. Navigate to /dash/users
      2. Type "张" in search bar, press Enter
      3. Assert results filtered to names containing 张
      4. Click "Next page"
      5. Assert new page of 张 results (not unfiltered)
    Expected Result: Search persists across pagination
    Evidence: .sisyphus/evidence/task-15-users-search-paginate.png
  ```

  **Commit**: YES
  - Message: `refactor(dash): migrate users page to DashTable`
  - Files: `src/apps/routers/dash/users.tsx`, `src/apps/routers/dash/users.test.tsx`

- [x] 16. GSZ/Mahjong Page Migration to DashTable

  **What to do**:
  - Replace raw `<table>` in `dash/gsz.tsx` with `<DashTable>`
  - Define columns: date, table, players, mode, format, rounds, scores, sync status, actions
  - Wire multi-axis filter via search syntax: `mode:4p format:hanchan sync:unsynced table:A1 date:2024-06-01..2024-06-30`
  - Wire offset pagination from T10
  - Preserve batch sync checkbox + batch sync action
  - Quick filter buttons for mode/format/sync as toolbar pills (above search)

  **Must NOT do**: Change sync logic, modify GSZ API integration

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12-T15, T17)
  - **Blocks**: T27
  - **Blocked By**: T4, T10

  **References**:
  - `apps/diceshock/src/apps/routers/dash/gsz.tsx` — current (940 lines, most complex filter UI)
  - `apps/diceshock/src/client/graphql/operations/dash-gsz.graphql`
  - `src/client/lib/searchParser.ts` (from T3) — grammar must support all GSZ filter keys

  **Acceptance Criteria**:
  - [ ] GSZ page renders via DashTable
  - [ ] All 4 filter axes (mode, format, completion, sync) work via search syntax AND quick pills
  - [ ] Date range filter works
  - [ ] Batch sync works with checkbox + action
  - [ ] Offset pagination works

  **QA Scenarios**:
  ```
  Scenario: Multi-axis filter via search syntax
    Tool: Playwright
    Steps:
      1. Navigate to /dash/gsz
      2. Type "mode:4p format:hanchan sync:unsynced" in search bar
      3. Press Enter
      4. Assert only 4-player hanchan unsynced matches shown
    Expected Result: Compound filter applied correctly
    Evidence: .sisyphus/evidence/task-16-gsz-multifilter.png

  Scenario: Quick filter pills toggle
    Tool: Playwright
    Steps:
      1. Click "4P" pill button
      2. Assert search bar updates to include "mode:4p"
      3. Assert table filtered
      4. Click "4P" again to deselect
      5. Assert "mode:4p" removed from search bar
    Expected Result: Pills sync bidirectionally with search bar
    Evidence: .sisyphus/evidence/task-16-gsz-pills.png
  ```

  **Commit**: YES
  - Message: `refactor(dash): migrate gsz/mahjong page to DashTable`
  - Files: `src/apps/routers/dash/gsz.tsx`, `src/apps/routers/dash/gsz.test.tsx`

- [x] 17. Orders Page Migration to DashTable (Most Complex)

  **What to do**:
  - Replace raw `<table>` in `dash/orders.tsx` with `<DashTable>`
  - Define columns: ID, table, user, start, end, duration, status, amount, actions
  - Wire search: `status:active table:A1 date:>2024-06-01 user:张三`
  - Wire sort (start_at/end_at/amount) via DashTable header click → URL state → GQL variable
  - Wire offset pagination from T11
  - Preserve groupBy dropdown (none/table/user/date) — client-side transformation of sorted server data
  - Preserve real-time SSE subscription for live order status updates
  - Preserve batch operations: select-all, select-by-status, pause/resume/settle via BatchActionBar
  - Preserve cost calculation display (from pricing snapshot data)
  - Status quick filter tabs (all/active/paused/ended)

  **Must NOT do**: Change pricing calculation logic, modify subscription infrastructure, inline edit

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12-T16)
  - **Blocks**: T27
  - **Blocked By**: T4, T11

  **References**:
  - `apps/diceshock/src/apps/routers/dash/orders.tsx` — current (955 lines, most complex page)
  - `apps/diceshock/src/client/graphql/operations/dash-orders.graphql` — query + subscription
  - `apps/diceshock/src/client/components/diceshock/BatchActionBar.tsx` — batch actions
  - `apps/diceshock/src/client/graphql/client.ts` — Apollo SSE subscription setup

  **Acceptance Criteria**:
  - [ ] Orders page renders via DashTable
  - [ ] Sort by start_at/end_at/amount works via header click
  - [ ] Status tabs filter server-side
  - [ ] GroupBy dropdown still produces grouped view
  - [ ] Real-time status changes reflect in table (SSE subscription)
  - [ ] Batch select + pause/resume/settle works
  - [ ] Cost column shows calculated price
  - [ ] Pagination works with current filters/sort preserved

  **QA Scenarios**:
  ```
  Scenario: Sort + filter + pagination combined
    Tool: Playwright
    Steps:
      1. Navigate to /dash/orders
      2. Click "Active" status tab
      3. Click "Start Time" column header (sort desc)
      4. Assert active orders sorted by start time descending
      5. Click "Next page" → assert sort + filter persist
    Expected Result: All 3 states (filter, sort, page) compose correctly
    Evidence: .sisyphus/evidence/task-17-orders-combined.png

  Scenario: Real-time update via SSE
    Tool: Playwright
    Steps:
      1. Navigate to /dash/orders (active tab)
      2. Via API call, change an order's status to "paused"
      3. Assert row updates in real-time (status badge changes) without page refresh
    Expected Result: Live update without manual refresh
    Evidence: .sisyphus/evidence/task-17-orders-realtime.png

  Scenario: Batch operations
    Tool: Playwright
    Steps:
      1. Check 3 active order rows
      2. Assert BatchActionBar shows "3 selected"
      3. Click "Pause" batch action
      4. Confirm dialog
      5. Assert all 3 rows change to "paused" status
    Expected Result: Batch mutation applies to all selected
    Evidence: .sisyphus/evidence/task-17-orders-batch.png
  ```

  **Commit**: YES
  - Message: `refactor(dash): migrate orders page to DashTable`
  - Files: `src/apps/routers/dash/orders.tsx`, `src/apps/routers/dash/orders.test.tsx`

- [x] 18. Chat Streaming Endpoint (Hono + AI SDK + DeepSeek)

  **What to do**:
  - Create `src/server/apis/chat/index.ts` — Hono route group for `/api/chat`
  - POST `/api/chat/stream` — accepts `{ messages: Message[], context?: { page: string, filters?: object } }`
  - Uses `@ai-sdk/deepseek` provider with `streamText()` to call DeepSeek V4 Pro (后台用 Pro 模型，WeChat 保持 Flash)
  - Inject system prompt with: store context, user identity (from session), current page context, available tools
  - Reuse conversation history pattern from WeChat (`conversationContext.ts`) adapted for web (session-based, not openId)
  - Auth guard: `requireStaff` — only staff/admin can use chat
  - Rate limit: 10 requests/min per user
  - Return AI SDK compatible streaming response (for `useChat` hook consumption)
  - TDD: Test endpoint with mock DeepSeek responses

  **Must NOT do**:
  - Build the frontend UI (T20-T21)
  - Implement tool execution (T19)
  - Add mem0ai integration (out of scope for now)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T19-T23)
  - **Blocks**: T19, T21
  - **Blocked By**: T1, T2

  **References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts` — existing DeepSeek integration to reuse patterns from
  - `apps/diceshock/src/server/apis/wechat/conversationContext.ts` — D1-based conversation history
  - `apps/diceshock/src/server/apis/graphqlEndpoint.ts` — auth pattern (session → role resolution)
  - `apps/diceshock/src/main.tsx` — route registration pattern
  - External: https://sdk.vercel.ai/docs/ai-sdk-core/streaming

  **Acceptance Criteria**:
  - [ ] `bun test src/server/apis/chat/index.test.ts` → PASS
  - [ ] POST `/api/chat/stream` returns streaming response compatible with `useChat`
  - [ ] Auth guard rejects unauthenticated requests (401)
  - [ ] Rate limit returns 429 after 10 requests/min
  - [ ] Conversation context saved to D1 per session

  **QA Scenarios**:
  ```
  Scenario: Streaming response works
    Tool: Bash (curl)
    Preconditions: wrangler dev, authenticated session cookie
    Steps:
      1. POST /api/chat/stream with valid session cookie and `{"messages":[{"role":"user","content":"你好"}]}`
      2. Assert response headers: `Content-Type: text/plain; charset=utf-8`, Transfer-Encoding: chunked
      3. Assert incremental text chunks arrive
    Expected Result: Streaming AI response
    Evidence: .sisyphus/evidence/task-18-chat-stream.txt

  Scenario: Auth guard blocks unauthenticated
    Tool: Bash (curl)
    Steps:
      1. POST /api/chat/stream WITHOUT session cookie
      2. Assert 401 response
    Expected Result: 401 Unauthorized
    Evidence: .sisyphus/evidence/task-18-chat-auth.txt
  ```

  **Commit**: YES
  - Message: `feat(chat): streaming endpoint with AI SDK + DeepSeek`
  - Files: `src/server/apis/chat/index.ts`, `src/server/apis/chat/index.test.ts`

- [x] 19. AI Tool Definitions + GQL Executor

  **What to do**:
  - Create `src/server/apis/chat/tools.ts` — define all 6 tools for the AI agent:
    1. `query_gql` — execute read-only GQL query, return results
    2. `mutate_gql` — propose a mutation, return preview (NOT execute yet — needs confirmation)
    3. `generate_totp` — generate TOTP code (reuse from WeChat)
    4. `search_rules` — RAG search D&D/mahjong rules (reuse from WeChat)
    5. `query_active_participants` — list active participants (reuse from WeChat)
    6. `format_search_query` — generate unified search syntax string from natural language
  - Use AI SDK `tool()` definitions with Zod schemas for parameters
  - GQL executor: use existing Apollo server-side execution (not client) with permission checks
  - `mutate_gql` returns `{ query: string, variables: object, affectedRows: number, preview: object }` — does NOT execute
  - Confirmation flow: separate endpoint `POST /api/chat/confirm-mutation` that actually executes
  - Permission injection: pass user's role to GQL context (staff can't do admin ops even via AI)
  - TDD: Test each tool individually

  **Must NOT do**:
  - Build confirmation UI (T22)
  - Execute mutations without confirmation
  - Allow identity management tools
  - Add tools beyond the 6 listed

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18, T20-T23)
  - **Blocks**: T22, T24, T25
  - **Blocked By**: T18

  **References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts:200-400` — existing tool definitions (WeChat format) to port to AI SDK format
  - `apps/diceshock/src/server/apis/wechat/graphql/index.ts` — GQL execution pipeline with permission validation
  - `apps/diceshock/src/server/graphql/guards.ts` — permission guards to apply
  - External: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling

  **Acceptance Criteria**:
  - [ ] `bun test src/server/apis/chat/tools.test.ts` → PASS
  - [ ] `query_gql` executes read queries with permission checks
  - [ ] `mutate_gql` returns preview WITHOUT executing
  - [ ] `format_search_query` generates valid search syntax
  - [ ] Staff user cannot execute admin-only mutations via AI
  - [ ] All Zod schemas validate correctly

  **QA Scenarios**:
  ```
  Scenario: query_gql respects permissions
    Tool: Bash (bun test)
    Steps:
      1. Call query_gql with staff role for `managedUsers` query
      2. Assert phone fields are masked
      3. Call query_gql with staff role for admin-only query
      4. Assert permission denied error
    Expected Result: Permission layer enforced
    Evidence: .sisyphus/evidence/task-19-tools-permissions.txt

  Scenario: mutate_gql returns preview only
    Tool: Bash (bun test)
    Steps:
      1. Call mutate_gql with "pause order X"
      2. Assert response contains query string + variables + preview
      3. Assert order is NOT actually paused in DB
    Expected Result: Preview returned, no side effect
    Evidence: .sisyphus/evidence/task-19-tools-mutate-preview.txt
  ```

  **Commit**: YES
  - Message: `feat(chat): AI tool definitions + GQL executor`
  - Files: `src/server/apis/chat/tools.ts`, `src/server/apis/chat/tools.test.ts`, `src/server/apis/chat/confirmMutation.ts`

- [x] 20. Chat Panel Layout + UI (Right Side, Collapsible)

  **What to do**:
  - Create `src/client/components/dash/ChatPanel.tsx` — right-side panel mirroring left sidebar
  - Desktop: fixed right panel `w-16 hover:w-80` (collapsed = narrow icon strip, expanded = chat)
  - Or: toggle button that slides panel in/out (`w-0` ↔ `w-80` with transition)
  - Mobile: FAB button (bottom-right) → bottom sheet overlay (70vh)
  - Adjust main content: `lg:pr-16` or dynamic padding when panel open
  - Modify `dash.lazy.tsx` layout to include ChatPanel alongside DashNavDrawer
  - Panel contents: message list (scrollable), input area (bottom), minimize button
  - DaisyUI themed (base-200 bg, consistent with left sidebar)
  - Animate open/close with `motion` (already installed)
  - TDD: Test render states (open/closed/mobile)

  **Must NOT do**:
  - Implement actual chat logic (T21)
  - Connect to backend (T18)
  - Build tool result rendering (T22)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18-T19, T21-T23)
  - **Blocks**: T21, T23
  - **Blocked By**: T2

  **References**:
  - `apps/diceshock/src/client/components/diceshock/DashNavMenu.tsx` — left sidebar pattern to mirror
  - `apps/diceshock/src/apps/routers/dash.lazy.tsx` — layout integration point
  - `apps/diceshock/src/client/styles/global.css` or tailwind config — existing style tokens

  **Acceptance Criteria**:
  - [ ] `bun test src/client/components/dash/ChatPanel.test.tsx` → PASS
  - [ ] Panel collapses/expands with smooth animation
  - [ ] Main content adjusts padding when panel opens
  - [ ] Mobile: FAB visible, opens bottom sheet
  - [ ] Desktop: narrow strip always visible, expand on click/hover

  **QA Scenarios**:
  ```
  Scenario: Desktop panel toggle
    Tool: Playwright
    Preconditions: Viewport 1920x1080
    Steps:
      1. Navigate to /dash
      2. Assert narrow chat strip visible on right (icon only)
      3. Click chat icon
      4. Assert panel expands to ~320px with input area
      5. Assert main content padding adjusts
      6. Click minimize → panel collapses back
    Expected Result: Smooth expand/collapse, layout adjusts
    Evidence: .sisyphus/evidence/task-20-panel-desktop.png

  Scenario: Mobile bottom sheet
    Tool: Playwright
    Preconditions: Viewport 375x812 (iPhone)
    Steps:
      1. Navigate to /dash
      2. Assert FAB button visible bottom-right
      3. Tap FAB
      4. Assert bottom sheet slides up (70% viewport)
      5. Assert input area at bottom of sheet
    Expected Result: Mobile-appropriate overlay
    Evidence: .sisyphus/evidence/task-20-panel-mobile.png
  ```

  **Commit**: YES
  - Message: `feat(dash): AI chat panel layout (right side, collapsible)`
  - Files: `src/client/components/dash/ChatPanel.tsx`, `src/client/components/dash/ChatPanel.test.tsx`, `src/apps/routers/dash.lazy.tsx` (modified)

- [x] 21. useChat Integration + Message Rendering

  **What to do**:
  - Wire `useChat` from `@ai-sdk/react` into ChatPanel
  - Configure: `api: '/api/chat/stream'`, include auth credentials
  - Pass page context: `body: { context: { page: currentRoute, filters: currentSearchState } }`
  - Message rendering: markdown via `react-markdown` (already installed) + `remark-gfm` + `rehype-raw`
  - User messages: right-aligned bubble
  - AI messages: left-aligned with avatar, streaming indicator (typing dots during stream)
  - Auto-scroll to bottom on new message
  - Input: textarea with Enter to send, Shift+Enter for newline
  - Store conversation in Jotai atom (persists across route changes within session)
  - Loading state: skeleton messages while waiting for first token
  - Error state: retry button, network error message
  - TDD: Test message rendering, streaming state, error handling

  **Must NOT do**:
  - Implement tool result rendering (T22)
  - Build confirmation UI (T22)
  - Add voice input

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18-T20, T22-T23)
  - **Blocks**: T22, T26
  - **Blocked By**: T18, T20

  **References**:
  - `apps/diceshock/src/server/apis/wechat/types.ts` — message types to reference
  - `apps/diceshock/src/client/hooks/useAuth.ts` — Jotai atom pattern for state persistence
  - External: https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot
  - External: https://sdk.vercel.ai/docs/ai-sdk-ui/streaming

  **Acceptance Criteria**:
  - [ ] `bun test src/client/components/dash/ChatMessages.test.tsx` → PASS
  - [ ] Messages stream incrementally (not wait-for-complete)
  - [ ] Markdown renders correctly (code blocks, lists, bold)
  - [ ] Conversation survives route changes (Jotai persistence)
  - [ ] Error state shows retry option
  - [ ] Auto-scroll works on new messages

  **QA Scenarios**:
  ```
  Scenario: Streaming conversation
    Tool: Playwright
    Steps:
      1. Navigate to /dash, open chat panel
      2. Type "列出所有活跃订单" and press Enter
      3. Assert user message appears right-aligned
      4. Assert typing indicator shows
      5. Assert AI response streams in character by character (left-aligned)
      6. Assert final response rendered as markdown
    Expected Result: Full streaming chat flow
    Evidence: .sisyphus/evidence/task-21-chat-streaming.png

  Scenario: Conversation persists across routes
    Tool: Playwright
    Steps:
      1. Send a message in /dash/orders
      2. Navigate to /dash/users
      3. Assert previous conversation still visible in panel
    Expected Result: Messages preserved across navigation
    Evidence: .sisyphus/evidence/task-21-chat-persist.png
  ```

  **Commit**: YES
  - Message: `feat(dash): useChat integration + message rendering`
  - Files: `src/client/components/dash/ChatMessages.tsx`, `src/client/components/dash/ChatMessages.test.tsx`, `src/client/components/dash/ChatInput.tsx`

- [x] 22. Tool Result Renderer (GQL Query Display + Confirm/Reject)

  **What to do**:
  - Create `src/client/components/dash/ToolResultRenderer.tsx` — renders different tool results inline in chat
  - `query_gql` result: formatted data table/card showing query results (mini DashTable or summary card)
  - `mutate_gql` result: **confirmation card** with:
    - GQL query string (syntax highlighted, collapsible)
    - Variables (formatted JSON)
    - Affected rows count + preview of changes
    - ✅ Confirm / ❌ Reject buttons
    - "Expired" state if not acted on within 5 minutes
  - `format_search_query` result: clickable chip that fills the search bar when clicked
  - `generate_totp` result: styled TOTP code display (large, monospace, copy button)
  - `search_rules` result: markdown content card
  - On confirm: POST `/api/chat/confirm-mutation` → update card to "Executed ✓" state
  - On reject: update card to "Rejected ✗" state, add system message
  - Use AI SDK `experimental_toolCall` / parts rendering pattern
  - TDD: Test each tool result type rendering + confirm/reject flow

  **Must NOT do**:
  - Modify tool logic (T19)
  - Execute mutations directly (must go through confirm endpoint)
  - Add animation beyond simple transitions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18-T21, T23)
  - **Blocks**: T24, T25
  - **Blocked By**: T19, T21

  **References**:
  - `apps/diceshock/src/server/apis/chat/tools.ts` (from T19) — tool output shapes
  - `apps/diceshock/src/server/apis/wechat/messagePipeline.ts` — existing message type rendering logic
  - External: https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot#tool-invocations

  **Acceptance Criteria**:
  - [ ] `bun test src/client/components/dash/ToolResultRenderer.test.tsx` → PASS
  - [ ] Mutation confirmation card shows GQL query highlighted
  - [ ] Confirm button triggers actual mutation execution
  - [ ] Reject button marks card as rejected
  - [ ] 5-minute expiry shows "Expired" state
  - [ ] Search query result is clickable → fills search bar

  **QA Scenarios**:
  ```
  Scenario: Mutation confirmation flow
    Tool: Playwright
    Steps:
      1. In chat, ask "暂停订单 ABC123"
      2. Assert confirmation card appears with GQL mutation displayed
      3. Assert "Confirm" and "Reject" buttons visible
      4. Click "Confirm"
      5. Assert card updates to "Executed ✓"
      6. Assert order actually paused (check table if visible)
    Expected Result: Full confirm → execute → feedback loop
    Evidence: .sisyphus/evidence/task-22-confirm-mutation.png

  Scenario: Reject mutation
    Tool: Playwright
    Steps:
      1. Ask AI to do a mutation
      2. Click "Reject" on confirmation card
      3. Assert card shows "Rejected ✗"
      4. Assert data unchanged
    Expected Result: No side effect on reject
    Evidence: .sisyphus/evidence/task-22-reject-mutation.png
  ```

  **Commit**: YES
  - Message: `feat(dash): tool result renderer + GQL confirmation UI`
  - Files: `src/client/components/dash/ToolResultRenderer.tsx`, `src/client/components/dash/ToolResultRenderer.test.tsx`, `src/client/components/dash/MutationConfirmCard.tsx`

- [x] 23. Mobile FAB + Bottom Sheet Overlay

  **What to do**:
  - Refine mobile experience from T20: proper bottom sheet with drag-to-dismiss
  - FAB button: floating action button, bottom-right corner, chat bubble icon, unread indicator badge
  - Bottom sheet: slide up animation (motion), 70vh max height, draggable handle to resize/dismiss
  - Keyboard handling: sheet adjusts when virtual keyboard opens (iOS/Android)
  - Backdrop: semi-transparent overlay, tap to dismiss
  - Persist open/closed state in Jotai (survives route changes)
  - TDD: Test open/close/drag behaviors

  **Must NOT do**: Desktop layout changes (handled in T20), actual chat logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18-T22)
  - **Blocks**: —
  - **Blocked By**: T20

  **References**:
  - `apps/diceshock/src/client/components/dash/ChatPanel.tsx` (from T20) — mobile stub to enhance
  - Motion library docs for drag gestures
  - DaisyUI modal/drawer patterns for backdrop

  **Acceptance Criteria**:
  - [ ] `bun test src/client/components/dash/MobileChatSheet.test.tsx` → PASS
  - [ ] FAB visible on mobile viewports
  - [ ] Bottom sheet slides up on FAB tap
  - [ ] Drag handle allows resize/dismiss
  - [ ] Keyboard doesn't overlap input

  **QA Scenarios**:
  ```
  Scenario: Full mobile flow
    Tool: Playwright
    Preconditions: Viewport 375x812
    Steps:
      1. Navigate to /dash
      2. Assert FAB visible, no chat panel visible
      3. Tap FAB → sheet slides up
      4. Type message, assert keyboard doesn't overlap input
      5. Drag handle down → sheet dismisses
      6. Assert FAB returns
    Expected Result: Smooth mobile experience
    Evidence: .sisyphus/evidence/task-23-mobile-sheet.png
  ```

  **Commit**: YES
  - Message: `feat(dash): mobile chat FAB + bottom sheet`
  - Files: `src/client/components/dash/MobileChatSheet.tsx`, `src/client/components/dash/MobileChatSheet.test.tsx`

- [x] 24. AI ↔ Search Bridge (format_search_query → Populate Search Bar)

  **What to do**:
  - When AI returns a `format_search_query` tool result, render it as a clickable chip in chat
  - On click: populate the current page's SearchBar with the generated syntax string
  - Update URL search state via TanStack Router `navigate({ search })`
  - Trigger table re-fetch with new filters
  - Bidirectional: user can also ask "帮我搜索上周的活跃订单" → AI generates `status:active date:>2024-06-16` → chip appears → click applies
  - Also support AI reading current search state: pass `currentFilters` in chat context so AI knows what's already filtered
  - TDD: Test chip click → URL update → table refetch chain

  **Must NOT do**:
  - Modify search parser logic (T3)
  - Auto-apply without user click (always require explicit action)
  - Modify DashTable internals

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with T25-T27)
  - **Blocks**: T27
  - **Blocked By**: T3, T19, T22

  **References**:
  - `src/client/lib/searchParser.ts` (from T3) — serialize parsed filters to URL string
  - `src/client/components/dash/ToolResultRenderer.tsx` (from T22) — chip rendering
  - `src/client/components/dash/SearchBar.tsx` (from T4) — programmatic value setting
  - TanStack Router `navigate` pattern from existing dash pages

  **Acceptance Criteria**:
  - [ ] `bun test src/client/components/dash/SearchBridge.test.tsx` → PASS
  - [ ] AI-generated search chip appears in chat
  - [ ] Clicking chip updates SearchBar value + URL + triggers refetch
  - [ ] Current filters passed to AI in context
  - [ ] Does NOT auto-apply (explicit click required)

  **QA Scenarios**:
  ```
  Scenario: AI generates search → user applies
    Tool: Playwright
    Steps:
      1. On /dash/orders, open chat panel
      2. Type "帮我找上周活跃的A1桌订单"
      3. Assert AI returns search chip: `status:active table:A1 date:>2024-06-16`
      4. Click the chip
      5. Assert SearchBar updates with that text
      6. Assert URL params update
      7. Assert table shows filtered results
    Expected Result: Full AI → search → table pipeline
    Evidence: .sisyphus/evidence/task-24-search-bridge.png

  Scenario: AI reads current filters
    Tool: Playwright
    Steps:
      1. On /dash/orders, manually filter "status:active"
      2. Open chat, ask "当前显示的是什么?"
      3. Assert AI response acknowledges "active orders" context
    Expected Result: AI is context-aware of current view
    Evidence: .sisyphus/evidence/task-24-context-aware.png
  ```

  **Commit**: YES
  - Message: `feat(dash): AI ↔ search bridge integration`
  - Files: `src/client/components/dash/SearchBridge.tsx`, `src/client/components/dash/SearchBridge.test.tsx`

- [x] 25. AI Mutation → Apollo Cache Invalidation + Refetch

  **What to do**:
  - After mutation confirmation executes successfully:
    1. Identify affected Apollo cache entities (from mutation response)
    2. Call `client.refetchQueries({ include: [affectedQueryName] })` to refresh table data
    3. Show success toast/notification
  - Map tool `mutate_gql` targets to Apollo query names: `pauseOrder` → refetch `OrdersQuery`, etc.
  - Handle optimistic lock failures: if mutation fails due to stale data (version mismatch), show error in chat + option to retry with fresh data
  - Handle concurrent modification: if Apollo cache has stale data when AI queried, `fetchPolicy: 'network-only'` for AI-triggered queries
  - TDD: Test cache invalidation triggers correctly per mutation type

  **Must NOT do**:
  - Implement optimistic UI updates (too risky for mutation-heavy ops)
  - Bypass confirmation flow
  - Modify Apollo client global config (only AI-triggered queries get network-only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with T24, T26-T27)
  - **Blocks**: T27
  - **Blocked By**: T19, T22

  **References**:
  - `apps/diceshock/src/client/graphql/client.ts` — Apollo client instance, refetchQueries pattern
  - `apps/diceshock/src/server/apis/chat/confirmMutation.ts` (from T19) — mutation execution endpoint
  - `apps/diceshock/src/client/graphql/operations/dash-orders.graphql` — query document names for refetch

  **Acceptance Criteria**:
  - [ ] `bun test src/client/hooks/useChatMutation.test.ts` → PASS
  - [ ] Confirmed mutation → table auto-refreshes with new data
  - [ ] Stale data conflict shows error + retry option
  - [ ] AI queries always use fresh data (network-only)
  - [ ] Success toast appears after confirmed mutation

  **QA Scenarios**:
  ```
  Scenario: Mutation confirmation refreshes table
    Tool: Playwright
    Steps:
      1. On /dash/orders with panel open
      2. Ask AI "暂停订单 XYZ"
      3. Confirm mutation
      4. Assert orders table refreshes (loading state briefly, then updated)
      5. Assert paused order now shows "paused" badge in table
    Expected Result: Table reflects mutation immediately after confirm
    Evidence: .sisyphus/evidence/task-25-cache-refresh.png

  Scenario: Stale data conflict handled
    Tool: Playwright
    Steps:
      1. AI proposes mutation on order
      2. Before confirming, manually change that order via another tab
      3. Click confirm
      4. Assert error message about stale data
      5. Assert "Retry with fresh data" option
    Expected Result: Conflict detected, graceful error
    Evidence: .sisyphus/evidence/task-25-stale-conflict.png
  ```

  **Commit**: YES
  - Message: `feat(dash): AI mutation cache invalidation + refetch`
  - Files: `src/client/hooks/useChatMutation.ts`, `src/client/hooks/useChatMutation.test.ts`

- [x] 26. Conversation State Persistence (Jotai + Route Transitions)

  **What to do**:
  - Create Jotai atoms for chat state: `chatMessagesAtom`, `chatPanelOpenAtom`, `chatContextAtom`
  - `chatMessagesAtom`: array of messages, persists across route changes within same browser session
  - `chatPanelOpenAtom`: boolean, remembered across navigations
  - `chatContextAtom`: derived atom that auto-updates with current route + current page's filter state
  - On route change: update context (page/filters) but preserve conversation
  - Session boundary: clear conversation on logout or browser close (sessionStorage backing)
  - Max messages: cap at 100 messages in Jotai atom, oldest trimmed (server D1 has full history)
  - Integration with `useChat`: configure `initialMessages` from atom, sync `messages` back to atom
  - TDD: Test persistence across simulated route changes

  **Must NOT do**:
  - Persist to localStorage (security: conversation may contain sensitive data)
  - Share across tabs
  - Add mem0ai integration

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with T24-T25, T27)
  - **Blocks**: T27
  - **Blocked By**: T21

  **References**:
  - `apps/diceshock/src/client/hooks/useAuth.ts` — existing Jotai atom patterns (themeA, userInfoA, etc.)
  - `apps/diceshock/src/client/components/dash/ChatPanel.tsx` (from T20) — integration point
  - `apps/diceshock/src/client/components/dash/ChatMessages.tsx` (from T21) — useChat config point

  **Acceptance Criteria**:
  - [ ] `bun test src/client/atoms/chatAtoms.test.ts` → PASS
  - [ ] Conversation persists across /dash/* route changes
  - [ ] Panel open/closed state persists across navigations
  - [ ] Context updates when route changes (AI knows current page)
  - [ ] Messages cleared on logout
  - [ ] Max 100 messages in memory (oldest trimmed)

  **QA Scenarios**:
  ```
  Scenario: Conversation survives navigation
    Tool: Playwright
    Steps:
      1. On /dash/orders, send chat message
      2. Navigate to /dash/users
      3. Assert previous message still in chat panel
      4. Send another message
      5. Navigate back to /dash/orders
      6. Assert both messages visible
    Expected Result: Full conversation preserved
    Evidence: .sisyphus/evidence/task-26-persist-navigate.png

  Scenario: Logout clears conversation
    Tool: Playwright
    Steps:
      1. Send several messages in chat
      2. Trigger logout
      3. Log back in, navigate to /dash
      4. Assert chat panel empty (no previous messages)
    Expected Result: Clean slate after logout
    Evidence: .sisyphus/evidence/task-26-logout-clear.png
  ```

  **Commit**: YES
  - Message: `feat(dash): chat conversation state persistence`
  - Files: `src/client/atoms/chatAtoms.ts`, `src/client/atoms/chatAtoms.test.ts`

- [x] 27. E2E Integration Tests (Playwright)

  **What to do**:
  - Write comprehensive Playwright E2E tests covering the full integrated system:
  - Test suite 1: Table pages — each of 6 pages loads, searches, sorts, paginates, batch actions
  - Test suite 2: AI panel — open panel, send message, receive streaming response, tool results render
  - Test suite 3: AI ↔ Table integration — AI generates search → apply → table filters, AI mutation → confirm → table refreshes
  - Test suite 4: Cross-cutting — mobile viewport, route transitions with panel, error states (network down)
  - Use Playwright fixtures for authenticated staff session
  - Seed test data via GraphQL mutations in `beforeAll`
  - TDD: These are the tests (write them, then verify they pass against the integrated system)

  **Must NOT do**:
  - Test in isolation (that's unit tests in each task) — this is INTEGRATION
  - Skip mobile tests
  - Hard-code wait times (use proper Playwright auto-waiting)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (after T24-T26 + T12-T17 all complete)
  - **Blocks**: F1-F4
  - **Blocked By**: T24, T25, T26, T12-T17

  **References**:
  - Existing Playwright config in project
  - All task QA scenarios above (E2E tests formalize them)
  - `apps/diceshock/src/apps/routers/dash/` — all migrated pages

  **Acceptance Criteria**:
  - [ ] `bunx playwright test` → ALL PASS
  - [ ] Coverage: all 6 table pages, AI panel, AI ↔ table bridge
  - [ ] Mobile viewport tests included
  - [ ] Tests run in <3 minutes total
  - [ ] No flaky tests (retry-free on CI)

  **QA Scenarios**:
  ```
  Scenario: Full integration smoke test
    Tool: Playwright
    Steps:
      1. Login as staff
      2. Navigate to /dash/orders
      3. Assert DashTable renders with data
      4. Open AI panel
      5. Ask "显示活跃订单"
      6. Assert tool result + search chip
      7. Click chip → assert table filters
      8. Ask "暂停第一个订单"
      9. Assert confirmation card
      10. Confirm → assert table refreshes with paused order
    Expected Result: Complete GUI ↔ LUI round trip
    Evidence: .sisyphus/evidence/task-27-e2e-smoke.png

  Scenario: Mobile responsive
    Tool: Playwright
    Preconditions: Viewport 375x812
    Steps:
      1. Navigate to /dash/users
      2. Assert table renders in responsive/card mode
      3. Tap FAB → assert bottom sheet
      4. Send message → assert response
    Expected Result: Mobile works end-to-end
    Evidence: .sisyphus/evidence/task-27-e2e-mobile.png
  ```

  **Commit**: YES
  - Message: `test(e2e): AI panel + table integration tests`
  - Files: `tests/e2e/dash-tables.spec.ts`, `tests/e2e/dash-chat.spec.ts`, `tests/e2e/dash-integration.spec.ts`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + Biome lint + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports. Check for AI slop patterns.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill
  Start from clean state. Test every table page: search, sort, filter, pagination, batch actions. Test AI panel: query, mutation with confirmation, streaming, error states. Cross-page navigation with panel open.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read spec vs actual diff. Verify nothing beyond spec was built (no inline editing, no column persistence, no voice, no form changes). Check WeChat bot still passes existing tests.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **T1**: `spike(dash): validate Vercel AI SDK on CF Workers`
- **T2**: `chore(dash): install tanstack-table + ai-sdk dependencies`
- **T3**: `feat(dash): unified search syntax parser`
- **T4**: `feat(dash): DashTable shared component`
- **T5**: `feat(gql): add unified filter input types`
- **T6-T11**: `refactor(resolver): {entity} DB-level pagination` (one per entity)
- **T12-T17**: `refactor(dash): migrate {page} to DashTable` (one per page)
- **T18-T19**: `feat(chat): streaming endpoint + AI tools`
- **T20-T23**: `feat(dash): AI chat panel UI`
- **T24-T26**: `feat(dash): AI ↔ table integration`
- **T27**: `test(e2e): AI panel + table integration tests`

---

## Success Criteria

### Verification Commands
```bash
bun test                    # Expected: all pass, 0 failures
bunx tsc --noEmit           # Expected: no new errors
bun run build               # Expected: successful build
bunx playwright test        # Expected: E2E pass
```

### Final Checklist
- [x] All 6 table pages render via DashTable + TanStack Table
- [x] Unified search works on all pages with per-table grammar
- [x] AI panel streams responses, shows tool results
- [x] GQL confirmation UI works for mutations
- [x] Batch actions preserved on all applicable pages
- [x] Real-time SSE subscription works on Orders
- [x] URL state round-trips correctly (paste URL → same view)
- [x] Mobile: tables responsive, AI panel via FAB/bottom sheet
- [x] WeChat bot unaffected (run existing integration tests)
- [x] No `Must NOT Have` violations found
