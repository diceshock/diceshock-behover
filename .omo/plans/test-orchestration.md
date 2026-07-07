# Test Orchestration: Husky + 并行测试 + Lighthouse + 干/湿 E2E

## TL;DR

> **Quick Summary**: 为 diceshock monorepo 建立完整的本地测试编排系统 — Husky git hooks 串联所有检查，Vitest/Playwright 并行执行，干/湿 E2E 分离，Lighthouse 性能回归检测。
> 
> **Deliverables**:
 > - Husky pre-commit (lint/format via lint-staged) + pre-push (全量测试)
> - `pnpm test:unit`, `pnpm test:e2e:dry`, `pnpm test:e2e:wet`, `pnpm test:lighthouse` 脚本
> - Vitest threads pool 并行化
> - Playwright workers 并行化 + 干/湿测试分离
> - Lighthouse CI 公开页面扫描 + 性能阈值基线
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 6 → Task 7 → F1-F4

---

## Context

### Original Request
使用 Husky 串联所有测试并引入 Lighthouse。并行执行测试，优化测试占用，完整 E2E 干测试和湿测试（使用真实模型测试）。

### Interview Summary
**Key Discussions**:
- **Husky 场景**: pre-commit 快速检查 (lint/typecheck) + pre-push 完整测试套件
- **并行策略**: 分层并行 — 类内并行，类间串行 (unit → E2E dry → E2E wet → Lighthouse)
- **干/湿定义**: 干 = mock 模型 E2E（快速隔离），湿 = 真实 DeepSeek API E2E
- **湿测试触发**: 每次 push（用户明确选择）
- **Lighthouse**: 全站公开页面扫描 + 基线 + 回归检测（阻断低于阈值变更）
- **范围**: 仅 diceshock app，仅本地，不含 CI/CD，不集成 ty-jk

**Research Findings**:
- Vitest 4.1 + Playwright 1.61 已安装，但无 `pnpm test` 命令
- 35 单元测试 + 8 E2E specs，E2E 基础设施成熟（POM, fixtures, vibe testing）
- `agent-wechat.spec.ts` 已有 LLM 调用逻辑（湿测试基础）
- `vibe.fixture.ts` 有 deterministic fallback 模式（干测试基础）
- 完全无 git hooks、无 Lighthouse

### Metis Review
**Identified Gaps** (addressed):
- 湿测试 API 失败处理: 缺少 `DEEPSEEK_API_KEY` 时应 graceful skip，非 hard fail
- Lighthouse 基线存储: 使用阈值配置文件 (`lighthouserc.json`)，非 commit 基线
- `fullyParallel: false` 原因需验证: 增加任务步骤验证测试独立性
- Pre-commit 性能: 必须 < 10s，typecheck 跑整个项目而非单文件
- Husky `prepare` script: 新 clone 自动安装 hooks
- 湿测试应始终串行: 防止 API rate limit

---

## Work Objectives

### Core Objective
建立完整的本地测试编排系统，通过 git hooks 自动执行分层并行测试，确保每次提交/推送的代码质量和性能基线。

### Concrete Deliverables
- `.husky/pre-commit` + `.husky/pre-push` hooks
- `lint-staged.config.js` 配置
- Root `package.json` 新增 test scripts
- `apps/diceshock/package.json` 新增 dry/wet E2E scripts
- `vitest.config.ts` 并行化配置
- `playwright.config.ts` 多配置（dry/wet）
- `.lighthouserc.json` 阈值配置
- `apps/diceshock/lighthouse/urls.txt` 页面列表

### Definition of Done
- [ ] `git commit` 含 lint 错误的文件 → 提交被拒绝
- [ ] `git commit` 仅改 .md 文件 → 即刻通过
- [ ] `git push` → 串行执行: unit → E2E dry → E2E wet → Lighthouse
- [ ] `pnpm test:unit` 并行跑完 35 个测试
- [ ] `pnpm test:e2e:dry` 并行跑完所有 mock E2E
- [ ] `pnpm test:e2e:wet` 串行跑真实 API E2E
- [ ] `pnpm test:lighthouse` 扫描公开页面，低于阈值时 exit 1

