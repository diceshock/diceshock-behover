# 手机绑定权限限制 + 自动合并账号

## TL;DR

> **Quick Summary**: 未绑定手机号的用户禁止执行写操作（改名、改偏好、约局、偏好标签、名片），绑定手机号时发现同号已有账号则自动合并（保留老账号）。
> 
> **Deliverables**:
> - `requirePhoneBound` guard 函数（复用于 GraphQL + WeChat bot 两套入口）
> - 6 类 mutation 端点添加 phone-bound 检查
> - `verifyPhone` 流程改造：从"拒绝重复手机"变为"自动合并账号"
> - 账号合并数据迁移逻辑（约局记录、报名、偏好等）
> - WeChat bot 错误处理：收到 phone-required 错误时引导绑定
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Tasks 4-8 (parallel) → Task 9 → Task 10 → Final

---

## Context

### Original Request
用户希望：未绑定手机号的用户无法执行修改名称、修改偏好、发起约局等操作。绑定手机号时如果发现同手机号已有账号，直接合并（不需要用户确认）。指导思想是保留获客相关的只读功能（询问规则、找约局、浏览内容），不影响新用户迁移。

### Interview Summary
**Key Discussions**:
- 合并方向：保留老账号（有手机号的），把当前微信账号数据迁移过去
- 需要绑定：改名、改偏好、发起约局、报名约局、桌游偏好、名片编辑
- 不需要绑定（获客/只读）：浏览约局、询问规则、查看内容、查看战绩
- WeChat bot：限制在接口层，bot 收到报错自动回复推荐绑定
- 合并不需要用户确认

**Research Findings**:
- 当前无 phone-bound 概念，只有 role-based (customer/staff/admin)
- `userInfoTable.phone` 是检测字段（nullable text）
- 两套 mutation 入口：GraphQL resolvers + WeChat bot mutate.ts
- 现有 verifyPhone 是拒绝重复手机号，需改为合并
- 已有 unionid 合并先例可参考（JWT callback + subscribe handler）

---

## Work Objectives

### Core Objective
在现有认证体系上增加 phone-bound 权限层，确保未绑定手机号的用户无法执行写操作，同时绑定流程支持自动账号合并。

### Concrete Deliverables
- `apps/diceshock/src/server/graphql/guards.ts` 新增 `requirePhoneBound` 函数
- 6 类 resolver/handler 添加 guard 调用
- `apps/diceshock/src/server/graphql/resolvers/auth.ts` verifyPhone 逻辑重写
- 新增 `mergeAccounts` 工具函数（数据迁移 + 账号重关联 + 清理）
- WeChat bot error handler 识别 phone-required 错误并引导绑定

### Definition of Done
- [ ] 未绑定手机用户调用受限 mutation → 返回特定错误码（如 `PHONE_REQUIRED`）
- [ ] 绑定手机号时若手机号已被其他账号使用 → 自动合并，当前用户 session 切换到合并后账号
- [ ] 合并后旧账号的约局报名、偏好等数据完整保留
- [ ] WeChat bot 调用受限 action 时收到错误 → 自动回复绑定引导
- [ ] 所有 test 通过，无运行时错误

### Must Have
- 统一的 `PHONE_REQUIRED` 错误码/类型，前后端可识别
- 合并逻辑是事务性的（D1 transaction），失败时不会产生数据不一致
- Staff/Admin 不受 phone-bound 限制（管理操作不应被阻塞）

### Must NOT Have (Guardrails)
- 不得影响只读操作（查看约局列表、查看规则、查看战绩、查看桌游库存）
- 不得影响 SMS 直接登录流程（SMS 登录用户天然已绑定手机）
- 不得在合并时丢失任何用户数据（约局、报名、战绩、积分、会员卡）
- 不得添加用户确认步骤（合并是自动的）
- 不得修改现有 unionid 合并逻辑（那是 WeChat 跨平台合并，无关）
- 不得过度抽象（不要引入新的 permission framework，直接在现有 guards 上扩展）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest configured in project root)
- **Automated tests**: YES (Tests-after) — 为核心逻辑写单测
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl or vitest) — Send requests, assert status + response fields
- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — must complete first):
├── Task 1: requirePhoneBound guard + PHONE_REQUIRED error type [quick]
├── Task 2: mergeAccounts utility function [deep]
└── Task 3: GraphQL schema update (error union type) [quick]

