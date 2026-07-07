# 立直麻将重新设计 (Riichi Mahjong Redesign)

## TL;DR

> **Quick Summary**: 将现有的"公式战"麻将系统全面重新设计为"立直麻将"。简化游戏引擎——移除局(round)、庄家(dealer)、场风轮换(wind rotation)等概念,新增"店内/公式战"模式切分,实现全新的录分确认流程,并简化所有相关 UI 页面。
> 
> **Deliverables**:
> - 重写的游戏引擎 (engine.ts) 和类型系统
> - 更新的 SocketDO WebSocket 实时协调
> - 重新设计的游戏 UI (MahjongMatchStepper)
> - 简化的历史记录、Dashboard、Me 页面
> - 数据库迁移 (新增 match_type, 移除 round_history)
> - 全套引擎自动化测试
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Types → Engine → Tests → SocketDO → Client Hook → Stepper UI → DB Migration → Dash/Me/History UI

---

## Context

### Original Request
用户要求将现有的"公式战"(Formula Battle)麻将系统重新设计并重命名为"立直麻将"(Riichi Mahjong)。核心变化:
- 新增 店内/公式战 模式区分
- 移除局(round)、庄家(dealer)概念
- 全新的录分流程(每人各自录分→个人确认可撤回→全部确认锁定)
- 录分完成后自动保持配置新开下一场(跳过选座)
- 投票终止后回到配置页

### Interview Summary
**Key Discussions**:
- "选场风" = 选座位(东南西北),只是换个叫法,逻辑不变
- 计时 = 正计时(从0往上数,显示已打多久)
- 只保留最终分数,不保留每次录分历史(完全移除 roundHistory)
- 临时身份可以参加"店内"模式,不能参加"公式战"模式
- 录分完成后自动下一场 = 保持配置新开一场,跳过选座,直接321倒计时
- 东风场/半庄 = 纯标签,用于未来分开排名,不影响当前游戏逻辑
- 每人录自己的分,独立输入独立确认
- 功能叫"立直麻将",里面两个模式: "店内"和"公式战"

**Research Findings**:
- 当前 engine.ts 有 ~490 行,包含局轮换、庄家管理、风推进等逻辑——全部要移除
- SocketDO 有 ~460 行,包含 alarm 投票超时——保留并适配
- MahjongMatchStepper.tsx 有 ~930 行——需要大幅重写
- gsz.ts 外部 API 对接(gsz.rmlinking.com)——保留不动
- gszManagement.ts 读取 roundHistory/currentRound——需要适配
- DB 有 round_history JSON 字段和特定的 termination_reason 枚举——需要迁移

### Gap Analysis (Self-Conducted)
**Identified Gaps** (addressed):
1. gsz.ts(外部公式战 API 对接)是否需要改动 → 不需要,保留不动
2. 注册流程(mahjongRegistrationsTable)是否改动 → 保留不动
3. DashNavMenu.tsx 中的"公式战"标签 → 需要重命名
4. Homepage sections (MahjongMatch.tsx / JPMahjong.tsx) → 暂不改
5. tables_.$id.tsx 和 users_.$id.tsx 显示的活跃公式战 → 需要适配
6. DB 迁移策略: round_history 列不能真正 DROP(SQLite 限制)→ 改为可选/忽略

---

## Work Objectives

### Core Objective
将"公式战"麻将系统重新设计为"立直麻将",简化游戏引擎,移除局/庄家概念,新增店内/公式战模式区分,实现全新的录分确认流程。

### Concrete Deliverables
- `src/shared/mahjong/types.ts` — 新的类型定义
- `src/shared/mahjong/constants.ts` — 更新常量
- `src/shared/mahjong/engine.ts` — 完全重写的状态机
- `src/shared/mahjong/__tests__/engine.test.ts` — 引擎测试
- `src/server/durableObjects/SocketDO.ts` — 更新的 DO
- `src/client/hooks/useMahjongMatch.ts` — 更新的客户端 Hook
- `src/client/components/diceshock/MahjongMatch/MahjongMatchStepper.tsx` — 重写的游戏 UI
- `src/client/components/diceshock/MahjongMatch/MahjongMatchHistory.tsx` — 简化的历史 UI
- `src/apps/routers/dash/gsz.tsx` — 简化的 Dashboard 列表
- `src/apps/routers/dash/gsz_.$id.tsx` — 简化的 Dashboard 详情
- `src/apps/routers/_with-home-lo/me.tsx` — 更新的 Me 页面
- `src/server/apis/trpc/mahjong.ts` — 更新的 tRPC
- `src/server/apis/trpc/gszManagement.ts` — 更新的管理 API
- `libs/db/src/schema.ts` — 更新的 DB Schema
- `drizzle/XXXX_*.sql` — DB 迁移文件

### Definition of Done
- [ ] `vitest run` 全部通过
- [ ] 所有 UI 中 "公式战" 文本已替换为 "立直麻将"
- [ ] 新游戏流程 config→seat→countdown→playing→scoring→ended 完整可用
- [ ] 录分确认流程(个人确认/撤回/全部锁定)正确工作
- [ ] 录分完成后自动新开一场(跳过选座)
- [ ] 投票终止后回到配置页
- [ ] 临时身份可参加店内模式,不可参加公式战模式
- [ ] 公式战模式自动锁定为半庄四麻

### Must Have
- 新状态机的所有 phase 转换正确
- 每人独立录分和确认/撤回语义
- 全部确认后锁定不可撤回
- 正计时显示(从 startedAt 计算)
- 321 倒计时后自动进入 playing
- 所有 "公式战" 文本重命名为 "立直麻将"

