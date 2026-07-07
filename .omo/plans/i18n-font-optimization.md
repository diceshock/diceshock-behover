# i18n 资源按需加载 & 字体优化

## TL;DR

> **Quick Summary**: 将翻译文件和字体资源从全量静态加载改为按 locale 按需加载，CJK 字体使用 unicode-range 分片技术，大幅减少页面体积。
> 
> **Deliverables**:
> - 翻译 JSON 按语言 code-split，只加载当前 locale
> - CJK 字体（Noto Sans SC/TC/JP）通过 cn-font-split 切片 + unicode-range 按需加载
> - 拉丁/西里尔字体使用 Inter（全量小，无需切片）
> - 字体文件自托管到 R2（assets.runespark.fun）
> - SSR 根据 locale 注入对应字体 CSS
> - 移除 Sarasa 字体依赖
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (font prep) → Task 4 (font CSS) → Task 6 (SSR integration) → Task 8 (cleanup)

---

## Context

### Original Request
优化 i18n 实现：翻译文件按需加载、字体按语言按需加载、CJK 字体使用 unicode-range 分片解决加载过慢问题。语言切换需刷新页面。

### Interview Summary
**Key Discussions**:
- 字体风格: 保持无衬线/黑体风格
- 字体托管: 从 Google Fonts 下载后放 R2 自托管
- 翻译拆分: 按语言拆分即可（每个 locale 一个 chunk）
- 字体选型: Noto Sans SC/TC/JP + Inter
- 字重: 保留全部当前字重（200, 300, 400, 600, 700）
- Italic: 全部保留
- Dots 字体: 全局保留
- 语言切换 = 页面刷新

**Research Findings**:
- 当前 Sarasa .ttc 每个文件 10-30MB，10 个字重变体 = 100-300MB 总字体资源
- 当前 `shared/i18n/index.ts` 静态 import 9 个 locale JSON，全部打入一个 bundle
- SSR 已通过 URL 路径段 `{store}-{locale}` 确定用户语言
- I18nProvider 使用 React context，`getTranslation()` 从静态 TRANSLATIONS map 读取
- cn-font-split 可将 CJK 字体切为 ~120 个 unicode-range slice（每个 20-50KB woff2）
- Inter 全量 woff2 约 80-100KB（含 Latin + Cyrillic），无需切片

### Metis Review
**Identified Gaps** (addressed):
- CJK 字体即使换 Noto Sans 仍然很大 → 使用 cn-font-split unicode-range 分片
- 字体 CSS 注入时机需明确 → SSR 阶段在 `<head>` 中注入 `<link>` 或内联 CSS
- FOUT/FOIT 处理 → 使用 `font-display: swap` 确保文字先显示
- 翻译加载失败的 fallback → 保留 zh_Hans 作为内联 fallback

---

## Work Objectives

### Core Objective
将 i18n 翻译和字体资源从全量加载改为按 locale 按需加载，CJK 字体实现 unicode-range 分片，从根本上解决中文字体加载慢的问题。

### Concrete Deliverables
- `scripts/font-split.ts` — 字体分片构建脚本
- `apps/diceshock/src/shared/i18n/index.ts` — 重构为 dynamic import
- `apps/diceshock/src/shared/i18n/loader.ts` — 异步 locale loader
- Per-locale 字体 CSS 文件（含 unicode-range 声明）
- R2 上传的字体分片文件
- SSR 层字体 CSS 注入逻辑
- `apps/diceshock/src/apps/style.css` — 移除 Sarasa @font-face

### Definition of Done
- [ ] 每种 locale 的翻译文件独立 chunk，不在主 bundle 中
- [ ] 中文页面只下载实际用到字符的字体分片（通常 5-15 个 slice = 100-500KB）
- [ ] 拉丁语言页面只加载 Inter（~100KB）
- [ ] Dots 字体全局保留
- [ ] 语言切换后刷新页面，新语言正确加载对应资源
- [ ] 首次加载无 FOIT（font-display: swap）

### Must Have
- 翻译 JSON 按 locale code-split（dynamic import）
- CJK 字体 unicode-range 分片
- SSR 注入当前 locale 对应的字体 CSS
- font-display: swap 防止字体阻塞渲染
- zh_Hans 翻译作为 fallback（内联或同步加载）

