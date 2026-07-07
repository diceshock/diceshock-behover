# Multi-Store + i18n Refactor

## TL;DR

> **Quick Summary**: Add multi-store support (光谷 gg, 街道口 jdk) and i18n (9 languages) to the Diceshock board game cafe management system. Route prefix `/{store}-{lang}/` on all public routes, shared users/members/leaderboard, store-scoped orders/inventory/tables/events.
> 
> **Deliverables**:
> - Database schema: `stores` table, `store_inventory` table, `store_id` columns on 6 tables, user preference fields
> - Route restructure: Optional `$storeLocale` prefix on all public routes via TanStack Router
> - i18n infrastructure: Translation loading, 9 locale files, string extraction
> - UI: Logo dropdown switcher, /me preference page, admin store filter
> - WeChat: Preference modification + AI system prompt i18n
> - Full TDD coverage
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves + final
> **Critical Path**: Types/Constants → Server Middleware → tRPC Scoping → UI Components → Verification

---

## Context

### Original Request
用户需要为桌游吧管理系统添加多店铺支持（光谷/街道口）和多语言支持（9种语言）。路由使用可选前缀 `/{store}-{lang}/`，用户/会员/排行共享，订单/库存/桌台各店独立。

### Interview Summary
**Key Discussions**:
- Route format: `/{store}-{lang}/` (e.g., `/gg-zh_Hans/inventory`). Store codes: `gg`, `jdk`. Lang codes use `_` internally.
- Resolution priority: Route > User preference (DB) > Accept-Language header > fallback (gg + zh_Hans)
- Admin dashboard: No route prefix, uses per-page localStorage store filter
- Staff: Global, not per-store scoped
- Board games: Shared catalog + per-store inventory table
- Membership/badges/leaderboard: Global shared
- Testing: TDD full coverage with vitest
- Languages: zh_Hans, zh_Hant, en, ja, ru, es, pt, fr, de
- Preference channels: Web /me page, Logo dropdown, WeChat service account
- WeChat AI system prompt affected by user's preferred store/lang

**Research Findings**:
- 22 existing tables, zero multi-store awareness
- TanStack Router file-based routing with auto-generated route tree
- Hono middleware chain already parses Accept-Language (unused)
- D1/SQLite supports `ALTER TABLE ADD COLUMN` for nullable columns
- tRPC dual router (dash/public) with 4 procedure levels
- All UI strings hardcoded Chinese

