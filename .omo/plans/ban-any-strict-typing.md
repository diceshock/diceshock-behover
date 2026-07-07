# Ban `any` & Enforce Strict Typing

## TL;DR

> **Quick Summary**: 一步到位禁用整个代码库中的 `any` 类型使用，配置 Biome lint 规则 + TypeScript 严格模式，修复所有手写代码中的 `as any` / `: any` / `@ts-ignore`。
> 
> **Deliverables**:
> - Biome config 启用 `noExplicitAny: "error"` + 禁用 `@ts-ignore`
> - 所有 ~85 个 `as any` 和 ~70 个 `: any` 修复为正确类型
> - 测试代码同样严格类型化
> - 生成文件通过 config 排除
> - 0 个 lint error, 0 个 type error
> 
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (config) → Task 2 (env types) → Tasks 3-8 (parallel fixes) → Task 9 (verification)

---

## Context

### Original Request
用户要求清查和禁用 `any`，限制 `@ts-ignore` 使用，正规化所有类型。一步到位，不分阶段。

### Interview Summary
**Key Discussions**:
- 生成文件: 通过配置排除，不 patch 生成内容
- 测试: 也要严格，不允许 `as any`
- 逃生口: 允许 `@ts-expect-error` + 必须附原因注释
- 策略: 一步到位，直接 error

**Research Findings**:
- 最大痛点: `c.env as any` 约 20+ 处，源于 Hono 泛型未正确传递 Bindings 类型
- 微信 API 响应没有类型定义，导致 `(tokens as any).openid`
- 测试中大量 `as any` 用于 mock 数据（mutate.test.ts 19处, dedup.test.ts 6处）
- Queue handler 的 batch 参数缺少正确类型
- Cloudflare AI 模型名称不在官方类型中

### Metis Review
**Identified Gaps** (addressed):
- Biome 是否能区分 ban `@ts-ignore` 但允许 `@ts-expect-error` — 已确认需要验证
- `as unknown as T` 型洗类型也应禁止 — 已加入 guardrails
- JSON.parse 隐式 any 不在 lint 范围 — 已记录为已知限制
- 需要验证 Biome 对 .tsx 文件的覆盖

---

## Work Objectives

### Core Objective
消除所有手写代码中的 `any` 类型使用，通过 lint 规则强制执行，确保未来代码不会引入新的 `any`。

### Concrete Deliverables
- `biome.json` 更新: `noExplicitAny: "error"`, ban `@ts-ignore`
- `src/types/env.d.ts` (或等价): Cloudflare Bindings 类型完善
- `src/types/wechat.d.ts`: 微信 API 响应类型定义
- 所有 ~85 个 `as any` 修复
- 所有 ~70 个 `: any` 手写注解修复

### Definition of Done
- [ ] `pnpm lint` exits 0
- [ ] `tsc --noEmit` exits 0 (各 app)
- [ ] `grep -r "as any" --include="*.ts" --include="*.tsx"` 在非生成文件中返回 0 结果
- [ ] `grep -r "@ts-ignore" --include="*.ts" --include="*.tsx"` 在非生成文件中返回 0 结果
- [ ] 测试套件通过
- [ ] `@ts-expect-error` 使用不超过 10 处，每处有注释说明

### Must Have
- 所有 `as any` 替换为正确类型或 `@ts-expect-error` + 理由
- 所有 `: any` 替换为具体类型
- Biome 规则阻止未来引入 `any`
- 生成文件排除在 lint 之外
- 零运行时行为变化

### Must NOT Have (Guardrails)
- ❌ 不得使用 `as unknown as T` 类型洗白（除非有 `@ts-expect-error` + 理由）
- ❌ 不得添加运行时类型检查或验证逻辑（仅编译时变化）
- ❌ 不得修改生成文件内容
- ❌ 不得重构代码结构（仅添加类型）
- ❌ 不得拓宽已有的窄类型（如 `string` → `string | unknown`）
- ❌ 不得趁机修复无关问题
- ❌ 不得散布 `.d.ts` 文件（集中在 `src/types/` 目录）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after — confirm existing tests still pass)
- **Framework**: vitest
- **TDD**: No — this is a refactoring task, existing tests serve as regression guard

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Lint verification**: `pnpm lint` or `npx @biomejs/biome check .`
- **Type check**: `npx tsc --noEmit` per app
- **Grep audit**: Count remaining `any` / `@ts-ignore` in non-generated files
- **Test run**: `pnpm test` or equivalent

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — must complete first):
├── Task 1: Biome config + generated file exclusions [quick]
├── Task 2: Env/Bindings type definitions [quick]
└── Task 3: WeChat API type definitions [quick]

