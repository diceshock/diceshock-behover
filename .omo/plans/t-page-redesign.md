# /t 页面公式战渲染逻辑重设计

## TL;DR

> **Quick Summary**: 重设计 /t 页面公式战的客户端-服务端数据流——本地变为只读展示层(loading-only), 远程 SocketDO 为唯一真相源, 使用 reconnecting-websocket 保持连接, step 竞争逻辑保证最终一致性, 页面始终完成初始化并展示网络状态信号等级。
> 
> **Deliverables**:
> - 使用 reconnecting-websocket 替换手写重连逻辑
> - MatchState 添加 step 版本号 + SocketDO step 竞争
> - 所有 action 按钮展示 loading 状态 + 重试机制
> - 网络质量信号等级 (ping/pong 丢包率) UI
> - 断连状态 overlay + 页面始终初始化
> - 现有测试更新
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 8 → Task 10 → F1-F4

---

## Context

### Original Request
重新设计 /t 页面公式战的渲染逻辑:
- 任何同步逻辑本地禁止修改状态, 只展示点击后的 loading 状态并持续尝试同步给远程更新桌台状态
- 远程收到内容后立刻更新所有用户本地状态并持续定期更新状态
- 使用 reconnecting-websocket 保持本地 socket 连接, 所有更新状态保证最终一致性
- 远程状态更新实现 step 竞争逻辑, 不会再因为后面的新状态撤销之前状态的改进
- 页面始终完成初始化, 桌台始终接受重新连接
- 页面要支持断连状态展示, 展示网络状态评估信号等级 (通过丢包率计算)

### Interview Summary
**Key Discussions**:
- 使用 pladaria/reconnecting-websocket (npm `reconnecting-websocket`), TS-first, 内置消息缓冲
- step 竞争: MatchState 新增 `step: number`, DO 每次成功处理 action 后 step++, 客户端仅接受 step >= local 的更新
- 网络质量: 通过 ping RTT + 丢包率计算信号等级 (4/3/2/1/0 格)
- 断连 overlay: 页面内容不消失, 叠加半透明遮罩 + 重连提示

**Research Findings**:
- CF DO 使用 `setWebSocketAutoResponse("ping", "pong")` 处理心跳 — 这是服务端自动回复, 客户端需要自行实现 RTT 测量
- reconnecting-websocket 自动缓冲断连期间的 send 调用, 重连后自动发送
- 现有 useSeatTimer 已有 jotai atom 缓存 (上轮修复), 需保留
- dash 端 `tables_.$id.tsx` 也使用 useSeatTimer, 但不在本次 UI 改动范围内 (hook 改动会自动生效)

### Self-Review / Gap Analysis
**Identified Gaps (addressed)**:
- Gap: CF setWebSocketAutoResponse 是服务端自动回复 "pong", 客户端的 reconnecting-websocket 不会自动做 RTT 测量 → 需要应用层 ping/pong (JSON message) 而非 WS 原生 ping
- Gap: step 应该加到 SocketState 而非仅 MatchState, 因为 table/occupancies 状态也需要版本控制 → 在 SocketState 顶层添加 step
- Gap: 消息缓冲在 step 竞争下可能导致过期 action 被重发 → action 消息应包含 `expectedStep` 字段, DO 可以忽略过期 action
- Gap: dash 端也用 useSeatTimer → hook 改动对 dash 端透明, 但需确认不破坏 dash 页面
- Guardrail: 不要在 engine.ts 中管理 step (engine 是纯业务逻辑), step 由 SocketDO 在 action 处理外层管理

---

## Work Objectives

### Core Objective
将公式战从 "fire-and-forget + 被动渲染" 模式重设计为 "loading-only 本地 + 远程真相源 + step 竞争最终一致性" 模式, 并添加网络质量指示器和断连状态展示。

### Concrete Deliverables
- `reconnecting-websocket` 包安装 + useSeatTimer.ts 重写
- `SocketState.step` 字段 + SocketDO step 竞争逻辑
- `useNetworkQuality` hook (ping RTT + 丢包率 → 信号等级)
- `useMahjongMatch` 添加 pending actions + retry 机制
- `MahjongMatchStepper` 所有子组件的 loading/disabled 状态
- `NetworkSignalIndicator` 组件
- `DisconnectionOverlay` 组件
- 更新所有现有 mahjong engine tests (step 字段)
- 新增 step 竞争单元测试