### Must NOT Have (Guardrails)
- 不做运行时语言热切换（已确认语言切换需刷新）
- 不做 per-route 翻译拆分（按语言整体加载即可）
- 不引入 i18n 框架（如 react-i18next）—— 保持当前自研方案
- 不修改翻译 key 结构或内容
- 不改变 locale 检测/路由逻辑
- 不做字体 preload（按需加载优先，避免预加载不需要的分片）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after) — 修改现有 i18n 测试适配新异步 API
- **Framework**: vitest (already configured)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Build verification**: `pnpm build` 成功
- **Bundle analysis**: 检查 locale chunk 是否独立
- **Font file verification**: curl R2 URL 确认分片文件可访问
- **SSR output inspection**: 检查 HTML 输出中字体 CSS 注入

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - font prep + translation refactor, independent):
├── Task 1: CJK 字体下载 + cn-font-split 分片 + 上传 R2 [unspecified-high]
├── Task 2: Inter 字体下载 + 处理 + 上传 R2 [quick]
├── Task 3: 翻译 JSON dynamic import 重构 [deep]

Wave 2 (After Wave 1 - CSS generation + SSR integration):
├── Task 4: 生成 per-locale 字体 CSS 文件 (depends: 1, 2) [unspecified-high]
├── Task 5: I18nProvider 适配异步加载 (depends: 3) [unspecified-high]
├── Task 6: SSR 字体 CSS 注入逻辑 (depends: 4) [deep]