Wave 2 (Parallel fixes — after Wave 1):
├── Task 4: Fix `c.env as any` pattern (server/apis) [unspecified-high]
├── Task 5: Fix test mocks (mutate.test, dedup.test, regression.test) [unspecified-high]
├── Task 6: Fix queue handlers & main.tsx [quick]
├── Task 7: Fix client components (UI `as any`) [quick]
├── Task 8: Fix providers/wechat.ts & auth middleware [unspecified-high]
├── Task 9: Fix graphql resolvers & drizzle ORM [unspecified-high]
└── Task 10: Fix remaining scattered `as any` [quick]

Wave 3 (Final verification):
├── Task 11: Full lint + type check + test pass [deep]

Wave FINAL (After ALL tasks):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 4-11 | 1 |
| 2 | - | 4, 6, 8 | 1 |
| 3 | - | 8 | 1 |
| 4 | 1, 2 | 11 | 2 |
| 5 | 1 | 11 | 2 |
| 6 | 1, 2 | 11 | 2 |
| 7 | 1 | 11 | 2 |
| 8 | 1, 2, 3 | 11 | 2 |
| 9 | 1 | 11 | 2 |
| 10 | 1 | 11 | 2 |
| 11 | 4-10 | F1-F4 | 3 |
| F1-F4 | 11 | user okay | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 7 tasks — T4 `unspecified-high`, T5 `unspecified-high`, T6 `quick`, T7 `quick`, T8 `unspecified-high`, T9 `unspecified-high`, T10 `quick`
- **Wave 3**: 1 task — T11 `deep`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Biome Config: 启用 `noExplicitAny` + 排除生成文件

  **What to do**:
  - 修改 `biome.json`:
    - `suspicious.noExplicitAny`: `"off"` → `"error"`
    - 添加 `overrides` 数组，对以下 pattern 禁用该规则: `**/routeTree.gen.ts`, `**/__generated__/**`, `**/worker-configuration.d.ts`
  - 确认 Biome 2.x 是否有规则可以 ban `@ts-ignore` 但允许 `@ts-expect-error`（可能是 `noSuppressedDiagnostics` 或 `useConsistentSuppressionComments`）
  - 如果有，启用该规则
  - 运行 `pnpm lint` 确认生成文件不报错，手写文件报出所有 `any` 错误

  **Must NOT do**:
  - 不修改任何源代码文件（本 task 仅改 config）
  - 不修改 tsconfig

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件配置变更，biome.json 修改
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `cloudflare`: 不涉及 Workers 代码

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, 3)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6, 7, 8, 9, 10, 11
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `biome.json` (root) — 当前完整配置，第 23 行 `noExplicitAny: "off"` 需改为 `"error"`

  **API/Type References**:
  - Biome 2.x docs: overrides configuration syntax

  **External References**:
  - https://biomejs.dev/linter/rules/no-explicit-any/
  - https://biomejs.dev/reference/configuration/#overrides

  **WHY Each Reference Matters**:
  - `biome.json` — 直接修改目标文件
  - Biome docs — 确认 overrides 语法和 `@ts-ignore` 相关规则名称

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Biome reports `any` errors in hand-written code
    Tool: Bash
    Preconditions: biome.json updated
    Steps:
      1. Run `npx @biomejs/biome check apps/diceshock/src/server/apis/wechat/messageHandler.ts`
      2. Confirm output contains `noExplicitAny` diagnostic errors
    Expected Result: Exit code non-zero, errors mention "any"
    Evidence: .sisyphus/evidence/task-1-biome-reports-any.txt

  Scenario: Biome does NOT report errors for generated files
    Tool: Bash
    Preconditions: biome.json overrides configured
    Steps:
      1. Run `npx @biomejs/biome check apps/diceshock/src/apps/routeTree.gen.ts`
      2. Confirm no `noExplicitAny` diagnostics
    Expected Result: Exit code 0 or no any-related errors
    Evidence: .sisyphus/evidence/task-1-generated-excluded.txt
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `chore(types): enforce noExplicitAny and ban @ts-ignore in biome config`
  - Files: `biome.json`
  - Pre-commit: N/A (config change only)

---