Wave 2 (Apply guards — MAX PARALLEL, depends: Task 1):
├── Task 4: Gate nickname mutation (auth.ts + mutate.ts) [quick]
├── Task 5: Gate preferences mutation (auth.ts + mutate.ts) [quick]
├── Task 6: Gate active creation + join (actives.ts + mutate.ts) [quick]
├── Task 7: Gate board game preferences (preferences.ts + mutate.ts) [quick]
└── Task 8: Gate business card (users.ts + mutate.ts) [quick]

Wave 3 (Merge logic — depends: Task 2):
├── Task 9: Rewrite verifyPhone to auto-merge (auth.ts + mutate.ts) [deep]
└── Task 10: WeChat bot error handling for PHONE_REQUIRED [quick]

Wave 4 (Frontend — depends: Task 1, 3):
└── Task 11: Frontend phone-required state prompts [unspecified-high]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 4, 5, 6, 7, 8, 10, 11 |
| 2 | — | 9 |
| 3 | — | 11 |
| 4-8 | 1 | F1-F4 |
| 9 | 2 | F1-F4 |
| 10 | 1 | F1-F4 |
| 11 | 1, 3 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `deep`, T3 → `quick`
- **Wave 2**: 5 tasks — T4-T8 → `quick`
- **Wave 3**: 2 tasks — T9 → `deep`, T10 → `quick`
- **Wave 4**: 1 task — T11 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. requirePhoneBound guard + PHONE_REQUIRED 错误类型

  **What to do**:
  - 在 `apps/diceshock/src/server/graphql/guards.ts` 新增 `requirePhoneBound(ctx)` 函数
  - 检查逻辑：从 ctx 获取 userId → 查 `userInfoTable.phone` → 如果为 null 且 role 不是 staff/admin → 抛错
  - 定义错误类型：创建 `PhoneRequiredError` (code: `PHONE_REQUIRED`)，使其可被前端和 bot 识别
  - 错误响应应包含：`{ code: "PHONE_REQUIRED", message: "请先绑定手机号" }`
  - 考虑性能：`userInjMiddleware` 已将 userInfo 注入 context，直接从 context 读 phone 字段即可，无需额外 DB 查询

  **Must NOT do**:
  - 不要引入新的 permission framework
  - 不要修改现有 requireAuth/requireStaff/requireAdmin 的行为
  - Staff/Admin 用户不受此限制

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, Task 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 5, 6, 7, 8, 10, 11
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/graphql/guards.ts` — 现有 guard 模式 (requireAuth, requireStaff 等)，新 guard 应遵循同样签名
  - `apps/diceshock/src/server/graphql/context.ts` — GQLContext 定义，了解 ctx 上有什么字段可用
  - `apps/diceshock/src/server/middlewares/auth.ts:371-501` — `userInjMiddleware` 将 userInfo 注入 context 的逻辑，确认 phone 字段在哪里可读

  **API/Type References**:
  - `libs/db/src/schema.ts:86-105` — `userInfoTable` schema，phone 字段定义
  - `apps/diceshock/src/server/graphql/context.ts` — GQLContext interface

  **WHY Each Reference Matters**:
  - `guards.ts`: 复用现有 guard 签名模式，保持一致性
  - `context.ts`: 确认 phone 是否已在 ctx 中，避免冗余 DB 查询
  - `userInjMiddleware`: 确认 phone 在哪一层被加载到 context

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Unbound user triggers requirePhoneBound → gets PHONE_REQUIRED error
    Tool: Bash (vitest)
    Preconditions: Test file with mock context (phone: null, role: "customer")
    Steps:
      1. Call requirePhoneBound(mockCtx) where mockCtx.phone = null, role = "customer"
      2. Assert throws error with code "PHONE_REQUIRED"
    Expected Result: Error thrown with { code: "PHONE_REQUIRED" }
    Evidence: .sisyphus/evidence/task-1-unbound-user-rejected.txt

  Scenario: Bound user passes requirePhoneBound
    Tool: Bash (vitest)
    Preconditions: Test file with mock context (phone: "13800138000", role: "customer")
    Steps:
      1. Call requirePhoneBound(mockCtx) where mockCtx.phone = "13800138000"
      2. Assert no error thrown
    Expected Result: Function returns without throwing
    Evidence: .sisyphus/evidence/task-1-bound-user-passes.txt

  Scenario: Staff without phone passes requirePhoneBound
    Tool: Bash (vitest)
    Preconditions: Test file with mock context (phone: null, role: "staff")
    Steps:
      1. Call requirePhoneBound(mockCtx) where mockCtx.phone = null, role = "staff"
      2. Assert no error thrown
    Expected Result: Function returns without throwing (staff exempt)
    Evidence: .sisyphus/evidence/task-1-staff-exempt.txt
  ```

  **Commit**: YES (groups with Tasks 2, 3)
  - Message: `feat(auth): add requirePhoneBound guard and PHONE_REQUIRED error type`
  - Files: `apps/diceshock/src/server/graphql/guards.ts`