### Definition of Done
- [ ] `pnpm x diceshock:dev` 启动无报错
- [ ] 所有现有 vitest 测试通过 (`vitest run`)
- [ ] 断开网络 → 页面显示断连 overlay → 恢复网络 → 自动重连 → overlay 消失 → 状态恢复
- [ ] 点击任何 action 按钮 → 按钮显示 loading → 远程处理 → loading 消失 → 新状态渲染
- [ ] 多客户端同时操作 → 所有客户端最终看到相同 step 和状态

### Must Have
- reconnecting-websocket 替换手写重连
- step 竞争逻辑 (SocketDO + 客户端)
- loading-only action buttons (全部 action)
- 网络质量信号等级
- 断连 overlay
- 页面始终初始化完成

### Must NOT Have (Guardrails)
- 不修改 engine.ts 的业务逻辑 (仅 SocketDO 管理 step)
- 不修改 MahjongMatchHistory 组件
- 不修改数据库 schema
- 不修改 dash 端 UI (tables_.$id.tsx)
- 不添加本地 optimistic state mutations
- 不在客户端运行 engine.* 函数做本地状态预测
- 不删除现有 jotai atom 缓存 (保留 SPA 导航状态保持)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after)
- **Framework**: vitest
- **Test command**: `pnpm vitest run` from repo root

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux)
- **Library/Module**: Use Bash (vitest)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — types + deps + server logic):
├── Task 1: Install reconnecting-websocket + types [quick]
├── Task 2: Add step to SocketState + MatchState types [quick]
├── Task 3: SocketDO step 竞争逻辑 [deep]
└── Task 4: useNetworkQuality hook (ping/pong RTT + 丢包率) [unspecified-high]

Wave 2 (Client hooks — depends on Wave 1):
├── Task 5: Rewrite useSeatTimer with reconnecting-websocket + step filtering [deep]
├── Task 6: Rewrite useMahjongMatch with pending actions + retry [deep]
└── Task 7: NetworkSignalIndicator + DisconnectionOverlay components [visual-engineering]

Wave 3 (UI integration — depends on Wave 2):
├── Task 8: MahjongMatchStepper loading/disabled states (all sub-views) [visual-engineering]
├── Task 9: $code.tsx integration — wire overlay + signal indicator [unspecified-high]
└── Task 10: Update existing tests + new step competition tests [unspecified-high]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 5 |
| 2 | — | 3, 4, 5, 6, 10 |
| 3 | 2 | 5, 6 |
| 4 | 2 | 7, 9 |
| 5 | 1, 2, 3 | 6, 8, 9 |
| 6 | 2, 3, 5 | 8 |
| 7 | 4 | 9 |
| 8 | 5, 6 | 9 |
| 9 | 5, 7, 8 | 10 |
| 10 | 2, 9 | F1-F4 |

### Agent Dispatch Summary
- **Wave 1**: 4 tasks — T1 → `quick`, T2 → `quick`, T3 → `deep`, T4 → `unspecified-high`
- **Wave 2**: 3 tasks — T5 → `deep`, T6 → `deep`, T7 → `visual-engineering`
- **Wave 3**: 3 tasks — T8 → `visual-engineering`, T9 → `unspecified-high`, T10 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Install reconnecting-websocket dependency

  **What to do**:
  - Run `pnpm add reconnecting-websocket` in the repo root
  - Verify the package is added to `package.json` dependencies
  - Verify types are bundled (pladaria fork includes TS types)

  **Must NOT do**:
  - Do not install `@types/reconnectingwebsocket` (pladaria fork has built-in types)
  - Do not modify any source files yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `package.json:19-37` — Current dependencies list
  - npm: `https://www.npmjs.com/package/reconnecting-websocket` — Package to install (v4.4.0)

  **Acceptance Criteria**:
  - [ ] `pnpm add reconnecting-websocket` completes without error
  - [ ] `package.json` contains `"reconnecting-websocket"` in dependencies
  - [ ] `import ReconnectingWebSocket from 'reconnecting-websocket'` resolves without TS errors (verify via LSP)

  **QA Scenarios**:
  ```
  Scenario: Package installs and types resolve
    Tool: Bash
    Steps:
      1. Run `pnpm add reconnecting-websocket`
      2. Check `grep reconnecting-websocket package.json` shows the dependency
      3. Create a temp file with `import ReconnectingWebSocket from 'reconnecting-websocket'; const ws = new ReconnectingWebSocket('ws://test');` and check LSP diagnostics
      4. Remove temp file
    Expected Result: No errors at any step
    Evidence: .sisyphus/evidence/task-1-install.txt
  ```

  **Commit**: YES
  - Message: `feat(diceshock): add reconnecting-websocket dependency`
  - Files: `package.json`, `pnpm-lock.yaml`