- [x] 2. 创建 Cloudflare Env Bindings 类型增强

  **What to do**:
  - 检查 `apps/diceshock/worker-configuration.d.ts` 中 `CloudflareBindings` 接口是否已包含所有 env 变量（WECHAT_MP_TOKEN, AI_SEARCH, DEEPSEEK_API_KEY 等）
  - 如果有缺失的 binding（导致代码用 `c.env as any`），创建 `apps/diceshock/src/types/env-augment.d.ts` 使用 `declare module` 或 interface merge 补充类型
  - 确保 Hono app 的泛型 `Hono<{ Bindings: CloudflareBindings }>` 能让 `c.env.WECHAT_MP_TOKEN` 等正确推导
  - 如果 `CloudflareBindings` 已包含所有字段但代码未使用泛型，标记该信息供 Task 4 使用

  **Must NOT do**:
  - 不修改 `worker-configuration.d.ts`（它是生成文件）
  - 不重构 Hono 路由结构
  - 不添加运行时验证

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 类型定义文件创建，影响面清晰
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1, 3)
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 6, 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/worker-configuration.d.ts` — 查看已生成的 `CloudflareBindings` 接口内容
  - `apps/diceshock/src/server/apis/wechat/messageHandler.ts:70` — `const env = c.env as any` 是最多的模式
  - `apps/diceshock/src/main.tsx:1-30` — 查看 Hono app 实例如何定义

  **API/Type References**:
  - `worker-configuration.d.ts` 中的 `Env` interface — 这是 wrangler typegen 的输出

  **External References**:
  - Hono CloudflareBindings pattern: https://hono.dev/docs/getting-started/cloudflare-workers#bindings

  **WHY Each Reference Matters**:
  - `worker-configuration.d.ts` — 确认哪些 binding 已有类型，哪些缺失
  - `messageHandler.ts` — 理解 `c.env as any` 的实际使用场景
  - Hono docs — 确认正确的泛型传递方式

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Env type covers all accessed properties
    Tool: Bash
    Preconditions: Type augmentation file created
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "Property.*does not exist on type.*Bindings"` 
      2. Confirm no missing property errors for env variables used in code
    Expected Result: Zero "does not exist on type" errors for known env vars
    Evidence: .sisyphus/evidence/task-2-env-type-coverage.txt

  Scenario: No orphan type file
    Tool: Bash
    Preconditions: Type file created
    Steps:
      1. Check that the new `.d.ts` file is included by tsconfig (via include pattern or explicit reference)
      2. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json` — file should be picked up
    Expected Result: TypeScript recognizes the augmentation
    Evidence: .sisyphus/evidence/task-2-type-recognized.txt
  ```

  **Commit**: YES (groups with 1, 3)
  - Message: `chore(types): enforce noExplicitAny and ban @ts-ignore in biome config`
  - Files: `apps/diceshock/src/types/env-augment.d.ts` (or equivalent)
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json`

---

- [x] 3. 创建微信 API 响应类型定义

  **What to do**:
  - 创建 `apps/diceshock/src/types/wechat.ts`（注意：不是 .d.ts，因为会 export 实际类型）
  - 基于 `src/server/providers/wechat.ts` 中的使用模式，定义:
    - `WechatOAuthTokenResponse` (包含 access_token, openid, unionid 等)
    - `WechatUserInfoResponse` (包含 nickname, headimgurl 等)
    - 其他在 `(data as any).xxx` 中访问的字段
  - 类型应基于微信官方 API 文档的字段

  **Must NOT do**:
  - 不添加运行时验证（zod schema 等）
  - 不修改 providers/wechat.ts（Task 8 会做）
  - 不过度定义用不到的字段

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 类型定义文件，结构清晰
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1, 2)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/providers/wechat.ts:48,112,120,181,188,247` — 所有 `(data as any)` 和 `(tokens as any)` 的使用
  - `apps/diceshock/src/server/middlewares/auth.ts:104,157,159` — `(profile as any).unionid`, `(profile as any).nickname`

  **External References**:
  - 微信 OAuth API: https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html

  **WHY Each Reference Matters**:
  - `providers/wechat.ts` — 实际访问了哪些字段，类型需要覆盖这些
  - `auth.ts` — 额外的 profile 字段使用
  - 微信文档 — 字段的权威定义

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Type definitions compile without error
    Tool: Bash
    Preconditions: wechat.ts type file created
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json`
      2. Confirm the new type file itself has no errors
    Expected Result: Exit 0 for the type file
    Evidence: .sisyphus/evidence/task-3-wechat-types-compile.txt

  Scenario: Types cover all used fields
    Tool: Bash
    Preconditions: Type file created
    Steps:
      1. Grep `(tokens as any)\.` and `(data as any)\.` and `(profile as any)\.` in providers/wechat.ts and auth.ts
      2. Verify each accessed field is present in the new type definitions
    Expected Result: Every accessed field (.openid, .unionid, .nickname, .headimgurl, etc.) has a corresponding type property
    Evidence: .sisyphus/evidence/task-3-field-coverage.txt
  ```

  **Commit**: YES (groups with 1, 2)
  - Message: `chore(types): enforce noExplicitAny and ban @ts-ignore in biome config`
  - Files: `apps/diceshock/src/types/wechat.ts`
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json`

---

- [x] 4. 修复 `c.env as any` 模式 (server/apis)

  **What to do**:
  - 修复 `messageHandler.ts` 中 9 处 `c.env as any` — 替换为直接 `c.env` 访问（前提是 Task 2 确保类型正确）
  - 修复 `wechat/index.ts` 中 4 处 `c.env as any`
  - 修复 `deepseekClient.ts` 中 1 处
  - 修复 `tools/searchRules.ts` 中 1 处 `(c.env as any).AI_SEARCH`
  - 修复 `avatarUpload.ts` 中 `c.get("authSession" as any)` — 使用正确的 Hono context variable key
  - 修复 `chat/spike.ts` 中 `(c.env as any)` 和 `messages as any`
  - 如果某些 binding 确实不在类型中且无法通过 Task 2 解决，使用 `@ts-expect-error // binding not in wrangler.toml typegen` 标注

  **Must NOT do**:
  - 不重构路由结构
  - 不添加运行时环境变量验证
  - 不修改非 env 相关的 any

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 多文件修改，需要理解 Hono context 类型系统
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 8, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/messageHandler.ts:70,100,125,235,609,617,628,638,724` — 所有 `c.env as any` 位置
  - `apps/diceshock/src/server/apis/wechat/index.ts:25,59,189,355` — 同模式
  - `apps/diceshock/src/server/apis/avatarUpload.ts:13` — `c.get("authSession" as any)` 特殊模式
  - `apps/diceshock/src/server/apis/chat/spike.ts:9,35` — env + messages

  **API/Type References**:
  - Task 2 产出的 `env-augment.d.ts` — 确认所有 binding 名称
  - `worker-configuration.d.ts` — CloudflareBindings 接口

  **WHY Each Reference Matters**:
  - 每个 `as any` 位置都需要确认对应 binding 是否在类型中
  - `avatarUpload.ts` 的 `c.get()` 是不同模式，需要查看 Hono Variables 类型

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zero `as any` remaining in server/apis
    Tool: Bash
    Preconditions: All env-related `as any` fixed
    Steps:
      1. Run `grep -rn "as any" apps/diceshock/src/server/apis/ --include="*.ts" | grep -v __tests__ | grep -v __generated__`
      2. Count results
    Expected Result: 0 results (excluding test files which Task 5 handles)
    Failure Indicators: Any line containing `as any` in non-test server/apis files
    Evidence: .sisyphus/evidence/task-4-server-apis-clean.txt

  Scenario: Type check passes for affected files
    Tool: Bash
    Preconditions: Files modified
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "error TS"`
      2. Compare with pre-change error count (should not increase)
    Expected Result: No new type errors introduced
    Evidence: .sisyphus/evidence/task-4-tsc-pass.txt
  ```

  **Commit**: YES (groups with 5-10)
  - Message: `refactor: remove all as any from hand-written source code`
  - Files: `apps/diceshock/src/server/apis/**/*.ts`
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json`