### Must Have
- Pre-commit 执行时间 < 10 秒
- Pre-push 总执行时间 < 3 分钟
- 缺少 `DEEPSEEK_API_KEY` 时湿测试 graceful skip + warning
- Lighthouse 阈值可配置（不硬编码）
- `pnpm install` 后 hooks 自动安装 (`prepare` script)
- 湿测试始终串行（防 rate limit）

### Must NOT Have (Guardrails)
- 不修改任何现有测试文件 (*.spec.ts, *.test.ts)
- 不修改 vibe.fixture.ts 内部逻辑（干/湿分离用环境变量驱动）
- 不添加 husky/lint-staged/@lhci/cli 之外的新依赖
- 不创建自定义 bash 脚本或 Makefile
- 不添加 CI/CD 配置文件
- 不配置覆盖率报告
- 不集成 ty-jk / x.sh
- 不创建 HTML 报告/dashboard（控制台输出即可）
- 不创建 per-page Lighthouse budgets（单一阈值配置）
- 不动 runespark app

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright)
- **Automated tests**: None (we are building test infrastructure, not writing tests)
- **Framework**: vitest (unit), playwright (e2e)
- **Note**: This plan builds the orchestration layer, not new test cases

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Git hooks**: Use Bash — create temp repo, commit bad code, verify rejection
- **Test scripts**: Use Bash — run scripts, verify exit codes and output
- **Lighthouse**: Use Bash — run lighthouse, verify JSON output + threshold logic

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — independent setup tasks):
├── Task 1: Add test scripts to package.json [quick]
├── Task 2: Install & configure Husky + lint-staged [quick]
└── Task 3: Vitest parallel configuration [quick]

Wave 2 (After Wave 1 — E2E restructuring + Lighthouse):
├── Task 4: Playwright parallel + dry/wet config split [unspecified-high]
├── Task 5: Lighthouse CI setup + public page scan [unspecified-high]
└── Task 6: Wet test graceful degradation [quick]

Wave 3 (After Wave 2 — integration + hooks wiring):
└── Task 7: Wire pre-push hook with full test pipeline [deep]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | None | 3, 4, 7 | 1 |
| 2 | None | 7 | 1 |
| 3 | 1 | 7 | 1 |
| 4 | 1 | 7 | 2 |
| 5 | None | 7 | 2 |
| 6 | 4 | 7 | 2 |
| 7 | 2, 3, 4, 5, 6 | F1-F4 | 3 |
| F1-F4 | 7 | user okay | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: 3 tasks — T4 → `unspecified-high`, T5 → `unspecified-high`, T6 → `quick`
- **Wave 3**: 1 task — T7 → `deep`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Add test scripts to package.json

  **What to do**:
  - Add to root `package.json` scripts:
    - `"test:unit": "vitest run"`
    - `"test:e2e:dry": "pnpm --filter diceshock run test:e2e:dry"`
    - `"test:e2e:wet": "pnpm --filter diceshock run test:e2e:wet"`
    - `"test:lighthouse": "pnpm --filter diceshock run test:lighthouse"`
    - `"test": "pnpm test:unit && pnpm test:e2e:dry && pnpm test:e2e:wet && pnpm test:lighthouse"`
    - `"prepare": "husky"`
  - Add to `apps/diceshock/package.json` scripts:
    - `"test:e2e:dry": "playwright test --config playwright.config.ts"`
    - `"test:e2e:wet": "playwright test --config playwright.wet.config.ts"`
    - `"test:lighthouse": "lhci autorun"`
  - Verify existing `test:e2e` script still works

  **Must NOT do**:
  - Don't remove or modify existing scripts
  - Don't add scripts to runespark
  - Don't use ty-jk or x.sh

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple JSON editing, no complex logic
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 3, 4, 7
  - **Blocked By**: None

  **References**:
  - `package.json` (root) — existing scripts section to extend
  - `apps/diceshock/package.json` — existing `test:e2e`, `test:e2e:ui`, `test:e2e:report` scripts as pattern
  - `vitest.config.ts` — confirms `vitest run` is the correct command
  - `apps/diceshock/playwright.config.ts` — confirms config file path

  **Acceptance Criteria**:
  - [ ] `pnpm test:unit` → exits 0, runs vitest
  - [ ] `pnpm test:e2e:dry` → exits 0, runs playwright with main config
  - [ ] `pnpm test:e2e:wet` → runs playwright with wet config (may skip if no API key)
  - [ ] `pnpm test:lighthouse` → runs lhci (may fail until Task 5 completes)
  - [ ] `pnpm prepare` → installs husky hooks

  **QA Scenarios**:

  ```
  Scenario: Unit test script works
    Tool: Bash
    Preconditions: Fresh install state
    Steps:
      1. Run `pnpm test:unit --run` from repo root
      2. Check exit code is 0
      3. Check stdout contains "Tests" and "passed"
    Expected Result: All 35 unit tests pass, exit code 0
    Failure Indicators: Non-zero exit code, "FAIL" in output
    Evidence: .sisyphus/evidence/task-1-unit-script.txt

  Scenario: E2E dry script invokes correct config
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run `pnpm --filter diceshock run test:e2e:dry -- --list` from repo root
      2. Check output lists test files from `e2e/fullstack/`
    Expected Result: Lists spec files, references playwright.config.ts
    Failure Indicators: "config not found" error, empty list
    Evidence: .sisyphus/evidence/task-1-e2e-dry-list.txt
  ```

  **Commit**: YES
  - Message: `build(test): add test scripts to package.json`
  - Files: `package.json`, `apps/diceshock/package.json`
  - Pre-commit: `pnpm exec biome check`