### Must NOT Have (Guardrails)
- **不改**: gsz.ts (外部 API 对接), 注册流程, Homepage sections
- **不加**: 新的路由/页面(只修改现有文件)
- **不做**: 排行榜功能(未来需求,只预留 format 标签)
- **不做**: 局/庄家/风轮换相关的任何残留逻辑
- **不做**: AI slop — 不加多余注释、不过度抽象、不无意义的错误处理

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest, already configured at root)
- **Automated tests**: YES (TDD for engine.ts)
- **Framework**: vitest
- **Test location**: `apps/diceshock/src/shared/mahjong/__tests__/engine.test.ts`

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Engine/Logic**: Use Bash (vitest) — Run tests, assert pass/fail
- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash — TypeCheck with tsc
- **All**: Use lsp_diagnostics to verify no type errors

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — types, constants, engine rewrite + tests):
├── Task 1: Rewrite types.ts — new MatchState, MatchConfig, MatchPhase [quick]
├── Task 2: Update constants.ts — add type labels, update mode labels [quick]
├── Task 3: Rewrite engine.ts — new state machine (depends: 1, 2) [deep]
├── Task 4: Write engine tests (depends: 3) [deep]

Wave 2 (Server — SocketDO, tRPC, DB):
├── Task 5: Update SocketDO.ts — new message types, new flow (depends: 1, 3) [unspecified-high]
├── Task 6: Update tRPC mahjong.ts — adapt saveMatch/getMyMatches (depends: 1) [quick]
├── Task 7: Update DB schema + migration (depends: 1) [quick]
├── Task 8: Update gszManagement.ts — remove round refs (depends: 1, 7) [quick]

Wave 3 (Client — hook, stepper, history):
├── Task 9: Update useMahjongMatch.ts hook (depends: 1, 5) [quick]
├── Task 10: Rewrite MahjongMatchStepper.tsx (depends: 1, 9) [visual-engineering]
├── Task 11: Simplify MahjongMatchHistory.tsx (depends: 1) [visual-engineering]

Wave 4 (Dashboard, Me, rename):
├── Task 12: Simplify dash/gsz.tsx (depends: 8) [visual-engineering]
├── Task 13: Simplify dash/gsz_.$id.tsx (depends: 8) [visual-engineering]
├── Task 14: Update Me page (depends: 11) [quick]
├── Task 15: Rename 公式战→立直麻将 across all files (depends: 10-14) [quick]
├── Task 16: Update DashNavMenu + tRPC index + misc references [quick]

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 3 → Task 4 → Task 5 → Task 9 → Task 10 → Task 15 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 3, 5, 6, 7, 8, 9, 10, 11 |
| 2 | — | 3 |
| 3 | 1, 2 | 4, 5, 9 |
| 4 | 3 | — |
| 5 | 1, 3 | 9 |
| 6 | 1 | — |
| 7 | 1 | 8 |
| 8 | 1, 7 | 12, 13 |
| 9 | 1, 5 | 10 |
| 10 | 1, 9 | 15 |
| 11 | 1 | 14 |
| 12 | 8 | 15 |
| 13 | 8 | 15 |
| 14 | 11 | 15 |
| 15 | 10-14 | F1-F4 |
| 16 | — | 15 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1 `quick`, T2 `quick`, T3 `deep`, T4 `deep`
- **Wave 2**: 4 tasks — T5 `unspecified-high`, T6 `quick`, T7 `quick`, T8 `quick`
- **Wave 3**: 3 tasks — T9 `quick`, T10 `visual-engineering`, T11 `visual-engineering`
- **Wave 4**: 5 tasks — T12 `visual-engineering`, T13 `visual-engineering`, T14 `quick`, T15 `quick`, T16 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [ ] 1. Rewrite types.ts — New type definitions for simplified mahjong

  **What to do**:
  - Rewrite `apps/diceshock/src/shared/mahjong/types.ts` completely
  - New `MatchPhase`: `"config_select" | "seat_select" | "countdown" | "playing" | "scoring" | "voting" | "ended"`
  - New `MatchConfig`: `{ type: "store" | "tournament"; mode: "3p" | "4p"; format: "tonpuu" | "hanchan" }`
  - New `MatchType`: `"store" | "tournament"`
  - New `TerminationReason`: `"score_complete" | "vote" | "admin_abort" | "order_invalid"` (remove "bust", "format_complete")
  - Simplified `PlayerState`: `{ userId, nickname, seat, phone, registered, currentPoints }` — remove `ready` (not needed in new flow)
  - Simplified `MatchState`: remove `currentRound`, `roundHistory`, `roundCounter`. Add `scoreConfirmed: Record<string, boolean>`
  - Remove `RoundState`, `RoundRecord`, `RoundResult` types entirely
  - Keep `Vote` type
  - Update `MatchResultForDB`: remove `roundHistory`, add `matchType`, remove `seat` requirement (keep optional)

  **Must NOT do**:
  - Don't add unnecessary types for features not requested
  - Don't keep any round/dealer related types

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2)
  - **Blocks**: Tasks 3, 5, 6, 7, 8, 9, 10, 11
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/shared/mahjong/types.ts` — Current type definitions to replace. Read the entire file to understand what exists, then rewrite.

  **API/Type References**:
  - `apps/diceshock/src/shared/mahjong/constants.ts` — Seat and Wind types imported here, keep those imports working
  - `apps/diceshock/src/shared/mahjong/engine.ts` — The engine imports all types from here; ensure new types are compatible with what engine will need

  **WHY Each Reference Matters**:
  - types.ts is the single source of truth for all mahjong type definitions. Every other file imports from here. Getting the types right first unblocks all other tasks.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation passes with new types
    Tool: Bash
    Preconditions: types.ts has been rewritten
    Steps:
      1. Run `npx tsc --noEmit --pretty 2>&1 | head -50` from project root
      2. Check that types.ts itself has no errors (may have downstream errors from other files that haven't been updated yet — that's expected and OK)
    Expected Result: types.ts file itself compiles without errors
    Evidence: .sisyphus/evidence/task-1-typecheck.txt

  Scenario: No round/dealer types remain
    Tool: Bash (grep)
    Steps:
      1. Search types.ts for "RoundState", "RoundRecord", "RoundResult", "dealerIndex", "honba", "roundNumber"
    Expected Result: Zero matches found
    Evidence: .sisyphus/evidence/task-1-no-round-types.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `refactor(mahjong): rewrite engine with simplified state machine (no rounds/dealer)`
  - Files: `apps/diceshock/src/shared/mahjong/types.ts`

- [ ] 2. Update constants.ts — Add match type labels and update mode labels

  **What to do**:
  - Update `apps/diceshock/src/shared/mahjong/constants.ts`
  - Add `MatchType` as a type: `"store" | "tournament"`
  - Add `MATCH_TYPE_LABELS`: `{ store: "店内", tournament: "公式战" }`
  - Add `MODE_LABELS`: `{ "3p": "三麻", "4p": "四麻" }`
  - Add `FORMAT_LABELS`: `{ tonpuu: "东风场", hanchan: "半庄" }`
  - Add `TERMINATION_LABELS`: `{ score_complete: "录分完成", vote: "投票结算", admin_abort: "管理员终止", order_invalid: "订单失效" }`
  - Add `PHASE_LABELS`: `{ config_select: "配置中", seat_select: "选座中", countdown: "倒计时", playing: "对局中", scoring: "录分中", voting: "投票中", ended: "已结束" }`
  - Keep existing SEAT_LABELS, WIND_LABELS, Seat, Wind types, SEATS_3P, SEATS_4P, STARTING_POINTS
  - Add `COUNTDOWN_SECONDS = 3`

  **Must NOT do**:
  - Don't remove existing seat/wind constants that are still needed

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/shared/mahjong/constants.ts` — Current constants file. Keep SEAT_LABELS, WIND_LABELS, SEATS_*, STARTING_POINTS_*. Add new label maps.

  **WHY Each Reference Matters**:
  - constants.ts defines shared display labels used across all UI components. Centralizing them here avoids duplicate label maps in gsz.tsx, MahjongMatchHistory.tsx, MahjongMatchStepper.tsx, and gsz_.$id.tsx.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Constants file exports all required labels
    Tool: Bash (grep)
    Steps:
      1. Check constants.ts contains: MATCH_TYPE_LABELS, MODE_LABELS, FORMAT_LABELS, TERMINATION_LABELS, PHASE_LABELS, COUNTDOWN_SECONDS
    Expected Result: All 6 constants found
    Evidence: .sisyphus/evidence/task-2-constants.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Files: `apps/diceshock/src/shared/mahjong/constants.ts`