### Metis Review
**Identified Gaps** (addressed):
- TanStack Router optional prefix approach: Use `$storeLocale/` directory with server-side redirect for prefix-less URLs
- D1 migration: Nullable `store_id` columns, then backfill script sets all to 'gg'
- Translation fallback: Missing key → zh_Hans string (not raw key)
- Durable Objects: Out of scope, table `code` already identifies store implicitly
- API/tRPC routes: Store passed via Hono context (not URL prefix on /apis/*)
- Translation format: JSON nested keys with ICU MessageFormat for plurals
- URL case sensitivity: Lowercase only, invalid → 404

---

## Work Objectives

### Core Objective
Transform a single-store Chinese-only application into a multi-store, multi-language platform with shared user base and store-scoped operational data.

### Concrete Deliverables
- `libs/db/src/schema.ts`: New tables (stores, store_inventory) + store_id columns + user preference fields
- `drizzle/0043_*.sql`: Migration file
- `apps/diceshock/src/apps/routers/$storeLocale/`: Restructured route tree
- `apps/diceshock/src/shared/i18n/`: Translation infrastructure + 9 locale files
- `apps/diceshock/src/server/middlewares/storeLocale.ts`: Resolution middleware
- UI components: Logo dropdown, /me preferences, admin filter
- Tests: Full vitest coverage for all new logic

### Definition of Done
- [ ] `pnpm x diceshock:build` succeeds
- [ ] `pnpm vitest run` — all tests pass
- [ ] Visiting `/inventory` → 302 redirects to `/gg-zh_Hans/inventory` (for anonymous user with zh Accept-Language)
- [ ] Visiting `/gg-ja/inventory` renders Japanese UI with 光谷 store data
- [ ] Admin `/dash/orders` shows store filter dropdown
- [ ] User can set preferred store/lang in /me page and via WeChat

### Must Have
- Store-scoped data isolation for tables, orders, events, actives, pricing, inventory
- Working language switcher in UI
- Route-based store/lang with proper resolution chain
- All existing Chinese text extracted to translation keys
- zh_Hans 100% complete, other languages have skeleton files
- TDD: Tests written before implementation for all core logic

### Must NOT Have (Guardrails)
- ❌ No Durable Object protocol changes (seat WebSocket stays as-is)
- ❌ No auth flow changes (store/lang is context, not identity)
- ❌ No per-store staff role scoping (staff sees all, filters cosmetically)
- ❌ No per-store branding/theming (shared UI chrome)
- ❌ No RTL layout support (all 9 languages are LTR)
- ❌ No translation of user-generated content (UGC stays as-is)
- ❌ No separate D1 databases per store (single DB, column-based partitioning)
- ❌ No OG card generation changes
- ❌ No email/notification i18n (out of scope)
- ❌ No over-abstracting store resolution (2 stores, hardcoded list is fine for now)
- ❌ Server-side tRPC error messages: remain in Chinese/English, NOT translated to all 9 locales

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest.config.ts at root)
- **Automated tests**: TDD (RED → GREEN → REFACTOR)
- **Framework**: vitest
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright - Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl/fetch) - Send requests, assert status + response fields
- **Library/Module**: Use Bash (vitest) - Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - all parallel, no deps):
├── Task 1: DB schema - stores table + store_inventory [quick]
├── Task 2: DB schema - add store_id to store-specific tables [quick]
├── Task 3: DB schema - user preference fields [quick]
├── Task 4: Types/Constants - store & locale definitions + parse utility [quick]
├── Task 5: i18n infrastructure - library setup + file structure [deep]
└── Task 6: Route restructure - $storeLocale directory + layout route [deep]

Wave 2 (Server Infrastructure - depends on Wave 1):
├── Task 7: Server middleware - store/lang resolution from URL (depends: 4) [deep]
├── Task 8: Server middleware - redirect for prefix-less routes (depends: 4, 7) [unspecified-high]
├── Task 9: tRPC context - add store_id + locale (depends: 4) [unspecified-high]
├── Task 10: i18n client provider + useTranslation + SSR hydration (depends: 5) [deep]
├── Task 11: Extract Chinese strings → zh_Hans translation keys (depends: 5, 10) [unspecified-high]
└── Task 12: Skeleton translation files for 8 other locales (depends: 11) [quick]

Wave 3 (Features - depends on Wave 2):
├── Task 13: tRPC router scoping - filter store-specific queries (depends: 2, 9) [deep]
├── Task 14: Logo dropdown - store/language switcher UI (depends: 6, 10) [visual-engineering]
├── Task 15: /me preferences - language + store settings (depends: 3, 9, 10) [unspecified-high]
├── Task 16: Admin dashboard - store filter dropdown + localStorage (depends: 9) [unspecified-high]
├── Task 17: Registration - auto-fill preferences from page context (depends: 3, 7) [unspecified-high]
├── Task 18: WeChat - preference modification commands (depends: 3, 9) [unspecified-high]
└── Task 19: WeChat AI - system prompt store/lang context (depends: 18) [unspecified-high]

Wave 4 (Polish - depends on Wave 3):
├── Task 20: URL validation - invalid store/lang handling (depends: 7, 8) [quick]
├── Task 21: Data backfill - existing rows → store_id = 'gg' (depends: 2) [quick]
├── Task 22: SEO - html lang, hreflang alternate links (depends: 6, 10) [quick]
├── Task 23: Translation fallback chain - missing key → zh_Hans (depends: 10, 12) [quick]
└── Task 24: Locale-aware formatting - dates, numbers via Intl API (depends: 10) [quick]

Wave FINAL (Verification - after ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 13, 21 |
| 2 | - | 13, 21 |
| 3 | - | 15, 17, 18 |
| 4 | - | 7, 8, 9 |
| 5 | - | 10, 11 |
| 6 | - | 14, 22 |
| 7 | 4 | 8, 17, 20 |
| 8 | 4, 7 | 20 |
| 9 | 4 | 13, 15, 16, 18 |
| 10 | 5 | 11, 14, 15, 22, 23, 24 |
| 11 | 5, 10 | 12 |
| 12 | 11 | 23 |
| 13 | 2, 9 | - |
| 14 | 6, 10 | - |
| 15 | 3, 9, 10 | - |
| 16 | 9 | - |
| 17 | 3, 7 | - |
| 18 | 3, 9 | 19 |
| 19 | 18 | - |
| 20 | 7, 8 | - |
| 21 | 2 | - |
| 22 | 6, 10 | - |
| 23 | 10, 12 | - |
| 24 | 10 | - |

### Agent Dispatch Summary

- **Wave 1**: 6 tasks — T1-T3 → `quick`, T4 → `quick`, T5 → `deep`, T6 → `deep`
- **Wave 2**: 6 tasks — T7 → `deep`, T8 → `unspecified-high`, T9 → `unspecified-high`, T10 → `deep`, T11 → `unspecified-high`, T12 → `quick`
- **Wave 3**: 7 tasks — T13 → `deep`, T14 → `visual-engineering`, T15-T19 → `unspecified-high`
- **Wave 4**: 5 tasks — T20-T24 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

### Wave 1 — Foundation (all parallel, no deps)

- [x] 1. DB Schema: stores table + store_inventory table

  **What to do**:
  - RED: Write tests in `libs/db/src/__tests__/schema-stores.test.ts` verifying:
    - `storesTable` has columns: id, code (unique), name, address, is_active, created_at
    - `storeInventoryTable` has columns: id, store_id (FK→stores), board_game_id (FK→board_games), quantity, status, notes
    - Relations: store_inventory → stores, store_inventory → board_games
  - GREEN: Add to `libs/db/src/schema.ts`:
    - `storesTable`: id (text PK, nanoid), code (text unique, 'gg'|'jdk'), name (text), address (text nullable), is_active (integer default 1), created_at (text default now)
    - `storeInventoryTable`: id (text PK, nanoid), store_id (text, FK→stores.id), board_game_id (text, FK→board_games.id), quantity (integer default 0), status ('available'|'unavailable'|'damaged'), notes (text nullable)
    - Add indexes: store_inventory_store_id_idx, store_inventory_game_id_idx
  - REFACTOR: Add Drizzle relations for both new tables
  - Generate migration: `pnpm drizzle generate`

  **Must NOT do**:
  - Do not modify existing tables in this task
  - Do not seed data (that's Task 21)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Tasks 13, 21
  - **Blocked By**: None

  **References**:
  - `libs/db/src/schema.ts:1-50` — Existing table definition patterns (nanoid PK, text columns, sqliteTable)
  - `libs/db/src/schema.ts:60-100` — boardGamesTable definition (FK target for store_inventory)
  - `drizzle.config.ts` — Migration generation config (dialect: sqlite, driver: d1-http)
  - `libs/db/src/index.ts` — How schema is exported and used

  **Acceptance Criteria**:
  - [ ] Test file exists: `libs/db/src/__tests__/schema-stores.test.ts`
  - [ ] `vitest run libs/db/src/__tests__/schema-stores.test.ts` → PASS
  - [ ] Migration file `drizzle/0043_*.sql` contains CREATE TABLE for both tables

  **QA Scenarios**:
  ```
  Scenario: Stores table schema correct
    Tool: Bash (vitest)
    Preconditions: Test file written
    Steps:
      1. Run `pnpm vitest run libs/db/src/__tests__/schema-stores.test.ts`
      2. Verify table columns match spec
    Expected Result: All tests pass (0 failures)
    Evidence: .sisyphus/evidence/task-1-stores-schema.txt

  Scenario: Migration generates successfully
    Tool: Bash
    Preconditions: Schema changes made
    Steps:
      1. Run `pnpm drizzle generate`
      2. Check drizzle/ directory for new 0043_*.sql file
      3. Verify SQL contains CREATE TABLE stores and CREATE TABLE store_inventory
    Expected Result: Migration file created with correct DDL
    Evidence: .sisyphus/evidence/task-1-migration-gen.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add stores and store_inventory tables`
  - Files: `libs/db/src/schema.ts`, `libs/db/src/__tests__/schema-stores.test.ts`, `drizzle/0043_*.sql`
  - Pre-commit: `vitest run libs/db/src/__tests__/schema-stores.test.ts`

- [x] 2. DB Schema: add store_id to store-specific tables

  **What to do**:
  - RED: Write tests in `libs/db/src/__tests__/schema-store-id.test.ts` verifying:
    - `tablesTable` has `store_id` column (text, nullable, FK→stores)
    - `pricingSnapshotsTable` has `store_id` column
    - `eventsTable` has `store_id` column
    - `activesTable` has `store_id` column
    - `mahjongMatchesTable` has `store_id` column
    - `leaderboardSnapshotsTable` has `store_id` column
  - GREEN: Add nullable `store_id` text column to each table:
    - `tablesTable` — `.references(() => storesTable.id)`
    - `pricingSnapshotsTable` — `.references(() => storesTable.id)`
    - `eventsTable` — `.references(() => storesTable.id)`
    - `activesTable` — `.references(() => storesTable.id)`
    - `mahjongMatchesTable` — `.references(() => storesTable.id)`
    - `leaderboardSnapshotsTable` — `.references(() => storesTable.id)`
  - Add index on `store_id` for each table
  - REFACTOR: Update existing relations to include store reference
  - Note: columns are NULLABLE because existing data has no store_id (backfill in Task 21)

  **Must NOT do**:
  - Do not add store_id to user/membership/badges/shared tables
  - Do not make store_id NOT NULL (backfill hasn't run yet)
  - Do not modify table_occupancy/order_pause_logs (they reference tables which has store_id)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: Tasks 13, 21
  - **Blocked By**: None (uses storesTable ref but same schema file)

  **References**:
  - `libs/db/src/schema.ts:168-200` — tablesTable definition
  - `libs/db/src/schema.ts:250-280` — pricingSnapshotsTable definition
  - `libs/db/src/schema.ts:130-165` — eventsTable definition
  - `libs/db/src/schema.ts:100-130` — activesTable definition
  - `libs/db/src/schema.ts:300-350` — mahjongMatchesTable definition
  - `libs/db/src/schema.ts:380-420` — leaderboardSnapshotsTable definition

  **Acceptance Criteria**:
  - [ ] Test file: `libs/db/src/__tests__/schema-store-id.test.ts`
  - [ ] `vitest run libs/db/src/__tests__/schema-store-id.test.ts` → PASS
  - [ ] Each of 6 tables has `store_id` column that is text, nullable

  **QA Scenarios**:
  ```
  Scenario: store_id columns added to all 6 tables
    Tool: Bash (vitest)
    Preconditions: Schema changes applied
    Steps:
      1. Run `pnpm vitest run libs/db/src/__tests__/schema-store-id.test.ts`
      2. Verify each table has store_id in its column list
    Expected Result: All assertions pass
    Evidence: .sisyphus/evidence/task-2-store-id-columns.txt

  Scenario: Migration includes ALTER TABLE statements
    Tool: Bash
    Preconditions: drizzle generate ran
    Steps:
      1. Check migration file for ALTER TABLE ... ADD COLUMN store_id
      2. Verify 6 ALTER TABLE statements exist
    Expected Result: Migration has correct ALTER TABLE DDL for all 6 tables
    Evidence: .sisyphus/evidence/task-2-migration.txt
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `feat(db): add store_id column to store-specific tables`
  - Files: `libs/db/src/schema.ts`, `libs/db/src/__tests__/schema-store-id.test.ts`, `drizzle/0043_*.sql`
  - Pre-commit: `vitest run libs/db/src/__tests__/schema-store-id.test.ts`

- [x] 3. DB Schema: user preference fields

  **What to do**:
  - RED: Write tests verifying `userInfoTable` has new columns:
    - `preferred_store_id` (text, nullable, FK→stores)
    - `preferred_locale` (text, nullable) — stores locale code like 'zh_Hans', 'en', 'ja'
  - GREEN: Add columns to `userInfoTable` in schema.ts
  - REFACTOR: Update userInfo relations to include store reference

  **Must NOT do**:
  - Do not add to `users` table (auth table stays clean)
  - Do not add default values (preferences start as null = not set)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 15, 17, 18
  - **Blocked By**: None

  **References**:
  - `libs/db/src/schema.ts:70-95` — userInfoTable definition (id, uid, nickname, phone, meta)

  **Acceptance Criteria**:
  - [ ] `userInfoTable` has `preferred_store_id` and `preferred_locale` columns
  - [ ] Tests pass
  - [ ] Migration generated

  **QA Scenarios**:
  ```
  Scenario: User preference columns exist
    Tool: Bash (vitest)
    Steps:
      1. Import userInfoTable from schema
      2. Assert preferred_store_id and preferred_locale in columns
    Expected Result: Both columns present, both nullable text type
    Evidence: .sisyphus/evidence/task-3-user-prefs.txt
  ```

  **Commit**: YES (groups with Tasks 1, 2)
  - Message: `feat(db): add user preference fields (store, locale)`
  - Files: `libs/db/src/schema.ts`
  - Pre-commit: `vitest run`

- [x] 4. Types/Constants: store & locale definitions + parse utility

  **What to do**:
  - RED: Write tests in `apps/diceshock/src/shared/__tests__/store-locale.test.ts`:
    - `STORES` constant has entries for 'gg' and 'jdk' with name, code, address
    - `LOCALES` constant has all 9 locale codes with display names
    - `parseStoreLocalePrefix(segment)` correctly parses: 'gg-zh_Hans' → { store: 'gg', locale: 'zh_Hans' }
    - `parseStoreLocalePrefix('jdk-en')` → { store: 'jdk', locale: 'en' }
    - `parseStoreLocalePrefix('invalid')` → null
    - `parseStoreLocalePrefix('gg-klingon')` → null
    - `buildStoreLocalePrefix(store, locale)` → 'gg-zh_Hans'
    - `resolveLocaleFromAcceptLanguage(header)` → best matching locale
    - `DEFAULT_STORE` = 'gg', `DEFAULT_LOCALE` = 'zh_Hans'
  - GREEN: Create `apps/diceshock/src/shared/store-locale.ts`:
    - Type definitions: `StoreCode`, `LocaleCode`, `StoreLocaleContext`
    - Constants: `STORES`, `LOCALES`, `DEFAULT_STORE`, `DEFAULT_LOCALE`
    - Functions: `parseStoreLocalePrefix`, `buildStoreLocalePrefix`, `resolveLocaleFromAcceptLanguage`, `isValidStore`, `isValidLocale`
  - REFACTOR: Export from shared index

  **Must NOT do**:
  - Do not import from server-only modules (this is shared code)
  - Do not use dynamic imports or async operations
  - Do not over-engineer: simple string parsing, not regex monsters

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 8, 9
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/shared/types/index.ts` — Existing shared type patterns
  - `apps/diceshock/src/shared/utils/` — Existing utility patterns
  - `apps/diceshock/src/server/middlewares/serverMetaInj.ts` — Current Accept-Language parsing (to understand existing format)

  **Acceptance Criteria**:
  - [ ] File exists: `apps/diceshock/src/shared/store-locale.ts`
  - [ ] Test file: `apps/diceshock/src/shared/__tests__/store-locale.test.ts`
  - [ ] `vitest run apps/diceshock/src/shared/__tests__/store-locale.test.ts` → PASS (all parse/build/resolve tests)

  **QA Scenarios**:
  ```
  Scenario: Parse valid store-locale prefixes
    Tool: Bash (vitest)
    Steps:
      1. Run tests covering: gg-zh_Hans, jdk-en, gg-ja, jdk-ru, gg-zh_Hant
      2. Assert each returns correct { store, locale } object
    Expected Result: All valid prefixes parse correctly
    Evidence: .sisyphus/evidence/task-4-parse-valid.txt

  Scenario: Reject invalid prefixes
    Tool: Bash (vitest)
    Steps:
      1. Test: 'invalid', 'xx-en', 'gg-klingon', '', null, 'gg', 'zh_Hans'
      2. Assert all return null
    Expected Result: All invalid inputs return null
    Evidence: .sisyphus/evidence/task-4-parse-invalid.txt

  Scenario: Accept-Language resolution
    Tool: Bash (vitest)
    Steps:
      1. Test: 'ja,en;q=0.9' → 'ja'
      2. Test: 'ru-RU,ru;q=0.9,en;q=0.8' → 'ru'
      3. Test: 'zh-TW,zh;q=0.9' → 'zh_Hant'
      4. Test: '*' → 'zh_Hans' (fallback)
    Expected Result: Best matching locale returned
    Evidence: .sisyphus/evidence/task-4-accept-lang.txt
  ```

  **Commit**: YES
  - Message: `feat(core): add store/locale type definitions and parse utilities`
  - Files: `apps/diceshock/src/shared/store-locale.ts`, `apps/diceshock/src/shared/__tests__/store-locale.test.ts`
  - Pre-commit: `vitest run apps/diceshock/src/shared/__tests__/store-locale.test.ts`

- [x] 5. i18n Infrastructure: library setup + file structure

  **What to do**:
  - RED: Write tests in `apps/diceshock/src/shared/i18n/__tests__/i18n.test.ts`:
    - `getTranslation('zh_Hans', 'common.welcome')` returns Chinese string
    - `getTranslation('en', 'common.welcome')` returns English string
    - `getTranslation('ja', 'missing.key')` falls back to zh_Hans value
    - `formatMessage('greeting', { name: 'Alice' })` interpolates variables
    - All 9 locale files can be loaded without error
  - GREEN: Create i18n infrastructure:
    - `apps/diceshock/src/shared/i18n/index.ts` — Core: `getTranslation(locale, key)`, `formatMessage(key, vars)`, `loadLocale(locale)`
    - `apps/diceshock/src/shared/i18n/types.ts` — Translation key types (nested object structure)
    - `apps/diceshock/src/shared/i18n/locales/zh_Hans.json` — Complete Chinese translation (start with common keys: nav, buttons, errors, pages)
    - `apps/diceshock/src/shared/i18n/locales/{en,ja,zh_Hant,ru,es,pt,fr,de}.json` — Skeleton files (keys present, values = zh_Hans placeholder or English)
    - Fallback chain: requested locale → zh_Hans
    - Variable interpolation: `{variableName}` syntax in strings
  - REFACTOR: Type-safe key access pattern

  **Must NOT do**:
  - Do not install a heavy i18n library (keep lightweight, ~500 lines max)
  - Do not translate all strings yet (just common UI keys for now: ~50 keys)
  - Do not add React context/provider here (that's Task 10)
  - Do not handle pluralization rules in this task (defer to Task 24)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 10, 11
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/shared/types/translate-schema.json` — Existing JSON schema for translation files (nested key→string structure)
  - `apps/diceshock/src/shared/utils/dayjs-config.ts` — Current locale config (zh-cn hardcoded, needs to be dynamic later)
  - No existing i18n library in the project — build from scratch, lightweight

  **Acceptance Criteria**:
  - [ ] `apps/diceshock/src/shared/i18n/` directory created with index.ts, types.ts
  - [ ] 9 locale JSON files in `apps/diceshock/src/shared/i18n/locales/`
  - [ ] `vitest run apps/diceshock/src/shared/i18n/__tests__/i18n.test.ts` → PASS
  - [ ] zh_Hans.json has ≥50 common UI keys
  - [ ] Fallback: missing key in any locale returns zh_Hans value

  **QA Scenarios**:
  ```
  Scenario: Translation loading and retrieval
    Tool: Bash (vitest)
    Steps:
      1. Load zh_Hans locale
      2. Get translation for 'nav.home' → expect Chinese string
      3. Load en locale
      4. Get translation for 'nav.home' → expect English string
    Expected Result: Correct translations returned for each locale
    Evidence: .sisyphus/evidence/task-5-i18n-load.txt

  Scenario: Fallback for missing keys
    Tool: Bash (vitest)
    Steps:
      1. Load ja locale (skeleton with missing keys)
      2. Request key that exists only in zh_Hans
      3. Assert zh_Hans value is returned (not undefined or key literal)
    Expected Result: Fallback chain works correctly
    Evidence: .sisyphus/evidence/task-5-i18n-fallback.txt

  Scenario: Variable interpolation
    Tool: Bash (vitest)
    Steps:
      1. Define template: "欢迎, {name}!"
      2. Call formatMessage with { name: 'Alice' }
      3. Assert result: "欢迎, Alice!"
    Expected Result: Variables correctly replaced
    Evidence: .sisyphus/evidence/task-5-i18n-vars.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): setup translation infrastructure with zh_Hans baseline`
  - Files: `apps/diceshock/src/shared/i18n/**`
  - Pre-commit: `vitest run apps/diceshock/src/shared/i18n/__tests__/i18n.test.ts`

- [x] 6. Route Restructure: $storeLocale directory + layout route

  **What to do**:
  - RED: Write test verifying route tree structure supports optional `$storeLocale` param
  - GREEN: Restructure the TanStack Router file tree:
    - Create layout route: `apps/diceshock/src/apps/routers/($storeLocale).tsx`
      - This is an OPTIONAL layout segment (TanStack Router syntax for optional params)
      - Layout component: reads $storeLocale param, parses it, provides context
      - If invalid → trigger redirect/404 logic (handled by middleware in Task 7/8)
    - Move all current `_with-home-lo/` routes under `($storeLocale)/_with-home-lo/`:
      - `($storeLocale)/_with-home-lo/index.tsx`
      - `($storeLocale)/_with-home-lo/inventory.tsx`
      - `($storeLocale)/_with-home-lo/actives.tsx`
      - etc. (all existing _with-home-lo routes)
    - Move other public routes: `t/`, `ready/`, `my-riichi/` under `($storeLocale)/`
    - `/dash` stays at ROOT level (no $storeLocale prefix for admin)
  - REFACTOR: Regenerate route tree, verify no broken imports

  **Must NOT do**:
  - Do not modify route component logic yet (just file moves)
  - Do not change /dash routes (admin is NOT prefixed)
  - Do not implement actual store/locale resolution (that's middleware Task 7)
  - Do not break existing functionality — route params are optional so bare URLs still match

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 14, 22
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/apps/routers/` — Current route directory structure (38 files)
  - `apps/diceshock/src/apps/routers/__root.tsx` — Root layout (don't move)
  - `apps/diceshock/src/apps/routers/_with-home-lo.tsx` — Public layout route (needs to move under $storeLocale)
  - `apps/diceshock/src/apps/routers/dash.tsx` — Admin layout (stays at root)
  - `apps/diceshock/vite.config.ts:TanStackRouter plugin config` — routesDirectory setting
  - TanStack Router docs: Optional route segments use `($param)` directory naming

  **Acceptance Criteria**:
  - [ ] Route tree regenerates successfully (`pnpm x diceshock:dev` starts without errors)
  - [ ] Visiting `/inventory` still renders (matches optional empty param)
  - [ ] Visiting `/gg-zh_Hans/inventory` matches with storeLocale='gg-zh_Hans'
  - [ ] `/dash` routes still work without prefix
  - [ ] `pnpm x diceshock:build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Route tree regeneration succeeds
    Tool: Bash
    Steps:
      1. Delete routeTree.gen.ts
      2. Run `pnpm x diceshock:dev` (briefly, to trigger regeneration)
      3. Verify routeTree.gen.ts is recreated
      4. Verify no TypeScript errors in route tree
    Expected Result: Route tree generates without errors
    Evidence: .sisyphus/evidence/task-6-route-tree.txt

  Scenario: Build succeeds with new route structure
    Tool: Bash
    Steps:
      1. Run `pnpm x diceshock:build`
      2. Verify exit code 0
    Expected Result: Build completes successfully
    Failure Indicators: TS errors about missing routes, broken imports
    Evidence: .sisyphus/evidence/task-6-build.txt
  ```

  **Commit**: YES
  - Message: `refactor(routes): restructure routes under optional $storeLocale prefix`
  - Files: `apps/diceshock/src/apps/routers/($storeLocale)/**`, `apps/diceshock/src/apps/routeTree.gen.ts`
  - Pre-commit: `pnpm x diceshock:build`

### Wave 2 — Server Infrastructure (depends on Wave 1)

- [x] 7. Server Middleware: store/lang resolution from URL

  **What to do**:
  - RED: Write tests in `apps/diceshock/src/server/middlewares/__tests__/storeLocale.test.ts`:
    - Request to `/gg-zh_Hans/inventory` → context has store='gg', locale='zh_Hans'
    - Request to `/jdk-ja/me` → context has store='jdk', locale='ja'
    - Request to `/inventory` (no prefix) → context has store=null, locale=null (redirect handled by Task 8)
    - Request to `/dash/orders` → middleware skips (admin route)
    - Request to `/apis/trpc/...` → middleware skips (API route)
    - For logged-in user with DB preference: store/locale set from DB when URL has no prefix
  - GREEN: Create `apps/diceshock/src/server/middlewares/storeLocale.ts`:
    - Hono middleware that runs early in the chain (after auth, before route handlers)
    - Parses URL path first segment using `parseStoreLocalePrefix()` from Task 4
    - If valid prefix found: set `c.set('storeCode', store)` and `c.set('locale', locale)` on Hono context
    - If no prefix and user is logged in with preferences: use their DB preferences
    - If no prefix and no preferences: use Accept-Language from serverMetaInj + default store
    - Skip for `/dash/*`, `/apis/*`, `/edge/*`, `/api/auth/*` paths
    - Add `StoreLocaleContext` to `HonoCtxEnv` type
  - REFACTOR: Wire into middleware chain in main.tsx (after userInjMiddleware, before route handlers)

  **Must NOT do**:
  - Do not handle redirects here (that's Task 8)
  - Do not modify tRPC context (that's Task 9)
  - Do not modify existing serverMetaInj middleware

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-12)
  - **Blocks**: Tasks 8, 17, 20
  - **Blocked By**: Task 4

  **References**:
  - `apps/diceshock/src/server/middlewares/serverMetaInj.ts` — Existing middleware pattern (how to access Hono context, skip paths)
  - `apps/diceshock/src/server/middlewares/auth.ts:userInjMiddleware` — How user info is injected into context (read from for preferences)
  - `apps/diceshock/src/shared/store-locale.ts` (Task 4) — parseStoreLocalePrefix function
  - `apps/diceshock/src/shared/types/index.ts` — HonoCtxEnv type definition (needs store/locale fields added)
  - `apps/diceshock/src/main.tsx:middleware chain order` — Where to insert this middleware

  **Acceptance Criteria**:
  - [ ] Middleware file: `apps/diceshock/src/server/middlewares/storeLocale.ts`
  - [ ] Test file passes: `vitest run apps/diceshock/src/server/middlewares/__tests__/storeLocale.test.ts`
  - [ ] HonoCtxEnv updated with storeCode and locale fields
  - [ ] Middleware wired into main.tsx chain

  **QA Scenarios**:
  ```
  Scenario: URL with valid store-locale prefix resolves correctly
    Tool: Bash (vitest)
    Steps:
      1. Simulate request to /gg-ja/inventory
      2. Assert context.storeCode === 'gg'
      3. Assert context.locale === 'ja'
    Expected Result: Store and locale extracted from URL
    Evidence: .sisyphus/evidence/task-7-url-resolve.txt

  Scenario: Admin routes are skipped
    Tool: Bash (vitest)
    Steps:
      1. Simulate request to /dash/orders
      2. Assert middleware does NOT set storeCode/locale
    Expected Result: Middleware passes through without action
    Evidence: .sisyphus/evidence/task-7-skip-admin.txt

  Scenario: Logged-in user with preferences (no URL prefix)
    Tool: Bash (vitest)
    Steps:
      1. Mock user with preferred_store_id='jdk', preferred_locale='ru'
      2. Simulate request to /inventory (no prefix)
      3. Assert context picks up user preferences
    Expected Result: User DB preferences used as fallback
    Evidence: .sisyphus/evidence/task-7-user-prefs.txt
  ```

  **Commit**: YES
  - Message: `feat(server): add store/locale resolution middleware`
  - Files: `apps/diceshock/src/server/middlewares/storeLocale.ts`, `apps/diceshock/src/shared/types/index.ts`, `apps/diceshock/src/main.tsx`
  - Pre-commit: `vitest run apps/diceshock/src/server/middlewares/__tests__/storeLocale.test.ts`

- [x] 8. Server Middleware: redirect for prefix-less routes

  **What to do**:
  - RED: Write tests:
    - Anonymous user visiting `/inventory` with Accept-Language: `ja` → 302 to `/gg-ja/inventory`
    - Logged-in user (pref: jdk, ru) visiting `/actives` → 302 to `/jdk-ru/actives`
    - User visiting `/gg-zh_Hans/inventory` (already has prefix) → NO redirect, pass through
    - User visiting `/dash/orders` → NO redirect
    - User visiting `/apis/...` → NO redirect
    - Preserve query string: `/inventory?page=2` → `/gg-ja/inventory?page=2`
  - GREEN: Create redirect logic (can be same file as Task 7 or separate middleware):
    - If path is a public route AND has no valid store-locale prefix:
      - Resolve target store + locale (user pref > Accept-Language > defaults)
      - 302 redirect to `/${store}-${locale}${path}${search}`
    - Skip: `/dash/*`, `/apis/*`, `/edge/*`, `/api/*`, static assets
  - REFACTOR: Ensure redirect doesn't loop (if prefix present, never redirect)

  **Must NOT do**:
  - Do not 301 (permanent redirect) — use 302 (preferences can change)
  - Do not redirect API calls
  - Do not strip query parameters during redirect

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T9-T12, after T7 conceptually but can develop in parallel with mocks)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 4, 7

  **References**:
  - `apps/diceshock/src/server/middlewares/storeLocale.ts` (Task 7) — Resolution logic to reuse
  - `apps/diceshock/src/main.tsx` — Middleware chain for insertion point
  - Hono redirect API: `c.redirect(url, 302)`

  **Acceptance Criteria**:
  - [ ] Tests pass for all redirect scenarios
  - [ ] Query strings preserved during redirect
  - [ ] No redirect loops possible
  - [ ] Admin and API routes never redirected

  **QA Scenarios**:
  ```
  Scenario: Anonymous user gets redirected with Accept-Language
    Tool: Bash (curl)
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -H "Accept-Language: ja" http://localhost:8787/inventory
      2. Assert status 302
      3. curl -s -o /dev/null -w "%{redirect_url}" -H "Accept-Language: ja" http://localhost:8787/inventory
      4. Assert redirect URL contains /gg-ja/inventory
    Expected Result: 302 redirect to correct prefixed URL
    Evidence: .sisyphus/evidence/task-8-redirect-anon.txt

  Scenario: Query string preserved
    Tool: Bash (curl)
    Steps:
      1. curl -s -o /dev/null -w "%{redirect_url}" http://localhost:8787/inventory?page=2&sort=name
      2. Assert redirect URL ends with ?page=2&sort=name
    Expected Result: Query params kept intact
    Evidence: .sisyphus/evidence/task-8-redirect-query.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `feat(server): add prefix-less route redirect logic`
  - Files: `apps/diceshock/src/server/middlewares/storeLocale.ts`
  - Pre-commit: `vitest run`

- [x] 9. tRPC Context: add store_id + locale

  **What to do**:
  - RED: Write tests verifying tRPC context includes storeCode and locale:
    - Public procedure can access `ctx.storeCode` and `ctx.locale`
    - Dash procedure can access `ctx.storeCode` (from header/query, not URL prefix)
    - Context creation reads from Hono context variables
  - GREEN: Modify `apps/diceshock/src/server/apis/trpc/baseTRPC.ts`:
    - Add `storeCode: string | null` and `locale: string | null` to tRPC context type
    - In context creation function: read from Hono context (set by middleware Task 7)
    - For dash router: read store from request header `X-Store-Code` or query param (admin filter sends it)
  - REFACTOR: Update type exports in shared types

  **Must NOT do**:
  - Do not modify existing procedures yet (that's Task 13)
  - Do not add store filtering to queries here
  - Do not break existing procedure signatures

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 15, 16, 18
  - **Blocked By**: Task 4

  **References**:
  - `apps/diceshock/src/server/apis/trpc/baseTRPC.ts` — Current tRPC context (env, aliyunClient, userInfo, userId, userRole)
  - `apps/diceshock/src/server/middlewares/trpcServerDash.ts` — How dash tRPC context is created from session
  - `apps/diceshock/src/server/middlewares/trpcServerPublic.ts` — How public tRPC context is created

  **Acceptance Criteria**:
  - [ ] tRPC context type includes storeCode and locale
  - [ ] Context creation reads from Hono context variables
  - [ ] Dash router supports X-Store-Code header for admin filter
  - [ ] All existing procedures still compile without changes

  **QA Scenarios**:
  ```
  Scenario: Public tRPC context includes store/locale
    Tool: Bash (vitest)
    Steps:
      1. Mock Hono context with storeCode='gg', locale='en'
      2. Create tRPC context
      3. Assert ctx.storeCode === 'gg' and ctx.locale === 'en'
    Expected Result: Store and locale available in tRPC context
    Evidence: .sisyphus/evidence/task-9-trpc-context.txt

  Scenario: Dash tRPC reads X-Store-Code header
    Tool: Bash (vitest)
    Steps:
      1. Mock request with header X-Store-Code: jdk
      2. Create dash tRPC context
      3. Assert ctx.storeCode === 'jdk'
    Expected Result: Admin store filter passed via header
    Evidence: .sisyphus/evidence/task-9-trpc-dash-header.txt
  ```

  **Commit**: YES
  - Message: `feat(trpc): add store/locale to tRPC context`
  - Files: `apps/diceshock/src/server/apis/trpc/baseTRPC.ts`, trpc middleware files
  - Pre-commit: `vitest run`

- [x] 10. i18n Client Provider + useTranslation hook + SSR hydration

  **What to do**:
  - RED: Write tests:
    - `useTranslation()` hook returns `t` function that retrieves translations
    - `t('nav.home')` returns localized string based on current context
    - `t('greeting', { name: 'Alice' })` interpolates variables
    - Provider correctly hydrates locale from server context (SSR → client)
    - Locale change triggers re-render with new translations
  - GREEN: Create React integration:
    - `apps/diceshock/src/client/providers/I18nProvider.tsx`:
      - React context provider wrapping the app
      - Reads initial locale from `useCrossData()` (server-injected)
      - Loads appropriate locale file
      - Provides `t()` function and current locale to children
    - `apps/diceshock/src/client/hooks/useTranslation.ts`:
      - Hook consuming the i18n context
      - Returns: `{ t, locale, setLocale }`
    - `apps/diceshock/src/client/hooks/useStoreContext.ts`:
      - Hook providing current store context
      - Returns: `{ storeCode, storeName, setStore }`
    - Wire I18nProvider into `__root.tsx` or `($storeLocale).tsx` layout
  - REFACTOR: Add InjectCrossData fields for locale + storeCode (extend server injection)

  **Must NOT do**:
  - Do not extract Chinese strings yet (Task 11)
  - Do not add language-specific formatting (Task 24)
  - Do not bundle all locale files eagerly — lazy load non-current locales

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 14, 15, 22, 23, 24
  - **Blocked By**: Task 5

  **References**:
  - `apps/diceshock/src/shared/i18n/index.ts` (Task 5) — Core i18n functions to wrap
  - `apps/diceshock/src/client/hooks/useCrossData.tsx` — Existing server→client data injection pattern
  - `apps/diceshock/src/apps/routers/__root.tsx` — Where to wire provider
  - `apps/diceshock/src/apps/routers/($storeLocale).tsx` (Task 6) — Layout that has storeLocale param
  - `apps/diceshock/src/shared/types/index.ts:InjectCrossData` — Server injection type to extend

  **Acceptance Criteria**:
  - [ ] I18nProvider created and wired into app root
  - [ ] useTranslation hook works in components
  - [ ] useStoreContext hook works in components
  - [ ] SSR hydration: server locale matches client initial render
  - [ ] Lazy loading: non-current locales loaded on demand

  **QA Scenarios**:
  ```
  Scenario: useTranslation returns correct translations
    Tool: Bash (vitest with React testing library)
    Steps:
      1. Render component wrapped in I18nProvider with locale='en'
      2. Call t('nav.home')
      3. Assert returns English translation
    Expected Result: Hook returns locale-appropriate string
    Evidence: .sisyphus/evidence/task-10-use-translation.txt

  Scenario: SSR hydration matches client
    Tool: Bash (vitest)
    Steps:
      1. Render server-side with locale='ja'
      2. Hydrate client
      3. Assert no hydration mismatch warnings
    Expected Result: Server and client render identical content
    Evidence: .sisyphus/evidence/task-10-ssr-hydration.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): add React provider, hooks, and SSR hydration`
  - Files: `apps/diceshock/src/client/providers/I18nProvider.tsx`, `apps/diceshock/src/client/hooks/useTranslation.ts`, `apps/diceshock/src/client/hooks/useStoreContext.ts`
  - Pre-commit: `vitest run`

- [x] 11. Extract Chinese strings → zh_Hans translation keys

  **What to do**:
  - Systematically go through ALL component files in `apps/diceshock/src/apps/routers/` and `apps/diceshock/src/client/components/`:
    - Replace hardcoded Chinese strings with `t('namespace.key')` calls
    - Add corresponding keys to `zh_Hans.json`
    - Namespace by feature: `nav.*`, `home.*`, `inventory.*`, `actives.*`, `events.*`, `me.*`, `riichi.*`, `common.*`, `errors.*`
  - Update component imports to include `useTranslation` hook
  - Ensure all user-facing text is extracted (buttons, labels, headings, descriptions, placeholders, error messages)

  **Must NOT do**:
  - Do not extract /dash (admin) Chinese strings — admin stays Chinese for now
  - Do not translate: proper nouns (board game names), user-generated content, technical identifiers
  - Do not extract console.log or developer-facing strings
  - Do not modify the meaning of any string during extraction

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 5, 10

  **References**:
  - `apps/diceshock/src/apps/routers/_with-home-lo/index.tsx` — Home page (many Chinese strings)
  - `apps/diceshock/src/apps/routers/_with-home-lo/inventory.tsx` — Inventory page
  - `apps/diceshock/src/apps/routers/_with-home-lo/actives.tsx` — Activities page
  - `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx` — User profile page
  - `apps/diceshock/src/apps/routers/_with-home-lo/riichi.tsx` — Mahjong page
  - `apps/diceshock/src/shared/i18n/locales/zh_Hans.json` (Task 5) — Target file for keys

  **Acceptance Criteria**:
  - [ ] Zero hardcoded Chinese strings remaining in public route components
  - [ ] zh_Hans.json has all extracted keys (≥200 keys expected)
  - [ ] `pnpm x diceshock:build` succeeds (no broken imports)
  - [ ] UI renders identically to before extraction (visual regression check)

  **QA Scenarios**:
  ```
  Scenario: No hardcoded Chinese in public components
    Tool: Bash (grep)
    Steps:
      1. grep -r "[\u4e00-\u9fff]" apps/diceshock/src/apps/routers/\($storeLocale\)/ --include="*.tsx"
      2. Filter out: comments, imports, board game names, console.log
      3. Assert zero matches remain
    Expected Result: No untranslated Chinese strings in public routes
    Evidence: .sisyphus/evidence/task-11-no-chinese.txt

  Scenario: Build still succeeds after extraction
    Tool: Bash
    Steps:
      1. Run pnpm x diceshock:build
      2. Verify exit code 0
    Expected Result: Build passes with all t() calls resolving
    Evidence: .sisyphus/evidence/task-11-build.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): extract all Chinese strings to translation keys`
  - Files: All public route components, `zh_Hans.json`
  - Pre-commit: `pnpm x diceshock:build`

- [x] 12. Skeleton translation files for 8 other locales

  **What to do**:
  - Copy zh_Hans.json structure to all 8 other locale files
  - For `en.json`: Provide actual English translations for ALL keys (machine-translate or manual)
  - For `ja.json`: Provide actual Japanese translations for ALL keys
  - For `zh_Hant.json`: Convert simplified → traditional Chinese for all keys
  - For `ru.json`, `es.json`, `pt.json`, `fr.json`, `de.json`: Use English as placeholder values (marked with [EN] prefix so it's obvious they need translation later)
  - Ensure all files have identical key structure

  **Must NOT do**:
  - Do not leave empty strings (always have a value, even if placeholder)
  - Do not use raw key names as values
  - Do not modify zh_Hans.json in this task

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (after Task 11 delivers final key set)
  - **Blocks**: Task 23
  - **Blocked By**: Task 11

  **References**:
  - `apps/diceshock/src/shared/i18n/locales/zh_Hans.json` (Task 11) — Source of truth for key structure
  - All 8 locale files created as skeletons in Task 5

  **Acceptance Criteria**:
  - [ ] All 9 locale files have identical key structure
  - [ ] en.json: Real English translations
  - [ ] ja.json: Real Japanese translations
  - [ ] zh_Hant.json: Correct traditional Chinese
  - [ ] ru/es/pt/fr/de: English placeholders with [EN] prefix
  - [ ] `vitest run` passes (fallback tests work)

  **QA Scenarios**:
  ```
  Scenario: All locale files have same key count
    Tool: Bash (node script)
    Steps:
      1. Count keys in zh_Hans.json
      2. Count keys in each other locale file
      3. Assert all counts match
    Expected Result: Identical key count across all 9 files
    Evidence: .sisyphus/evidence/task-12-key-parity.txt

  Scenario: English translations are real (not placeholders)
    Tool: Bash (vitest)
    Steps:
      1. Load en.json
      2. Check 10 random keys have English text (not Chinese, not [EN] prefix)
    Expected Result: en.json has real English content
    Evidence: .sisyphus/evidence/task-12-en-real.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): add en/ja/zh_Hant translations, skeleton for ru/es/pt/fr/de`
  - Files: All locale JSON files
  - Pre-commit: `vitest run`

### Wave 3 — Features (depends on Wave 2)

- [x] 13. tRPC Router Scoping: filter store-specific queries

  **What to do**:
  - RED: Write tests for each store-scoped tRPC router:
    - `tables.list` with storeCode='gg' → only returns tables where store_id='gg'
    - `ordersManagement.list` with storeCode='jdk' → only returns occupancies for jdk tables
    - `eventsManagement.list` with storeCode='gg' → only returns gg events
    - `activesManagement.list` → filtered by store
    - `pricingPlansManagement.list` → filtered by store
    - `mahjong.matches` → filtered by store (via table's store_id)
    - `leaderboard.get` → filtered by store
    - Mutations: creating a new table/event/active automatically sets store_id from context
  - GREEN: Modify each store-scoped tRPC sub-router:
    - Add `.where(eq(table.store_id, ctx.storeCode))` to all list/get queries
    - Add `store_id: ctx.storeCode` to all create mutations
    - For nested queries (occupancy via table): join on table.store_id
    - For public procedures: use ctx.storeCode from URL resolution
    - For staff/admin procedures: use ctx.storeCode from X-Store-Code header (can be null = all)
  - REFACTOR: Extract a `withStoreFilter(query, ctx)` helper to reduce repetition

  **Must NOT do**:
  - Do not modify shared/global routes (users, membership, badges, board_games catalog)
  - Do not break existing API contracts — just add filtering
  - Do not make store_id required in queries (admin can still query all with null)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 9

  **References**:
  - `apps/diceshock/src/server/apis/trpc/tables.ts` — Tables router (needs store filter)
  - `apps/diceshock/src/server/apis/trpc/ordersManagement.ts` — Orders router
  - `apps/diceshock/src/server/apis/trpc/eventsManagement.ts` — Events router
  - `apps/diceshock/src/server/apis/trpc/activesManagement.ts` — Activities router
  - `apps/diceshock/src/server/apis/trpc/pricingPlansManagement.ts` — Pricing router
  - `apps/diceshock/src/server/apis/trpc/mahjong.ts` — Mahjong router
  - `apps/diceshock/src/server/apis/trpc/leaderboard.ts` — Leaderboard router
  - `apps/diceshock/src/server/apis/trpc/baseTRPC.ts` (Task 9) — ctx.storeCode access

  **Acceptance Criteria**:
  - [ ] All store-scoped list queries include store_id filter
  - [ ] All store-scoped create mutations auto-set store_id
  - [ ] Admin with storeCode=null sees all data (no filter applied)
  - [ ] Tests cover each scoped router
  - [ ] Existing tests still pass (no regression)

  **QA Scenarios**:
  ```
  Scenario: Tables list filtered by store
    Tool: Bash (vitest)
    Steps:
      1. Seed 3 tables: 2 for gg, 1 for jdk
      2. Call tables.list with ctx.storeCode='gg'
      3. Assert only 2 tables returned
      4. Call tables.list with ctx.storeCode=null
      5. Assert all 3 returned
    Expected Result: Store filter correctly applied
    Evidence: .sisyphus/evidence/task-13-tables-filter.txt

  Scenario: Create mutation auto-sets store_id
    Tool: Bash (vitest)
    Steps:
      1. Call events.create with ctx.storeCode='jdk', title='Test Event'
      2. Query DB directly for the created event
      3. Assert event.store_id === 'jdk'
    Expected Result: store_id automatically assigned from context
    Evidence: .sisyphus/evidence/task-13-create-store-id.txt
  ```

  **Commit**: YES
  - Message: `feat(trpc): scope store-specific queries by store_id`
  - Files: All modified tRPC routers
  - Pre-commit: `vitest run`

- [x] 14. Logo Dropdown: store/language switcher UI

  **What to do**:
  - RED: Write component tests:
    - Dropdown renders with current store highlighted
    - Clicking "光谷店" when on jdk navigates to `/gg-{currentLang}/{currentPath}`
    - Language list shows all 9 languages with native names
    - Clicking a language navigates to `/{currentStore}-{newLang}/{currentPath}`
    - "回到主页" navigates to `/{currentStore}-{currentLang}/`
    - Dropdown closes on outside click
  - GREEN: Create `apps/diceshock/src/client/components/StoreLocaleDropdown.tsx`:
    - Trigger: Click on Logo in header
    - Layout: Three sections:
      1. "回到主页" / "Home" (i18n)
      2. "Languages" section → 9 language options with native display names
      3. Store section → [current store marked] 光谷店 | 街道口店
    - On selection: update URL prefix and navigate (preserving current path)
    - Use `useStoreContext()` and `useTranslation()` hooks
    - Animate: slide down / fade in
  - Wire into Header component (replace or augment current Logo behavior)
  - REFACTOR: Extract shared navigation utility `navigateWithStoreLocale(store, locale, path)`

  **Must NOT do**:
  - Do not auto-save preference to DB on dropdown switch (just URL navigation)
  - Do not show dropdown on /dash routes
  - Do not add complex animations beyond basic slide/fade

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 10

  **References**:
  - `apps/diceshock/src/apps/routers/($storeLocale)/_with-home-lo.tsx` (Task 6) — Header component location
  - `apps/diceshock/src/client/hooks/useTranslation.ts` (Task 10) — i18n hook
  - `apps/diceshock/src/client/hooks/useStoreContext.ts` (Task 10) — Store context hook
  - `apps/diceshock/src/shared/store-locale.ts` (Task 4) — STORES and LOCALES constants with display names

  **Acceptance Criteria**:
  - [ ] Dropdown renders on Logo click
  - [ ] All 9 languages shown with native names
  - [ ] Both stores shown with current one marked
  - [ ] Switching language updates URL correctly
  - [ ] Switching store updates URL correctly
  - [ ] Current path preserved during switch

  **QA Scenarios**:
  ```
  Scenario: Language switch preserves path
    Tool: Playwright
    Steps:
      1. Navigate to /gg-zh_Hans/inventory
      2. Click Logo
      3. Click "English" in language list
      4. Assert URL changed to /gg-en/inventory
      5. Assert page content in English
    Expected Result: Language switched, path preserved
    Evidence: .sisyphus/evidence/task-14-lang-switch.png

  Scenario: Store switch preserves language and path
    Tool: Playwright
    Steps:
      1. Navigate to /gg-ja/actives
      2. Click Logo
      3. Click "街道口店"
      4. Assert URL changed to /jdk-ja/actives
    Expected Result: Store switched, language and path preserved
    Evidence: .sisyphus/evidence/task-14-store-switch.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add store/language switcher dropdown`
  - Files: `apps/diceshock/src/client/components/StoreLocaleDropdown.tsx`, Header component
  - Pre-commit: `vitest run`

- [x] 15. /me Preferences: language + store settings

  **What to do**:
  - RED: Write tests:
    - Preference form shows current user's preferred_locale and preferred_store_id
    - Saving preferences calls tRPC mutation
    - After save, subsequent route visits use saved preferences
    - Form validates: locale must be one of 9 valid codes, store must be 'gg' or 'jdk'
  - GREEN:
    - Add tRPC mutation: `users.updatePreferences({ preferred_locale, preferred_store_id })`
    - Add UI section in `/me` page: "偏好设置" / "Preferences"
      - Dropdown: preferred language (9 options with native names)
      - Dropdown: preferred store (光谷 / 街道口)
      - Save button
    - On save: update user_info row, show success toast
  - REFACTOR: Extract preference form as reusable component

  **Must NOT do**:
  - Do not auto-redirect after saving (just confirm success)
  - Do not modify other /me page sections

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 9, 10

  **References**:
  - `apps/diceshock/src/apps/routers/($storeLocale)/_with-home-lo/me.tsx` — Current /me page
  - `apps/diceshock/src/server/apis/trpc/users.ts` — Users tRPC router (add mutation here)
  - `libs/db/src/schema.ts:userInfoTable` (Task 3) — preferred_store_id, preferred_locale columns

  **Acceptance Criteria**:
  - [ ] Preference section visible on /me page
  - [ ] Dropdowns populated with correct options
  - [ ] Save mutation updates DB successfully
  - [ ] Saved preferences used by resolution middleware on next visit

  **QA Scenarios**:
  ```
  Scenario: Save and verify preference persistence
    Tool: Playwright
    Steps:
      1. Navigate to /gg-zh_Hans/me (logged in)
      2. Change language to "日本語"
      3. Change store to "街道口店"
      4. Click save
      5. Assert success toast shown
      6. Navigate to /inventory (no prefix)
      7. Assert redirected to /jdk-ja/inventory
    Expected Result: Saved preferences drive redirect behavior
    Evidence: .sisyphus/evidence/task-15-prefs-save.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add language/store preference settings in /me`
  - Files: me.tsx, users tRPC router
  - Pre-commit: `vitest run`

- [x] 16. Admin Dashboard: store filter dropdown + localStorage

  **What to do**:
  - RED: Write tests:
    - Filter dropdown renders on relevant admin pages (orders, tables, events, actives, pricing)
    - Selecting "光谷" stores 'gg' in localStorage and refetches data
    - Selecting "所有店铺" stores null and shows all data
    - New page load reads from localStorage and pre-selects filter
    - X-Store-Code header sent with tRPC requests from admin
  - GREEN:
    - Create `apps/diceshock/src/client/components/AdminStoreFilter.tsx`:
      - Dropdown: 光谷 | 街道口 | 所有店铺
      - On change: save to `localStorage.setItem('admin_store_filter', code)`
      - On mount: read from localStorage
    - Wire into relevant /dash pages (orders, tables, events, actives, pricing)
    - Modify tRPC client config: add header interceptor that reads admin store filter and sends X-Store-Code
  - REFACTOR: Create `useAdminStoreFilter()` hook for consistent access

  **Must NOT do**:
  - Do not add filter to user-related admin pages (users are global)
  - Do not persist to DB (localStorage only)
  - Do not add to /dash/gsz (mahjong stats are shared)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:
  - `apps/diceshock/src/apps/routers/dash/orders.tsx` — Admin orders page (needs filter)
  - `apps/diceshock/src/apps/routers/dash/tables.tsx` — Admin tables page
  - `apps/diceshock/src/apps/routers/dash/events.tsx` — Admin events page
  - `apps/diceshock/src/apps/routers/dash/actives.tsx` — Admin actives page
  - `apps/diceshock/src/apps/routers/dash/pricing.tsx` — Admin pricing page
  - `apps/diceshock/src/shared/utils/trpc.ts` — tRPC client configuration (add header interceptor)

  **Acceptance Criteria**:
  - [ ] Filter dropdown visible on 5 admin pages
  - [ ] Selection persists across page navigations via localStorage
  - [ ] X-Store-Code header sent with admin tRPC requests
  - [ ] "所有店铺" shows unfiltered data
  - [ ] Pages not needing filter (users, gsz) don't show it

  **QA Scenarios**:
  ```
  Scenario: Admin store filter persists
    Tool: Playwright
    Steps:
      1. Navigate to /dash/orders (as admin)
      2. Select "街道口" from filter dropdown
      3. Navigate to /dash/tables
      4. Assert filter still shows "街道口" (read from localStorage)
    Expected Result: Filter selection persists across admin pages
    Evidence: .sisyphus/evidence/task-16-admin-filter-persist.png

  Scenario: Filter affects displayed data
    Tool: Playwright
    Steps:
      1. Seed: 2 orders for gg, 1 for jdk
      2. Navigate to /dash/orders, select "光谷"
      3. Assert 2 orders shown
      4. Select "街道口"
      5. Assert 1 order shown
      6. Select "所有店铺"
      7. Assert 3 orders shown
    Expected Result: Data filtered by selected store
    Evidence: .sisyphus/evidence/task-16-admin-filter-data.png
  ```

  **Commit**: YES
  - Message: `feat(dash): add store filter dropdown with localStorage persistence`
  - Files: AdminStoreFilter.tsx, relevant dash pages, tRPC client config
  - Pre-commit: `vitest run`

- [x] 17. Registration: auto-fill preferences from page context

  **What to do**:
  - RED: Write tests:
    - User registering from `/gg-ja/inventory` gets preferred_store_id='gg', preferred_locale='ja'
    - User registering from `/jdk-en/actives` gets jdk + en
    - Preferences stored in user_info on first login/registration
    - WeChat silent auth also captures store/locale from redirect origin
  - GREEN:
    - Modify auth callback (in `apps/diceshock/src/server/middlewares/auth.ts`):
      - On new user creation (signIn callback, isNewUser=true):
        - Read storeCode and locale from Hono context (set by middleware Task 7)
        - Set `preferred_store_id` and `preferred_locale` on the user_info row
    - For WeChat silent auth redirect: pass store/locale as state parameter so it's available on callback
  - REFACTOR: Extract preference-setting logic into reusable function

  **Must NOT do**:
  - Do not override existing user preferences (only set on FIRST registration)
  - Do not modify the auth flow logic (just add preference setting)
  - Do not require preference fields for registration to succeed

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 7

  **References**:
  - `apps/diceshock/src/server/middlewares/auth.ts:signIn callback` — Where new users are created
  - `apps/diceshock/src/server/middlewares/wechatSilentAuth.tsx` — WeChat auto-login flow (needs state param)
  - `apps/diceshock/src/server/middlewares/storeLocale.ts` (Task 7) — Where store/locale are in Hono context

  **Acceptance Criteria**:
  - [ ] New users get preferences set from registration context
  - [ ] Existing users are not affected
  - [ ] WeChat silent auth captures store/locale from origin page
  - [ ] Tests verify preference setting on new user creation

  **QA Scenarios**:
  ```
  Scenario: New user gets preferences from registration URL
    Tool: Bash (vitest)
    Steps:
      1. Mock registration from /jdk-ja/ context
      2. Trigger new user creation via auth callback
      3. Query user_info for the new user
      4. Assert preferred_store_id='jdk', preferred_locale='ja'
    Expected Result: Preferences auto-filled from context
    Evidence: .sisyphus/evidence/task-17-reg-prefs.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): auto-fill user preferences on registration`
  - Files: auth.ts middleware, wechatSilentAuth.tsx
  - Pre-commit: `vitest run`

- [x] 18. WeChat: preference modification commands

  **What to do**:
  - RED: Write tests:
    - User sends "切换语言" or "change language" → bot responds with language options
    - User sends "English" → bot updates preferred_locale to 'en', confirms
    - User sends "切换店铺" or "change store" → bot responds with store options
    - User sends "街道口" → bot updates preferred_store_id to 'jdk', confirms
    - Invalid input → bot responds with help message
  - GREEN:
    - Modify WeChat message handler (AI tool calling or command detection):
      - Add tool/command: `update_user_preference(type: 'locale'|'store', value: string)`
      - On preference change: update user_info table
      - Respond with confirmation in user's preferred language
    - Add preference query: user can ask "我的偏好" / "my preferences" to see current settings
  - REFACTOR: Integrate with existing WeChat conversation flow

  **Must NOT do**:
  - Do not change the core AI chat logic
  - Do not add new WeChat menu buttons (use text commands)
  - Do not require re-authentication after preference change

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 3, 9

  **References**:
  - `apps/diceshock/src/server/apis/wechat/` — WeChat message handler (find the AI chat/tool-calling logic)
  - `libs/db/src/schema.ts:userInfoTable` — Where preferences are stored
  - `apps/diceshock/src/server/apis/trpc/baseTRPC.ts` — How to access DB in server context

  **Acceptance Criteria**:
  - [ ] "切换语言" command shows language options
  - [ ] Selecting a language updates DB and confirms
  - [ ] "切换店铺" command shows store options
  - [ ] "我的偏好" shows current preferences
  - [ ] Tests cover all commands

  **QA Scenarios**:
  ```
  Scenario: User changes language via WeChat
    Tool: Bash (vitest)
    Steps:
      1. Simulate WeChat message: "切换语言"
      2. Assert reply contains language list
      3. Simulate follow-up: "English"
      4. Assert reply confirms change
      5. Verify user_info.preferred_locale updated to 'en'
    Expected Result: Language preference updated via chat
    Evidence: .sisyphus/evidence/task-18-wechat-lang.txt
  ```

  **Commit**: YES
  - Message: `feat(wechat): add preference modification commands`
  - Files: WeChat message handler files
  - Pre-commit: `vitest run`

- [x] 19. WeChat AI: system prompt store/lang context

  **What to do**:
  - RED: Write tests:
    - AI system prompt includes user's preferred store name
    - AI system prompt includes instruction to respond in user's preferred language
    - When user pref is 'ja' → system prompt instructs "respond in Japanese"
    - When user pref store is 'jdk' → system prompt includes 街道口 context (address, hours)
    - Tool calls (inventory, actives) scoped to user's preferred store
  - GREEN:
    - Modify AI system prompt construction:
      - Add store context: "用户当前关联 {storeName} 店（{storeAddress}）"
      - Add language instruction: "请使用 {languageName} 回复用户"
      - Make tool calls (查询库存, 查询活动) pass store_id filter
    - Read preferences from user_info on conversation start
  - REFACTOR: Template the system prompt for maintainability

  **Must NOT do**:
  - Do not change the AI model or API endpoint
  - Do not modify conversation history format
  - Do not break existing tool functions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 18)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 18

  **References**:
  - `apps/diceshock/src/server/apis/wechat/` — AI chat handler with system prompt
  - `apps/diceshock/src/shared/store-locale.ts` (Task 4) — STORES constant with store details

  **Acceptance Criteria**:
  - [ ] System prompt dynamically includes store context
  - [ ] System prompt instructs AI to respond in user's preferred language
  - [ ] Tool calls filter by user's preferred store
  - [ ] Fallback: user without preference gets default (gg + zh_Hans)

  **QA Scenarios**:
  ```
  Scenario: AI responds in user's preferred language
    Tool: Bash (vitest)
    Steps:
      1. Set user preferred_locale='ja'
      2. Build system prompt
      3. Assert prompt contains "日本語で返信してください" or equivalent instruction
    Expected Result: System prompt includes correct language instruction
    Evidence: .sisyphus/evidence/task-19-ai-lang-prompt.txt

  Scenario: AI tool calls scoped to preferred store
    Tool: Bash (vitest)
    Steps:
      1. Set user preferred_store_id='jdk'
      2. Simulate tool call for inventory query
      3. Assert query includes store_id='jdk' filter
    Expected Result: Tool calls respect user's store preference
    Evidence: .sisyphus/evidence/task-19-ai-store-scope.txt
  ```

  **Commit**: YES
  - Message: `feat(wechat): add store/lang context to AI system prompt`
  - Files: WeChat AI handler
  - Pre-commit: `vitest run`

### Wave 4 — Polish (depends on Wave 3)

- [x] 20. URL Validation: invalid store/lang handling

  **What to do**:
  - RED: Write tests:
    - `/xyz-en/inventory` (invalid store) → 404 page
    - `/gg-klingon/inventory` (invalid lang) → 404 page
    - `/GG-ZH_HANS/inventory` (wrong case) → 404 (URLs are case-sensitive, lowercase only)
    - `/gg-zh_Hans/nonexistent-page` → normal 404 (existing behavior)
    - Error page is translated if locale is partially valid
  - GREEN:
    - In storeLocale middleware (Task 7): if prefix segment exists but fails validation:
      - Do NOT redirect — return 404 response
      - Render a localized "Page Not Found" page if possible
    - Ensure middleware distinguishes between "no prefix" (→ redirect) and "invalid prefix" (→ 404)
  - REFACTOR: Add clear error messages explaining valid URL format

  **Must NOT do**:
  - Do not redirect invalid URLs to valid ones (confusing for users)
  - Do not allow case-insensitive matching (would create duplicate URLs for SEO)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 7, 8

  **References**:
  - `apps/diceshock/src/server/middlewares/storeLocale.ts` (Tasks 7, 8) — Resolution middleware to enhance
  - `apps/diceshock/src/shared/store-locale.ts` (Task 4) — Validation functions

  **Acceptance Criteria**:
  - [ ] Invalid store in URL → 404
  - [ ] Invalid locale in URL → 404
  - [ ] No redirect loops for invalid URLs
  - [ ] Tests cover all invalid URL patterns

  **QA Scenarios**:
  ```
  Scenario: Invalid store returns 404
    Tool: Bash (curl)
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/xyz-en/inventory
      2. Assert status 404
    Expected Result: 404 Not Found
    Evidence: .sisyphus/evidence/task-20-invalid-store.txt

  Scenario: Invalid locale returns 404
    Tool: Bash (curl)
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/gg-klingon/inventory
      2. Assert status 404
    Expected Result: 404 Not Found
    Evidence: .sisyphus/evidence/task-20-invalid-locale.txt
  ```

  **Commit**: YES
  - Message: `feat(server): handle invalid store/locale URLs with 404`
  - Files: storeLocale.ts middleware
  - Pre-commit: `vitest run`

- [x] 21. Data Backfill: existing rows → store_id = 'gg'

  **What to do**:
  - RED: Write tests:
    - After backfill script runs: all tables rows have store_id = 'gg'
    - Stores table has exactly 2 entries: gg and jdk
    - Script is idempotent (running twice doesn't error or duplicate)
  - GREEN: Create `scripts/backfill-store-id.ts`:
    - Insert into `stores` table: { code: 'gg', name: '光谷店', address: '...' }, { code: 'jdk', name: '街道口店', address: '...' }
    - UPDATE each store-scoped table: SET store_id = (SELECT id FROM stores WHERE code = 'gg') WHERE store_id IS NULL
    - Tables to update: tables, pricing_snapshots, events, actives, mahjong_matches, leaderboard_snapshots
    - Log count of updated rows per table
  - REFACTOR: Make script runnable via `pnpm run backfill` in package.json

  **Must NOT do**:
  - Do not make store_id NOT NULL after backfill (leave nullable for flexibility)
  - Do not delete or modify existing data
  - Do not run automatically — manual script execution only

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:
  - `libs/db/src/schema.ts` (Tasks 1, 2) — Updated schema with store_id columns
  - `drizzle.config.ts` — D1 connection details for script
  - `scripts/` — Existing scripts directory

  **Acceptance Criteria**:
  - [ ] Script file exists: `scripts/backfill-store-id.ts`
  - [ ] Stores table seeded with gg + jdk entries
  - [ ] All store-scoped rows have store_id set to gg's ID
  - [ ] Script is idempotent

  **QA Scenarios**:
  ```
  Scenario: Backfill sets all existing data to gg
    Tool: Bash
    Steps:
      1. Run `pnpm run backfill` (or ts-node/bun scripts/backfill-store-id.ts)
      2. Query: SELECT count(*) FROM tables WHERE store_id IS NULL
      3. Assert count = 0
      4. Query: SELECT count(*) FROM stores
      5. Assert count = 2
    Expected Result: All rows backfilled, stores seeded
    Evidence: .sisyphus/evidence/task-21-backfill.txt

  Scenario: Script is idempotent
    Tool: Bash
    Steps:
      1. Run backfill script twice
      2. Assert no errors on second run
      3. Assert stores table still has exactly 2 rows (no duplicates)
    Expected Result: Second run succeeds without side effects
    Evidence: .sisyphus/evidence/task-21-idempotent.txt
  ```

  **Commit**: YES
  - Message: `feat(scripts): add store_id backfill script`
  - Files: `scripts/backfill-store-id.ts`, `package.json` (script entry)
  - Pre-commit: `vitest run`

- [x] 22. SEO: html lang + hreflang alternate links

  **What to do**:
  - RED: Write tests:
    - HTML response for `/gg-ja/inventory` has `<html lang="ja">`
    - HTML response contains `<link rel="alternate" hreflang="zh-Hans" href="/gg-zh_Hans/inventory" />`
    - All 9 languages listed as alternates
    - Both stores have alternates (18 total: 9 langs × 2 stores)
    - `x-default` hreflang points to default (gg-zh_Hans version)
  - GREEN:
    - Modify HTML shell rendering (server-side):
      - Set `<html lang="{resolvedLocale}">` dynamically
      - Generate `<link rel="alternate" hreflang="..." href="..." />` for all locale variants
    - Map internal locale codes to BCP47: zh_Hans→zh-Hans, zh_Hant→zh-Hant, etc.
    - Add meta tag: `<meta name="robots" content="index, follow" />`
  - REFACTOR: Extract hreflang generation utility

  **Must NOT do**:
  - Do not add hreflang to /dash pages (admin is not indexed)
  - Do not add sitemap.xml generation (separate task)
  - Do not modify existing OG meta tags

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 10

  **References**:
  - `apps/diceshock/src/server/utils/ogMeta.ts` — Existing meta tag generation pattern
  - `apps/diceshock/src/apps/routers/__root.tsx` — HTML shell where <html> tag is rendered
  - `apps/diceshock/src/shared/store-locale.ts` (Task 4) — Locale codes list

  **Acceptance Criteria**:
  - [ ] `<html lang>` dynamically set from resolved locale
  - [ ] hreflang alternate links for all 9 locales present in HTML head
  - [ ] BCP47 mapping correct (zh_Hans → zh-Hans)
  - [ ] x-default hreflang present

  **QA Scenarios**:
  ```
  Scenario: HTML lang attribute correct
    Tool: Bash (curl + grep)
    Steps:
      1. curl -s http://localhost:8787/gg-ja/inventory
      2. grep '<html.*lang="ja"'
      3. Assert match found
    Expected Result: HTML lang matches requested locale
    Evidence: .sisyphus/evidence/task-22-html-lang.txt

  Scenario: Hreflang alternates present
    Tool: Bash (curl + grep)
    Steps:
      1. curl -s http://localhost:8787/gg-en/inventory
      2. grep 'hreflang' | wc -l
      3. Assert ≥ 9 hreflang links present
    Expected Result: All locale alternates listed
    Evidence: .sisyphus/evidence/task-22-hreflang.txt
  ```

  **Commit**: YES
  - Message: `feat(seo): add dynamic html lang and hreflang alternate links`
  - Files: HTML shell rendering, utility file
  - Pre-commit: `vitest run`

- [x] 23. Translation Fallback Chain: missing key → zh_Hans

  **What to do**:
  - RED: Write comprehensive fallback tests:
    - Key exists in requested locale → return that locale's value
    - Key missing in requested locale but exists in zh_Hans → return zh_Hans value
    - Key missing in both → return key literal with warning in dev mode
    - Nested key resolution: 'nav.items.home' traverses correctly
    - Empty string value (intentional) should NOT trigger fallback
  - GREEN:
    - Verify/enhance the i18n core (Task 5) fallback logic
    - Add dev-mode console warning when fallback is triggered
    - Add reporting: track which keys triggered fallback (for translation coverage metrics)
    - Ensure deeply nested keys work correctly
  - REFACTOR: Add `getMissingKeys(locale)` utility for translation coverage checking

  **Must NOT do**:
  - Do not show raw keys to users (always show zh_Hans fallback)
  - Do not throw errors for missing translations
  - Do not add runtime reporting in production (dev mode only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 10, 12

  **References**:
  - `apps/diceshock/src/shared/i18n/index.ts` (Task 5) — Core i18n logic to enhance
  - `apps/diceshock/src/shared/i18n/locales/` — All locale files

  **Acceptance Criteria**:
  - [ ] Fallback chain works: requested → zh_Hans → key literal
  - [ ] Dev-mode warning logged for missing keys
  - [ ] `getMissingKeys('ja')` returns list of keys only in zh_Hans
  - [ ] Empty string values respected (not treated as missing)

  **QA Scenarios**:
  ```
  Scenario: Fallback returns zh_Hans for missing key
    Tool: Bash (vitest)
    Steps:
      1. Load 'de' locale (has [EN] placeholder values but missing some keys)
      2. Request key that only exists in zh_Hans
      3. Assert zh_Hans value returned
    Expected Result: Graceful fallback without error
    Evidence: .sisyphus/evidence/task-23-fallback.txt

  Scenario: getMissingKeys reports coverage gaps
    Tool: Bash (vitest)
    Steps:
      1. Call getMissingKeys('de')
      2. Assert returns array of key paths
      3. Assert length > 0 (de has placeholders)
    Expected Result: Coverage utility works correctly
    Evidence: .sisyphus/evidence/task-23-missing-keys.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): enhance fallback chain and add coverage utilities`
  - Files: `apps/diceshock/src/shared/i18n/index.ts`
  - Pre-commit: `vitest run`

- [x] 24. Locale-Aware Formatting: dates, numbers via Intl API

  **What to do**:
  - RED: Write tests:
    - `formatDate(date, 'ja')` → Japanese date format (2024年1月15日)
    - `formatDate(date, 'en')` → English format (January 15, 2024)
    - `formatDate(date, 'de')` → German format (15. Januar 2024)
    - `formatNumber(1234.5, 'de')` → '1.234,5'
    - `formatNumber(1234.5, 'en')` → '1,234.5'
    - `formatRelativeTime(pastDate, 'ja')` → '3日前'
    - `formatCurrency(99.5, 'zh_Hans')` → '¥99.50'
  - GREEN: Create `apps/diceshock/src/shared/i18n/formatters.ts`:
    - `formatDate(date, locale, style?)` — uses `Intl.DateTimeFormat`
    - `formatNumber(num, locale)` — uses `Intl.NumberFormat`
    - `formatRelativeTime(date, locale)` — uses `Intl.RelativeTimeFormat`
    - `formatCurrency(amount, locale, currency?)` — uses `Intl.NumberFormat` with currency
    - Map internal locale codes to BCP47 for Intl API
    - Update `dayjs-config.ts` to use dynamic locale instead of hardcoded 'zh-cn'
  - REFACTOR: Replace hardcoded date formatting in existing components with new utilities

  **Must NOT do**:
  - Do not install moment.js or other date libraries (use native Intl)
  - Do not handle timezone conversion (keep existing Asia/Shanghai default)
  - Do not change dayjs dependency (just make its locale dynamic)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 10

  **References**:
  - `apps/diceshock/src/shared/utils/dayjs-config.ts` — Current hardcoded zh-cn locale
  - `apps/diceshock/src/shared/utils/formatDate.ts` — Existing date formatting utility
  - MDN Intl API documentation

  **Acceptance Criteria**:
  - [ ] formatDate works for all 9 locales
  - [ ] formatNumber respects locale number formatting
  - [ ] formatCurrency adds correct currency symbol
  - [ ] dayjs locale configurable per request
  - [ ] Existing date displays not broken

  **QA Scenarios**:
  ```
  Scenario: Date formatting across locales
    Tool: Bash (vitest)
    Steps:
      1. Format same date in all 9 locales
      2. Assert each produces locale-appropriate output
      3. Verify Japanese uses 年月日, German uses dots, English uses commas
    Expected Result: All locales format dates correctly
    Evidence: .sisyphus/evidence/task-24-date-format.txt

  Scenario: Number formatting
    Tool: Bash (vitest)
    Steps:
      1. Format 1234567.89 in en → '1,234,567.89'
      2. Format 1234567.89 in de → '1.234.567,89'
      3. Format 1234567.89 in fr → '1 234 567,89'
    Expected Result: Locale-correct number separators
    Evidence: .sisyphus/evidence/task-24-number-format.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): add locale-aware date/number/currency formatting`
  - Files: `apps/diceshock/src/shared/i18n/formatters.ts`, `dayjs-config.ts`
  - Pre-commit: `vitest run`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + biome lint + `vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Test: visit `/` → redirect to `/gg-zh_Hans/`. Switch language via dropdown → URL updates. Visit `/jdk-ja/inventory` → Japanese UI + jdk store data. Set preferences in /me → subsequent visits use preference. Admin store filter works. Invalid URL → 404.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message | Pre-commit Check |
|------|---------------|-----------------|
| 1 | `feat(db): add multi-store schema (stores, store_inventory, store_id columns)` | `pnpm drizzle generate` succeeds |
| 1 | `feat(core): add store/locale type definitions and parse utilities` | `vitest run --filter store-locale` |
| 1 | `feat(i18n): setup translation infrastructure and zh_Hans baseline` | `vitest run --filter i18n` |
| 2 | `feat(server): add store/lang resolution middleware and redirect logic` | `vitest run --filter middleware` |
| 2 | `feat(i18n): extract Chinese strings and create locale skeleton files` | build succeeds |
| 3 | `feat(trpc): scope store-specific queries by store_id` | `vitest run --filter trpc` |
| 3 | `feat(ui): add store/language switcher and preference settings` | `vitest run` + build |
| 3 | `feat(wechat): add preference commands and i18n system prompt` | `vitest run --filter wechat` |
| 4 | `feat(polish): URL validation, backfill, SEO, fallback chain` | full test suite |

---

## Success Criteria

### Verification Commands
```bash
pnpm x diceshock:build              # Expected: Build succeeds
pnpm vitest run                     # Expected: All tests pass
# Curl tests (after dev server running):
curl -s -o /dev/null -w "%{http_code}" localhost:8787/inventory  # Expected: 302
curl -s -o /dev/null -w "%{redirect_url}" localhost:8787/inventory  # Expected: contains /gg-zh_Hans/inventory
curl -s localhost:8787/gg-ja/inventory | grep -q "lang=\"ja\""  # Expected: 0 (found)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All vitest tests pass
- [ ] Build succeeds with zero TS errors
- [ ] 9 translation files exist with correct structure
- [ ] Store filter in admin dashboard persists across pages
- [ ] User preference saved and used for resolution
