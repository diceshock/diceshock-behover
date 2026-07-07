# Fix All TSC & Biome Errors — Root Cause Optimization

## TL;DR

> **Quick Summary**: 消除 diceshock 应用中 208 个 TypeScript 错误和 193 个 Biome 诊断（115 errors + 78 warnings），通过修复 6 个宏观根因而非逐个补丁。不修改任何 linter/tsc 配置。
> 
> **Deliverables**:
> - `tsc --noEmit` 全项目零错误
> - `biome check` 全项目零错误零警告
> - 代码质量实际提升（消除 `as any`、修复类型定义、清理死代码）
> 
> **Estimated Effort**: Medium (6-8 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 8 → Task 9 → Final Verification

---

## Context

### Original Request
用户要求查明并修复所有 linter 和 tsc 检查问题。要求从宏观根源解决，优化代码本身，禁止修改 biome.json 或 tsconfig 配置。

### Interview Summary
**Key Discussions**:
- 用户明确"不要为修而修，实际优化代码"
- 禁止修改 biome.json / tsconfig*.json

**Research Findings**:
- runespark、libs/db、libs/utils 全部通过 tsc —— 问题集中在 diceshock
- 208 tsc 错误分布在 45 个文件中
- 6 个独立根因，互不阻塞可并行修复

### Metis Review
**Identified Gaps** (addressed):
- mem0ai 实际在用（wechat/memory.ts），不能移除，需用 pnpm overrides 解决 pg 重复
- worker-configuration.d.ts 已被 git 跟踪，可直接编辑添加 secrets
- validateSearch 已有默认值但返回类型推断为 required，需用 `search` 工具类型修复
- biome `--write` 可能删除有副作用的 import，需人工审查

---

## Work Objectives

### Core Objective
通过修复 6 个结构性根因，将 diceshock 的 tsc 和 biome 错误降至零。

### Concrete Deliverables
- `pnpm tsc --noEmit -p apps/diceshock/tsconfig.json` → 0 errors
- `pnpm tsc --noEmit -p apps/runespark/tsconfig.json` → 0 errors (回归验证)
- `pnpm biome check .` → 0 errors, 0 warnings
- 减少代码中 `as any` 使用量

### Definition of Done
- [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json` 输出 0 error
- [ ] `npx tsc --noEmit -p apps/runespark/tsconfig.json` 输出 0 error
- [ ] `pnpm biome check .` 退出码 0
- [ ] `pnpm build` 成功

### Must Have
- 修复所有 208 个 tsc 错误
- 修复所有 115 个 biome errors
- 消除 78 个 biome warnings
- 每个根因修复后验证错误 delta

### Must NOT Have (Guardrails)
- ❌ 修改 `biome.json`
- ❌ 修改任何 `tsconfig*.json`
- ❌ 添加 `// @ts-ignore` 或 `// @ts-expect-error`
- ❌ 添加新的 `as any` 类型断言（应该减少）
- ❌ 用 `biome-ignore` 抑制可修复的问题（仅允许用于 `noDangerouslySetInnerHtml` 等确实需要的场景）
- ❌ 手动编辑 `routeTree.gen.ts`（自动生成文件）
- ❌ 移除 `mem0ai` 依赖（正在使用中）
- ❌ 删除有副作用的 import/变量（如 WebSocket 初始化）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after (验证现有测试不回归)
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Build verification**: Use Bash — run tsc/biome, assert exit codes
- **Regression**: Use Bash — run existing tests

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — dependency & type foundations):
├── Task 1: Fix pnpm pg override to deduplicate drizzle-orm [quick]
├── Task 2: Add missing Cloudflare Env secrets to worker-configuration.d.ts [quick]
├── Task 3: Run biome auto-fix (format + unused imports/vars) [quick]

Wave 2 (After Wave 1 — code logic fixes, MAX PARALLEL):
├── Task 4: Fix TanStack Router path format in Link/navigate (depends: 3) [quick]
├── Task 5: Fix TanStack Router search params typing (depends: 3) [unspecified-high]
├── Task 6: Fix auth.ts user session type + remove as-any casts (depends: 1, 2) [unspecified-high]
├── Task 7: Fix crawler.tsx trpc return type (depends: 1) [unspecified-high]
├── Task 8: Fix missing t() imports + ogCard relational queries (depends: 1) [quick]

Wave 3 (After Wave 2 — remaining biome manual fixes):
├── Task 9: Fix useExhaustiveDependencies + useHookAtTopLevel (depends: 3) [deep]
├── Task 10: Fix remaining biome issues (noUselessFragments, noDangerouslySetInnerHtml) (depends: 3) [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 6, 7, 8 | 1 |
| 2 | - | 6 | 1 |
| 3 | - | 4, 5, 9, 10 | 1 |
| 4 | 3 | - | 2 |
| 5 | 3 | - | 2 |
| 6 | 1, 2 | - | 2 |
| 7 | 1 | - | 2 |
| 8 | 1 | - | 2 |
| 9 | 3 | - | 3 |
| 10 | 3 | - | 3 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 5 tasks — T4 `quick`, T5 `unspecified-high`, T6 `unspecified-high`, T7 `unspecified-high`, T8 `quick`
- **Wave 3**: 2 tasks — T9 `deep`, T10 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Fix pnpm pg override to deduplicate drizzle-orm instances

  **What to do**:
  - 在 `package.json` 的 `overrides` 中添加 `"pg": "8.11.3"`（将 `mem0ai → natural → pg@8.21.0` 强制对齐到 `pg@8.11.3`）
  - 运行 `rm -rf node_modules && pnpm install` 重新安装
  - 验证 `find node_modules/.pnpm -maxdepth 1 -name "drizzle-orm*"` 只剩 1-2 个实例（不再有 pg@8.21.0 变体）
  - 运行 `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "error TS" | wc -l` 记录 delta

  **Must NOT do**:
  - 不要移除 `mem0ai` 依赖（正在使用中）
  - 不要用 `"pg": "false"`（会破坏 mem0ai 运行时）
  - 不要修改 tsconfig

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `package.json:58-61` — 现有 overrides 字段，已有 `"jiti": "2.6.1"` 和 `"@auth/core"` override

  **API/Type References**:
  - pnpm overrides 文档: https://pnpm.io/package_json#pnpmoverrides

  **WHY Each Reference Matters**:
  - package.json overrides 是解决 pnpm phantom dependency 的标准方式
  - pg 的两个版本导致 drizzle-orm 被安装三份，类型系统把它们视为不兼容的独立类（private property 不同）

  **Acceptance Criteria**:
  - [ ] `find node_modules/.pnpm -maxdepth 1 -name "drizzle-orm*" | wc -l` ≤ 2
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "shouldInlineParams" | wc -l` = 0
  - [ ] `pnpm install --frozen-lockfile` 不报错（或重新生成 lockfile 后可冻结）

  **QA Scenarios**:

  ```
  Scenario: drizzle-orm deduplication succeeds
    Tool: Bash
    Preconditions: Current state has 3 drizzle-orm instances in node_modules/.pnpm
    Steps:
      1. Run `grep -c '"pg"' package.json` — expect output contains the override
      2. Run `find node_modules/.pnpm -maxdepth 1 -name "drizzle-orm*" | wc -l`
      3. Assert result ≤ 2
    Expected Result: Only 1-2 drizzle-orm installations remain (no pg@8.21.0 variant)
    Failure Indicators: Still 3 instances, or pnpm install fails
    Evidence: .sisyphus/evidence/task-1-drizzle-dedup.txt

  Scenario: tsc drizzle errors eliminated
    Tool: Bash
    Preconditions: pnpm install completed successfully
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "shouldInlineParams" | wc -l`
      2. Assert result = 0
    Expected Result: Zero "separate declarations of a private property" errors
    Failure Indicators: Any remaining shouldInlineParams errors
    Evidence: .sisyphus/evidence/task-1-tsc-delta.txt
  ```

  **Commit**: YES
  - Message: `fix(deps): override pg to deduplicate drizzle-orm instances`
  - Files: `package.json`, `pnpm-lock.yaml`
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "shouldInlineParams"` → 0

- [x] 2. Add missing Cloudflare Env secret bindings to worker-configuration.d.ts

  **What to do**:
  - 编辑 `apps/diceshock/worker-configuration.d.ts`，在 `Cloudflare.Env` interface 中添加缺失的 secret bindings:
    ```typescript
    AUTH_SECRET: string;
    WECHAT_OPEN_APP_ID: string;
    WECHAT_OPEN_APP_SECRET: string;
    WECHAT_MP_APP_ID: string;
    WECHAT_MP_APP_SECRET: string;
    WECHAT_MP_TOKEN: string;
    WECHAT_MP_ENCODING_AES_KEY: string;
    DEEPSEEK_API_KEY: string;
    CF_AI_GATEWAY_ID: string;
    GSZ_TOKEN: string;
    MEM0_API_KEY: string;
    CAPTCHA_PREFIX: string;
    ALIBABA_CLOUD_ACCESS_KEY_ID: string;
    ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
    ```
  - 同时添加缺失的 queue binding（如果存在）: `NOTIFICATION_QUEUE: Queue;`
  - 参照 `.env.example` 和 `wrangler.toml` 确认完整的 secret 列表

  **Must NOT do**:
  - 不要修改 tsconfig
  - 不要把 secret 值写入代码
  - 不要删除已有的类型定义

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/worker-configuration.d.ts:8-19` — 现有 `Cloudflare.Env` interface，已有 KV/R2/DB/Queue 等 binding
  - `.env.example` — 完整的环境变量列表

  **API/Type References**:
  - `apps/diceshock/src/shared/types/index.ts:19-20` — `HonoCtxEnv` 使用 `Bindings: Cloudflare.Env`

  **WHY Each Reference Matters**:
  - auth.ts 直接访问 `c.env.AUTH_SECRET`、`c.env.WECHAT_*` 等属性，现在报 TS2339 因为这些属性不在类型中
  - worker-configuration.d.ts 是 git tracked 的，可以直接编辑

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "does not exist on type 'Env'" | wc -l` = 0
  - [ ] 所有 `.env.example` 中的变量都在类型中声明

  **QA Scenarios**:

  ```
  Scenario: Env secrets type-check passes
    Tool: Bash
    Preconditions: worker-configuration.d.ts edited with new secrets
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "does not exist on type 'Env'" | wc -l`
      2. Assert result = 0
    Expected Result: Zero "property does not exist on type Env" errors
    Failure Indicators: Any remaining Env property errors
    Evidence: .sisyphus/evidence/task-2-env-types.txt

  Scenario: No typo in secret names
    Tool: Bash
    Preconditions: Secrets added to worker-configuration.d.ts
    Steps:
      1. Run `grep -oP "c\.env\.\w+" apps/diceshock/src/server/ -r | grep -oP "\.\w+$" | sort -u` to get all accessed env vars
      2. For each var, verify it exists in worker-configuration.d.ts
    Expected Result: All accessed env vars are declared
    Failure Indicators: A var accessed in code but missing from types
    Evidence: .sisyphus/evidence/task-2-env-coverage.txt
  ```

  **Commit**: YES
  - Message: `fix(types): add missing Cloudflare Env secret bindings`
  - Files: `apps/diceshock/worker-configuration.d.ts`
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "does not exist on type 'Env'"` → 0

- [x] 3. Run biome auto-fix (format + unused imports/vars/params)

  **What to do**:
  - 运行 `pnpm biome check --write .` 修复所有 auto-fixable 问题（格式化 + safe lint fixes）
  - 检查 diff：确认没有删除有副作用的 import（如 polyfill、CSS import、WebSocket 初始化等）
  - 如果有误删的副作用 import，手动恢复并添加 `// biome-ignore lint/correctness/noUnusedImports: side-effect import` 注释
  - 记录修复的诊断数量

  **Must NOT do**:
  - 不要删除 side-effectful imports（polyfill、CSS）
  - 不要手动编辑 `routeTree.gen.ts`（如果 biome 格式化了它，那没问题）
  - 不要修改 biome.json

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 5, 9, 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `biome.json` — 当前 lint 规则配置（recommended + specific overrides）

  **WHY Each Reference Matters**:
  - biome auto-fix 会处理 88 个格式问题 + 33 个 unused imports + 28 个 unused vars + 7 个 unused params
  - 这是后续手动修复的前提：先清理噪音，再处理逻辑问题

  **Acceptance Criteria**:
  - [ ] `pnpm biome check . 2>&1 | grep "Found.*errors"` 中的 error 数显著下降（从 115 降到 <50）
  - [ ] 无 side-effectful import 被误删

  **QA Scenarios**:

  ```
  Scenario: Auto-fix reduces error count
    Tool: Bash
    Preconditions: biome check --write completed
    Steps:
      1. Run `pnpm biome check . 2>&1 | tail -5`
      2. Compare error count with baseline (115 errors, 78 warnings)
      3. Assert errors < 50 (format + unused should be gone)
    Expected Result: Format issues (88) and unused imports/vars (61) eliminated
    Failure Indicators: Error count didn't decrease, or new errors appeared
    Evidence: .sisyphus/evidence/task-3-biome-delta.txt

  Scenario: No side-effectful imports removed
    Tool: Bash
    Preconditions: biome check --write completed
    Steps:
      1. Run `git diff --stat` to see changed files
      2. Run `git diff -- "*.ts" "*.tsx" | grep "^-import" | grep -v "type "` to find removed imports
      3. Review each removed import for side effects (CSS, polyfills, global registrations)
    Expected Result: All removed imports are genuinely unused
    Failure Indicators: A polyfill or CSS import was removed
    Evidence: .sisyphus/evidence/task-3-removed-imports.txt
  ```

  **Commit**: YES
  - Message: `style: biome auto-fix format + remove unused imports/vars`
  - Files: ~50 files across apps/diceshock
  - Pre-commit: `pnpm biome check . 2>&1 | grep -c "noUnusedImports\|noUnusedVariables\|format"` < 5

- [x] 4. Fix TanStack Router path format in Link/navigate calls

  **What to do**:
  - 在 4 个文件中将旧格式路由路径替换为新格式：
    - `/$storeLocale/` → `/{-$storeLocale}` (去掉尾斜杠)
    - `/$storeLocale/inventory` → `/{-$storeLocale}/inventory`
    - `/$storeLocale/inventory/$id` → `/{-$storeLocale}/inventory/$id`
    - `/$storeLocale/contact-us` → `/{-$storeLocale}/contact-us`
    - `/$storeLocale/diceshock-agents` → `/{-$storeLocale}/diceshock-agents`
  - 同时修复 `params` 传递方式：现有代码用 `params: (prev) => prev` 来传递 storeLocale param，这在新路由格式下应该仍然正确，但需确认 TanStack Router 的 `{-$storeLocale}` 参数名对应的 params key
  - 修复 `GlobalNotFound.tsx` 中的 `"/"`、`"/contact-us"` 等绝对路径 → 改为带 storeLocale 前缀的路径
  - 修复 `AvataMenu.tsx` 中 `/t/$code` 和 `/me` → 改为 `/{-$storeLocale}/t/$code` 和 `/{-$storeLocale}/me`
  - 修复 `external-redirect.tsx` 中 `"/{-$storeLocale}/"` → `"/{-$storeLocale}"`

  **Must NOT do**:
  - 不要手动编辑 `routeTree.gen.ts`
  - 不要修改路由定义文件本身（只改 Link/navigate 的消费端）
  - 不要使用 `as any` 来绕过类型

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 3 (biome auto-fix 先清理格式噪音)

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/client/components/diceshock/Header/index.tsx` — 已正确使用 `/{-$storeLocale}/` 格式的 Link 组件（参照此文件的写法）
  - `apps/diceshock/src/apps/routeTree.gen.ts` — 自动生成的路由树，定义了所有合法路径字符串

  **API/Type References**:
  - TanStack Router `Link` 组件的 `to` prop 类型是从 routeTree 推断的字符串字面量联合类型

  **WHY Each Reference Matters**:
  - Header/index.tsx 中有正确写法的 Link，用作模板
  - routeTree.gen.ts 中列出了所有合法路径（如 `"/{-$storeLocale}"` 而非 `"/$storeLocale/"`）

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "TS2820\|Did you mean" | wc -l` = 0
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "is not assignable to type.*storeLocale" | wc -l` = 0

  **QA Scenarios**:

  ```
  Scenario: All route path type errors resolved
    Tool: Bash
    Preconditions: All Link/navigate calls updated to new format
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "TS2820" | wc -l`
      2. Assert result = 0
      3. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "storeLocale" | wc -l`
      4. Assert result = 0
    Expected Result: Zero route path type mismatch errors
    Failure Indicators: Remaining TS2820 or route literal errors
    Evidence: .sisyphus/evidence/task-4-route-paths.txt

  Scenario: No broken navigation at runtime
    Tool: Bash
    Preconditions: Route paths updated
    Steps:
      1. Run `grep -rn 'to="/$storeLocale' apps/diceshock/src/ | wc -l`
      2. Assert result = 0 (no old format remaining)
    Expected Result: Zero instances of old path format
    Evidence: .sisyphus/evidence/task-4-no-old-format.txt
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `fix(router): correct Link paths and search param types`
  - Files: Footer.tsx, Agents.tsx, BoardGame.tsx, RawList.tsx, GlobalNotFound.tsx, AvataMenu.tsx, external-redirect.tsx, GszRegistrationModal.tsx
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "TS2820"` → 0

- [x] 5. Fix TanStack Router search params typing

  **What to do**:
  - 问题：`dash/index.tsx` 中 Link 组件传 `search={{}}` 给需要 required search params 的路由（如 `/dash/orders` 要求 `{ q, status, sortBy, sortOrder, groupBy, page }`）
  - 根因：虽然 `validateSearch` 函数内部给了默认值，但 TanStack Router 的类型推断把返回对象的每个字段都视为 required（因为返回类型是确定性对象字面量）
  - 修复方案 A（推荐）：在 Link 的 `search` prop 中传入空对象时使用 `search` 的函数形式：`search={(prev) => prev}` 或直接省略 `search` prop
  - 修复方案 B：将每个 route 的 `validateSearch` 用 `zodSearchValidator` 包裹，让所有字段都有 `.default()`，这样 TanStack Router 会将其推断为 optional
  - 分析哪种方案更符合项目现有模式（检查其他正确的 Link 用法）
  - 修复 `actives_.$id.tsx`、`tables_.$id.tsx`、`users_.$id.tsx` 中 `navigate({ to: "/dash/xxx" })` 缺少 `search` 的问题 — 加上 `search: {}` 并使用正确的类型

  **Must NOT do**:
  - 不要用 `as any` 绕过
  - 不要修改 tsconfig
  - 不要改变 URL 的实际行为（用户访问 `/dash/orders` 不带参数时应该用默认值）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/dash/actives.tsx:38-44` — validateSearch 实现，返回带默认值的对象
  - `apps/diceshock/src/apps/routers/dash/index.tsx:164-167` — 有问题的 Link 用法 `search={{}}`
  - `apps/diceshock/src/apps/routers/dash/actives_.$id.tsx:98` — navigate 缺少 search 参数

  **API/Type References**:
  - TanStack Router 的 `MakeRequiredSearchParams` 类型 — 当 validateSearch 返回确定性对象时，所有字段变 required

  **WHY Each Reference Matters**:
  - 理解 validateSearch 的类型推断机制才能选择正确的修复方案
  - dash/index.tsx 是主要的 hub 页面，有 ~10 个 Link 都传 `search={{}}`

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "MakeRequiredSearchParams\|search.*missing" | wc -l` = 0
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "dash/index.tsx\|actives_.\$id\|tables_.\$id\|users_.\$id" | wc -l` = 0

  **QA Scenarios**:

  ```
  Scenario: Search param type errors eliminated
    Tool: Bash
    Preconditions: Search param typing fixed across dash routes
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "MakeRequiredSearchParams" | wc -l`
      2. Assert result = 0
      3. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "search.*missing" | wc -l`
      4. Assert result = 0
    Expected Result: Zero search-param-related type errors
    Failure Indicators: Any remaining MakeRequiredSearchParams or "search missing" errors
    Evidence: .sisyphus/evidence/task-5-search-params.txt

  Scenario: Route navigation still works correctly
    Tool: Bash
    Preconditions: Link components updated
    Steps:
      1. Run `pnpm build` (includes type-check in build pipeline)
      2. Assert exit code 0
    Expected Result: Build succeeds with no type errors
    Evidence: .sisyphus/evidence/task-5-build.txt
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `fix(router): correct Link paths and search param types`
  - Files: dash/index.tsx, actives_.$id.tsx, tables_.$id.tsx, users_.$id.tsx
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "MakeRequiredSearchParams"` → 0

- [x] 6. Fix auth.ts user session type + remove as-any casts

  **What to do**:
  - **根因分析**：`userInfoZ` 通过 `createSelectSchema(userInfoTable).omit(...)` 生成。由于 Task 1 修复了 drizzle-orm 重复实例，`createSelectSchema` 的类型推断应该恢复正常
  - 修复后仍然存在的问题：
    1. `DrizzleAdapter(db(c.env.DB))` 报 `not assignable to 'SqlFlavorOptions'` — 这是 drizzle dual instance 导致的，Task 1 应已修复
    2. auth.ts:412-454 的 `uid: userInfoRaw.uid` 赋值报 `string not assignable to any[]` — 这说明 `injectCrossDataZ` 的 `UserInfo` 字段类型不正确
  - 检查 `userInfoTable` schema 中 `uid`、`nickname`、`phone` 字段的实际类型（应该是 `text`/`string`）
  - 如果 drizzle-zod 的 `createSelectSchema` 在修复 pg 重复后正确推断为 `string`，则这些错误自动消失
  - 如果仍有问题：手动检查 `injectCrossDataZ` 使用的 `userInfoZ` 类型是否正确映射
  - 移除 auth.ts 中现有的 `(drizzle as any).eq(...)` cast — 改为直接用 `eq()` (从 drizzle-orm import)
  - 确认 `c.env.AUTH_SECRET` 等属性在 Task 2 完成后不再报错

  **Must NOT do**:
  - 不要添加新的 `as any`
  - 不要修改 tsconfig
  - 不要改变 auth 行为逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2 (drizzle fix + env types)

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/server/middlewares/auth.ts:22-27` — `userInfoZ` 定义
  - `apps/diceshock/src/server/middlewares/auth.ts:410-456` — UserInfo 赋值处（`uid`, `nickname`, `phone`, `meta`）
  - `apps/diceshock/src/server/middlewares/auth.ts:428,444` — `(drizzle as any).eq(...)` 需要替换为直接 `eq()`
  - `apps/diceshock/src/shared/types/index.ts:10-17` — `injectCrossDataZ` 定义

  **API/Type References**:
  - `libs/db/src/schema` — userInfoTable 的 column 定义（uid/nickname/phone 应该是 text columns）
  - `drizzle-zod` 的 `createSelectSchema` — 从 table schema 生成 Zod schema

  **WHY Each Reference Matters**:
  - Task 1 修复 drizzle 重复后，大部分 auth.ts 错误应该自动消失
  - 剩余的 `as any` cast 是开发者绕过类型错误的临时方案，现在可以移除

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "auth.ts" | wc -l` = 0
  - [ ] `grep "as any" apps/diceshock/src/server/middlewares/auth.ts | wc -l` = 0

  **QA Scenarios**:

  ```
  Scenario: auth.ts zero type errors
    Tool: Bash
    Preconditions: Tasks 1 and 2 completed (drizzle dedup + env types)
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "auth.ts" | wc -l`
      2. Assert result = 0
    Expected Result: Zero type errors in auth.ts
    Failure Indicators: Any remaining errors in auth.ts
    Evidence: .sisyphus/evidence/task-6-auth-types.txt

  Scenario: No as-any casts remain in auth.ts
    Tool: Bash
    Preconditions: as-any casts replaced with proper typed calls
    Steps:
      1. Run `grep -c "as any" apps/diceshock/src/server/middlewares/auth.ts`
      2. Assert result = 0
    Expected Result: All as-any casts removed
    Evidence: .sisyphus/evidence/task-6-no-as-any.txt
  ```

  **Commit**: YES
  - Message: `fix(auth): correct UserInfo type inference and remove as-any casts`
  - Files: `apps/diceshock/src/server/middlewares/auth.ts`
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "auth.ts"` → 0

- [x] 7. Fix crawler.tsx trpc return type + crawlerManagement procedure types

  **What to do**:
  - 问题：`crawler.tsx` 使用 `CrawlerStats` 类型（从 trpc procedure 推断），但推断结果中字段为 `Record<never, never>` 而非具体类型
  - 根因：trpc procedure `crawlerManagement.getStats` 可能在 drizzle 重复实例修复后自动恢复正确类型推断（因为 SQL query 的返回类型依赖 drizzle-orm 类型）
  - 如果 Task 1 没有完全解决：
    1. 检查 `crawlerManagement.ts` 中 `getStats` procedure 的返回值类型
    2. 如果返回的是 raw SQL 查询结果（如 `db.all(sql)` without typed schema），需要添加显式返回类型
    3. 同样检查 `getErrors` procedure 的 `id` 和 `created_at` 字段缺失问题
  - 修复 `gszManagement.ts` 中类似的 drizzle 类型问题（同样应被 Task 1 解决）

  **Must NOT do**:
  - 不要用 `as any` 或类型断言绕过
  - 不要大幅重构 trpc router 结构
  - 不要修改 tsconfig

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 8)
  - **Blocks**: None
  - **Blocked By**: Task 1 (drizzle fix)

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/dash/crawler.tsx:25-31` — `CrawlerStats` 和 `CrawlerError` 类型定义（从 trpc infer）
  - `apps/diceshock/src/apps/routers/dash/crawler.tsx:70-73` — 使用 `stats.next_id` 等字段
  - `apps/diceshock/src/server/apis/trpc/crawlerManagement.ts` — trpc procedure 实现

  **WHY Each Reference Matters**:
  - crawler.tsx 的类型完全依赖 trpc procedure 的返回类型推断
  - 如果 drizzle dedup 修复后 SQL 查询类型正确，这些错误自动消失
  - 如果仍有问题，需要在 procedure 中显式类型化返回值

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "crawler\|crawlerManagement\|gszManagement" | wc -l` = 0

  **QA Scenarios**:

  ```
  Scenario: Crawler type errors resolved
    Tool: Bash
    Preconditions: Task 1 completed, drizzle types unified
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "crawler.tsx\|crawlerManagement\|gszManagement" | wc -l`
      2. Assert result = 0
    Expected Result: Zero crawler/gsz related type errors
    Failure Indicators: Remaining Record<never, never> or property-not-exist errors
    Evidence: .sisyphus/evidence/task-7-crawler-types.txt

  Scenario: trpc type inference works end-to-end
    Tool: Bash
    Preconditions: drizzle dedup applied
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "Record<never" | wc -l`
      2. Assert result = 0
    Expected Result: No more Record<never, never> inference failures
    Evidence: .sisyphus/evidence/task-7-no-record-never.txt
  ```

  **Commit**: YES (groups with Task 8)
  - Message: `fix(types): crawler stats type + ogCard queries + missing t()`
  - Files: crawlerManagement.ts, gszManagement.ts, crawler.tsx (if manual type annotation needed)
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "crawlerManagement\|gszManagement"` → 0

- [x] 8. Fix missing t() imports + ogCard relational queries

  **What to do**:
  - **t() 未定义**（4 处）：
    - `apps/diceshock/src/apps/routers/{-$storeLocale}/t/$code.tsx` — 3 处使用了 `t(...)` 但未 destructure。找到该文件的 i18n hook 调用，添加 `{ t }` 解构（或如果完全没有 hook 调用，添加 `const { t } = useTranslation();`）
    - `apps/diceshock/src/client/components/diceshock/DashNavMenu.tsx` — 1 处使用 `t` 未定义。同样添加 hook
  - **ogCard relational queries**（3 处）：
    - `activeCard.tsx:43-44,109` — `active.registrations`、`active.boardGame`、`active.creator` 不存在
    - 原因：drizzle query 使用了 `with: { creator: true, registrations: true, boardGame: true }` 但返回类型推断缺失
    - Task 1 修复 drizzle 重复后，关系查询类型推断应恢复正常
    - 如果仍有问题：检查 `activesTable` 的 `relations` 定义是否正确导出
  - **ogCard drizzle eq() 调用**（各 ogCard 文件的 `eq()` 报 shouldInlineParams）— 应被 Task 1 解决

  **Must NOT do**:
  - 不要使用 `@ts-ignore`
  - 不要重构 ogCard 的整体架构

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 7)
  - **Blocks**: None
  - **Blocked By**: Task 1 (drizzle fix for ogCard types)

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/routers/{-$storeLocale}/t/$code.tsx:690,742,784` — 使用 `t(...)` 的三处
  - `apps/diceshock/src/client/components/diceshock/DashNavMenu.tsx:177` — 使用 `t` 的一处
  - `apps/diceshock/src/server/apis/ogCards/activeCard.tsx:21-27` — drizzle relational query with `with` clause

  **API/Type References**:
  - 项目 i18n hook: `useTranslation` (从 `@/client/hooks/useTranslation` 或类似路径)
  - drizzle relational queries: `.query.tableName.findFirst({ with: {...} })` 返回类型包含 relation 字段

  **WHY Each Reference Matters**:
  - t() 问题是简单的遗漏 import/destructure
  - ogCard 的关系查询类型在 drizzle 单实例后应该正确推断

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "TS2304.*Cannot find name 't'" | wc -l` = 0
  - [ ] `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "ogCards" | wc -l` = 0

  **QA Scenarios**:

  ```
  Scenario: Missing t() resolved
    Tool: Bash
    Preconditions: useTranslation hook added/destructured in relevant files
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "Cannot find name 't'" | wc -l`
      2. Assert result = 0
    Expected Result: Zero "Cannot find name 't'" errors
    Evidence: .sisyphus/evidence/task-8-missing-t.txt

  Scenario: ogCard files clean
    Tool: Bash
    Preconditions: Task 1 completed (drizzle fix)
    Steps:
      1. Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep "ogCards" | wc -l`
      2. Assert result = 0
    Expected Result: Zero ogCard type errors
    Evidence: .sisyphus/evidence/task-8-ogcards.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `fix(types): crawler stats type + ogCard queries + missing t()`
  - Files: t/$code.tsx, DashNavMenu.tsx, ogCards/*.tsx
  - Pre-commit: `npx tsc --noEmit -p apps/diceshock/tsconfig.json 2>&1 | grep -c "TS2304"` → 0

- [x] 9. Fix useExhaustiveDependencies + useHookAtTopLevel

  **What to do**:
  - **useExhaustiveDependencies**（~38 处）：
    - 逐个分析每个 `useEffect`/`useCallback`/`useMemo` 的依赖项
    - 对于确实缺少依赖的情况：添加正确依赖
    - 对于需要 ref 避免重新执行的情况：将回调提取到 `useRef` 或 `useCallback` 中
    - 对于确实只需要运行一次的 effect（如 mount-only）：使用 `// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect` 注释（需有合理说明）
    - 绝不要盲目添加所有依赖 — 这会导致无限循环或性能问题
  - **useHookAtTopLevel**（4 处）：
    - 检查条件调用 hooks 的代码（如 `if (x) useEffect(...)`）
    - 重构为：将条件移入 hook 内部，或提取到子组件中
  - 每次修复后运行 `pnpm biome check` 验证 delta

  **Must NOT do**:
  - 不要盲目添加所有 lint 建议的依赖（可能导致无限循环）
  - 不要使用 `biome-ignore` 除非确实是 mount-only effect 且有注释说明
  - 不要大幅重构组件结构

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 10)
  - **Blocks**: None
  - **Blocked By**: Task 3 (biome auto-fix)

  **References**:

  **Pattern References**:
  - 现有代码中正确使用 `useCallback` + 依赖的示例
  - `apps/diceshock/src/apps/routers/dash/crawler.tsx:50-64` — `useCallback` 带 `[msg]` 依赖

  **WHY Each Reference Matters**:
  - React hooks 规则和 biome 的 exhaustive-deps 检查确保不会有 stale closure bugs
  - 但盲目添加依赖比不添加更危险（无限循环）

  **Acceptance Criteria**:
  - [ ] `pnpm biome check . 2>&1 | grep "useExhaustiveDependencies" | wc -l` = 0
  - [ ] `pnpm biome check . 2>&1 | grep "useHookAtTopLevel" | wc -l` = 0
  - [ ] 应用运行时不出现无限循环（通过 build 验证）

  **QA Scenarios**:

  ```
  Scenario: All hook dependency warnings resolved
    Tool: Bash
    Preconditions: Hook dependencies fixed or properly ignored
    Steps:
      1. Run `pnpm biome check . 2>&1 | grep -c "useExhaustiveDependencies"`
      2. Assert result = 0
      3. Run `pnpm biome check . 2>&1 | grep -c "useHookAtTopLevel"`
      4. Assert result = 0
    Expected Result: Zero hook-related lint issues
    Failure Indicators: Any remaining useExhaustiveDependencies or useHookAtTopLevel warnings
    Evidence: .sisyphus/evidence/task-9-hooks.txt

  Scenario: No infinite loops introduced
    Tool: Bash
    Preconditions: Dependencies modified
    Steps:
      1. Run `pnpm build` to verify compilation
      2. Assert exit code 0
    Expected Result: Build completes without hanging or errors
    Evidence: .sisyphus/evidence/task-9-build.txt
  ```

  **Commit**: YES (groups with Task 10)
  - Message: `fix(lint): useExhaustiveDeps + remaining biome issues`
  - Files: ~40 files
  - Pre-commit: `pnpm biome check . 2>&1 | grep -c "useExhaustiveDependencies\|useHookAtTopLevel"` → 0

- [x] 10. Fix remaining biome issues (noUselessFragments, noDangerouslySetInnerHtml, useTemplate, useImportType)

  **What to do**:
  - **noUselessFragments**（4 处）：将 `<>{children}</>` 简化为直接返回 `children`，或将 `<><Component/></>` 简化为 `<Component/>`
  - **noDangerouslySetInnerHtml**（10 处）：
    - 检查每处 `dangerouslySetInnerHTML` 的用途
    - 如果是渲染经过服务端消毒的 HTML（如 markdown 渲染结果）：添加 `// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side content`
    - 如果有更安全的替代方案，使用替代方案
  - **useTemplate**（2 处）：将字符串拼接改为模板字面量
  - **useImportType**（2 处）：将 `import { X }` 改为 `import type { X }`（仅当 X 只用于类型位置）
  - **noUselessConstructor**（1 处）：移除空构造函数
  - **noBannedTypes**（1 处）：替换被禁止的类型（如 `{}` → `Record<string, unknown>`）

  **Must NOT do**:
  - 不要用 `biome-ignore` 压制可修复的问题
  - 只对 `noDangerouslySetInnerHtml` 允许有合理说明的 ignore

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - biome docs: https://biomejs.dev/linter/rules/no-dangerously-set-inner-html/

  **WHY Each Reference Matters**:
  - 这些是 biome 剩余的非自动修复问题，需逐个人工判断

  **Acceptance Criteria**:
  - [ ] `pnpm biome check . 2>&1 | grep "Found.*errors"` → "Found 0 errors"
  - [ ] `pnpm biome check .` 退出码 0

  **QA Scenarios**:

  ```
  Scenario: biome fully clean
    Tool: Bash
    Preconditions: All manual biome fixes applied
    Steps:
      1. Run `pnpm biome check .`
      2. Assert exit code = 0
      3. Verify output says "Found 0 errors"
    Expected Result: Zero biome errors and zero warnings
    Failure Indicators: Any remaining diagnostics
    Evidence: .sisyphus/evidence/task-10-biome-clean.txt
  ```

  **Commit**: YES (groups with Task 9)
  - Message: `fix(lint): useExhaustiveDeps + remaining biome issues`
  - Files: various
  - Pre-commit: `pnpm biome check .` → exit 0

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify: tsc 0 errors in both apps, biome 0 errors/warnings, no biome.json or tsconfig changes, no new `as any` additions. Check `.sisyphus/evidence/` for all task evidence.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit -p apps/diceshock/tsconfig.json && npx tsc --noEmit -p apps/runespark/tsconfig.json && pnpm biome check .`. Review changed files for: new `as any`, `@ts-ignore`, `biome-ignore` without justification, deleted side-effectful code.
  Output: `TSC [PASS/FAIL] | Biome [PASS/FAIL] | Quality [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Run `pnpm build` to verify full build. Run `pnpm vitest run` if tests exist. Check that no runtime behavior changed by examining diffs for logical changes vs type-only changes.
  Output: `Build [PASS/FAIL] | Tests [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: verify biome.json and tsconfig*.json have ZERO diff. Verify no `@ts-ignore`/`@ts-expect-error` added. Count `as any` before vs after — must decrease or stay same. Verify routeTree.gen.ts changes are only auto-generated.
  Output: `Config files [UNCHANGED/MODIFIED] | as-any delta [+N/-N] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Key Files |
|------|---------------|-----------|
| 1 | `fix(deps): override pg to deduplicate drizzle-orm instances` | package.json, pnpm-lock.yaml |
| 2 | `fix(types): add missing Cloudflare Env secret bindings` | worker-configuration.d.ts |
| 3 | `style: biome auto-fix format + remove unused imports/vars` | ~50 files |
| 4+5 | `fix(router): correct Link paths and search param types` | ~15 files |
| 6 | `fix(auth): correct UserInfo type and remove as-any casts` | auth.ts, types/index.ts |
| 7+8 | `fix(types): crawler stats type + ogCard queries + missing t()` | ~8 files |
| 9+10 | `fix(lint): useExhaustiveDeps + remaining biome issues` | ~40 files |

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit -p apps/diceshock/tsconfig.json  # Expected: 0 errors
npx tsc --noEmit -p apps/runespark/tsconfig.json   # Expected: 0 errors
npx tsc --noEmit -p libs/db/tsconfig.json          # Expected: 0 errors
npx tsc --noEmit -p libs/utils/tsconfig.json       # Expected: 0 errors
pnpm biome check .                                  # Expected: exit 0
pnpm build                                          # Expected: success
```

### Final Checklist
- [ ] All "Must Have" present (0 tsc errors, 0 biome errors/warnings)
- [ ] All "Must NOT Have" absent (no config changes, no ts-ignore, no new as-any)
- [ ] All tests pass (existing vitest suite)
- [ ] pnpm build succeeds