- [ ] 2. Install & configure Husky + lint-staged

  **What to do**:
  - Install: `pnpm add -Dw husky lint-staged`
  - Initialize Husky: `pnpm exec husky init`
  - Create `.husky/pre-commit`:
    ```sh
    pnpm exec lint-staged
    ```
  - Create `lint-staged.config.js` at root:
    ```js
    export default {
      '*.{ts,tsx,js,jsx}': ['biome check --write'],
      '*.{json,css,md}': ['biome format --write'],
    }
    ```
  - Add `"prepare": "husky"` to root package.json (if not already from Task 1)
  - Verify: commit a file with lint error → rejected
  - Verify: commit a .md file → passes < 10s

  **Must NOT do**:
  - Don't add typecheck to pre-commit (too slow for < 10s requirement)
  - Don't use `npx` — use `pnpm exec`
  - Don't add hooks for commit-msg

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Package installation + simple config files
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `package.json` (root) — devDependencies section, scripts section
  - Biome existing config — confirm `biome check` and `biome format` work standalone without ty-jk

  **Acceptance Criteria**:
  - [ ] `pnpm install` on fresh clone → `.husky/` hooks installed automatically
  - [ ] `git commit` with lint error in staged .ts file → commit rejected, error output shown
  - [ ] `git commit` with only .md changes → passes in < 10s
  - [ ] `lint-staged.config.js` exists and is valid ESM

  **QA Scenarios**:

  ```
  Scenario: Pre-commit rejects bad code
    Tool: Bash
    Preconditions: Husky hooks installed, repo is clean
    Steps:
      1. Create file `_test_lint_error.ts` with content `const x: string = 123;`
      2. Run `git add _test_lint_error.ts`
      3. Run `git commit -m "test bad code" 2>&1` and capture output
      4. Check exit code is non-zero
      5. Clean up: `git checkout -- . && rm -f _test_lint_error.ts`
    Expected Result: Commit rejected, biome error in output
    Failure Indicators: Exit code 0 (commit succeeded), no lint output
    Evidence: .sisyphus/evidence/task-2-precommit-reject.txt

  Scenario: Pre-commit passes clean changes
    Tool: Bash
    Preconditions: Husky hooks installed
    Steps:
      1. Create file `_test_clean.md` with content `# Test`
      2. Run `git add _test_clean.md`
      3. Time: `time git commit -m "test clean" 2>&1` and capture output
      4. Check exit code is 0, time < 10s
      5. Clean up: `git reset HEAD~1 && rm -f _test_clean.md`
    Expected Result: Commit succeeds in < 10s
    Failure Indicators: Exit code non-zero, time > 10s
    Evidence: .sisyphus/evidence/task-2-precommit-pass.txt
  ```

  **Commit**: YES
  - Message: `build(hooks): configure husky + lint-staged`
  - Files: `.husky/pre-commit`, `lint-staged.config.js`, `package.json`
  - Pre-commit: `pnpm exec biome check`

- [ ] 3. Vitest parallel configuration

  **What to do**:
  - Edit `vitest.config.ts`:
    - Add `pool: 'threads'` to test config
    - Add `poolOptions: { threads: { useAtomics: true } }` for better perf
    - Keep `fileParallelism: true` (default, but make explicit)
  - Run `pnpm test:unit` 3 times consecutively to verify stability
  - Verify no test failures introduced by thread isolation

  **Must NOT do**:
  - Don't modify any test files
  - Don't change test glob patterns
  - Don't add coverage config
  - Don't change the `@/` alias or resolve config

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file config change + verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1 (needs `pnpm test:unit` script)

  **References**:
  - `vitest.config.ts` — current config to modify (has `globals: true`, workspace globs, alias)
  - Vitest docs: threads pool configuration

  **Acceptance Criteria**:
  - [ ] `vitest.config.ts` contains `pool: 'threads'`
  - [ ] `pnpm test:unit` → all 35 tests pass
  - [ ] Run 3 consecutive times with 0 flaky failures
  - [ ] Execution time reduced compared to sequential (measure before/after)

  **QA Scenarios**:

  ```
  Scenario: Parallel vitest runs all tests successfully
    Tool: Bash
    Preconditions: Task 1 complete (test:unit script exists)
    Steps:
      1. Run `pnpm test:unit 2>&1 | tee /tmp/vitest-run1.txt`
      2. Check exit code is 0
      3. Grep for "Tests.*35.*passed" or equivalent pass count
      4. Run again: `pnpm test:unit 2>&1 | tee /tmp/vitest-run2.txt`
      5. Run third time: `pnpm test:unit 2>&1 | tee /tmp/vitest-run3.txt`
      6. All 3 runs exit 0
    Expected Result: 35/35 tests pass across 3 consecutive runs, no flakes
    Failure Indicators: Any run has non-zero exit, test count mismatch, "FAIL" in output
    Evidence: .sisyphus/evidence/task-3-parallel-vitest.txt

  Scenario: Thread pool is actually configured
    Tool: Bash
    Preconditions: vitest.config.ts modified
    Steps:
      1. Run `pnpm test:unit -- --reporter=verbose 2>&1 | head -20`
      2. Check for "pool" or "threads" mention in startup output
      3. Alternatively: `grep -n "pool" vitest.config.ts` — confirm it shows 'threads'
    Expected Result: Config shows threads pool active
    Failure Indicators: No pool config found, fallback to forks
    Evidence: .sisyphus/evidence/task-3-pool-config.txt
  ```

  **Commit**: YES
  - Message: `perf(test): enable vitest parallel execution with threads pool`
  - Files: `vitest.config.ts`
  - Pre-commit: `pnpm test:unit`

- [ ] 4. Playwright parallel + dry/wet config split

  **What to do**:
  - Modify `apps/diceshock/playwright.config.ts` (dry config):
    - Set `fullyParallel: true`
    - Increase `workers: process.env.CI ? 2 : 4`
    - Add `testIgnore: ['**/agent-wechat.spec.ts']` to exclude wet tests
    - Keep all other settings (projects, reporter, webServer, etc.)
  - Create `apps/diceshock/playwright.wet.config.ts` (wet config):
    - Import/extend base config
    - Set `fullyParallel: false` (wet tests always serial — rate limit protection)
    - Set `workers: 1`
    - Set `testMatch: ['**/agent-wechat.spec.ts']` — only wet test specs
    - Set `timeout: 120_000` (longer timeout for real API calls)
    - Remove `testIgnore`
  - Verify dry config runs all E2E except agent-wechat
  - Verify wet config runs only agent-wechat
  - Run dry tests 3 times to verify parallel stability

  **Must NOT do**:
  - Don't modify any .spec.ts files
  - Don't modify vibe.fixture.ts
  - Don't change webServer config
  - Don't change reporter settings
  - Don't add new test dependencies

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Config splitting requires understanding of Playwright config API + ensuring no regressions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 1 (needs e2e:dry/wet scripts)

  **References**:
  - `apps/diceshock/playwright.config.ts` — current config (fullyParallel: false, 2 projects, 90s timeout, webServer config)
  - `apps/diceshock/e2e/fullstack/agent-wechat.spec.ts` — the "wet" test file
  - `apps/diceshock/e2e/fixtures/vibe.fixture.ts` — has LLM simulation with fallback; env var `USE_REAL_MODEL` or similar may already exist
  - `apps/diceshock/e2e/fixtures/chat.fixture.ts` — mock chat streams (used in dry mode)

  **Acceptance Criteria**:
  - [ ] `pnpm test:e2e:dry` runs all specs EXCEPT agent-wechat.spec.ts
  - [ ] `pnpm test:e2e:dry` uses `workers: 4` and `fullyParallel: true`
  - [ ] `pnpm test:e2e:wet` runs ONLY agent-wechat.spec.ts
  - [ ] `pnpm test:e2e:wet` uses `workers: 1` and `fullyParallel: false`
  - [ ] 3 consecutive dry runs with 0 flaky failures

  **QA Scenarios**:

  ```
  Scenario: Dry E2E excludes wet tests
    Tool: Bash
    Preconditions: Both configs exist, Task 1 scripts present
    Steps:
      1. Run `pnpm --filter diceshock run test:e2e:dry -- --list 2>&1`
      2. Check output does NOT contain "agent-wechat"
      3. Check output contains other spec files (dash-integration, page-core, etc.)
    Expected Result: agent-wechat excluded, other specs listed
    Failure Indicators: "agent-wechat" appears in list, or list is empty
    Evidence: .sisyphus/evidence/task-4-dry-list.txt

  Scenario: Wet E2E only runs wet tests
    Tool: Bash
    Preconditions: Wet config exists
    Steps:
      1. Run `pnpm --filter diceshock run test:e2e:wet -- --list 2>&1`
      2. Check output contains "agent-wechat"
      3. Check output does NOT contain other spec files
    Expected Result: Only agent-wechat listed
    Failure Indicators: Other specs appear, or empty list
    Evidence: .sisyphus/evidence/task-4-wet-list.txt

  Scenario: Dry parallel stability (3 runs)
    Tool: Bash
    Preconditions: Dev server accessible
    Steps:
      1. Run `pnpm --filter diceshock run test:e2e:dry 2>&1 | tee /tmp/e2e-dry-1.txt`
      2. Check exit code 0
      3. Repeat 2 more times
      4. All 3 exit 0
    Expected Result: 0 failures across 3 parallel runs
    Failure Indicators: Any flaky failure, timeout
    Evidence: .sisyphus/evidence/task-4-dry-stability.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): separate dry/wet playwright configs with parallel execution`
  - Files: `apps/diceshock/playwright.config.ts`, `apps/diceshock/playwright.wet.config.ts`
  - Pre-commit: `pnpm test:e2e:dry -- --list`

- [ ] 5. Lighthouse CI setup + public page scan

  **What to do**:
  - Install: `pnpm add -Dw @lhci/cli`
  - Create `.lighthouserc.json` at repo root:
    ```json
    {
      "ci": {
        "collect": {
          "url": [],
          "startServerCommand": "pnpm --filter diceshock run dev",
          "startServerReadyPattern": "ready",
          "startServerReadyTimeout": 30000,
          "numberOfRuns": 3,
          "settings": {
            "onlyCategories": ["performance", "accessibility", "best-practices", "seo"],
            "skipAudits": ["uses-http2"]
          }
        },
        "assert": {
          "assertions": {
            "categories:performance": ["error", {"minScore": 0.7}],
            "categories:accessibility": ["error", {"minScore": 0.8}],
            "categories:best-practices": ["error", {"minScore": 0.8}],
            "categories:seo": ["error", {"minScore": 0.8}]
          }
        },
        "upload": {
          "target": "filesystem",
          "outputDir": "apps/diceshock/lighthouse/results"
        }
      }
    }
    ```
  - Create `apps/diceshock/lighthouse/urls.txt` with all public page routes (enumerate from TanStack Router config)
  - The `url` array in lighthouserc should be populated from routes: `/`, `/zh/`, `/en/`, `/zh/ready`, `/zh/my-riichi`, `/zh/t`, etc.
  - Exclude all `/dash/*` routes
  - Add `apps/diceshock/lighthouse/results/` to `.gitignore`
  - Verify `pnpm test:lighthouse` produces scores and respects thresholds

  **Must NOT do**:
  - Don't create per-page budgets
  - Don't add HTML report viewers
  - Don't test authenticated pages
  - Don't create custom Lighthouse plugins
  - Don't add assertions beyond the 4 category scores

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Needs to enumerate routes from codebase, configure LHCI correctly, handle dev server startup
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: None (independent setup)

  **References**:
  - `apps/diceshock/src/apps/routeTree.gen.ts` — auto-generated route tree, enumerate all public paths from here
  - `apps/diceshock/src/apps/router.ts` — router configuration
  - `apps/diceshock/package.json` — `dev` script for server startup command
  - `apps/diceshock/vite.config.ts` — port config for dev server
  - `.gitignore` — add lighthouse results dir

  **Acceptance Criteria**:
  - [ ] `.lighthouserc.json` exists with threshold config
  - [ ] `pnpm test:lighthouse` starts dev server and runs audits
  - [ ] Reports scores for performance, accessibility, best-practices, seo
  - [ ] Exits non-zero if any score below threshold
  - [ ] No `/dash/*` routes in URL list
  - [ ] Results directory is gitignored

  **QA Scenarios**:

  ```
  Scenario: Lighthouse runs and produces scores
    Tool: Bash
    Preconditions: @lhci/cli installed, dev server can start
    Steps:
      1. Run `pnpm test:lighthouse 2>&1 | tee /tmp/lhci-output.txt`
      2. Check output contains "performance" score
      3. Check output contains "accessibility" score
      4. Check for JSON results in `apps/diceshock/lighthouse/results/`
    Expected Result: Scores produced for all categories, results saved
    Failure Indicators: "LHCI server not found", no scores in output, server startup timeout
    Evidence: .sisyphus/evidence/task-5-lighthouse-scores.txt

  Scenario: Lighthouse excludes dashboard pages
    Tool: Bash
    Preconditions: lighthouserc.json configured
    Steps:
      1. Run `cat .lighthouserc.json | grep -c "dash"` — should be 0
      2. Alternatively check `apps/diceshock/lighthouse/urls.txt` does not contain "dash"
    Expected Result: Zero "/dash" URLs in config
    Failure Indicators: Any "/dash" URL found
    Evidence: .sisyphus/evidence/task-5-no-dash.txt
  ```

  **Commit**: YES
  - Message: `build(perf): add lighthouse CI for public page performance auditing`
  - Files: `.lighthouserc.json`, `apps/diceshock/lighthouse/urls.txt`, `.gitignore`, `package.json`
  - Pre-commit: `pnpm exec biome check`

- [ ] 6. Wet test graceful degradation

  **What to do**:
  - Create a small wrapper check in `playwright.wet.config.ts` or a shared utility:
    - Before running: check for `DEEPSEEK_API_KEY` env var
    - If missing: print warning `⚠ DEEPSEEK_API_KEY not set — skipping wet E2E tests`
    - Exit 0 (graceful skip, not failure)
  - Implementation approach: Use Playwright's `globalSetup` in wet config:
    ```ts
    // apps/diceshock/e2e/wet-global-setup.ts
    export default function globalSetup() {
      if (!process.env.DEEPSEEK_API_KEY) {
        console.warn('⚠ DEEPSEEK_API_KEY not set — skipping wet E2E tests');
        process.exit(0);
      }
    }
    ```
  - Reference this in `playwright.wet.config.ts`: `globalSetup: './e2e/wet-global-setup.ts'`
  - Set timeout for wet tests: 120s per test (real API can be slow)
  - Verify: without key → graceful skip; with key → runs tests

  **Must NOT do**:
  - Don't modify existing fixture files
  - Don't add env var to .env files (it's a secret)
  - Don't hard-fail on missing key
  - Don't add retry logic for API failures (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small file creation + config reference
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 4 (needs wet config to exist)

  **References**:
  - `apps/diceshock/playwright.wet.config.ts` — the wet config from Task 4
  - `apps/diceshock/e2e/fullstack/agent-wechat.spec.ts` — understands how DeepSeek key is used
  - `apps/diceshock/e2e/fixtures/vibe.fixture.ts` — may already read env vars for model config

  **Acceptance Criteria**:
  - [ ] `unset DEEPSEEK_API_KEY && pnpm test:e2e:wet` → exits 0 with warning
  - [ ] `DEEPSEEK_API_KEY=sk-xxx pnpm test:e2e:wet` → runs agent-wechat tests
  - [ ] Warning message is visible in console output
  - [ ] No .env file created or modified

  **QA Scenarios**:

  ```
  Scenario: Missing API key graceful skip
    Tool: Bash
    Preconditions: playwright.wet.config.ts exists with globalSetup
    Steps:
      1. Run `unset DEEPSEEK_API_KEY; pnpm --filter diceshock run test:e2e:wet 2>&1`
      2. Check exit code is 0
      3. Check output contains "DEEPSEEK_API_KEY not set" or "skipping"
    Expected Result: Exit 0, warning shown, no test execution
    Failure Indicators: Non-zero exit code, test execution attempted, error thrown
    Evidence: .sisyphus/evidence/task-6-graceful-skip.txt

  Scenario: With API key runs tests
    Tool: Bash
    Preconditions: DEEPSEEK_API_KEY available in environment
    Steps:
      1. Run `DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY pnpm --filter diceshock run test:e2e:wet -- --list 2>&1`
      2. Check output lists agent-wechat.spec.ts
      3. Check no "skipping" message
    Expected Result: Test file listed, globalSetup passes through
    Failure Indicators: "skipping" appears, empty list
    Evidence: .sisyphus/evidence/task-6-with-key.txt
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `test(e2e): add wet test graceful degradation for missing API key`
  - Files: `apps/diceshock/e2e/wet-global-setup.ts`, `apps/diceshock/playwright.wet.config.ts`
  - Pre-commit: `pnpm exec biome check`

- [ ] 7. Wire pre-push hook with full test pipeline

  **What to do**:
  - Create `.husky/pre-push`:
    ```sh
    #!/usr/bin/env sh

    echo "🧪 Running full test pipeline..."

    # Layer 1: Unit tests (parallel within)
    echo "📦 [1/4] Unit tests..."
    pnpm test:unit || exit 1

    # Layer 2: E2E dry tests (parallel within)
    echo "🎭 [2/4] E2E dry tests..."
    pnpm test:e2e:dry || exit 1

    # Layer 3: E2E wet tests (serial, real API)
    echo "🌊 [3/4] E2E wet tests..."
    pnpm test:e2e:wet || exit 1

    # Layer 4: Lighthouse (performance regression)
    echo "🔦 [4/4] Lighthouse performance audit..."
    pnpm test:lighthouse || exit 1

    echo "✅ All tests passed!"
    ```
  - Make executable: `chmod +x .husky/pre-push`
  - Verify: `git push` triggers the full pipeline
  - Verify: failing unit test → push rejected at layer 1 (fast fail)
  - Verify: total time < 3 minutes (measure)
  - Consider: Add `SKIP_TESTS=1 git push` escape hatch via env var check at top

  **Must NOT do**:
  - Don't use background/parallel processes between layers (keep sequential as user specified)
  - Don't add custom Node scripts
  - Don't modify the pre-commit hook
  - Don't add notification/beep sounds

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration task — must verify full pipeline works end-to-end, timing requirements, failure modes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (solo)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 3, 4, 5, 6 (needs all components ready)

  **References**:
  - `.husky/pre-commit` — pattern for hook file format (from Task 2)
  - Root `package.json` scripts — `test:unit`, `test:e2e:dry`, `test:e2e:wet`, `test:lighthouse`
  - All previous tasks' outputs — this task integrates everything

  **Acceptance Criteria**:
  - [ ] `.husky/pre-push` exists and is executable
  - [ ] `git push` triggers all 4 test layers sequentially
  - [ ] Failing test at any layer → push rejected (early exit)
  - [ ] Total pipeline time < 3 minutes
  - [ ] `SKIP_TESTS=1 git push` bypasses all tests

  **QA Scenarios**:

  ```
  Scenario: Pre-push runs full pipeline
    Tool: Bash
    Preconditions: All previous tasks complete, hooks installed
    Steps:
      1. Create a test branch: `git checkout -b test-prepush-$(date +%s)`
      2. Make a trivial commit: `echo "test" >> _prepush_test.md && git add . && git commit -m "test"`
      3. Run `git push origin HEAD 2>&1 | tee /tmp/prepush-output.txt` (or simulate with `.husky/pre-push`)
      4. Check output shows all 4 layers executed
      5. Check output contains "All tests passed"
      6. Measure total time < 180s
      7. Clean up: `git checkout main && git branch -D test-prepush-*`
    Expected Result: All 4 layers run, pass, total < 3 min
    Failure Indicators: Any layer missing from output, timeout > 3 min
    Evidence: .sisyphus/evidence/task-7-full-pipeline.txt

  Scenario: Pipeline fails fast on unit test failure
    Tool: Bash
    Preconditions: Hooks installed
    Steps:
      1. Temporarily break a unit test (add `test.skip` → `test.only` that fails)
      2. Actually — don't modify test files. Instead: run `.husky/pre-push` directly with env to simulate
      3. Alternative: `echo 'exit 1' > /tmp/fake-unit && pnpm test:unit` (can't easily test without modifying)
      4. Instead: verify the script uses `|| exit 1` pattern by reading the file
      5. `grep -c "|| exit 1" .husky/pre-push` — should be 4
    Expected Result: 4 exit-on-failure guards present
    Failure Indicators: Fewer than 4 `|| exit 1` guards
    Evidence: .sisyphus/evidence/task-7-fail-fast.txt

  Scenario: SKIP_TESTS bypass works
    Tool: Bash
    Preconditions: pre-push hook has SKIP_TESTS check
    Steps:
      1. Run `SKIP_TESTS=1 .husky/pre-push 2>&1`
      2. Check exit code is 0
      3. Check no test output (skipped entirely)
    Expected Result: Immediate exit 0, no tests run
    Failure Indicators: Tests still run, non-zero exit
    Evidence: .sisyphus/evidence/task-7-skip-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(hooks): wire pre-push hook with full layered test pipeline`
  - Files: `.husky/pre-push`
  - Pre-commit: `chmod +x .husky/pre-push && .husky/pre-push` (self-test — actually just verify file)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm exec biome check`. Verify no TypeScript errors in new/modified config files. Check for stale imports, unused configs.
  Output: `Lint [PASS/FAIL] | Type Check [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  From clean state: run `pnpm install`, verify hooks installed. Create dirty commit, verify rejection. Run each test script individually. Run `git push` simulation.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify: no existing test files modified, no runespark changes, no CI/CD files, no ty-jk integration, no new deps beyond husky/lint-staged/@lhci/cli.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit Check |
|--------|---------|-------|-----------------|
| 1 | `build(test): add test scripts to package.json` | `package.json`, `apps/diceshock/package.json` | biome check |
| 2 | `build(hooks): configure husky + lint-staged` | `.husky/*`, `lint-staged.config.js`, `package.json` | biome check |
| 3 | `perf(test): enable vitest parallel execution` | `vitest.config.ts` | pnpm test:unit |
| 4 | `test(e2e): separate dry/wet playwright configs` | `apps/diceshock/playwright.config.ts`, `apps/diceshock/playwright.wet.config.ts` | pnpm test:e2e:dry |
| 5 | `build(perf): add lighthouse CI for public pages` | `.lighthouserc.json`, `apps/diceshock/lighthouse/*`, `package.json` | pnpm test:lighthouse |
| 6 | `feat(hooks): wire pre-push full test pipeline` | `.husky/pre-push` | git push (self-test) |

---

## Success Criteria

### Verification Commands
```bash
# Pre-commit rejects bad code
echo "const x: number = 'oops'" > /tmp/test.ts && git add /tmp/test.ts && git commit -m "test"
# Expected: commit rejected by biome/typecheck

# Unit tests run in parallel
pnpm test:unit
# Expected: 35 tests pass, uses thread pool

# Dry E2E
pnpm test:e2e:dry
# Expected: all specs pass with mocked responses

# Wet E2E
DEEPSEEK_API_KEY=sk-xxx pnpm test:e2e:wet
# Expected: agent-wechat passes with real API

# Wet E2E graceful skip
unset DEEPSEEK_API_KEY && pnpm test:e2e:wet
# Expected: skip with warning, exit 0

# Lighthouse
pnpm test:lighthouse
# Expected: scans public pages, reports scores, exit 1 if below threshold

# Full pre-push pipeline
git push
# Expected: unit → e2e:dry → e2e:wet → lighthouse, sequential
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Pre-commit < 10s
- [ ] Pre-push < 3 min
- [ ] All 35 unit tests pass with threads pool
- [ ] All E2E specs pass with parallel workers
- [ ] Lighthouse produces scores for all public pages