- [x] 2. Add step field to SocketState and MatchState types

  **What to do**:
  - Add `step: number` to `SocketState` interface in `SocketDO.ts` (line 34-39)
  - Add `step: number` to `MatchState` interface in `types.ts` (line 55-67) — although step is managed by SocketDO, the engine types should reflect it for serialization
  - Update `createInitialState()` in `engine.ts` (line 33-47) to include `step: 0` in returned state
  - Update `resetKeepConfig()` in `engine.ts` to reset step to 0
  - Add `step` to `buildState()` in SocketDO.ts — expose a top-level `step` in SocketState, separate from mahjongState

  **Must NOT do**:
  - Do not add step management logic to engine.ts functions (step is managed externally by SocketDO)
  - Do not modify any engine state transition functions beyond adding the field to initial state

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 3, 4, 5, 6, 10
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:34-39` — SocketState interface
  - `apps/diceshock/src/shared/mahjong/types.ts:55-67` — MatchState interface
  - `apps/diceshock/src/shared/mahjong/engine.ts:33-47` — createInitialState()
  - `apps/diceshock/src/shared/mahjong/engine.ts:49-55` — resetKeepConfig()

  **Acceptance Criteria**:
  - [ ] `SocketState` has `step: number` field
  - [ ] `MatchState` has `step: number` field
  - [ ] `createInitialState()` returns `{ ..., step: 0 }`
  - [ ] `resetKeepConfig()` returns state with `step: 0`
  - [ ] No LSP errors in any modified files

  **QA Scenarios**:
  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. Run LSP diagnostics on SocketDO.ts, types.ts, engine.ts
      2. Verify no errors related to step field
    Expected Result: Zero LSP errors in modified files
    Evidence: .sisyphus/evidence/task-2-types.txt

  Scenario: Existing tests still pass
    Tool: Bash
    Steps:
      1. Run `pnpm vitest run`
      2. Verify all engine.test.ts and integration.test.ts tests pass
    Expected Result: All tests pass (some may need step:0 added to expected values)
    Evidence: .sisyphus/evidence/task-2-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(mahjong): add step field to SocketState and MatchState types`
  - Files: `SocketDO.ts`, `types.ts`, `engine.ts`