---

- [x] 2. mergeAccounts 工具函数

  **What to do**:
  - 创建 `apps/diceshock/src/server/utils/mergeAccounts.ts`
  - 函数签名：`mergeAccounts(db, fromUserId, toUserId)` — 将 fromUser 的数据全部迁移到 toUser
  - 使用 D1 batch (transaction) 确保原子性
  - 迁移步骤：
    1. 将 `accounts` 表中 fromUser 的所有记录 → userId 改为 toUser
    2. 将 `activeRegistrationsTable` 中 fromUser 的报名 → userId 改为 toUser（注意去重：如果 toUser 已报名同一活动则跳过）
    3. 将 `activesTable` 中 fromUser 创建的约局 → creator_id 改为 toUser
    4. 将 `preferencesTable` 中 fromUser 的偏好 → userId 改为 toUser（去重）
    5. 将 `userBusinessCardTable` 中 fromUser 的名片 → 如果 toUser 没有则迁移，有则保留 toUser 的
    6. 将 `userMembershipPlansTable` 中 fromUser 的会员 → userId 改为 toUser
    7. 合并 points：toUser.points += fromUser.points
    8. 删除 fromUser 的 `userInfoTable` 记录
    9. 删除 fromUser 的 `users` 记录
  - 返回迁移结果摘要

  **Must NOT do**:
  - 不要迁移 nickname/avatar（保留 toUser 的，因为 toUser 是老账号）
  - 不要迁移 phone（toUser 已有 phone）
  - 不要修改 session/JWT 逻辑（那是调用方的责任）
  - 不要在此函数内发送通知

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1, Task 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/middlewares/auth.ts:96-134` — 现有 unionid merge 逻辑（reassign accounts + delete orphan），是合并逻辑的参考模板
  - `apps/diceshock/src/server/middlewares/auth.ts:227-352` — SMS login 中的 account resolution 逻辑

  **API/Type References**:
  - `libs/db/src/schema.ts` — 所有相关表定义：`users`, `userInfoTable`, `accounts`, `activesTable`, `activeRegistrationsTable`, `preferencesTable`, `userBusinessCardTable`, `userMembershipPlansTable`
  - Drizzle ORM batch API: `db.batch([...statements])` 用于事务

  **WHY Each Reference Matters**:
  - unionid merge 逻辑：已有 "reassign accounts + delete orphan user" 的模式，复用其方法
  - schema.ts：确认每个表的外键和主键结构

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Merge accounts with active registrations
    Tool: Bash (vitest)
    Preconditions: 
      - fromUser has 2 active registrations (activeId: "a1", "a2")
      - toUser has 1 registration (activeId: "a1" — overlap)
    Steps:
      1. Call mergeAccounts(db, fromUserId, toUserId)
      2. Query activeRegistrationsTable for toUserId
      3. Assert toUser has registrations for "a1" and "a2" (not duplicated)
      4. Query users table for fromUserId → should not exist
    Expected Result: toUser has both registrations, no duplicates, fromUser deleted
    Evidence: .sisyphus/evidence/task-2-merge-registrations.txt

  Scenario: Merge accounts with points
    Tool: Bash (vitest)
    Preconditions: fromUser.points = 50, toUser.points = 100
    Steps:
      1. Call mergeAccounts(db, fromUserId, toUserId)
      2. Query userInfoTable for toUserId
    Expected Result: toUser.points = 150
    Evidence: .sisyphus/evidence/task-2-merge-points.txt

  Scenario: Merge accounts - fromUser created an active
    Tool: Bash (vitest)
    Preconditions: fromUser is creator of active "a3"
    Steps:
      1. Call mergeAccounts(db, fromUserId, toUserId)
      2. Query activesTable for active "a3"
    Expected Result: active "a3".creator_id = toUserId
    Evidence: .sisyphus/evidence/task-2-merge-creator.txt
  ```

  **Commit**: YES (groups with Task 1, 3)
  - Message: `feat(auth): add requirePhoneBound guard and PHONE_REQUIRED error type`
  - Files: `apps/diceshock/src/server/utils/mergeAccounts.ts`

