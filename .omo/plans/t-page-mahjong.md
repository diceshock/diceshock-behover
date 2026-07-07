# Plan: T页面小工具 + 日麻公式战

## Metadata
- **Created**: 2026-03-30
- **Status**: DRAFT
- **Scope**: T-page tab restructure, shortcuts, floating bar, mahjong formal match system

## Architecture Overview

### Key Files (existing)
- `apps/diceshock/src/apps/routers/t/$code.tsx` — current monolithic t-page (813 lines)
- `apps/diceshock/src/apps/routers/t.tsx` — t-page layout wrapper
- `apps/diceshock/src/apps/routers/_with-home-lo.tsx` — main site layout (floating bar goes here)
- `apps/diceshock/src/server/durableObjects/SeatTimerDO.ts` — DO to rename/rewrite → SocketDO
- `apps/diceshock/src/server/utils/seatTimer.ts` — server util (notifySeatTimerDO, fetchTableStateForDO)
- `apps/diceshock/src/client/hooks/useSeatTimer.ts` — client WS hook
- `apps/diceshock/wrangler.toml` — DO binding config
- `apps/diceshock/worker-configuration.d.ts` — generated types
- `libs/db/src/schema.ts` — Drizzle DB schema

### Key Files (to create)
- `apps/diceshock/src/shared/mahjong/` — pure logic module (state machine, rules, types)
- `apps/diceshock/src/client/components/diceshock/FloatingOccupancyBar.tsx` — draggable floating bar
- `apps/diceshock/src/client/components/diceshock/MahjongMatch/` — mahjong UI components
- `apps/diceshock/src/client/hooks/useFloatingBar.ts` — drag+dock behavior hook
- `apps/diceshock/src/server/apis/trpc/mahjong.ts` — mahjong tRPC router
- `drizzle/XXXX_mahjong_matches.sql` — D1 migration
- `vitest.config.ts` — test config (root)
- `apps/diceshock/src/shared/mahjong/__tests__/` — test files

### Design Decisions
- **DO rename**: SeatTimerDO → SocketDO, SEAT_TIMER → SOCKET (class + binding)
- **Mahjong state**: Pure functions in `shared/mahjong/` (testable), DO holds runtime state + broadcasts
- **Persistence**: Match results saved to D1 on match end only (not per-round)
- **GSZ API**: NOT connected yet, local simulation only
- **Registration gate**: Real users with verified phone only (no temp identity)
- **Voting**: 三麻 2/3, 四麻 3/4
- **连庄 judgment**: Needs per-round result marker (庄和/闲和/流局) — added to录点 UI
- **场制**: 东风場/半庄, auto-end when all rounds complete or bust (≤0)

### Parallelization Map
```
T1 (DO rename) ──→ T5 (SocketDO mahjong extend) ──→ T8 (mahjong UI)
T2 (test infra) ──→ T6 (mahjong logic tests)
T3 (tab refactor) ─── independent
T4 (floating bar) ─── independent
T7 (DB migration + tRPC) ── depends on T5 types
T9 (integration) ── depends on all

Parallel group A: T1, T2, T3, T4
Parallel group B: T5, T6 (after T1, T2)
Parallel group C: T7, T8 (after T5)
Sequential: T9 (after all)
```

## TODOs