---

- [x] 5. 修复测试文件中的 `as any` (typed mocks)

  **What to do**:
  - `__tests__/mutate.test.ts` (19处): 
    - `action: "delete_user" as any` → 定义联合类型或使用 `satisfies` 验证
    - `params: { ... } as any` → 创建 `Partial<ActionParams>` 类型或使用具体类型 + 可选字段
    - 对于故意传入无效值的测试（如 `action: "foobar"`），使用 `@ts-expect-error // testing invalid action value` 标注
  - `__tests__/dedup.test.ts` (6处):
    - `(kv.get as any).mockResolvedValue(...)` → 使用 `vi.mocked(kv.get).mockResolvedValue(...)` 或 `vi.spyOn(kv, 'get')`
    - `(kv.put as any).mock.calls` → 使用 `vi.mocked(kv.put).mock.calls`
  - `__tests__/regression.test.ts` (1处):
    - `} as any` → 创建 typed partial mock

  **Must NOT do**:
  - 不构建 mock 框架或工厂
  - 不修改非 `as any` 相关的测试逻辑
  - 不改变测试覆盖范围

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 测试类型化需要理解被测模块的类型签名
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 6, 7, 8, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/__tests__/mutate.test.ts:60-307` — 19 处 `as any`
  - `apps/diceshock/src/server/apis/wechat/__tests__/dedup.test.ts:18-75` — 6 处 mock `as any`
  - `apps/diceshock/src/server/apis/wechat/__tests__/regression.test.ts:89` — 1 处
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` — 被测模块，查看 action 联合类型和 params 类型

  **API/Type References**:
  - vitest mock utilities: `vi.mocked()`, `vi.spyOn()`

  **WHY Each Reference Matters**:
  - test 文件 — 直接修改目标
  - `mutate.ts` — 需要了解 action/params 的正确类型签名来写 typed tests
  - vitest API — `vi.mocked()` 是替代 `(fn as any).mock` 的正确方式

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tests still pass after typing
    Tool: Bash
    Preconditions: Test mocks rewritten
    Steps:
      1. Run `pnpm vitest run apps/diceshock/src/server/apis/wechat/__tests__/`
      2. All tests pass
    Expected Result: Exit 0, all assertions pass
    Failure Indicators: Any test failure indicates type change broke test logic
    Evidence: .sisyphus/evidence/task-5-tests-pass.txt

  Scenario: Zero `as any` in test files
    Tool: Bash
    Preconditions: All test `as any` fixed
    Steps:
      1. Run `grep -rn "as any" apps/diceshock/src/server/apis/wechat/__tests__/`
      2. Count results
    Expected Result: 0 results
    Evidence: .sisyphus/evidence/task-5-tests-clean.txt
  ```

  **Commit**: YES (groups with 4, 6-10)
  - Message: `refactor: remove all as any from hand-written source code`
  - Files: `apps/diceshock/src/server/apis/wechat/__tests__/*.ts`
  - Pre-commit: `pnpm vitest run apps/diceshock/src/server/apis/wechat/__tests__/`

---

- [x] 6. 修复 Queue handlers & main.tsx

  **What to do**:
  - `main.tsx` (6处): `batch as any`, `env as any` in queue handler
    - 为 queue batch 定义正确的 `MessageBatch<T>` 类型
    - 确认 `CloudflareBindings` 包含 queue bindings
    - 如果 Cloudflare Workers 的 queue 类型需要特殊处理，使用正确泛型
  - `gstoneOcrConsumer.ts` (6处):
    - AI 模型名 `"@cf/meta/llama-4-scout-17b-16e-instruct" as any` — 创建 `declare module` 增强 Cloudflare AI 模型列表，或使用 `@ts-expect-error // model not in @cloudflare/workers-types yet`
    - `} as any` for AI request body — 定义正确的 AI input 类型

  **Must NOT do**:
  - 不重构 queue 消费逻辑
  - 不添加运行时类型检查

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 模式清晰，修改集中在两个文件
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 7, 8, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/main.tsx:210-243` — queue handler `as any` 模式
  - `apps/diceshock/src/server/queue/gstoneOcrConsumer.ts:125-238` — AI model `as any`

  **API/Type References**:
  - Cloudflare Workers Queue types: `MessageBatch`, `QueueEvent`
  - Cloudflare AI types: `@cloudflare/workers-types` AI binding

  **WHY Each Reference Matters**:
  - `main.tsx` — queue 入口，需要正确的 batch 泛型
  - `gstoneOcrConsumer.ts` — AI 模型名不在官方类型中，需要决定用 augmentation 还是 `@ts-expect-error`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zero `as any` in main.tsx and queue consumers
    Tool: Bash
    Steps:
      1. Run `grep -n "as any" apps/diceshock/src/main.tsx apps/diceshock/src/server/queue/*.ts apps/diceshock/src/server/queue/*.tsx`
      2. Count results
    Expected Result: 0 results
    Evidence: .sisyphus/evidence/task-6-queue-clean.txt

  Scenario: Type check passes
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -E "(main\.tsx|gstoneOcr)"`
      2. No new errors in these files
    Expected Result: No type errors referencing these files
    Evidence: .sisyphus/evidence/task-6-tsc-pass.txt
  ```

  **Commit**: YES (groups with 4, 5, 7-10)
  - Message: `refactor: remove all as any from hand-written source code`
  - Files: `apps/diceshock/src/main.tsx`, `apps/diceshock/src/server/queue/gstoneOcrConsumer.ts`

---

- [x] 7. 修复 client components 中的 `as any`

  **What to do**:
  - `AvataMenu.tsx` (4处): `(userInfo as any)?.avatar_url` — 扩展 userInfo 类型定义加入 `avatar_url` 字段
  - `DashNavMenu.tsx` (2处): `(session?.user as any)?.role` — 扩展 session user 类型加入 `role`
  - `InventoryManagementCard.tsx` (3处): `(patch as any).fetched`, `(wakeData as any).clean/hidded` — 查看 GraphQL 返回类型
  - `Swing.tsx` (1处): `DeviceMotionEvent as any` → 使用 `@ts-expect-error // requestPermission is iOS-only API not in standard DOM types`
  - `TiptapEditor/index.tsx` (1处): `(editor.storage as any).markdown` → 使用 Tiptap markdown extension 类型或 `@ts-expect-error`
  - `useCrossData.tsx` (diceshock + runespark, 2处): `(globalThis as any)[key]` → 定义全局注入类型

  **Must NOT do**:
  - 不修改组件逻辑或 UI
  - 不添加运行时类型守卫

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 前端组件类型修复，模式重复
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 8, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/client/components/diceshock/Header/AvataMenu.tsx:110-211` — userInfo avatar
  - `apps/diceshock/src/client/components/diceshock/DashNavMenu.tsx:77-78` — session role
  - `apps/diceshock/src/client/components/diceshock/InventoryManagementCard.tsx:66-84` — GraphQL response
  - `apps/diceshock/src/client/components/diceshock/Swing.tsx:64` — DeviceMotionEvent
  - `apps/diceshock/src/client/hooks/useCrossData.tsx:40` — globalThis injection

  **API/Type References**:
  - gqty 生成的 GraphQL 类型 — 查看 `__generated__/index.ts` 中的 query 返回类型

  **WHY Each Reference Matters**:
  - 每个文件的 `as any` 原因不同：缺少用户类型字段、iOS 非标准 API、Tiptap 插件类型、全局注入

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zero `as any` in client components
    Tool: Bash
    Steps:
      1. Run `grep -rn "as any" apps/diceshock/src/client/ apps/runespark/src/client/ --include="*.tsx" --include="*.ts" | grep -v __generated__`
      2. Count results
    Expected Result: 0 results
    Evidence: .sisyphus/evidence/task-7-client-clean.txt

  Scenario: No type errors in client code
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "src/client"`
      2. Compare with baseline
    Expected Result: No new type errors in client directory
    Evidence: .sisyphus/evidence/task-7-client-tsc.txt
  ```

  **Commit**: YES (groups with 4-6, 8-10)
  - Message: `refactor: remove all as any from hand-written source code`
  - Files: `apps/diceshock/src/client/**/*.tsx`, `apps/runespark/src/client/**/*.tsx`

---

- [x] 8. 修复 providers/wechat.ts & auth middleware

  **What to do**:
  - `providers/wechat.ts` (6处):
    - `(await res.json()) as any` → `(await res.json()) as WechatOAuthTokenResponse` (使用 Task 3 的类型)
    - `(tokens as any).openid` → `tokens.openid` (类型已包含)
  - `middlewares/auth.ts` (8处):
    - `(altResult as any).id` → 查看 altResult 的实际类型，补充字段
    - `(profile as any).unionid/nickname` → 使用 WechatUserInfoResponse 类型
    - `(session.user as any).role` → 扩展 session user 类型
    - `type: "credentials" as any` → 查看 auth.js 的 provider type 联合类型
    - `(drizzle as any).eq(...)` → 应该直接 import eq from drizzle-orm

  **Must NOT do**:
  - 不修改 auth 逻辑流程
  - 不重构 provider 实现

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及多个第三方库类型（auth.js, drizzle-orm, WeChat API），需要理解上下文
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 7, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/providers/wechat.ts:48-247` — 所有 6 处 `as any`
  - `apps/diceshock/src/server/middlewares/auth.ts:62-488` — 所有 8 处 `as any`

  **API/Type References**:
  - Task 3 产出: `WechatOAuthTokenResponse`, `WechatUserInfoResponse`
  - `drizzle-orm` 的 `eq` 函数 — 应该直接 import，不通过 drizzle 对象访问
  - auth.js / `@auth/core` 的 session/token 类型扩展模式

  **External References**:
  - Auth.js type augmentation: https://authjs.dev/getting-started/typescript

  **WHY Each Reference Matters**:
  - `providers/wechat.ts` — 直接使用 Task 3 的类型定义
  - `auth.ts` — 最复杂的文件，涉及 auth.js type augmentation 和 drizzle import 修复
  - Auth.js docs — session.user 扩展类型的正确方式

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zero `as any` in providers and middlewares
    Tool: Bash
    Steps:
      1. Run `grep -n "as any" apps/diceshock/src/server/providers/wechat.ts apps/diceshock/src/server/middlewares/auth.ts`
      2. Count results
    Expected Result: 0 results
    Evidence: .sisyphus/evidence/task-8-providers-clean.txt

  Scenario: Auth middleware types are sound
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -E "(providers/wechat|middlewares/auth)"`
      2. No errors in these files
    Expected Result: Zero type errors referencing these files
    Evidence: .sisyphus/evidence/task-8-auth-tsc.txt
  ```

  **Commit**: YES (groups with 4-7, 9-10)
  - Message: `refactor: remove all as any from hand-written source code`
  - Files: `apps/diceshock/src/server/providers/wechat.ts`, `apps/diceshock/src/server/middlewares/auth.ts`