- [ ] 3. Rewrite engine.ts — New simplified state machine

  **What to do**:
  - Completely rewrite `apps/diceshock/src/shared/mahjong/engine.ts`
  - New state machine phases: `config_select → seat_select → countdown → playing → scoring → ended` (with `voting` branch from `playing`)
  - **Functions to implement**:
    - `createInitialState()`: Returns MatchState with phase `config_select`, empty players, null config
    - `setConfig(state, config)`: Set config. If type="tournament", force mode="4p" and format="hanchan". Only in config_select phase.
    - `startSeatSelect(state)`: Transition config_select → seat_select
    - `backToConfig(state)`: Transition seat_select → config_select, clear players
    - `addPlayer(state, player)`: Add player to players array with starting points based on mode. Guard: if config.type="tournament" and player is temp (not registered), throw error
    - `selectSeat(state, userId, seat)`: Assign seat to player
    - `allSeated(state)`: Check if all required seats are filled
    - `startCountdown(state)`: Transition seat_select → countdown (when all seated)
    - `startMatch(state)`: Transition countdown → playing, set startedAt
    - `beginScoring(state)`: Transition playing → scoring, clear pendingScores and scoreConfirmed
    - `submitScore(state, userId, points)`: Record a player's score in pendingScores
    - `confirmScore(state, userId)`: Set scoreConfirmed[userId] = true (individual confirm)
    - `cancelConfirm(state, userId)`: Set scoreConfirmed[userId] = false (individual cancel). Only if NOT all confirmed yet.
    - `allScoresConfirmed(state)`: Check if all players have submitted AND confirmed
    - `finalizeScoring(state)`: When all confirmed, transition scoring → ended with terminationReason "score_complete", set endedAt, update players' currentPoints from pendingScores
    - `initiateVote(state)`: Transition playing → voting
    - `castVote(state, userId, vote)`: Record vote
    - `resolveVote(state)`: Resolve vote — if passed, ended with "vote"; if failed, back to playing
    - `resolveVoteByTimeout(state)`: Timeout resolution (same logic as before)
    - `isVotePassed(state)`, `isVoteFailed(state)`: Vote calculation (same thresholds: 3/4 or 2/3)
    - `resetKeepConfig(state)`: Reset to seat_select with same config (for auto-new-match after scoring)
    - `resetToConfig(state)`: Reset to config_select (for after vote termination)
    - `getRanking(state)`: Sort players by currentPoints
    - `abortMatch(state, reason)`: Admin abort
    - `serializeForDB(state)`: Serialize for DB — include matchType from config.type, NO roundHistory
  - **Remove entirely**: advanceRound, endRound, confirmScores (old multi-round confirm), windCount, all dealer/round/wind rotation logic

  **Must NOT do**:
  - Don't keep any round/dealer/wind rotation logic
  - Don't keep roundHistory, roundCounter, currentRound in state
  - Don't add `ready` flag to PlayerState (removed)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T1, T2)
  - **Parallel Group**: Wave 1 (sequential after T1+T2)
  - **Blocks**: Tasks 4, 5, 9
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/shared/mahjong/engine.ts` — Current engine to replace. Study the existing function signatures and how they're called from SocketDO.ts to ensure new functions cover all needed transitions.
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:257-395` — handleMahjongAction method shows exactly which engine functions are called and how. New engine must provide equivalent functions for the new flow.

  **API/Type References**:
  - `apps/diceshock/src/shared/mahjong/types.ts` — New types from Task 1
  - `apps/diceshock/src/shared/mahjong/constants.ts` — Updated constants from Task 2

  **WHY Each Reference Matters**:
  - engine.ts is the core state machine shared between server (SocketDO) and client. It must be pure functions with no side effects. SocketDO.ts shows exactly how each function is called so new engine must maintain the same call pattern (state in → state out).

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Engine compiles with new types
    Tool: Bash
    Steps:
      1. Run lsp_diagnostics on engine.ts
    Expected Result: No type errors in engine.ts
    Evidence: .sisyphus/evidence/task-3-typecheck.txt

  Scenario: No round/dealer logic remains
    Tool: Bash (grep)
    Steps:
      1. Search engine.ts for "dealerIndex", "honba", "roundNumber", "advanceRound", "windCount", "RoundResult", "RoundRecord"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-3-no-round-logic.txt

  Scenario: Tournament forces 4p hanchan
    Tool: Bash (node REPL)
    Steps:
      1. Import engine, call setConfig with type="tournament", mode="3p", format="tonpuu"
      2. Check result config has mode="4p" and format="hanchan"
    Expected Result: Config is forced to 4p hanchan regardless of input
    Evidence: .sisyphus/evidence/task-3-tournament-force.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Files: `apps/diceshock/src/shared/mahjong/engine.ts`