### T1: DO Rename — SeatTimerDO → SocketDO
- [x] Rename `SeatTimerDO` class to `SocketDO` in `apps/diceshock/src/server/durableObjects/SeatTimerDO.ts` → rename file to `SocketDO.ts`
- Acceptance Criteria:
  - `wrangler.toml`: binding `SOCKET`, class_name `SocketDO`, new migration tag `v2` with `renamed_classes = [{from = "SeatTimerDO", to = "SocketDO"}]`
  - `worker-configuration.d.ts`: `SOCKET: DurableObjectNamespace<...SocketDO>`
  - All 9 files updated: `env.SEAT_TIMER` → `env.SOCKET`, import paths updated
  - Files to update: `wrangler.toml`, `worker-configuration.d.ts`, `server/utils/seatTimer.ts`, `server/apis/trpc/ordersManagement.ts`, `server/apis/trpc/tablesManagement.ts`, `server/apis/trpc/tempIdentity.ts`, `server/apis/trpc/tables.ts`, `client/hooks/useSeatTimer.ts`, `server/durableObjects/SeatTimerDO.ts` (rename file)
  - Server util rename: `notifySeatTimerDO` → `notifySocketDO`, `fetchTableStateForDO` stays but import path changes
  - Hook `useSeatTimer` → keep name (it's the seat timer feature), just update internal import
  - `pnpm run build` passes (or `pnpm nx build diceshock`)
  - Existing seat timer functionality unchanged
- Evidence: `grep -r "SeatTimerDO\|SEAT_TIMER" apps/diceshock/` returns 0 matches
- Parallel: YES — independent of T2, T3, T4

### T2: Test Infrastructure Setup
- [x] Create `vitest.config.ts` at project root and write a smoke test to verify vitest runs
- Acceptance Criteria:
  - `vitest.config.ts` at repo root configured for TypeScript with path aliases matching `tsconfig.base.json`
  - Smoke test file `apps/diceshock/src/shared/mahjong/__tests__/smoke.test.ts` with a trivial passing test
  - `pnpm vitest run` exits 0
  - Path alias `@/` resolves correctly in test files
- Evidence: `pnpm vitest run` passes
- Parallel: YES — independent of T1, T3, T4

### T3: T-Page Tab Restructure + Shortcuts
- [x] Refactor `t/$code.tsx` from monolithic layout into a tabbed interface with "主页" tab containing compact sections and shortcut links
- Acceptance Criteria:
  - DaisyUI tabs component at top of page
  - "主页" tab (default active) contains in order:
    1. Compact header row: timer (large), table info (small badge), price estimate (small badge)
    2. TOTP verification code section (with QR)
    3. Quick shortcuts section: two card-style links to `/inventory` and `/actives`
  - All existing functionality preserved (occupy flow, occupancy list, temp identity alerts, etc.)
  - Tab state does NOT affect URL (local state only)
  - Mobile-responsive layout
  - No regressions in existing seat timer flow
  - If scope is "mahjong", a "公式战" tab placeholder appears to the right of "主页" (content: "coming soon" placeholder — actual content in T8)
- Evidence: Visual inspection via browser, `pnpm run build` passes
- Parallel: YES — independent of T1, T2, T4

### T4: Floating Occupancy Bar in _with-home-lo Layout
- [x] Add a draggable, edge-docking floating bar to `_with-home-lo.tsx` that shows active occupancy timer and links to the t-page
- Acceptance Criteria:
  - New component `FloatingOccupancyBar.tsx` in `client/components/diceshock/`
  - New hook `useFloatingBar.ts` in `client/hooks/` for drag + edge-dock behavior
  - Renders in `_with-home-lo.tsx` layout (wrapped in `<ClientOnly>`)
  - Shows only when user has an active or paused occupancy (calls `tables.getMyActiveOccupancy` or `tempIdentity.getActiveOccupancy`)
  - Does NOT show when occupancy status is "ended"
  - Displays: table name, elapsed time (updating live), visual indicator for active vs paused
  - Click navigates to `/t/{code}` via TanStack Router Link
  - Draggable via touch/mouse, snaps to nearest edge when released
  - Persists position in localStorage
  - Does not interfere with page content (fixed position, appropriate z-index)
  - Works on mobile and desktop
- Evidence: Visual inspection via browser, `pnpm run build` passes
- Parallel: YES — independent of T1, T2, T3

### T5: SocketDO — Extend with Mahjong State Management
- [x] Extend the renamed SocketDO to handle mahjong match state broadcasting via WebSocket alongside existing seat timer functionality
- Acceptance Criteria:
  - New message types added to SocketDO:
    - ClientMessage additions: `mahjong_action` with sub-actions: `register`, `select_mode`, `select_seat`, `ready`, `end_round`, `submit_score`, `vote_end`, `cancel_vote`
    - ServerMessage additions: `mahjong_state` broadcasting full match state to all clients
  - Mahjong state stored in DO memory (not DO storage — ephemeral per match):
    - `matchConfig`: { mode: "3p"|"4p", format: "tonpuu"|"hanchan" }
    - `players[]`: { userId, nickname, seat: E/S/W/N, phone, registered, ready, scores[] }
    - `currentRound`: { wind: "east"|"south", roundNumber, honba (本場数), dealerIndex }
    - `phase`: "lobby"|"seat_select"|"countdown"|"playing"|"scoring"|"round_review"|"voting"|"ended"
    - `votes`: { userId, vote: boolean }[]
    - `roundHistory`: per-round score snapshots
  - State machine transitions enforced in DO (invalid transitions rejected with error message)
  - Existing seat timer functionality (table + occupancies broadcast) completely unchanged
  - WebSocket messages are namespaced: seat timer messages use existing format, mahjong messages use `mahjong_` prefix
  - Phase transitions broadcast to all connected clients immediately
  - Countdown (3-2-1) handled server-side via DO alarm
- Dependencies: T1 (DO rename must complete first)
- Evidence: Unit-testable state machine logic lives in `shared/mahjong/`, DO just calls it
- Parallel: NO — depends on T1

### T6: Mahjong Pure Logic Module + Tests
- [x] Create `shared/mahjong/` module with pure functions for all mahjong match logic, and comprehensive vitest tests
- Acceptance Criteria:
  - `shared/mahjong/types.ts` — all TypeScript types/interfaces for match state
  - `shared/mahjong/engine.ts` — pure state machine functions:
    - `createMatch(config)` → initial state
    - `selectSeat(state, userId, seat)` → new state
    - `allReady(state)` → boolean
    - `startMatch(state)` → new state with round 1
    - `submitScore(state, userId, score)` → new state
    - `endRound(state, result: "dealer_win"|"non_dealer_win"|"draw")` → new state with:
      - 连庄 logic: dealer win or draw → dealer stays, honba +1
      - 轮庄 logic: non-dealer win → dealer rotates to next player
      - Round/wind advancement: all players dealt → next wind
      - Auto-end detection: bust (≤0) or format complete
    - `canEndMatch(state)` → boolean (format complete or bust)
    - `voteEnd(state, userId, vote)` → new state
    - `isVotePassed(state)` → boolean (2/3 for 3p, 3/4 for 4p)
    - `getRanking(state)` → sorted player list by points
    - `serializeForDB(state)` → D1-ready object
  - `shared/mahjong/constants.ts` — starting points (35000/25000), seat names, wind names
  - Test files in `shared/mahjong/__tests__/`:
    - `engine.test.ts` — comprehensive tests:
      - Dealer rotation for 3p and 4p
      - 連庄 (dealer keeps) on dealer win and draw
      - 輪庄 (dealer rotates) on non-dealer win
      - Wind progression: east → south for hanchan
      - Auto-end on format completion (tonpuu: 1 rotation, hanchan: 2 rotations)
      - Auto-end on bust (player ≤ 0 points)
      - Voting logic: 2/3 threshold for 3p, 3/4 for 4p
      - Score submission and validation (total points conservation)
      - Full multi-round multi-match simulation (3+ rounds)
      - Edge cases: all players at exactly 0, tie scores, single-round match
      - Phase transition validation (invalid transitions rejected)
  - All tests pass: `pnpm vitest run`
- Dependencies: T2 (vitest config must exist)
- Evidence: `pnpm vitest run` — all tests green
- Parallel: NO — depends on T2; can parallel with T5

### T7: D1 Migration + Mahjong tRPC Router
- [x] Create D1 migration for `mahjong_matches` table and tRPC router for mahjong match persistence and registration
- Acceptance Criteria:
  - Drizzle schema addition in `libs/db/src/schema.ts`:
    - `mahjongMatchesTable`: id, table_id, mode (3p/4p), format (tonpuu/hanchan), started_at, ended_at, termination_reason (format_complete/bust/vote), players (JSON: [{userId, nickname, seat, finalScore}]), round_history (JSON: [{round, wind, honba, dealer, scores: {userId: points}[], result}]), config (JSON), created_at
  - Migration file in `drizzle/` directory
  - tRPC router `server/apis/trpc/mahjong.ts`:
    - `mahjong.saveMatch` (protectedProcedure) — called by SocketDO on match end, saves to D1
    - `mahjong.getMyMatches` (protectedProcedure) — list user's match history
    - `mahjong.getMatchById` (protectedProcedure) — get single match details
    - `mahjong.checkRegistration` (protectedProcedure) — check if user can play (has phone, not temp)
    - `mahjong.register` (protectedProcedure) — local registration (mark user as mahjong-enabled, require phone verification)
  - Router wired into `appRouterPublic` in `server/apis/trpc/index.ts`
  - Schema: `mahjong_registrations` table: id, user_id (unique), registered_at, phone (verified)
  - Build passes with new schema
- Dependencies: T5 (needs types from shared/mahjong/)
- Evidence: `pnpm run build` passes, migration file exists, drizzle can generate
- Parallel: NO — depends on T5 types

### T8: Mahjong Match UI Components (公式战 Tab Content)
- [x] Build the complete mahjong match UI as the "公式战" tab content, replacing the placeholder from T3
- Acceptance Criteria:
  - Component directory: `client/components/diceshock/MahjongMatch/`
  - Sub-components for each stepper phase:
    - `RegistrationGate.tsx` — checks registration, shows "一键开通" for unregistered users, phone verification prompt if no phone, "临时身份不支持" message for temp users
    - `ModeSelect.tsx` — 3p/4p selection + 東風場/半庄 + seat selection (E/S/W/N grid) + ready button + countdown overlay (3,2,1)
    - `MatchBoard.tsx` — current round display (wind+round+honba), points, rankings with dealer badge, "结束本局" and "结算本场" buttons
    - `ScoreInput.tsx` — number input for current points, confirmation dialog (irreversible), loading state while waiting for others
    - `RoundReview.tsx` — point changes, ranking changes, other players' submission status, round result selector (dealer_win/non_dealer_win/draw)
    - `VotePanel.tsx` — vote UI with progress indicator, result display
    - `MatchResult.tsx` — final standings after match ends
  - Parent component `MahjongMatchStepper.tsx` orchestrates phase display based on WebSocket state
  - New hook `useMahjongMatch.ts` — subscribes to mahjong state from SocketDO WebSocket (reuses existing useSeatTimer connection, filters mahjong messages)
  - Irreversible transitions show confirmation dialogs with clear warnings
  - Back navigation blocked at appropriate phases (after all-ready, after score confirm)
  - Real-time updates via WebSocket — all players see state changes immediately
  - Mobile-first responsive design using DaisyUI + Tailwind
- Dependencies: T3 (tab structure), T5 (SocketDO mahjong state), T6 (shared logic types)
- Evidence: Visual inspection via browser, `pnpm run build` passes
- Parallel: NO — depends on T3, T5, T6

### T9: Integration Testing + End-to-End Verification
- [x] Write integration tests simulating complete multi-player multi-match flows and verify all features work together
- Acceptance Criteria:
  - Integration test file: `shared/mahjong/__tests__/integration.test.ts`
  - Test scenarios:
    1. Full 4-player hanchan: setup → 8+ rounds with mixed dealer wins/rotations → format completion → D1 save
    2. Full 3-player tonpuu: setup → 3 rounds → format completion → D1 save
    3. Bust scenario: player goes ≤ 0 mid-match → auto-end → D1 save
    4. Vote end scenario: vote initiated → 3/4 agree → match ends → D1 save
    5. Vote rejection: vote initiated → insufficient votes → match continues
    6. Multi-match sequence: match ends → new match starts → different config
    7. Registration gate: temp user blocked, user without phone prompted, registered user passes
    8. Score validation: total points check, invalid submissions rejected
  - All tests pass: `pnpm vitest run`
  - Build passes: `pnpm run build` (or `pnpm nx build diceshock`)
  - No TypeScript errors: `lsp_diagnostics` clean for all new/modified files
- Dependencies: ALL previous tasks (T1-T8)
- Evidence: `pnpm vitest run` all green, `pnpm run build` exit 0
- Parallel: NO — depends on all

## Final Verification Wave

- [x] F1: Code Quality Review — All new code follows existing patterns (Tailwind+DaisyUI styling, tRPC conventions, Drizzle schema patterns, Hono middleware patterns). No stubs, TODOs, or placeholder implementations remain. All imports correct.
- [x] F2: Functionality Review — Tab restructure shows correct layout. Floating bar appears/disappears correctly. Mahjong stepper flows through all phases. Irreversible transitions are properly guarded. WebSocket sync works for multi-player scenarios.
- [x] F3: Test Suite Review — All vitest tests pass. Tests cover dealer rotation, state transitions, voting thresholds, bust detection, multi-match simulation, D1 serialization. No flaky tests.
- [x] F4: Build & Type Safety — `pnpm run build` passes. Zero TypeScript errors in lsp_diagnostics for all modified files. No regressions in existing functionality (seat timer, occupancy, TOTP).