Wave 3 (After Wave 2 - cleanup + verification):
├── Task 7: 移除 Sarasa + 更新 style.css (depends: 6) [quick]
├── Task 8: 更新测试 + 全量验证 (depends: 5, 7) [unspecified-high]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 4 |
| 2 | - | 4 |
| 3 | - | 5 |
| 4 | 1, 2 | 6 |
| 5 | 3 | 8 |
| 6 | 4 | 7 |
| 7 | 6 | 8 |
| 8 | 5, 7 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `unspecified-high`, T2 → `quick`, T3 → `deep`
- **Wave 2**: 3 tasks — T4 → `unspecified-high`, T5 → `unspecified-high`, T6 → `deep`
- **Wave 3**: 2 tasks — T7 → `quick`, T8 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. CJK 字体下载 + cn-font-split 分片 + 上传 R2

  **What to do**:
  - 安装 `cn-font-split` 作为 devDependency
  - 从 Google Fonts 下载 Noto Sans SC, Noto Sans TC, Noto Sans JP 的 woff2 源文件（字重: 200, 300, 400, 600, 700；含 italic 变体）
  - 编写构建脚本 `scripts/font-split.ts`，对每个字体/字重/样式组合执行 cn-font-split
  - 输出结构: `fonts/{font-family}/{weight}-{style}/slice-{N}.woff2` + 对应的 `result.css`（含 unicode-range 声明）
  - 将分片文件上传到 R2 bucket（assets.runespark.fun/fonts/noto-sans-sc/400/... 等路径）
  - 脚本应为幂等，可重复执行

  **Must NOT do**:
  - 不修改任何应用代码
  - 不处理 Inter 字体（Task 2 负责）
  - 不生成最终的 locale CSS（Task 4 负责）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及外部工具安装、文件处理流水线、R2 上传，需要较强综合能力
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `cloudflare-deploy`: 只做 R2 文件上传，不涉及 Worker 部署

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/style.css:126-201` — 当前 Sarasa @font-face 声明结构，了解字重/样式覆盖需求
  - `scripts/` 目录 — 已有脚本结构参考

  **API/Type References**:
  - `apps/diceshock/src/shared/store-locale.ts:50-60` — LOCALES 定义，确认 CJK locales: zh_Hans, zh_Hant, ja

  **External References**:
  - cn-font-split: https://github.com/nicepkg/cn-font-split — 字体分片工具
  - Google Fonts Noto Sans SC: https://fonts.google.com/noto/specimen/Noto+Sans+SC
  - wrangler r2 object put: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

  **WHY Each Reference Matters**:
  - style.css 的 @font-face 告诉你需要覆盖哪些字重和样式组合
  - store-locale.ts 确认哪些 locale 需要 CJK 字体
  - cn-font-split 是核心工具，需要了解其 API 和输出格式

  **Acceptance Criteria**:
  - [ ] `scripts/font-split.ts` 可通过 `npx tsx scripts/font-split.ts` 执行
  - [ ] 每个 CJK 字体/字重组合生成 50-150 个 woff2 slice 文件
  - [ ] 每个 slice 文件 < 100KB
  - [ ] 生成的 result.css 包含正确的 unicode-range 声明
  - [ ] 文件已上传到 R2 且可通过 `https://assets.runespark.fun/fonts/noto-sans-sc/400/slice-001.woff2` 访问

  **QA Scenarios**:

  ```
  Scenario: CJK font slices are correctly generated
    Tool: Bash
    Preconditions: cn-font-split installed, Noto Sans SC woff2 source downloaded
    Steps:
      1. Run `npx tsx scripts/font-split.ts`
      2. Check output directory `fonts/noto-sans-sc/400/` exists
      3. Count woff2 files: `ls fonts/noto-sans-sc/400/*.woff2 | wc -l`
      4. Check largest file: `ls -la fonts/noto-sans-sc/400/ | sort -k5 -n | tail -1`
      5. Verify CSS generated: `cat fonts/noto-sans-sc/400/result.css | grep "unicode-range" | wc -l`
    Expected Result: 50-150 woff2 files, largest < 100KB, CSS has matching number of unicode-range declarations
    Failure Indicators: 0 output files, single large file > 1MB, no unicode-range in CSS
    Evidence: .sisyphus/evidence/task-1-font-split-output.txt

  Scenario: Font slices accessible on R2
    Tool: Bash (curl)
    Preconditions: Files uploaded to R2
    Steps:
      1. `curl -sI https://assets.runespark.fun/fonts/noto-sans-sc/400/slice-001.woff2`
      2. Check status code is 200
      3. Check Content-Type header contains "font/woff2" or "application/octet-stream"
    Expected Result: HTTP 200, content served correctly
    Failure Indicators: 404, 403, or timeout
    Evidence: .sisyphus/evidence/task-1-r2-access.txt
  ```

  **Commit**: YES (group 1)
  - Message: `feat(fonts): add CJK font splitting script and upload slices to R2`
  - Files: `scripts/font-split.ts`, `package.json` (devDep)
  - Pre-commit: script runs without error

- [x] 2. Inter 字体下载 + 处理 + 上传 R2

  **What to do**:
  - 从 Google Fonts 下载 Inter woff2 文件（字重: 200, 300, 400, 600, 700；italic 变体）
  - Inter 已按 latin/latin-ext/cyrillic/cyrillic-ext/greek 等 subset 拆分，直接使用 Google Fonts 的分片即可
  - 上传到 R2: `assets.runespark.fun/fonts/inter/{weight}-{style}.woff2`（或按 subset 分几个文件）
  - 生成 Inter 的 @font-face CSS（含 unicode-range，照搬 Google Fonts 的声明）

  **Must NOT do**:
  - 不使用 cn-font-split（Inter 不需要）
  - 不修改应用代码

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的文件下载和上传任务
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/style.css:126-201` — 当前字重声明参考

  **External References**:
  - Google Fonts Inter: https://fonts.google.com/specimen/Inter
  - Google Fonts CSS API (查看 unicode-range 声明): `https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,200;0,300;0,400;0,600;0,700;1,200;1,300;1,400;1,600;1,700&display=swap`

  **WHY Each Reference Matters**:
  - Google Fonts CSS API 返回的 CSS 包含完美的 unicode-range subset 声明，可直接复制修改 URL 为 R2 路径

  **Acceptance Criteria**:
  - [ ] Inter woff2 文件已上传 R2
  - [ ] 生成的 CSS 文件包含 unicode-range 声明（latin, latin-ext, cyrillic 等 subset）
  - [ ] 覆盖字重 200, 300, 400, 600, 700 正体和斜体

  **QA Scenarios**:

  ```
  Scenario: Inter font files accessible on R2
    Tool: Bash (curl)
    Preconditions: Files uploaded
    Steps:
      1. `curl -sI https://assets.runespark.fun/fonts/inter/400-normal-latin.woff2`
      2. Verify HTTP 200
    Expected Result: All font files return 200
    Failure Indicators: 404 or missing files
    Evidence: .sisyphus/evidence/task-2-inter-access.txt
  ```

  **Commit**: YES (group 1)
  - Message: `feat(fonts): add Inter font files to R2`
  - Files: font files, CSS
  - Pre-commit: curl test passes

- [x] 3. 翻译 JSON dynamic import 重构

  **What to do**:
  - 创建 `apps/diceshock/src/shared/i18n/loader.ts`，导出异步加载函数:
    ```ts
    export async function loadLocale(locale: LocaleCode): Promise<TranslationDict> {
      const module = await import(`./locales/${locale}.json`);
      return module.default;
    }
    ```
  - 修改 `apps/diceshock/src/shared/i18n/index.ts`:
    - 移除所有静态 `import xx from "./locales/xx.json"` 
    - 移除静态 `TRANSLATIONS` map
    - 保留 `zh_Hans` 作为同步内联 fallback（它是默认语言，SSR 时一定需要）
    - 导出 `setTranslations(locale, dict)` 用于注册已加载的翻译
    - `getTranslation()` 逻辑不变，但从运行时注册的 dict 读取
  - 确保 Vite 将每个 locale JSON 打包为独立 chunk（dynamic import 默认行为）
  - SSR 端：在渲染前 `await loadLocale(currentLocale)` 然后 `setTranslations(locale, dict)`
  - 客户端：SSR 时在 HTML 中注入已加载的翻译数据（通过 `<script>` 标签），客户端 hydrate 时直接使用，无需重新 fetch

  **Must NOT do**:
  - 不修改翻译 key 结构或内容
  - 不引入 i18n 框架
  - 不做 per-route 拆分
  - 不修改 locale 路由检测逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及 SSR + 客户端 hydration 的同步问题，需要深入理解数据流
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/shared/i18n/index.ts:1-103` — 当前翻译系统完整实现（需要重构的文件）
  - `apps/diceshock/src/shared/i18n/types.ts:1-32` — 类型定义（保持不变）
  - `apps/diceshock/src/client/providers/I18nProvider.tsx:1-41` — 客户端 Provider（需要适配）

  **API/Type References**:
  - `apps/diceshock/src/shared/store-locale.ts:5-14` — LocaleCode 类型定义
  - `apps/diceshock/src/shared/i18n/types.ts:1-2` — TranslationDict 类型

  **Test References**:
  - `apps/diceshock/src/shared/__tests__/i18n.test.ts` — 现有测试，需要适配异步 API
  - `apps/diceshock/src/client/__tests__/i18n-provider.test.ts` — Provider 测试

  **External References**:
  - Vite dynamic import code splitting: https://vite.dev/guide/features#dynamic-import

  **WHY Each Reference Matters**:
  - index.ts 是要重构的核心文件，必须理解当前 API surface
  - I18nProvider 依赖 getTranslation()，API 变化会影响它
  - 测试文件告诉你当前的 public API contract
  - Vite dynamic import 文档确认 code-splitting 行为

  **Acceptance Criteria**:
  - [ ] `pnpm build` 输出中可见独立的 locale chunk 文件（如 `de-xxxxx.js`, `fr-xxxxx.js`）
  - [ ] 主 bundle 不再包含非 zh_Hans 的翻译内容
  - [ ] `getTranslation()` API 保持同步调用（已加载的翻译）
  - [ ] SSR 渲染结果与重构前一致

  **QA Scenarios**:

  ```
  Scenario: Locale chunks are code-split in build output
    Tool: Bash
    Preconditions: Build completed successfully
    Steps:
      1. Run `pnpm --filter diceshock build`
      2. Search build output for locale chunk files: `find dist -name "*.js" | xargs grep -l '"nav"' | head -5`
      3. Check main bundle does NOT contain German translations: `grep -r "Laden..." dist/assets/index-*.js`
    Expected Result: Locale-specific strings only in their chunk files, not in main bundle
    Failure Indicators: All translations found in main bundle, no separate chunks
    Evidence: .sisyphus/evidence/task-3-bundle-analysis.txt

  Scenario: SSR renders correct translation for non-default locale
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. `curl -s http://localhost:5173/gg-en/ | grep -o "Home"`
      2. `curl -s http://localhost:5173/gg-ja/ | grep -o "ホーム"`
      3. Verify zh_Hans fallback works: check page renders without error for all locales
    Expected Result: Each locale page contains correct translated text
    Failure Indicators: Untranslated keys shown, error in console, blank page
    Evidence: .sisyphus/evidence/task-3-ssr-translation.txt
  ```

  **Commit**: YES (group 2)
  - Message: `refactor(i18n): convert translations to dynamic imports for per-locale code splitting`
  - Files: `shared/i18n/index.ts`, `shared/i18n/loader.ts`
  - Pre-commit: `pnpm vitest run`

- [x] 4. 生成 per-locale 字体 CSS 文件

  **What to do**:
  - 基于 Task 1 和 Task 2 的产物，为每个 locale 生成对应的字体 CSS 文件
  - CSS 文件路径: 上传到 R2 `assets.runespark.fun/fonts/css/{locale}.css`
  - 内容结构:
    - `zh_Hans.css`: Noto Sans SC 所有字重的 unicode-range @font-face 声明
    - `zh_Hant.css`: Noto Sans TC 所有字重的 unicode-range @font-face 声明
    - `ja.css`: Noto Sans JP 所有字重的 unicode-range @font-face 声明
    - `en.css` / `de.css` / `fr.css` / `es.css` / `pt.css` / `ru.css`: Inter 的 @font-face 声明
  - 所有 CSS 中的 font-family 统一为 `"DiceShock Sans"`（或一个统一名称），这样应用代码中 `body { font-family: "DiceShock Sans", sans-serif; }` 不需要改
  - 添加 `font-display: swap` 防止 FOIT
  - 扩展 `scripts/font-split.ts` 或创建新脚本 `scripts/generate-font-css.ts`

  **Must NOT do**:
  - 不修改应用 CSS 中的 font-family 引用名称（除了删除 Sarasa 声明）
  - 不做 font preload

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要组合多个字体的分片信息生成正确的 CSS
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/style.css:126-206` — 当前 @font-face 声明风格
  - Task 1 产物: `fonts/noto-sans-sc/400/result.css` — cn-font-split 生成的 unicode-range CSS

  **External References**:
  - CSS unicode-range: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range
  - font-display: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display

  **WHY Each Reference Matters**:
  - 当前 style.css 展示了 font-family 命名约定
  - cn-font-split 的 result.css 是组装最终 CSS 的原材料

  **Acceptance Criteria**:
  - [ ] 每个 locale 有对应的 CSS 文件上传到 R2
  - [ ] CJK locale CSS 包含 unicode-range 分片声明（50-150 个 @font-face 规则/字重）
  - [ ] Latin locale CSS 包含 Inter 的 subset 声明
  - [ ] 所有 @font-face 使用统一 font-family 名称
  - [ ] 所有 @font-face 包含 `font-display: swap`

  **QA Scenarios**:

  ```
  Scenario: Per-locale CSS files are valid and accessible
    Tool: Bash (curl)
    Preconditions: CSS files uploaded to R2
    Steps:
      1. `curl -s https://assets.runespark.fun/fonts/css/zh_Hans.css | head -20`
      2. Verify contains `@font-face`, `unicode-range`, `font-display: swap`
      3. `curl -s https://assets.runespark.fun/fonts/css/en.css | head -20`
      4. Verify contains Inter @font-face declarations
      5. Count @font-face rules in zh_Hans.css: `curl -s https://assets.runespark.fun/fonts/css/zh_Hans.css | grep -c "@font-face"`
    Expected Result: zh_Hans.css has 250+ @font-face rules (5 weights × ~50+ slices), en.css has ~50 rules
    Failure Indicators: Empty CSS, missing unicode-range, wrong font-family name
    Evidence: .sisyphus/evidence/task-4-font-css-validation.txt
  ```

  **Commit**: YES (group 3)
  - Message: `feat(fonts): generate per-locale font CSS with unicode-range slicing`
  - Files: `scripts/generate-font-css.ts`, uploaded CSS files
  - Pre-commit: CSS validation passes

- [x] 5. I18nProvider 适配异步翻译加载

  **What to do**:
  - 修改 `I18nProvider` 使其接受预加载的翻译数据（从 SSR 注入的 `<script>` 中读取）
  - 在 SSR entry point 中:
    1. `await loadLocale(locale)` 加载翻译
    2. 调用 `setTranslations(locale, dict)` 注册
    3. 将翻译数据序列化到 HTML: `<script>window.__I18N_DATA__={locale, dict}</script>`
  - 在客户端 entry point 中:
    1. 从 `window.__I18N_DATA__` 读取翻译数据
    2. 调用 `setTranslations(locale, dict)` 注册
    3. I18nProvider 正常初始化（`getTranslation()` 同步可用）
  - 确保 hydration mismatch 不会发生（SSR 和客户端使用相同翻译数据）

  **Must NOT do**:
  - 不引入 react-i18next 或其他框架
  - 不修改 `useTranslation` hook 的 API
  - 不做运行时语言切换逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: SSR hydration 同步是容易出错的地方，需要仔细处理
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4, 6 序列中)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/client/providers/I18nProvider.tsx:1-41` — 当前 Provider 实现
  - `apps/diceshock/src/shared/i18n/index.ts` — 翻译系统 API（Task 3 重构后的版本）

  **API/Type References**:
  - `apps/diceshock/src/shared/types/index.ts` — `injectCrossDataZ` schema（SSR→客户端数据传递模式）

  **Test References**:
  - `apps/diceshock/src/client/__tests__/i18n-provider.test.ts:1-65` — 现有 Provider 测试

  **WHY Each Reference Matters**:
  - I18nProvider 是要修改的文件
  - injectCrossDataZ 展示了项目已有的 SSR→客户端数据注入模式，应保持一致
  - Provider 测试需要适配，确保不 break

  **Acceptance Criteria**:
  - [ ] `I18nProvider` 无需异步等待即可渲染（翻译数据已通过 `<script>` 注入）
  - [ ] SSR HTML 中包含 `<script>` 标签注入翻译数据
  - [ ] 客户端 hydration 无 mismatch warning
  - [ ] `useTranslation()` hook API 不变

  **QA Scenarios**:

  ```
  Scenario: SSR injects translation data correctly
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. `curl -s http://localhost:5173/gg-en/ | grep "__I18N_DATA__"`
      2. Verify the script tag contains locale "en" and translation keys
      3. Verify no hydration mismatch: run dev server, check browser console for React hydration warnings
    Expected Result: Script tag present with valid JSON, no hydration warnings
    Failure Indicators: Missing script tag, JSON parse error, hydration mismatch
    Evidence: .sisyphus/evidence/task-5-ssr-injection.txt

  Scenario: Translation works after client hydration
    Tool: Bash (curl) + visual check
    Preconditions: App running
    Steps:
      1. Open http://localhost:5173/gg-ja/ in browser
      2. Check "ホーム" appears in navigation
      3. Check no flash of untranslated content
    Expected Result: Japanese text renders immediately without flash
    Failure Indicators: English text flashes first, untranslated keys visible
    Evidence: .sisyphus/evidence/task-5-hydration-check.txt
  ```

  **Commit**: YES (group 2)
  - Message: `feat(i18n): wire async translation loading with SSR data injection`
  - Files: `I18nProvider.tsx`, SSR entry, client entry
  - Pre-commit: `pnpm vitest run`

- [x] 6. SSR 字体 CSS 注入逻辑

  **What to do**:
  - 在 SSR 渲染流程中，根据当前请求的 locale，在 `<head>` 中注入对应字体 CSS:
    ```html
    <link rel="stylesheet" href="https://assets.runespark.fun/fonts/css/{locale}.css" />
    ```
  - 同时保留 Dots 字体的全局 @font-face（移到独立声明或保留在 style.css）
  - 找到 SSR HTML 模板/渲染函数，添加字体 CSS link 注入

  **Must NOT do**:
  - 不做字体 preload（`<link rel="preload">` 会下载所有分片，违背按需加载）
  - 不内联字体 CSS 到 HTML（CJK 的 CSS 可能很大，几十 KB）
  - 不修改路由逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解 SSR 渲染管线，找到正确的注入点
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 4)
  - **Blocks**: Task 7
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - 需要找到 SSR 的 HTML shell/template 文件（可能在 `vite-ssr-components` 的约定中）
  - `apps/diceshock/src/shared/store-locale.ts:99-114` — `parseStoreLocalePrefix()` 获取当前 locale

  **API/Type References**:
  - `apps/diceshock/src/shared/store-locale.ts:5-14` — LocaleCode 类型

  **External References**:
  - vite-ssr-components plugin: 查看如何自定义 HTML head

  **WHY Each Reference Matters**:
  - 需要知道 SSR 模板在哪里、如何修改 `<head>`
  - parseStoreLocalePrefix 是获取当前 locale 的现有方式

  **Acceptance Criteria**:
  - [ ] SSR 输出 HTML 的 `<head>` 中包含 `<link rel="stylesheet" href="...fonts/css/{locale}.css">`
  - [ ] 不同 locale 页面注入不同的字体 CSS
  - [ ] Dots 字体声明全局保留

  **QA Scenarios**:

  ```
  Scenario: Correct font CSS injected per locale
    Tool: Bash (curl)
    Preconditions: Dev server running with all changes applied
    Steps:
      1. `curl -s http://localhost:5173/gg-zh_Hans/ | grep "fonts/css/zh_Hans.css"`
      2. `curl -s http://localhost:5173/gg-en/ | grep "fonts/css/en.css"`
      3. `curl -s http://localhost:5173/gg-ja/ | grep "fonts/css/ja.css"`
    Expected Result: Each locale page has corresponding font CSS link in head
    Failure Indicators: Wrong CSS linked, missing link tag, all pages get same CSS
    Evidence: .sisyphus/evidence/task-6-font-css-injection.txt

  Scenario: Dots font still loads globally
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. `curl -s http://localhost:5173/gg-en/ | grep "dots.ttf"`
    Expected Result: Dots font reference present regardless of locale
    Failure Indicators: Dots font reference missing
    Evidence: .sisyphus/evidence/task-6-dots-font.txt
  ```

  **Commit**: YES (group 4)
  - Message: `feat(ssr): inject locale-specific font CSS link in HTML head`
  - Files: SSR template/rendering files
  - Pre-commit: curl tests pass

- [x] 7. 移除 Sarasa + 更新 style.css

  **What to do**:
  - 从 `apps/diceshock/src/apps/style.css` 移除所有 Sarasa @font-face 声明（line 133-201）
  - 将 `body { font-family: "Sarasa", sans-serif; }` 改为 `body { font-family: "DiceShock Sans", sans-serif; }`（与 Task 4 生成的 font-family 名称一致）
  - 同样处理 `.tiptap-wrapper` 和 `.mdx-content` 中的 font-family 引用
  - 保留 Dots 字体的 @font-face 声明（line 126-131）
  - 对 `apps/runespark/src/apps/style.css` 做同样处理（如果共享字体方案）

  **Must NOT do**:
  - 不删除 Dots 字体
  - 不修改主题颜色或其他样式
  - 不修改 tailwind/daisyui 配置

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 直接的 CSS 编辑工作
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `apps/diceshock/src/apps/style.css:126-206` — 要修改的区域
  - `apps/runespark/src/apps/style.css:126-201` — 同结构，需要同步修改

  **WHY Each Reference Matters**:
  - 这些是要直接编辑的文件，需要精确定位修改范围

  **Acceptance Criteria**:
  - [ ] style.css 中无 Sarasa 相关 @font-face
  - [ ] body font-family 使用新统一名称
  - [ ] Dots @font-face 保留
  - [ ] `pnpm build` 成功

  **QA Scenarios**:

  ```
  Scenario: Sarasa references fully removed
    Tool: Bash (grep)
    Preconditions: Changes applied
    Steps:
      1. `grep -ri "sarasa" apps/diceshock/src/`
      2. `grep -ri "sarasa" apps/runespark/src/`
    Expected Result: Zero matches
    Failure Indicators: Any remaining Sarasa references
    Evidence: .sisyphus/evidence/task-7-sarasa-removal.txt

  Scenario: Build still succeeds
    Tool: Bash
    Preconditions: All CSS changes applied
    Steps:
      1. `pnpm build`
    Expected Result: Build succeeds with no errors
    Failure Indicators: CSS parse errors, missing font references
    Evidence: .sisyphus/evidence/task-7-build-check.txt
  ```

  **Commit**: YES (group 5)
  - Message: `refactor(style): remove Sarasa fonts, use locale-specific font loading`
  - Files: `apps/diceshock/src/apps/style.css`, `apps/runespark/src/apps/style.css`
  - Pre-commit: `pnpm build`

- [x] 8. 更新测试 + 全量验证

  **What to do**:
  - 更新 `apps/diceshock/src/shared/__tests__/i18n.test.ts`:
    - 适配新的异步 API（如果 `getTranslation` 变为需要预先 `setTranslations`）
    - 确保所有现有测试逻辑仍然覆盖
  - 更新 `apps/diceshock/src/client/__tests__/i18n-provider.test.ts`:
    - 模拟 `window.__I18N_DATA__` 的存在
  - 运行全量测试: `pnpm vitest run`
  - 运行 build: `pnpm build`
  - 验证 bundle 分析结果

  **Must NOT do**:
  - 不降低测试覆盖率
  - 不删除现有测试用例（可以修改断言方式）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要理解测试意图并正确适配
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 7)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 5, 7

  **References**:

  **Test References**:
  - `apps/diceshock/src/shared/__tests__/i18n.test.ts:1-214` — 完整的翻译测试
  - `apps/diceshock/src/client/__tests__/i18n-provider.test.ts:1-65` — Provider 测试

  **WHY Each Reference Matters**:
  - 这些是要修改的测试文件，必须理解每个测试的意图

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run` 全部通过
  - [ ] `pnpm build` 成功
  - [ ] 测试用例数量不减少
  - [ ] Bundle 中无非 zh_Hans 的翻译内容泄露到主 chunk

  **QA Scenarios**:

  ```
  Scenario: All tests pass
    Tool: Bash
    Preconditions: All code changes complete
    Steps:
      1. `pnpm vitest run`
      2. Check exit code is 0
      3. Check no test was skipped or pending
    Expected Result: All tests pass, 0 failures
    Failure Indicators: Non-zero exit code, failed assertions
    Evidence: .sisyphus/evidence/task-8-test-results.txt

  Scenario: Bundle analysis confirms code splitting
    Tool: Bash
    Preconditions: Build completed
    Steps:
      1. `pnpm --filter diceshock build`
      2. `ls dist/client/assets/ | grep -E "^(de|fr|es|pt|ru|ja|zh)" | wc -l`
      3. Verify at least 8 locale-related chunks exist
    Expected Result: 8+ locale chunk files in build output
    Failure Indicators: No separate chunks, all bundled together
    Evidence: .sisyphus/evidence/task-8-bundle-split.txt
  ```

  **Commit**: YES (group 6)
  - Message: `test(i18n): update tests for async translation loading`
  - Files: test files
  - Pre-commit: `pnpm vitest run`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + biome check + `vitest`. Review changed files for: dead code, console.log in prod, unused imports, over-abstraction.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start dev server. Visit pages in different locales. Verify: correct font rendering, no FOIT, translation loads correctly, language switch works via URL change + refresh. Check Network tab for font slice loading behavior.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify nothing beyond spec was built, nothing was missed. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files |
|--------|---------|-------|
| 1 | `feat(i18n): add font splitting build script and upload to R2` | scripts/font-split.ts, fonts/ |
| 2 | `refactor(i18n): convert translations to dynamic imports` | shared/i18n/index.ts, shared/i18n/loader.ts |
| 3 | `feat(i18n): generate per-locale font CSS with unicode-range` | font CSS files |
| 4 | `feat(ssr): inject locale-specific font CSS in SSR` | SSR rendering files |
| 5 | `refactor(style): remove Sarasa fonts, update style.css` | style.css |
| 6 | `test(i18n): update tests for async translation loading` | test files |

---

## Success Criteria

### Verification Commands
```bash
pnpm build                    # Expected: SUCCESS, locale chunks visible in output
pnpm vitest run               # Expected: all tests pass
curl -I https://assets.runespark.fun/fonts/noto-sans-sc/400/slice-001.woff2  # Expected: 200 OK
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Bundle size reduction verified (no 9 locale JSONs in main chunk)
- [ ] CJK page loads < 500KB of font data (vs current 10-30MB per .ttc)
- [ ] Latin page loads < 150KB of font data