---

- [x] 3. GQLContext 扩展 phone 字段

  **What to do**:
  - 确认 `userInjMiddleware` 已将 phone 注入到 cross-data context 中
  - 如果 GQLContext interface 没有 phone 字段，添加 `phone: string | null`
  - 确保 GraphQL context factory 将 phone 从 middleware context 传递到 GQLContext
  - 这样 `requirePhoneBound` 可以直接从 ctx.phone 读取，无需额外查库

  **Must NOT do**:
  - 不要修改 GraphQL schema（不需要暴露 phone 到客户端 query）
  - 不要修改 JWT token 结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1, Task 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 11
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/graphql/context.ts` — GQLContext interface 定义
  - `apps/diceshock/src/server/middlewares/auth.ts:371-501` — userInjMiddleware 注入逻辑
  - `apps/diceshock/src/server/apis/graphqlEndpoint.ts` — GraphQL context factory，创建 GQLContext 的地方

  **WHY Each Reference Matters**:
  - context.ts：看当前 GQLContext 有哪些字段，加 phone
  - userInjMiddleware：确认 phone 是否已在 InjectCrossData 中
  - graphqlEndpoint.ts：确认 context factory 从哪里读取 cross data

  **Acceptance Criteria**:

  ```
  Scenario: GQLContext includes phone field
    Tool: Bash (grep)
    Steps:
      1. grep "phone" in context.ts → should show phone field in GQLContext
      2. grep "phone" in graphqlEndpoint.ts → should show phone being passed to context
    Expected Result: phone field exists in GQLContext type and is populated
    Evidence: .sisyphus/evidence/task-3-context-phone.txt
  ```

  **Commit**: YES (groups with Task 1, 2)
  - Message: `feat(auth): add requirePhoneBound guard and PHONE_REQUIRED error type`
  - Files: `apps/diceshock/src/server/graphql/context.ts`, `apps/diceshock/src/server/apis/graphqlEndpoint.ts`

---

- [x] 4. Gate nickname mutation

  **What to do**:
  - 在 `apps/diceshock/src/server/graphql/resolvers/auth.ts` 的 `updateProfile` resolver (约 line 273) 开头添加 `requirePhoneBound(ctx)`
  - 在 `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` 的 `update_profile` handler (约 line 660) 开头添加同样的检查
  - WeChat bot 入口：从 context 获取 userInfo，检查 phone 是否为 null，若为 null 则返回错误字符串（bot 层不抛 GraphQL error，而是返回文本提示）

  **Must NOT do**:
  - 不要修改绑定手机的 `verifyPhone` 部分（那是 updateMyUserInfo 的 phone+code 分支，不应被 gate）
  - 注意 `updateMyUserInfo` 是统一 mutation：nickname 分支要 gate，phone 分支不能 gate

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/auth.ts:270-290` — updateProfile resolver 具体位置
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:650-680` — WeChat bot update_profile handler
  - `apps/diceshock/schema.graphql:135-155` — UpdateMyUserInfoInput 定义，注意 nickname 和 phone 是不同分支

  **Acceptance Criteria**:

  ```
  Scenario: Unbound user tries to change nickname → PHONE_REQUIRED
    Tool: Bash (vitest or curl against dev server)
    Preconditions: User logged in via WeChat, phone is null
    Steps:
      1. Send updateMyUserInfo mutation with { nickname: "NewName" }
      2. Assert response contains error with code "PHONE_REQUIRED"
    Expected Result: Mutation rejected with PHONE_REQUIRED
    Evidence: .sisyphus/evidence/task-4-nickname-blocked.txt

  Scenario: Unbound user can still bind phone (verifyPhone path unaffected)
    Tool: Bash (vitest)
    Preconditions: User logged in, phone is null, valid SMS code in KV
    Steps:
      1. Send updateMyUserInfo mutation with { phone: "13800138000", code: "123456" }
      2. Assert response is successful (no PHONE_REQUIRED error)
    Expected Result: Phone binding succeeds
    Evidence: .sisyphus/evidence/task-4-phone-binding-unblocked.txt
  ```

  **Commit**: YES (groups with Tasks 5-8)
  - Message: `feat(auth): gate write mutations behind phone binding`
  - Files: `apps/diceshock/src/server/graphql/resolvers/auth.ts`, `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 5. Gate preferences mutation

  **What to do**:
  - 在 `apps/diceshock/src/server/graphql/resolvers/auth.ts` 的 `updatePreferences` resolver (约 line 294) 开头添加 `requirePhoneBound(ctx)`
  - 在 `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` 的 `update_preferences` handler (约 line 747) 开头添加检查

  **Must NOT do**:
  - 不要 gate 读取偏好的操作（只 gate 修改）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 6, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/auth.ts:294-315` — updatePreferences resolver
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:740-760` — WeChat bot update_preferences

  **Acceptance Criteria**:

  ```
  Scenario: Unbound user tries to change store preference → PHONE_REQUIRED
    Tool: Bash (vitest)
    Preconditions: User phone is null
    Steps:
      1. Call updatePreferences mutation with { preferredStoreId: "store-1" }
      2. Assert PHONE_REQUIRED error
    Expected Result: Mutation rejected
    Evidence: .sisyphus/evidence/task-5-preferences-blocked.txt
  ```

  **Commit**: YES (groups with Tasks 4, 6-8)
  - Message: `feat(auth): gate write mutations behind phone binding`
  - Files: `apps/diceshock/src/server/graphql/resolvers/auth.ts`, `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 6. Gate active creation + join

  **What to do**:
  - 在 `apps/diceshock/src/server/graphql/resolvers/actives.ts` 的 `createActive` resolver (约 line 209) 开头添加 `requirePhoneBound(ctx)`
  - 在同文件的 `joinActive` resolver (约 line 253) 开头添加 `requirePhoneBound(ctx)`
  - 在 `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` 的 `create_active` (约 line 380) 和 `join_active` (约 line 430) 开头添加检查

  **Must NOT do**:
  - 不要 gate `leaveActive`（用户应该能退出约局，不管绑不绑定）
  - 不要 gate 读取/浏览约局列表的 query
  - 不要 gate `watch_active`（围观是只读的获客行为）— 还是需要确认这点

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/actives.ts:209-251` — createActive resolver
  - `apps/diceshock/src/server/graphql/resolvers/actives.ts:253-320` — joinActive resolver
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:280-430` — WeChat bot create_active, join_active

  **Acceptance Criteria**:

  ```
  Scenario: Unbound user tries to create active → PHONE_REQUIRED
    Tool: Bash (vitest)
    Preconditions: User phone is null
    Steps:
      1. Call createActive mutation with valid input
      2. Assert PHONE_REQUIRED error
    Expected Result: Active not created, error returned
    Evidence: .sisyphus/evidence/task-6-create-active-blocked.txt

  Scenario: Unbound user tries to join active → PHONE_REQUIRED
    Tool: Bash (vitest)
    Preconditions: User phone is null, active exists
    Steps:
      1. Call joinActive mutation with { activeId: "existing-id" }
      2. Assert PHONE_REQUIRED error
    Expected Result: Registration not created
    Evidence: .sisyphus/evidence/task-6-join-active-blocked.txt
  ```

  **Commit**: YES (groups with Tasks 4, 5, 7, 8)
  - Message: `feat(auth): gate write mutations behind phone binding`
  - Files: `apps/diceshock/src/server/graphql/resolvers/actives.ts`, `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 7. Gate board game preferences

  **What to do**:
  - 在 `apps/diceshock/src/server/graphql/resolvers/preferences.ts` 的 `createPreference` (约 line 295)、`deletePreference`、`togglePreference` resolver 开头添加 `requirePhoneBound(ctx)`
  - 在 `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` 的 `add_preference` (约 line 937)、`delete_preference`、`toggle_preference` handler 开头添加检查
  - 不要 gate `list_preferences`（读取操作）

  **Must NOT do**:
  - 不要 gate `parsePreference`（AI 解析偏好文本是辅助功能，不产生写入）
  - 不要 gate 偏好的读取/列表操作

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/preferences.ts:295-383` — create/delete/toggle preference resolvers
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:937-1066` — WeChat bot preference handlers

  **Acceptance Criteria**:

  ```
  Scenario: Unbound user tries to add preference → PHONE_REQUIRED
    Tool: Bash (vitest)
    Preconditions: User phone is null
    Steps:
      1. Call createPreference mutation
      2. Assert PHONE_REQUIRED error
    Expected Result: Preference not created
    Evidence: .sisyphus/evidence/task-7-preference-blocked.txt
  ```

  **Commit**: YES (groups with Tasks 4-6, 8)
  - Message: `feat(auth): gate write mutations behind phone binding`
  - Files: `apps/diceshock/src/server/graphql/resolvers/preferences.ts`, `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 8. Gate business card

  **What to do**:
  - 在 `apps/diceshock/src/server/graphql/resolvers/users.ts` 的 `upsertBusinessCard` resolver (约 line 582) 开头添加 `requirePhoneBound(ctx)`
  - 在 `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` 的 `upsert_business_card` handler (约 line 604) 开头添加检查

  **Must NOT do**:
  - 不要 gate 读取他人名片的操作

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:
  - `apps/diceshock/src/server/graphql/resolvers/users.ts:580-620` — upsertBusinessCard resolver
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:600-650` — WeChat bot business card handler

  **Acceptance Criteria**:

  ```
  Scenario: Unbound user tries to edit business card → PHONE_REQUIRED
    Tool: Bash (vitest)
    Preconditions: User phone is null
    Steps:
      1. Call upsertBusinessCard mutation
      2. Assert PHONE_REQUIRED error
    Expected Result: Business card not updated
    Evidence: .sisyphus/evidence/task-8-card-blocked.txt
  ```

  **Commit**: YES (groups with Tasks 4-7)
  - Message: `feat(auth): gate write mutations behind phone binding`
  - Files: `apps/diceshock/src/server/graphql/resolvers/users.ts`, `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 9. Rewrite verifyPhone to auto-merge on conflict

  **What to do**:
  - 修改 `apps/diceshock/src/server/graphql/resolvers/auth.ts` 中的 `verifyPhone` 逻辑
  - 当前行为：如果 phone 已被其他账号使用 → 抛错 "Phone number is already in use"
  - 新行为：如果 phone 已被其他账号使用 → 调用 `mergeAccounts(db, currentUserId, existingUserId)` 将当前用户数据合并到已有手机号的老账号
  - 合并后：
    1. 当前用户的微信 accounts 已被迁移到 oldUser
    2. 当前用户已被删除
    3. 需要让当前 session 失效/重新登录，或更新 JWT token 指向 oldUser
  - Session 处理策略：合并后返回一个特殊响应（如 `{ merged: true, newUserId: oldUserId }`），前端收到后强制重新登录（刷新 session）
  - 同步修改 `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` 中的 `verify_phone` handler (约 line 1125)，应用相同的合并逻辑
  - WeChat bot 合并后返回文本：`"手机号绑定成功！已自动合并账号数据。"`

  **Must NOT do**:
  - 不要添加用户确认步骤
  - 不要修改 SMS 登录流程（那是另一条路径）
  - 不要丢失任何数据（merge 函数已处理）
  - 不要修改 unionid 合并逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 10)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/graphql/resolvers/auth.ts:193-271` — 当前 sendSmsCode + verifyPhone 实现
  - `apps/diceshock/src/server/middlewares/auth.ts:96-134` — unionid merge 逻辑（参考 pattern：reassign accounts → delete orphan）
  - `apps/diceshock/src/server/utils/mergeAccounts.ts` — Task 2 新建的 merge 工具函数

  **API/Type References**:
  - `libs/db/src/schema.ts:263-286` — accounts 表结构
  - `libs/db/src/schema.ts:86-105` — userInfoTable 结构

  **WHY Each Reference Matters**:
  - 当前 verifyPhone：需要精确了解现有检查逻辑以替换
  - unionid merge：已有的 session 处理逻辑作为参考（如何在 merge 后处理 token）
  - mergeAccounts：直接调用

  **Acceptance Criteria**:

  ```
  Scenario: Bind phone that already belongs to another user → auto-merge
    Tool: Bash (vitest)
    Preconditions:
      - userA (current, WeChat login, phone=null, has 2 active registrations)
      - userB (old, SMS login, phone="13800138000", has 3 active registrations)
      - Valid SMS code for "13800138000" in KV
    Steps:
      1. As userA, call verifyPhone(phone: "13800138000", code: "valid")
      2. Assert response indicates merge happened (merged: true)
      3. Query userInfoTable for userA → should not exist
      4. Query accounts table → userA's WeChat account now belongs to userB
      5. Query activeRegistrationsTable for userB → has all 5 registrations (merged)
    Expected Result: userA deleted, data migrated to userB, WeChat accounts reassigned
    Evidence: .sisyphus/evidence/task-9-auto-merge.txt

  Scenario: Bind phone that is not used by anyone → normal binding (no merge)
    Tool: Bash (vitest)
    Preconditions: 
      - userA (phone=null)
      - No other user has phone "13900139000"
      - Valid SMS code in KV
    Steps:
      1. Call verifyPhone(phone: "13900139000", code: "valid")
      2. Assert success, phone is now bound
      3. Query userInfoTable for userA → phone = "13900139000"
    Expected Result: Normal phone binding, no merge
    Evidence: .sisyphus/evidence/task-9-normal-binding.txt

  Scenario: WeChat bot verify_phone with conflict → auto-merge + friendly message
    Tool: Bash (vitest)
    Preconditions: Same as merge scenario but via WeChat bot path
    Steps:
      1. Simulate verify_phone tool call in mutate.ts
      2. Assert merge happens
      3. Assert return text contains "合并" or merge confirmation
    Expected Result: Merge executes, bot gets friendly text response
    Evidence: .sisyphus/evidence/task-9-bot-merge.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): auto-merge accounts on phone binding conflict`
  - Files: `apps/diceshock/src/server/graphql/resolvers/auth.ts`, `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 10. WeChat bot PHONE_REQUIRED error handling

  **What to do**:
  - 在 `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` 的顶层错误处理中，识别 `PHONE_REQUIRED` 错误
  - 当 mutate tool 执行失败且错误码为 PHONE_REQUIRED 时，返回友好文本：
    ```
    "该操作需要先绑定手机号哦~\n请发送"绑定手机"或直接告诉我你的手机号开始绑定流程。"
    ```
  - 确保这个错误处理在所有 mutate tool 的公共调用路径上（不需要每个 handler 都单独处理）
  - 可以在 mutate 执行的 try/catch 中统一拦截

  **Must NOT do**:
  - 不要在 bot 端单独再做一套 phone 检查（限制在接口层）
  - 不要修改 query/read tool 的行为
  - 不要阻止 `send_sms_code` 和 `verify_phone` 工具本身

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` — mutate tool 执行入口和错误处理流
  - `apps/diceshock/src/server/apis/wechat/index.ts` — WeChat 消息处理主流程，了解 tool 调用如何 catch 错误

  **WHY Each Reference Matters**:
  - mutate.ts：找到工具调用的公共 catch 点，添加统一的 PHONE_REQUIRED 识别
  - wechat/index.ts：了解错误如何传回用户（文本消息回复）

  **Acceptance Criteria**:

  ```
  Scenario: Bot mutate tool hits PHONE_REQUIRED → returns binding guidance
    Tool: Bash (vitest)
    Preconditions: User via WeChat (phone=null) calls create_active tool
    Steps:
      1. Simulate tool execution that triggers PHONE_REQUIRED
      2. Assert returned text contains "绑定手机"
      3. Assert no stack trace or raw error exposed to user
    Expected Result: Friendly Chinese text guiding user to bind phone
    Evidence: .sisyphus/evidence/task-10-bot-phone-hint.txt
  ```

  **Commit**: YES (groups with Task 9)
  - Message: `feat(auth): auto-merge accounts on phone binding conflict`
  - Files: `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 11. Frontend phone-required state handling

  **What to do**:
  - 在前端 Apollo Client error link 或全局 error handler 中识别 `PHONE_REQUIRED` 错误码
  - 当收到此错误时，显示提示 UI（modal 或 toast），引导用户去绑定手机号
  - 绑定入口：复用已有的手机绑定 modal（`me.tsx` 中已有 phone binding modal）
  - 具体实现：
    1. 在全局 GraphQL error handler 中 catch `PHONE_REQUIRED` → 弹出绑定手机号的 modal
    2. 或在各受限操作的 UI 组件上，检查当前用户 phone 状态，disable 按钮并显示提示
  - 推荐方案：全局 error handler 方式更简洁，不需要每个页面都改

  **Must NOT do**:
  - 不要重写已有的手机绑定 modal UI（复用）
  - 不要在前端做第二重权限判断（后端是 source of truth）
  - 不要阻止页面加载或导航（只拦截提交操作）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 1 + 3 completing)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 1, 3

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/{-$storeLocale}/_with-home-lo/me.tsx:422-482` — 已有的手机绑定 modal UI 和逻辑
  - `apps/diceshock/src/client/hooks/useSmsCode.ts` — 已有的 SMS code hook（复用）
  - `apps/diceshock/src/client/graphql/` — Apollo Client 配置，找全局 error handling

  **WHY Each Reference Matters**:
  - me.tsx：已有 phone binding modal，需要将其抽取为可全局调用的组件
  - useSmsCode：复用而非重写
  - Apollo client 配置：添加全局 onError link

  **Acceptance Criteria**:

  ```
  Scenario: Frontend receives PHONE_REQUIRED → shows binding prompt
    Tool: Playwright
    Preconditions: User logged in via WeChat, phone not bound
    Steps:
      1. Navigate to active creation page
      2. Fill form and click submit
      3. Wait for error response
      4. Assert phone binding modal/dialog appears
      5. Assert modal contains text "绑定手机" or similar
    Expected Result: Binding modal shown, user can initiate binding flow
    Evidence: .sisyphus/evidence/task-11-frontend-prompt.png

  Scenario: Bound user submits same form → succeeds normally
    Tool: Playwright
    Preconditions: User with phone bound
    Steps:
      1. Navigate to active creation page
      2. Fill form and click submit
      3. Assert success (no error modal)
    Expected Result: Form submits successfully
    Evidence: .sisyphus/evidence/task-11-bound-user-ok.png
  ```

  **Commit**: YES
  - Message: `feat(ui): show phone-required prompts on gated actions`
  - Files: `apps/diceshock/src/client/` (error handler + modal extraction)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm lint` + type check. Review changed files for: `as any`, empty catches, console.log in prod, unused imports. Check consistency between GraphQL and WeChat bot implementations.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start dev server. Test: (1) Unbound user calls gated mutation → gets PHONE_REQUIRED error, (2) Bound user calls same mutation → succeeds, (3) Bind phone that already exists → merge happens, data preserved, (4) Staff user without phone → can still operate.
  Output: `Scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify nothing beyond spec was built. Check read-only endpoints NOT affected. Verify no data loss in merge path.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(auth): add requirePhoneBound guard and PHONE_REQUIRED error type`
- **Wave 2**: `feat(auth): gate write mutations behind phone binding`
- **Wave 3**: `feat(auth): auto-merge accounts on phone binding conflict`
- **Wave 4**: `feat(ui): show phone-required prompts on gated actions`

---

## Success Criteria

### Verification Commands
```bash
pnpm lint          # Expected: no errors in changed files
pnpm vitest run    # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] No regression in read-only operations