- [ ] 4. Write engine tests — Comprehensive test suite for new state machine

  **What to do**:
  - Create `apps/diceshock/src/shared/mahjong/__tests__/engine.test.ts`
  - Test all state transitions:
    - config_select → seat_select → countdown → playing → scoring → ended (happy path)
    - playing → voting → ended (vote pass)
    - playing → voting → playing (vote fail)
    - scoring confirm/cancel flow (individual confirm, cancel before all confirmed, lock after all confirmed)
    - Tournament mode forces 4p hanchan
    - Tournament mode rejects temp identity (unregistered player)
    - Store mode allows temp identity
    - Auto-new-match: resetKeepConfig goes to seat_select
    - Vote terminate: resetToConfig goes to config_select
    - Error cases: invalid phase transitions throw errors
    - serializeForDB returns correct shape

  **Must NOT do**:
  - Don't test round/dealer logic (doesn't exist anymore)
  - Don't mock — engine is pure functions, test directly

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T3)
  - **Parallel Group**: Wave 1 (after T3)
  - **Blocks**: None (non-blocking, but must pass before wave completion)
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/shared/mahjong/engine.ts` — The engine being tested (from Task 3)
  - `vitest.config.ts` — Test configuration at project root. Tests must be in `__tests__/` directory and end with `.test.ts`

  **External References**:
  - vitest docs for describe/it/expect API

  **WHY Each Reference Matters**:
  - vitest.config.ts defines the test include pattern (`apps/**/src/**/__tests__/**/*.test.ts`) and path aliases (`@/` and `@lib/`). Test file must match this pattern.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All engine tests pass
    Tool: Bash
    Steps:
      1. Run `npx vitest run apps/diceshock/src/shared/mahjong/__tests__/engine.test.ts`
    Expected Result: All tests pass, 0 failures
    Evidence: .sisyphus/evidence/task-4-tests.txt

  Scenario: Test coverage includes all transitions
    Tool: Bash (grep)
    Steps:
      1. Count number of test cases (it/test blocks) in the test file
    Expected Result: At least 15 test cases covering all major transitions
    Evidence: .sisyphus/evidence/task-4-coverage.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Files: `apps/diceshock/src/shared/mahjong/__tests__/engine.test.ts`

- [ ] 5. Update SocketDO.ts — Adapt WebSocket coordination for new flow

  **What to do**:
  - Update `apps/diceshock/src/server/durableObjects/SocketDO.ts`
  - Update `ClientMessage` type union:
    - Remove: `mahjong_ready`, `mahjong_end_round`, `mahjong_confirm_scores` (old round flow)
    - Add: `mahjong_start_countdown`, `mahjong_confirm_score`, `mahjong_cancel_confirm`, `mahjong_finalize_scoring`
    - Keep: `mahjong_set_config`, `mahjong_join`, `mahjong_start_seat_select`, `mahjong_back_to_config`, `mahjong_select_seat`, `mahjong_start` (rename to start match from countdown), `mahjong_begin_scoring`, `mahjong_submit_score`, `mahjong_initiate_vote`, `mahjong_cast_vote`, `mahjong_resolve_vote`, `mahjong_reset`, `mahjong_admin_abort`
  - Update `handleMahjongAction`:
    - `mahjong_select_seat`: When allSeated, call `engine.startCountdown(state)` instead of `engine.startMatch`. Then set alarm for countdown (3s) to auto-start match.
    - `mahjong_start_countdown`: Explicit trigger for countdown (alternative to auto-start)
    - `mahjong_start`: Call `engine.startMatch` (from countdown phase)
    - `mahjong_confirm_score`: Call `engine.confirmScore`. If allScoresConfirmed, call `engine.finalizeScoring`, save to DB, then call `engine.resetKeepConfig` for auto-new-match.
    - `mahjong_cancel_confirm`: Call `engine.cancelConfirm`
    - `mahjong_finalize_scoring`: Manual finalize trigger
    - Remove old `mahjong_end_round` handler
    - Remove old `mahjong_confirm_scores` handler (the old one was for round review)
    - Update `mahjong_reset`: After vote termination, use `resetToConfig`. For normal flow, `resetKeepConfig`.
  - Update `alarm()`:
    - Add countdown alarm: after 3 seconds, transition countdown → playing via `engine.startMatch`
    - Keep vote timeout alarm (20s)
  - Update `saveMatchToDB`: Adapt to new serializeForDB shape (no roundHistory, has matchType)
  - Update `checkOrderValidity`: Update active phases list (remove `round_review`, add `countdown`)

  **Must NOT do**:
  - Don't change the WebSocket handshake or connection logic
  - Don't change the sync/update_state/app_ping handlers
  - Don't remove the alarm mechanism — reuse it for countdown AND vote timeout

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T7, T8 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 3

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts` — Current DO to update. Study handleMahjongAction (lines 257-395), alarm (lines 410-420), saveMatchToDB (lines 234-255), and checkOrderValidity (lines 202-220).

  **API/Type References**:
  - `apps/diceshock/src/shared/mahjong/engine.ts` — New engine functions from Task 3
  - `apps/diceshock/src/shared/mahjong/types.ts` — New types from Task 1
  - `libs/db/src/schema.ts:517-555` — mahjongMatchesTable for DB insert shape

  **WHY Each Reference Matters**:
  - SocketDO is the server-side coordinator. It receives WebSocket messages and calls engine functions. The message types and handler logic must match the new engine API exactly.
  - The alarm mechanism is critical for both countdown (3s) and vote timeout (20s). Must distinguish between the two alarm types.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SocketDO compiles with new engine API
    Tool: Bash
    Steps:
      1. Run lsp_diagnostics on SocketDO.ts
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-5-typecheck.txt

  Scenario: No old message types remain
    Tool: Bash (grep)
    Steps:
      1. Search SocketDO.ts for "mahjong_end_round", "mahjong_ready", "round_review"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-5-no-old-messages.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `refactor(mahjong): update SocketDO, tRPC, and DB schema for new flow`
  - Files: `apps/diceshock/src/server/durableObjects/SocketDO.ts`