---

- [x] 9. 修复 GraphQL resolvers & Drizzle ORM `as any`

  **What to do**:
  - `graphql/resolvers/admin.ts` (2处):
    - `data as any` → 查看 Pothos resolver 返回类型，使用正确的类型断言或泛型
  - `graphql/resolvers/mahjong.ts` (4处):
    - `(m.table as any)?.id` → 查看 Drizzle 关联查询的返回类型，可能需要 `with` 关联类型
    - `(m as any).playersJson` → 可能是 raw SQL 查询返回的额外字段，需要类型注解
  - `wechat/tools/mutate.ts` (2处):
    - `.values({ id: userId, ...data } as any)` → 修复 Drizzle insert 类型推导
    - `.values(accountValues as any)` → 同上
  - `scripts/test-agent.ts` (1处)

  **Must NOT do**:
  - 不重构 GraphQL schema
  - 不修改查询逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Drizzle ORM 和 Pothos GraphQL 类型系统复杂
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 7, 8, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/graphql/resolvers/admin.ts:1371,1436` — Pothos data cast
  - `apps/diceshock/src/server/graphql/resolvers/mahjong.ts:995-1004` — Drizzle relation fields
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:647,1169` — Drizzle insert values

  **API/Type References**:
  - Drizzle ORM insert types: `typeof table.$inferInsert`
  - Pothos resolver return types

  **WHY Each Reference Matters**:
  - `admin.ts` — Pothos 的 data 参数可能需要查看 schema builder 定义
  - `mahjong.ts` — Drizzle `with` 关联返回类型可能需要 `InferSelectModel` 或泛型
  - `mutate.ts` — Drizzle `$inferInsert` 是解决 insert 类型的标准方式

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zero `as any` in GraphQL resolvers and mutate tools
    Tool: Bash
    Steps:
      1. Run `grep -rn "as any" apps/diceshock/src/server/graphql/ apps/diceshock/src/server/apis/wechat/tools/mutate.ts --include="*.ts" | grep -v __tests__`
      2. Count results
    Expected Result: 0 results
    Evidence: .sisyphus/evidence/task-9-graphql-clean.txt

  Scenario: Type check for resolvers
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -E "(resolvers/|tools/mutate)"`
    Expected Result: Zero new type errors
    Evidence: .sisyphus/evidence/task-9-resolvers-tsc.txt
  ```

  **Commit**: YES (groups with 4-8, 10)
  - Message: `refactor: remove all as any from hand-written source code`
  - Files: `apps/diceshock/src/server/graphql/resolvers/*.ts`, `apps/diceshock/src/server/apis/wechat/tools/mutate.ts`