- [x] 3. SocketDO step 竞争逻辑

  **What to do**:
  - Add `private step: number = 0` to SocketDO class
  - In `handleMahjongAction()`: after each successful engine.* call, increment `this.step++`
  - In `buildState()`: include `step: this.step` in the returned SocketState
  - In `/update-state` POST handler: also increment step when table/occupancies change
  - Add application-level ping/pong: new ClientMessage `{ action: "app_ping", ts: number }` → ServerMessage `{ type: "app_pong", ts: number, serverTime: number }`
  - Handle "app_ping" in webSocketMessage: respond with "app_pong" to the sender only (not broadcast)

  **Must NOT do**:
  - Do not touch engine.ts — step is managed by SocketDO only
  - Do not change the existing CF-native ping/pong (setWebSocketAutoResponse) — it stays for keep-alive
  - Do not broadcast app_pong to all clients (it's per-connection)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 1)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 2

  **References**:
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:69-73` — Class properties (tableInfo, occupancies, mahjongState)
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:126-161` — webSocketMessage handler
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:163-279` — handleMahjongAction
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:294-301` — buildState()
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:41-67` — ClientMessage/ServerMessage types

  **Acceptance Criteria**:
  - [ ] `SocketDO` has `private step: number = 0`
  - [ ] Each successful mahjong action increments step
  - [ ] `/update-state` POST increments step
  - [ ] `buildState()` includes step
  - [ ] `app_ping` action is handled and responds with `app_pong` to sender only
  - [ ] `ClientMessage` type includes `{ action: "app_ping", ts: number }`
  - [ ] `ServerMessage` type includes `{ type: "app_pong", ts: number, serverTime: number }`
  - [ ] No LSP errors

  **QA Scenarios**:
  ```
  Scenario: Step increments on action
    Tool: Bash
    Steps:
      1. Read SocketDO.ts and verify step++ after each engine call in handleMahjongAction
      2. Verify buildState includes step field
      3. LSP diagnostics clean
    Expected Result: step field present and incremented correctly
    Evidence: .sisyphus/evidence/task-3-step-logic.txt

  Scenario: app_ping responds with app_pong
    Tool: Bash
    Steps:
      1. Read SocketDO.ts webSocketMessage handler
      2. Verify "app_ping" case sends app_pong only to the requesting ws (not broadcast)
    Expected Result: app_pong sent to individual ws, not broadcasted
    Evidence: .sisyphus/evidence/task-3-ping.txt
  ```

  **Commit**: YES
  - Message: `feat(socket-do): implement step competition and app-level ping`
  - Files: `SocketDO.ts`

- [x] 4. useNetworkQuality hook

  **What to do**:
  - Create `apps/diceshock/src/client/hooks/useNetworkQuality.ts`
  - Hook takes a `sendMessage` function and `connected` boolean from useSeatTimer
  - Every 5 seconds when connected: send `{ action: "app_ping", ts: Date.now() }` via sendMessage
  - Listen for `app_pong` responses (need to add onPong callback to useSeatTimer)
  - Track sliding window of last 10 pings: `{ sent: number, received: boolean, rtt?: number }`
  - Calculate: avgRtt, packetLoss (% of pings without response within 3s timeout)
  - Derive signal level: 4 (excellent), 3 (good), 2 (fair), 1 (poor), 0 (disconnected)
    - Level 4: connected && packetLoss === 0 && avgRtt < 200
    - Level 3: connected && packetLoss < 0.2 && avgRtt < 500
    - Level 2: connected && packetLoss < 0.5 && avgRtt < 1000
    - Level 1: connected && (packetLoss >= 0.5 || avgRtt >= 1000)
    - Level 0: !connected
  - Return: `{ signalLevel: 0|1|2|3|4, avgRtt: number, packetLoss: number, connected: boolean }`

  **Must NOT do**:
  - Do not use WebSocket-level ping/pong (CF handles that for keep-alive)
  - Do not modify useSeatTimer in this task (Task 5 handles that)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 7, 9
  - **Blocked By**: Task 2

  **References**:
  - `apps/diceshock/src/client/hooks/useSeatTimer.ts` — sendMessage and connected return values
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts` — app_ping/app_pong protocol (Task 3)

  **Acceptance Criteria**:
  - [ ] `useNetworkQuality.ts` exists
  - [ ] Returns `{ signalLevel, avgRtt, packetLoss, connected }`
  - [ ] Sends app_ping every 5 seconds
  - [ ] Tracks sliding window of 10 pings
  - [ ] Signal level calculation matches spec
  - [ ] No LSP errors

  **QA Scenarios**:
  ```
  Scenario: Hook compiles and exports correct shape
    Tool: Bash
    Steps:
      1. Run LSP diagnostics on useNetworkQuality.ts
      2. Verify exported function signature matches spec
    Expected Result: No LSP errors, correct return type
    Evidence: .sisyphus/evidence/task-4-hook.txt
  ```

  **Commit**: YES
  - Message: `feat(hooks): add useNetworkQuality hook for signal strength`
  - Files: `useNetworkQuality.ts`

- [x] 5. Rewrite useSeatTimer with reconnecting-websocket + step filtering

  **What to do**:
  - Replace `new WebSocket(url)` with `new ReconnectingWebSocket(url, [], options)` in useSeatTimer.ts
  - Options: `{ connectionTimeout: 4000, maxRetries: Infinity, maxReconnectionDelay: 30000, minReconnectionDelay: 1000 }`
  - Remove ALL manual reconnect logic (reconnectDelayRef, reconnectTimerRef, onclose reconnect timer)
  - Remove manual ping interval (CF setWebSocketAutoResponse handles keep-alive; app-level ping is in useNetworkQuality)
  - Keep jotai atom cache for cross-navigation state persistence
  - Add step-based filtering: only update atom state when `incoming.step >= localStepRef.current`
  - Track localStepRef via useRef to avoid stale closure issues
  - Add `onPong` callback support: when receiving `{ type: "app_pong", ts, serverTime }`, call registered pong listeners
  - Expose new return values: `{ state, connected, sendMessage, requestSync, onPongMessage }` where `onPongMessage` is a registration function for pong listeners
  - `connected` state: derived from `ws.readyState === ReconnectingWebSocket.OPEN`

  **Must NOT do**:
  - Do not remove jotai atom cache (stateAtomCache)
  - Do not change the sendMessage/requestSync API signatures
  - Do not import or use engine.* on client side

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Tasks 6, 8, 9
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `apps/diceshock/src/client/hooks/useSeatTimer.ts` — Current implementation (152 lines)
  - `https://github.com/pladaria/reconnecting-websocket` — ReconnectingWebSocket API
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:34-39` — SocketState shape (with step)

  **Acceptance Criteria**:
  - [ ] `import ReconnectingWebSocket from 'reconnecting-websocket'` in useSeatTimer
  - [ ] No manual reconnect logic remains (no setTimeout for reconnect)
  - [ ] Step-based filtering: `if (incoming.step >= localStepRef.current) { setState(incoming); localStepRef.current = incoming.step; }`
  - [ ] `onPongMessage` callback registration exposed
  - [ ] `connected` tracks readyState correctly
  - [ ] No LSP errors
  - [ ] dash page (tables_.$id.tsx) still works (it uses useSeatTimer)

  **QA Scenarios**:
  ```
  Scenario: Hook compiles and exposes correct API
    Tool: Bash
    Steps:
      1. LSP diagnostics on useSeatTimer.ts — zero errors
      2. LSP diagnostics on $code.tsx — zero errors (uses useSeatTimer)
      3. LSP diagnostics on dash/tables_.$id.tsx — zero errors (also uses useSeatTimer)
    Expected Result: No errors in any consumer
    Evidence: .sisyphus/evidence/task-5-compile.txt

  Scenario: No manual reconnect code remains
    Tool: Bash (grep)
    Steps:
      1. grep for "reconnectDelayRef" in useSeatTimer.ts — should not exist
      2. grep for "reconnectTimerRef" in useSeatTimer.ts — should not exist
      3. grep for "ReconnectingWebSocket" in useSeatTimer.ts — should exist
    Expected Result: Old reconnect refs gone, ReconnectingWebSocket present
    Evidence: .sisyphus/evidence/task-5-no-manual-reconnect.txt
  ```

  **Commit**: YES
  - Message: `refactor(hooks): rewrite useSeatTimer with reconnecting-websocket`
  - Files: `useSeatTimer.ts`

- [x] 6. Rewrite useMahjongMatch with pending actions + retry

  **What to do**:
  - Add `pendingActions: Map<string, PendingAction>` state to track in-flight actions
  - `PendingAction = { action: string, sentAt: number, retryCount: number, payload: Record<string, unknown> }`
  - When an action is called (e.g., `selectSeat(seat)`):
    1. Generate a unique action key (e.g., `"mahjong_select_seat"`)
    2. Add to pendingActions map with sentAt = Date.now()
    3. Send via sendMessage
    4. Return the action key
  - When new state arrives from WS (wsState changes):
    1. Compare new state against pending actions
    2. Clear pending actions that appear to have been processed (phase changed, scores updated, etc.)
  - Retry: useEffect interval every 3 seconds checks pendingActions — if any action is > 3s old and retryCount < 3, re-send it and increment retryCount
  - Expose `pendingActions` so UI can check if a specific action type is pending
  - Add `isPending(actionType: string): boolean` helper
  - Keep all existing action functions but wrap them with pending tracking

  **Must NOT do**:
  - Do not mutate local state based on actions (loading only)
  - Do not run engine.* functions client-side
  - Do not change the action message format (SocketDO expects current format)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 2, 3, 5

  **References**:
  - `apps/diceshock/src/client/hooks/useMahjongMatch.ts` — Current implementation (123 lines)
  - `apps/diceshock/src/server/durableObjects/SocketDO.ts:41-63` — ClientMessage types
  - `apps/diceshock/src/shared/mahjong/types.ts:8-17` — MatchPhase type

  **Acceptance Criteria**:
  - [ ] `pendingActions` state exposed
  - [ ] `isPending(actionType)` helper function
  - [ ] Actions add to pendingActions on send
  - [ ] pendingActions cleared when matching state change arrives
  - [ ] Retry logic: re-send after 3s, max 3 retries
  - [ ] No local state mutation
  - [ ] No LSP errors

  **QA Scenarios**:
  ```
  Scenario: Hook compiles with pending actions API
    Tool: Bash
    Steps:
      1. LSP diagnostics on useMahjongMatch.ts
      2. Verify isPending is exported in return type
    Expected Result: No LSP errors
    Evidence: .sisyphus/evidence/task-6-compile.txt

  Scenario: No engine imports in hook
    Tool: Bash (grep)
    Steps:
      1. grep for "engine" in useMahjongMatch.ts — should not exist
    Expected Result: No engine imports (engine stays server-side only)
    Evidence: .sisyphus/evidence/task-6-no-engine.txt
  ```

  **Commit**: YES
  - Message: `feat(hooks): add pending actions and retry to useMahjongMatch`
  - Files: `useMahjongMatch.ts`

- [x] 7. NetworkSignalIndicator + DisconnectionOverlay components

  **What to do**:
  - Create `apps/diceshock/src/client/components/diceshock/NetworkSignalIndicator.tsx`:
    - Props: `{ signalLevel: 0|1|2|3|4 }`
    - Render signal bars (4 bars, filled based on level) using pure CSS/SVG
    - Colors: level 4 = green (text-success), 3 = green, 2 = yellow (text-warning), 1 = red (text-error), 0 = gray (text-base-content/30)
    - Use Phosphor icons: WifiHigh (4), WifiMedium (3), WifiLow (2), WifiSlash (1, 0)
    - Size: matches existing badge sizes (size-4)
  - Create `apps/diceshock/src/client/components/diceshock/DisconnectionOverlay.tsx`:
    - Props: `{ visible: boolean, retryCount: number }`
    - When visible: semi-transparent backdrop (bg-base-100/80 backdrop-blur-sm) over content area
    - Content: "正在重新连接..." text + loading spinner + retry count
    - Use `fixed inset-0 z-50` positioning within the /t layout
    - Animate in/out with CSS transition

  **Must NOT do**:
  - Do not add complex logic — these are pure presentation components
  - Do not use any hooks beyond basic React
  - Do not import WS/network logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 9
  - **Blocked By**: Task 4

  **References**:
  - `apps/diceshock/src/apps/routers/t/$code.tsx:371-423` — TableInfoSection (where signal indicator goes)
  - `apps/diceshock/src/apps/routers/t.tsx:11-29` — SeatLayout (where overlay goes)
  - Phosphor icons: WifiHigh, WifiMedium, WifiLow, WifiSlash from `@phosphor-icons/react/dist/ssr`
  - DaisyUI classes: `badge`, `loading`, `alert`

  **Acceptance Criteria**:
  - [ ] NetworkSignalIndicator renders 4 different signal states visually
  - [ ] DisconnectionOverlay renders semi-transparent overlay with reconnection message
  - [ ] Both components have zero LSP errors
  - [ ] Uses existing project patterns (Phosphor icons, DaisyUI, clsx)

  **QA Scenarios**:
  ```
  Scenario: Components compile without errors
    Tool: Bash
    Steps:
      1. LSP diagnostics on NetworkSignalIndicator.tsx
      2. LSP diagnostics on DisconnectionOverlay.tsx
    Expected Result: No LSP errors
    Evidence: .sisyphus/evidence/task-7-compile.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add NetworkSignalIndicator and DisconnectionOverlay`
  - Files: `NetworkSignalIndicator.tsx`, `DisconnectionOverlay.tsx`

- [x] 8. MahjongMatchStepper loading/disabled states

  **What to do**:
  - Update `MahjongMatchStepper` Props to receive `isPending: (actionType: string) => boolean` and `connected: boolean`
  - **ConfigSelectView**: "开始对局" button shows `loading loading-spinner` when `isPending("mahjong_start_seat_select")`, disabled when `!connected`
  - **SeatSelectView**: Each SeatCard disabled when `!connected` or `isPending("mahjong_select_seat")`; "返回重新选择" disabled when `isPending("mahjong_back_to_config")` or `!connected`
  - **MatchBoardView**: "结束本局" loading when `isPending("mahjong_begin_scoring")`, "结算本场" loading when `isPending("mahjong_initiate_vote")`. Both disabled when `!connected`
  - **ScoreInputView**: "确认点数" loading when `isPending("mahjong_submit_score")`, "确认全部点数" loading when `isPending("mahjong_confirm_scores")`. Both disabled when `!connected`
  - **RoundReviewView**: "确认并继续" loading when `isPending("mahjong_end_round")`, disabled when `!connected`
  - **VotePanelView**: Vote buttons loading when `isPending("mahjong_cast_vote")`, "确认投票结果" loading when `isPending("mahjong_resolve_vote")`. All disabled when `!connected`
  - **MatchResultView**: "新的一场" loading when `isPending("mahjong_reset")`, disabled when `!connected`
  - Pattern: `<button className={clsx("btn", isPending("action") && "btn-disabled")} disabled={!connected || isPending("action")}>{isPending("action") ? <span className="loading loading-spinner loading-xs" /> : null} Label</button>`

  **Must NOT do**:
  - Do not add any local state mutations or engine calls
  - Do not change the action message payloads
  - Do not restructure the component hierarchy

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 5, 6)
  - **Parallel Group**: Wave 3 (with Tasks 9, 10)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 5, 6

  **References**:
  - `apps/diceshock/src/client/components/diceshock/MahjongMatch/MahjongMatchStepper.tsx` — Full file (702 lines)
  - `apps/diceshock/src/client/hooks/useMahjongMatch.ts` — isPending return (Task 6)
  - DaisyUI: `btn-disabled`, `loading loading-spinner loading-xs`

  **Acceptance Criteria**:
  - [ ] Every action button in every sub-view has loading + disabled state
  - [ ] All buttons disabled when `!connected`
  - [ ] No local state mutations added
  - [ ] No LSP errors
  - [ ] Visual pattern consistent across all views

  **QA Scenarios**:
  ```
  Scenario: All action buttons have loading states
    Tool: Bash (grep)
    Steps:
      1. grep for "isPending" in MahjongMatchStepper.tsx — should appear in every sub-view
      2. Count occurrences — should be >= 8 (one per action button type)
      3. grep for "!connected" — should appear as disabled condition
    Expected Result: isPending used everywhere, connected check on all buttons
    Evidence: .sisyphus/evidence/task-8-loading-states.txt

  Scenario: No engine imports in stepper
    Tool: Bash (grep)
    Steps:
      1. Verify engine import is only used for getRanking and allScoresSubmitted (read-only queries), not for state mutations
    Expected Result: engine used only for read queries, not mutations
    Evidence: .sisyphus/evidence/task-8-no-mutations.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add loading/disabled states to MahjongMatchStepper`
  - Files: `MahjongMatchStepper.tsx`

- [x] 9. $code.tsx integration — wire overlay + signal indicator

  **What to do**:
  - Import and use `useNetworkQuality` in SeatTimerPage, passing sendMessage and connected from useSeatTimer
  - Replace the green/gray dot in TableInfoSection with `<NetworkSignalIndicator signalLevel={networkQuality.signalLevel} />`
  - Add `<DisconnectionOverlay visible={!connected && !!wsState} retryCount={...} />` inside SeatTimerPage — only show when was previously connected (wsState exists) but now disconnected
  - Pass `isPending` and `connected` to MahjongMatchStepper
  - Wire `onPongMessage` from useSeatTimer into useNetworkQuality
  - Ensure page renders fully even when wsState is null (loading state already handled by prior fix)

  **Must NOT do**:
  - Do not modify other pages/routes
  - Do not change the page layout structure
  - Do not remove existing error handling or fallback logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with Tasks 8, 10)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 5, 7, 8

  **References**:
  - `apps/diceshock/src/apps/routers/t/$code.tsx:84-369` — SeatTimerPage component
  - `apps/diceshock/src/apps/routers/t/$code.tsx:371-423` — TableInfoSection (signal dot at line 403-408)
  - `apps/diceshock/src/apps/routers/t/$code.tsx:355-366` — MahjongMatchStepper usage

  **Acceptance Criteria**:
  - [ ] NetworkSignalIndicator replaces the green/gray dot
  - [ ] DisconnectionOverlay renders when disconnected and wsState exists
  - [ ] MahjongMatchStepper receives isPending and connected props
  - [ ] Page renders without errors when wsState is null
  - [ ] No LSP errors in $code.tsx

  **QA Scenarios**:
  ```
  Scenario: Imports and integration compile
    Tool: Bash
    Steps:
      1. LSP diagnostics on $code.tsx — zero errors
      2. grep for "NetworkSignalIndicator" in $code.tsx — should exist
      3. grep for "DisconnectionOverlay" in $code.tsx — should exist
      4. grep for "isPending" in $code.tsx — should exist
    Expected Result: All components integrated, no errors
    Evidence: .sisyphus/evidence/task-9-integration.txt

  Scenario: Green dot removed
    Tool: Bash (grep)
    Steps:
      1. grep for "bg-success" in $code.tsx — should NOT exist (was the green dot)
      2. grep for "bg-base-300" dot pattern in $code.tsx — should NOT exist
    Expected Result: Old signal dot replaced
    Evidence: .sisyphus/evidence/task-9-no-dot.txt
  ```

  **Commit**: YES
  - Message: `feat(seat): integrate overlay + signal indicator in $code.tsx`
  - Files: `$code.tsx`

- [x] 10. Update existing tests + new step competition tests

  **What to do**:
  - Update `engine.test.ts`: all test assertions that check MatchState structure need `step: 0` added (initial state, resetKeepConfig, etc.)
  - Update `integration.test.ts`: same — add step field to expected state shapes
  - Add new test file `apps/diceshock/src/shared/mahjong/__tests__/step.test.ts`:
    - Test: createInitialState returns step: 0
    - Test: resetKeepConfig returns step: 0
    - Test: step field is preserved through engine transitions (engine doesn't modify it)
  - Run full test suite to verify all pass

  **Must NOT do**:
  - Do not test SocketDO (it's a CF Durable Object, not testable via vitest)
  - Do not test client hooks (no test infra for React hooks currently)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 9

  **References**:
  - `apps/diceshock/src/shared/mahjong/__tests__/engine.test.ts` — 588 lines
  - `apps/diceshock/src/shared/mahjong/__tests__/integration.test.ts` — 295 lines
  - `apps/diceshock/src/shared/mahjong/engine.ts:33-47` — createInitialState with step

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run` — all tests pass
  - [ ] New step.test.ts exists with step-specific tests
  - [ ] Existing tests updated for step field
  - [ ] No test failures

  **QA Scenarios**:
  ```
  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. Run `pnpm vitest run`
      2. Capture output
    Expected Result: All tests pass, zero failures
    Evidence: .sisyphus/evidence/task-10-tests.txt

  Scenario: Step test file exists
    Tool: Bash
    Steps:
      1. Verify file exists: apps/diceshock/src/shared/mahjong/__tests__/step.test.ts
      2. grep for "step" in the test file — should appear multiple times
    Expected Result: File exists with step-specific test cases
    Evidence: .sisyphus/evidence/task-10-step-tests.txt
  ```

  **Commit**: YES
  - Message: `test(mahjong): update tests for step field + add step competition tests`
  - Files: `engine.test.ts`, `integration.test.ts`, `step.test.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, check code). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` (via LSP diagnostics) + linter. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: disconnect during action, rapid button clicks, multiple tabs. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **T1**: `feat(diceshock): add reconnecting-websocket dependency` — package.json, pnpm-lock.yaml
- **T2**: `feat(mahjong): add step field to SocketState and MatchState types` — types.ts, SocketDO.ts
- **T3**: `feat(socket-do): implement step competition logic` — SocketDO.ts
- **T4**: `feat(hooks): add useNetworkQuality hook` — useNetworkQuality.ts
- **T5**: `refactor(hooks): rewrite useSeatTimer with reconnecting-websocket` — useSeatTimer.ts
- **T6**: `feat(hooks): add pending actions and retry to useMahjongMatch` — useMahjongMatch.ts
- **T7**: `feat(ui): add NetworkSignalIndicator and DisconnectionOverlay` — new component files
- **T8**: `feat(ui): add loading/disabled states to MahjongMatchStepper` — MahjongMatchStepper.tsx
- **T9**: `feat(seat): integrate overlay + signal indicator in $code.tsx` — $code.tsx
- **T10**: `test(mahjong): update tests for step field + add step competition tests` — test files

---

## Success Criteria

### Verification Commands
```bash
pnpm vitest run  # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] No LSP errors in changed files
- [ ] reconnecting-websocket installed and used
- [ ] step field present in SocketState
- [ ] Network signal indicator visible in UI
- [ ] Disconnection overlay renders when WS disconnected