- [ ] 6. Update tRPC mahjong.ts — Adapt saveMatch and queries for new data model

  **What to do**:
  - Update `apps/diceshock/src/server/apis/trpc/mahjong.ts`
  - `saveMatch` mutation: Update input to include `matchType` field, remove `round_history` from insert. Add `match_type` to the DB insert.
  - `getMyMatches` query: Result no longer includes round_history. Keep structure but simplify returned shape.
  - `getMatchById` query: Same simplification.
  - `checkRegistration` and `register`: Keep unchanged.

  **Must NOT do**:
  - Don't change the registration flow
  - Don't add new procedures

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T5, T7, T8 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/apis/trpc/mahjong.ts` — Current tRPC procedures. Lines 6-62 for saveMatch input shape.

  **API/Type References**:
  - `libs/db/src/schema.ts:517-555` — DB table schema (will be updated by Task 7)

  **WHY Each Reference Matters**:
  - mahjong.ts is the persistence layer. saveMatch is called from SocketDO after match ends. The input shape must match what engine.serializeForDB returns.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: tRPC compiles with updated schema
    Tool: Bash
    Steps:
      1. Run lsp_diagnostics on mahjong.ts
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-6-typecheck.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Files: `apps/diceshock/src/server/apis/trpc/mahjong.ts`

- [ ] 7. Update DB Schema + Generate Migration

  **What to do**:
  - Update `libs/db/src/schema.ts`:
    - Add `match_type` column: `sqlite.text().$type<"store" | "tournament">()` (nullable for backward compat with existing data)
    - Keep `round_history` column but make it optional/nullable (SQLite can't DROP columns, existing data needs to remain readable)
    - Update `termination_reason` type to include "score_complete" and exclude "bust", "format_complete" in the type annotation (DB still stores strings, this is just TypeScript)
    - Update `config` JSON type to include `type` field
  - Generate migration: Run `pnpm drizzle` to generate the migration SQL for adding `match_type` column
  - The migration should be: `ALTER TABLE mahjong_matches ADD COLUMN match_type TEXT;`

  **Must NOT do**:
  - Don't try to DROP the round_history column (SQLite limitation)
  - Don't break backward compat with existing match data
  - Don't modify mahjongRegistrationsTable

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T5, T6, T8 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `libs/db/src/schema.ts:517-555` — Current mahjongMatchesTable definition to update
  - `drizzle/0000_bitter_yellow_claw.sql` — Example migration format

  **External References**:
  - `drizzle.config.ts` — Drizzle config for migration generation

  **WHY Each Reference Matters**:
  - schema.ts is the canonical DB definition. All tRPC procedures and SocketDO insert operations depend on this schema matching the DB.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Schema compiles
    Tool: Bash
    Steps:
      1. Run lsp_diagnostics on libs/db/src/schema.ts
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-7-typecheck.txt

  Scenario: Migration generated
    Tool: Bash
    Steps:
      1. Run `pnpm drizzle` and check new migration file exists in drizzle/
    Expected Result: New SQL file with ALTER TABLE statement
    Evidence: .sisyphus/evidence/task-7-migration.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Files: `libs/db/src/schema.ts`, `drizzle/*.sql`

- [ ] 8. Update gszManagement.ts — Remove round-related references

  **What to do**:
  - Update `apps/diceshock/src/server/apis/trpc/gszManagement.ts`
  - `list` query: Keep as-is (already doesn't return roundHistory in list items)
  - `getById` query: Remove `round_history` from response. Remove `RoundJSON` type. Simplify returned shape to just players + config + times + termination.
  - `listActive` query: Remove `roundCount`, `currentWind`, `currentRoundNumber` from ActiveMatchInfo. These fields don't exist in new MatchState. Keep: phase, mode, format, players, startedAt.
  - Update `ActiveMatchInfo` interface: Remove `roundCount`, `currentWind`, `currentRoundNumber`. Add `matchType` if available from config.
  - `terminateMatch`: Update error message from "终止公式战失败" to "终止立直麻将失败"

  **Must NOT do**:
  - Don't change the list/filter/pagination logic
  - Don't change the listTables query

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T5, T6, T7 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: Tasks 1, 7

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/apis/trpc/gszManagement.ts` — Current management API. Focus on getById (lines 134-196) and listActive (lines 227-284) and ActiveMatchInfo interface (lines 208-225).

  **API/Type References**:
  - `apps/diceshock/src/shared/mahjong/types.ts` — New MatchState shape (no currentRound, no roundHistory)

  **WHY Each Reference Matters**:
  - gszManagement.ts reads MatchState from SocketDO (via /mahjong-state endpoint) for listActive. The fields it accesses (roundHistory.length, currentRound.wind, etc.) no longer exist, so it must be updated.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No round references remain
    Tool: Bash (grep)
    Steps:
      1. Search gszManagement.ts for "roundHistory", "currentRound", "roundCount", "currentWind", "currentRoundNumber", "RoundJSON"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-8-no-round-refs.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Files: `apps/diceshock/src/server/apis/trpc/gszManagement.ts`

- [ ] 9. Update useMahjongMatch.ts hook — Adapt client actions for new flow

  **What to do**:
  - Update `apps/diceshock/src/client/hooks/useMahjongMatch.ts`
  - Remove actions: `setReady`, `endRound`, `confirmScores` (old round-related)
  - Add actions: `startCountdown`, `confirmScore`, `cancelConfirm`, `finalizeScoring`
  - Update `join` action: Keep nickname/phone/registered params
  - Keep: `setConfig`, `startSeatSelect`, `backToConfig`, `join`, `selectSeat`, `start`, `beginScoring`, `submitScore`, `initiateVote`, `castVote`, `resolveVote`, `reset`
  - Update dispatch message types to match new ClientMessage types in SocketDO

  **Must NOT do**:
  - Don't change the pending action retry mechanism
  - Don't change the WebSocket state sync logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10, T11 in Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 1, 5

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/client/hooks/useMahjongMatch.ts` — Current hook. Follow the existing dispatch pattern (lines 97-112) for adding new actions.
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts` — Updated ClientMessage types from Task 5. Actions dispatched here must match.

  **WHY Each Reference Matters**:
  - The hook is the bridge between UI and SocketDO. Each action dispatches a message that SocketDO.handleMahjongAction processes. Message types must match exactly.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Hook exports correct actions
    Tool: Bash (grep)
    Steps:
      1. Search useMahjongMatch.ts for "confirmScore", "cancelConfirm", "finalizeScoring"
      2. Verify "endRound" and "confirmScores" (old) are not present
    Expected Result: New actions found, old actions absent
    Evidence: .sisyphus/evidence/task-9-actions.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `refactor(mahjong): update client hook and rewrite game UI`
  - Files: `apps/diceshock/src/client/hooks/useMahjongMatch.ts`

- [ ] 10. Rewrite MahjongMatchStepper.tsx — Complete game UI redesign

  **What to do**:
  - Rewrite `apps/diceshock/src/client/components/diceshock/MahjongMatch/MahjongMatchStepper.tsx`
  - Phase views to implement:
    1. **Temp identity gate**: If isTemp AND config.type="tournament", show "临时身份不支持公式战模式" message. If isTemp AND store mode, allow through.
    2. **Registration gate**: Keep existing phone/registration check for tournament mode only
    3. **ConfigSelectView**: Three config dimensions:
       - 店内/公式战 toggle (two buttons)
       - 三麻/四麻 toggle (disabled and locked to 四麻 when 公式战 selected)
       - 东风/半庄 toggle (disabled and locked to 半庄 when 公式战 selected)
       - "开始对局" button → transitions to seat_select
    4. **SeatSelectView**: Same as current but label as "选座". Auto-join on mount. Select seat. When all seated, auto-start countdown.
    5. **CountdownView**: Full-screen "3... 2... 1... 开始!" countdown animation. Auto-transitions to playing when done.
    6. **PlayingView** (replaces MatchBoardView): 
       - Show正计时 timer (elapsed since startedAt, updating every second)
       - Show player list with current points
       - "录分" button (→ scoring phase)
       - "终止本场" button (→ voting phase)
       - Remove: 局/风/庄家/闲家 all indicators
    7. **ScoringView** (replaces ScoreInputView + RoundReviewView):
       - Each player independently enters their score
       - "确认" button after entering score
       - After confirming, can "取消" (cancel confirm) if not all confirmed yet
       - Show progress: which players have submitted, which have confirmed
       - When all players have confirmed, auto-finalize (save + auto-new-match)
    8. **VotePanelView**: Same as current but remove 庄/闲 labels. Keep countdown timer.
    9. **MatchResultView** (replaces old ended view): Show final ranking. Show two buttons:
       - Auto-new-match behavior is handled by engine (after scoring), so this view only shows after vote termination
       - "重新配置" button (→ config_select)

  **Must NOT do**:
  - Don't show 局, 庄家, 闲家, 场风 anywhere
  - Don't use round_review phase (removed)
  - Don't show honba
  - Don't keep FORMAT_OPTIONS with old wind/compass icons

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T11 in Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 1, 9

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/client/components/diceshock/MahjongMatch/MahjongMatchStepper.tsx` — Current game UI. Study the component structure and props pattern. Reuse SeatCard component with minimal changes.
  - `apps/diceshock/src/client/hooks/useMahjongMatch.ts` — Updated hook from Task 9. The `actions` and `state` objects this component receives.

  **API/Type References**:
  - `apps/diceshock/src/shared/mahjong/types.ts` — New MatchState, MatchPhase, PlayerState
  - `apps/diceshock/src/shared/mahjong/constants.ts` — MATCH_TYPE_LABELS, MODE_LABELS, FORMAT_LABELS, SEAT_LABELS, COUNTDOWN_SECONDS

  **External References**:
  - DaisyUI components used: btn, badge, card, alert, radial-progress
  - Phosphor icons used: PlayIcon, ArrowLeftIcon, StorefrontIcon, GlobeSimpleIcon, etc.

  **WHY Each Reference Matters**:
  - The current MahjongMatchStepper is 930 lines and the primary UI users interact with. The new version should be simpler (no round/dealer views) but has new views (countdown, new scoring flow). Study the existing DaisyUI + Tailwind patterns to maintain visual consistency.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Config view shows store/tournament toggle
    Tool: Playwright
    Steps:
      1. Navigate to a mahjong table page
      2. Look for buttons with text "店内" and "公式战"
      3. Click "公式战" — verify 三麻/四麻 and 东风/半庄 toggles become disabled/locked
      4. Click "店内" — verify toggles become enabled
    Expected Result: Tournament mode locks config, store mode is free
    Evidence: .sisyphus/evidence/task-10-config-toggle.png

  Scenario: Scoring flow with confirm/cancel
    Tool: Playwright
    Steps:
      1. In scoring phase, enter a score value
      2. Click "确认" — verify confirmed state shown
      3. Click "取消" — verify back to unconfirmed state
    Expected Result: Individual confirm/cancel works
    Evidence: .sisyphus/evidence/task-10-scoring-flow.png

  Scenario: No round/dealer UI elements
    Tool: Bash (grep)
    Steps:
      1. Search MahjongMatchStepper.tsx for "庄", "闲", "局", "honba", "dealerIndex", "round_review"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-10-no-round-ui.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Files: `apps/diceshock/src/client/components/diceshock/MahjongMatch/MahjongMatchStepper.tsx`

- [ ] 11. Simplify MahjongMatchHistory.tsx — Remove round details

  **What to do**:
  - Simplify `apps/diceshock/src/client/components/diceshock/MahjongMatch/MahjongMatchHistory.tsx`
  - **MahjongMatchDetailModal**: Remove the entire "对局详情" table (round history table). Only keep "最终排名" section with player rankings.
  - Remove: `RoundHistoryEntry` interface, `formatRoundLabel`, `computeWindRoundNumber`, `RESULT_LABELS`, `CHINESE_NUMBERS`
  - Keep: `MatchPlayer` interface, `getRank`, `getRankBadge`
  - Update `Match` interface: Remove `round_history` field. Add `match_type` field (optional).
  - Match list items: Keep existing layout. Add match_type badge if available (店内/公式战).
  - Rename: "公式战历史" → "立直麻将历史"

  **Must NOT do**:
  - Don't change the list/card layout pattern
  - Don't add new features

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T9, T10 in Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/client/components/diceshock/MahjongMatch/MahjongMatchHistory.tsx` — Current history component. Lines 123-319 are the detail modal to simplify. Lines 321-451 are the list to update.

  **WHY Each Reference Matters**:
  - The history component currently has extensive round-by-round tables. With roundHistory removed, the detail modal shrinks to just a ranking view.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No round history in detail modal
    Tool: Bash (grep)
    Steps:
      1. Search MahjongMatchHistory.tsx for "对局详情", "round_history", "RoundHistoryEntry", "formatRoundLabel", "computeWindRoundNumber"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-11-no-rounds.txt

  Scenario: Title renamed
    Tool: Bash (grep)
    Steps:
      1. Search MahjongMatchHistory.tsx for "立直麻将历史"
      2. Verify "公式战历史" is NOT present
    Expected Result: "立直麻将历史" found, "公式战历史" not found
    Evidence: .sisyphus/evidence/task-11-rename.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Files: `apps/diceshock/src/client/components/diceshock/MahjongMatch/MahjongMatchHistory.tsx`

- [ ] 12. Simplify dash/gsz.tsx — Dashboard match list

  **What to do**:
  - Simplify `apps/diceshock/src/apps/routers/dash/gsz.tsx`
  - Remove PHASE_LABELS entries for "round_review" (phase no longer exists)
  - Update PHASE_LABELS to match new phases: add "countdown", "scoring" (already exists), keep others
  - Update TERMINATION_LABELS: Replace "format_complete"→"score_complete"/"录分完成", remove "bust"/"飞人终局"
  - **ActiveMatchesSection**: Remove round/wind display (`currentWind`, `currentRoundNumber`, `roundCount`). These fields no longer exist on ActiveMatchInfo. Show elapsed time since startedAt instead.
  - Add match_type filter option (store/tournament) alongside existing mode/format filters
  - Title/breadcrumb: Rename "公式战" references to "立直麻将"

  **Must NOT do**:
  - Don't change the table structure/columns drastically
  - Don't change pagination logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T13, T14 in Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 15
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/dash/gsz.tsx` — Current dashboard list. Lines 53-60 for PHASE_LABELS. Lines 514-591 for ActiveMatchesSection (remove round info).

  **API/Type References**:
  - `apps/diceshock/src/server/apis/trpc/gszManagement.ts` — Updated ActiveMatchInfo from Task 8 (no roundCount/currentWind/currentRoundNumber)

  **WHY Each Reference Matters**:
  - Dashboard gsz.tsx displays active matches using ActiveMatchInfo. With round fields removed, the active match cards need to show different info (elapsed time instead of wind/round).

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No round references in dashboard
    Tool: Bash (grep)
    Steps:
      1. Search gsz.tsx for "currentWind", "currentRoundNumber", "roundCount", "format_complete", "bust"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-12-no-rounds.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `refactor(mahjong): simplify dashboard/me, rename 公式战→立直麻将`
  - Files: `apps/diceshock/src/apps/routers/dash/gsz.tsx`

- [ ] 13. Simplify dash/gsz_.$id.tsx — Dashboard match detail

  **What to do**:
  - Simplify `apps/diceshock/src/apps/routers/dash/gsz_.$id.tsx`
  - Remove the "rounds" and "dealer" tabs entirely (these showed per-round data and dealer flow)
  - Keep only the "overview" tab showing player rankings
  - Remove: `RoundsDetail` component, `DealerFlow` component, `RESULT_LABELS`, `RoundJSON` type
  - Remove: Tab navigation (only one view now, no tabs needed)
  - Update title: "公式战详情" → "立直麻将详情"
  - Update TERMINATION_LABELS: same changes as Task 12
  - Remove "总局数" stat card (no rounds anymore)
  - Keep: mode/format badges, start/end time, duration, player rankings, termination reason

  **Must NOT do**:
  - Don't change the overall page layout/structure pattern
  - Don't add new features

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T12, T14 in Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 15
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/dash/gsz_.$id.tsx` — Current detail page. Lines 186-194 for tab system (remove). Lines 256-329 for RoundsDetail (remove). Lines 331-438 for DealerFlow (remove).

  **API/Type References**:
  - `apps/diceshock/src/server/apis/trpc/gszManagement.ts` — Updated getById response from Task 8 (no round_history)

  **WHY Each Reference Matters**:
  - The detail page has 3 tabs with 2 (rounds + dealer) being entirely about per-round data. Since roundHistory is removed, these tabs and their ~180 lines of components become dead code to remove.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No round/dealer components remain
    Tool: Bash (grep)
    Steps:
      1. Search gsz_.$id.tsx for "RoundsDetail", "DealerFlow", "round_history", "RESULT_LABELS", "dealer"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-13-no-rounds.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Files: `apps/diceshock/src/apps/routers/dash/gsz_.$id.tsx`

- [ ] 14. Update Me page — Update history section

  **What to do**:
  - Update `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx`
  - The MahjongMatchHistory component (imported) is already updated by Task 11
  - No significant changes needed here — just verify it still renders correctly
  - If there are any direct references to "公式战" text in this file, rename to "立直麻将"

  **Must NOT do**:
  - Don't change the page layout or other sections (TOTP, phone, sign out)
  - Don't add new sections

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T12, T13 in Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 15
  - **Blocked By**: Task 11

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx` — Current Me page. Line 328 imports MahjongMatchHistory.

  **WHY Each Reference Matters**:
  - Me page embeds MahjongMatchHistory which was updated in Task 11. Just need to verify integration works and rename any "公式战" text.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No 公式战 text in me.tsx
    Tool: Bash (grep)
    Steps:
      1. Search me.tsx for "公式战"
    Expected Result: Zero matches
    Evidence: .sisyphus/evidence/task-14-no-gsz-text.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Files: `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx`

- [ ] 15. Rename 公式战→立直麻将 across all files

  **What to do**:
  - Search ALL files for remaining "公式战" text and rename to "立直麻将"
  - **Files to check** (non-exhaustive):
    - `src/client/components/diceshock/DashNavMenu.tsx` — Line 34: label "公式战" → "立直麻将"
    - `src/client/components/diceshock/HomePage/MahjongMatch.tsx` — Excluded per scope (homepage sections not changed)
    - `src/client/components/diceshock/HomePage/JPMahjong.tsx` — Excluded per scope
    - `src/server/apis/trpc/gszManagement.ts` — Already handled in Task 8
    - Any other files found by grep
  - Also rename route-level references if needed:
    - `src/apps/routers/dash/gsz.tsx` — Route stays `/dash/gsz` (path doesn't change, just labels)
    - `src/apps/routers/dash/gsz_.$id.tsx` — Route stays `/dash/gsz_/$id`
  - Do NOT rename:
    - `gsz.ts` (external API file — keep as-is)
    - File names (routes stay as `/dash/gsz`)
    - Variable names that reference the GSZ API

  **Must NOT do**:
  - Don't rename gsz.ts or its external API references
  - Don't change route paths
  - Don't change file names
  - Don't change homepage sections (MahjongMatch.tsx, JPMahjong.tsx)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (final task before verification)
  - **Parallel Group**: Wave 4 (after T10-T14)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 10, 11, 12, 13, 14

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/client/components/diceshock/DashNavMenu.tsx:34` — Nav menu label
  - All files listed above

  **WHY Each Reference Matters**:
  - This is a sweep task. Every UI-visible "公式战" must become "立直麻将" (except excluded files).

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No 公式战 in non-excluded files
    Tool: Bash (grep)
    Steps:
      1. grep -r "公式战" apps/diceshock/src/ --include="*.tsx" --include="*.ts" | grep -v "gsz.ts" | grep -v "HomePage/MahjongMatch" | grep -v "HomePage/JPMahjong"
    Expected Result: Zero matches (or only in explicitly excluded files)
    Evidence: .sisyphus/evidence/task-15-rename-complete.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Files: Multiple (DashNavMenu.tsx, any remaining files)

- [ ] 16. Update tRPC index + misc references

  **What to do**:
  - Check `apps/diceshock/src/server/apis/trpc/index.ts` — No changes needed (just imports, no labels)
  - Check for any other files that reference mahjong-related labels or round concepts:
    - `apps/diceshock/src/apps/routers/dash/tables_.$id.tsx` — If it shows active formula battles, update to remove round info
    - `apps/diceshock/src/apps/routers/dash/users_.$id.tsx` — If it shows user's formula battles, update
  - This is a catch-all cleanup task for anything missed

  **Must NOT do**:
  - Don't restructure the tRPC router
  - Don't add new routes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T12-T15 in Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: None (can run independently)

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/apis/trpc/index.ts` — Router definition
  - `apps/diceshock/src/apps/routers/dash/tables_.$id.tsx` — May reference active matches
  - `apps/diceshock/src/apps/routers/dash/users_.$id.tsx` — May reference user matches

  **WHY Each Reference Matters**:
  - Catch-all to ensure no stale references remain in files not covered by other tasks.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full typecheck passes
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from project root
    Expected Result: No type errors across entire project
    Evidence: .sisyphus/evidence/task-16-typecheck.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Files: Any remaining files

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Test the complete game flow: config→seat→countdown→playing→scoring→ended→auto-new-match. Test voting. Test temp identity restrictions. Test tournament config lock. Save evidence.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: verify everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect unaccounted changes. Verify gsz.ts, registration flow, and homepage sections were NOT modified.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

After each wave:
- Wave 1: `refactor(mahjong): rewrite engine with simplified state machine (no rounds/dealer)`
- Wave 2: `refactor(mahjong): update SocketDO, tRPC, and DB schema for new flow`
- Wave 3: `refactor(mahjong): update client hook and rewrite game UI`
- Wave 4: `refactor(mahjong): simplify dashboard/me, rename 公式战→立直麻将`

---

## Success Criteria

### Verification Commands
```bash
npx vitest run  # Expected: all tests pass
npx tsc --noEmit  # Expected: no type errors
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] No "公式战" text remaining in UI (except gsz.ts external API which is kept)
- [ ] Game flow works end-to-end: config → seat → countdown → playing → scoring → ended → auto-new