---

- [x] 10. 修复剩余零散 `as any` 和 `: any`

  **What to do**:
  - `scripts/crawl-5e-rules.ts` (若有)
  - `apps/diceshock/src/server/apis/ogCards/*.tsx` 中的 `as any`
  - `apps/diceshock/src/server/apis/wechat/membershipCard.tsx` (1处)
  - `apps/diceshock/src/apps/routers/dash/users_.$id.tsx` (20处 `as any` — 这个文件需要特别关注)
  - `apps/diceshock/src/apps/routers/{-$storeLocale}/_with-home-lo/me.tsx` (1处)
  - `apps/diceshock/src/apps/routers/x/$id.tsx` (1处)
  - `apps/diceshock/src/apps/routers/dash.tsx` (1处)
  - `apps/diceshock/src/apps/routers/dash/gsz.tsx` (2处)
  - `apps/diceshock/src/server/utils/gszFetch.ts` (1处)
  - `apps/diceshock/src/server/cron/passExpiration.ts` (1处)
  - `apps/diceshock/src/server/apis/wechat/memory.ts` — `: any` annotations
  - `apps/diceshock/src/server/apis/wechat/wechatApi.ts` — `: any` annotations
  - `apps/diceshock/src/server/apis/wechat/templateMessage.ts` — `: any` annotations
  - 所有剩余 `: any` 手写注解（排除 worker-configuration.d.ts）

  **Must NOT do**:
  - 不修改逻辑
  - 不趁机重构

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 文件散布广，dash/users_.$id.tsx 有 20 处需要集中处理
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6, 7, 8, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/dash/users_.$id.tsx` — 20 处 `as any`，最集中的非生成文件
  - `apps/diceshock/src/server/apis/wechat/memory.ts` — `: any` 函数参数
  - `apps/diceshock/src/server/apis/wechat/wechatApi.ts` — `: any` 函数参数
  - `apps/diceshock/src/server/apis/wechat/templateMessage.ts` — 15 处 `: any`

  **WHY Each Reference Matters**:
  - `users_.$id.tsx` — 最大单文件 `as any` 热点（非生成代码），可能是 admin UI 表单数据
  - `templateMessage.ts` — 最大 `: any` 热点，需要定义微信模板消息 API 类型

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zero `as any` in all non-generated source
    Tool: Bash
    Steps:
      1. Run `grep -r "as any" apps/ libs/ scripts/ --include="*.ts" --include="*.tsx" | grep -v "routeTree.gen" | grep -v "__generated__" | grep -v "node_modules" | grep -v "worker-configuration"`
      2. Count results
    Expected Result: 0 results
    Evidence: .sisyphus/evidence/task-10-final-any-count.txt

  Scenario: Zero `: any` annotations in hand-written code
    Tool: Bash
    Steps:
      1. Run `grep -rn ": any" apps/ libs/ scripts/ --include="*.ts" --include="*.tsx" | grep -v "routeTree.gen" | grep -v "__generated__" | grep -v "node_modules" | grep -v "worker-configuration.d.ts"`
      2. Count results
    Expected Result: 0 results
    Evidence: .sisyphus/evidence/task-10-final-colon-any.txt
  ```

  **Commit**: YES (groups with 4-9)
  - Message: `refactor: remove all as any from hand-written source code`
  - Files: All remaining files with `as any` or `: any`

---

- [x] 11. 全面验证: Lint + Type Check + Test

  **What to do**:
  - 运行 `pnpm lint` — 确认 0 errors
  - 运行 `npx tsc --noEmit -p apps/diceshock/tsconfig.json` — 确认 0 errors
  - 运行 `npx tsc --noEmit -p apps/runespark/tsconfig.json` — 确认 0 errors
  - 运行 `pnpm test`（或 `pnpm vitest run`）— 确认所有测试通过
  - 统计最终 `@ts-expect-error` 数量，确保 ≤ 10，每处有注释
  - 如果有失败：修复并重新验证（本 task 包含修复循环）

  **Must NOT do**:
  - 不为了通过 lint 而禁用规则
  - 不跳过任何验证步骤

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要迭代修复直到完全通过，可能涉及多轮 fix-verify 循环
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 4, 5, 6, 7, 8, 9, 10

  **References**:

  **Pattern References**:
  - 所有前置 task 修改的文件

  **WHY Each Reference Matters**:
  - 这是整合验证步骤，确保所有修改协同工作

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full lint pass
    Tool: Bash
    Steps:
      1. Run `pnpm lint`
      2. Exit code is 0
    Expected Result: Zero lint errors
    Evidence: .sisyphus/evidence/task-11-lint-pass.txt

  Scenario: Full type check pass (both apps)
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json`
      2. Run `npx tsc --noEmit -p apps/runespark/tsconfig.json`
      3. Both exit 0
    Expected Result: Zero type errors
    Evidence: .sisyphus/evidence/task-11-tsc-pass.txt

  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. Run `pnpm vitest run` or `pnpm test`
      2. All tests pass
    Expected Result: Exit 0, zero failures
    Evidence: .sisyphus/evidence/task-11-tests-pass.txt

  Scenario: Escape hatch count within budget
    Tool: Bash
    Steps:
      1. Run `grep -rn "@ts-expect-error" apps/ libs/ scripts/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v __generated__`
      2. Count ≤ 10
      3. Each line has a comment explaining why
    Expected Result: ≤ 10 instances, all with justification
    Evidence: .sisyphus/evidence/task-11-escape-hatches.txt
  ```

  **Commit**: YES
  - Message: `chore: final verification pass — zero any violations`
  - Files: Any remaining fixes
  - Pre-commit: All verification commands above

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm lint` + `tsc --noEmit`. Review all changed files for: `as unknown as T` without justification, excessive `@ts-expect-error`, widened types, runtime additions. Check AI slop: over-abstraction, unnecessary utility types.
  Output: `Lint [PASS/FAIL] | Types [PASS/FAIL] | Smell [N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Run full test suite. Grep for `as any`, `: any`, `@ts-ignore` in non-generated files. Count `@ts-expect-error` instances and verify each has a comment. Test the app starts (`pnpm x diceshock:dev`) without errors.
  Output: `Tests [PASS/FAIL] | Any-free [YES/NO] | Escape hatches [N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: verify only type-level changes (no runtime behavior modification). Verify generated files untouched. Verify no code restructuring beyond adding types. Flag any file touched that wasn't in original scope.
  Output: `Tasks [N/N compliant] | Runtime changes [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Commit 1** (after Wave 1): `chore(types): add strict typing config and type definitions`
  - biome.json, src/types/*.d.ts
- **Commit 2** (after Wave 2): `refactor: remove all \`as any\` and \`: any\` from hand-written code`
  - All modified source files
- **Commit 3** (after Wave 3 verification): `chore: verify zero any violations`
  - Any final cleanup

---

## Success Criteria

### Verification Commands
```bash
pnpm lint                    # Expected: exit 0
npx tsc --noEmit -p apps/diceshock/tsconfig.json  # Expected: exit 0
npx tsc --noEmit -p apps/runespark/tsconfig.json   # Expected: exit 0
pnpm test                    # Expected: all pass
grep -r "as any" apps/ libs/ scripts/ --include="*.ts" --include="*.tsx" | grep -v "routeTree.gen" | grep -v "__generated__" | grep -v "node_modules"  # Expected: 0 results
grep -r "@ts-ignore" apps/ libs/ scripts/ --include="*.ts" --include="*.tsx" | grep -v "__generated__" | grep -v "node_modules"  # Expected: 0 results
grep -c "@ts-expect-error" apps/ libs/ scripts/ -r --include="*.ts" --include="*.tsx" | awk -F: '{s+=$2} END {print s}'  # Expected: ≤ 10
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Zero `as any` in non-generated code
- [ ] Zero `@ts-ignore` in non-generated code
- [ ] ≤ 10 `@ts-expect-error` each with reason comment
