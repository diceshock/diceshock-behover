# 用户偏好系统 (User Preferences & Smart Matching)

## TL;DR

> **Quick Summary**: 为 Diceshock 平台添加用户偏好功能 — 用户通过自然语言描述约局偏好（时间+游戏类型+人数），系统每日自动匹配偏好交汇点，创建推荐约局并推送通知。
> 
> **Deliverables**:
> - 偏好数据模型 (D1 schema + Drizzle ORM)
> - Agent 解析管线 (自然语言 → rrule + 分类 + 人数)
> - 匹配引擎 (Cron job + rrule 展开 + 双轨匹配)
> - 推荐约局自动创建 (系统用户)
> - 模板消息推送 (13:00-22:00 窗口, 2条/天/用户)
> - 微信服务号偏好 skill (添加/查看/删除)
> - 前端偏好页 + /me 卡片入口
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Types → Schema → Agent Parse → CRUD → Matching Engine → Cron → Push → Frontend

---

## Context

### Original Request
给每个用户添加偏好功能：
- 偏好格式: 日程 + 自然语言描述 (如 "工作日周三晚上我想要玩日麻和聚会桌游")
- 添加方式: 微信服务号对话 (agent 解析) + 前端页面 (自然语言输入框)
- 用途1: 匹配现有约局 → 推送通知
- 用途2: 偏好交汇分析 → 自动创建推荐约局 → 推送给潜在用户
- 所有 agent 调用计用户额度

### Interview Summary
**Key Discussions**:
- 时间存储: 类 rrule 格式 (FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00)
- 大类: trpg, boardgame, mahjong (多选可空)
- 匹配引擎: 每天 0:00 cron, 计算未来7天(不含今天)增量交叉
- 推荐约局: 系统用户作 creator, 用户加入可看名片不可删除
- 双轨推送: 偏好↔现有约局 + 偏好↔偏好
- 推送规则: 13:00-22:00, 每用户每天最多2条, 每条附原因+管理链接
- 匹配阈值: 日麻3人, 桌游≥最佳人数, 跑团灵活匹配
- 前端: /me卡片 → 独立偏好页, 顶部sticky输入框回车提交
- 展示: 原文 + 基于rrule模式生成的自然语言描述(非agent)
- 前端添加: 输入 → agent解析 → 用户确认 → 保存

### Self-Conducted Gap Analysis
**Identified Gaps** (addressed):
1. 系统用户如何创建 → 需要 seed migration, 硬编码 system user id
2. rrule 展开库选型 → rrule.js (标准库, 轻量)
3. 推送去重 → preference_push_log 表追踪已推送 (preference_id + active_id + date)
4. 偏好过期 → 不过期, 用户手动启用/禁用
5. activesTable 的推荐约局如何区分 → 新增 is_system_recommended 字段或通过 creator_id 判断
6. 前端路由 → /preferences (独立路由, 非 /me 子路由)
7. Agent 解析失败降级 → 返回错误提示, 不保存

---

## Work Objectives

### Core Objective
实现偏好驱动的智能约局推荐系统: 用户表达偏好 → 系统日常匹配 → 自动组局推送

### Concrete Deliverables
- `libs/db/src/schema.ts` — 新增 userPreferencesTable, preferencePushLogTable
- `apps/diceshock/src/shared/preferences/` — 类型定义, rrule helpers, display utils
- `apps/diceshock/src/server/apis/trpc/preferences.ts` — 偏好 CRUD router
- `apps/diceshock/src/server/apis/wechat/skills/preference.ts` — 微信偏好 skill
- `apps/diceshock/src/server/cron/preferenceMatching.ts` — 匹配引擎
- `apps/diceshock/src/server/cron/notificationDispatcher.ts` — 推送调度
- `apps/diceshock/src/apps/routers/_with-home-lo/preferences.tsx` — 偏好页面
- Me 页面更新 — 偏好卡片入口

### Definition of Done
- [ ] 用户可通过微信对话和前端页面添加/查看/删除偏好
- [ ] 偏好以 rrule + 分类 + 人数结构化存储
- [ ] 每日 cron 跑匹配, 能发现偏好交汇并创建推荐约局
- [ ] 推送在 13:00-22:00 窗口内, 每用户每天 ≤2 条
- [ ] 推荐约局由系统用户创建, 用户不可删除
- [ ] 前端偏好页可正常展示偏好列表 + 添加新偏好

### Must Have
- Agent 解析自然语言为结构化偏好 (rrule + category + player_count)
- 每日匹配 cron job
- 双轨推送 (偏好↔约局 + 偏好↔偏好)
- 推送时间窗口限制 + 频率限制
- 前端偏好页 + /me 入口
- 微信偏好 skill

### Must NOT Have (Guardrails)
- ❌ 不做实时匹配 (只用 cron)
- ❌ 不做 embedding/向量匹配 (用结构化规则)
- ❌ 不修改现有约局的删除/退出逻辑 (只对系统推荐约局限制)
- ❌ 不做偏好过期机制 (用户手动管理)
- ❌ Agent 解析失败不存不猜
- ❌ 推送不超过 22:00, 不早于 13:00
- ❌ 不做 AI 生成 rrule 自然语言描述 (用规则引擎生成)
- ❌ 不修改现有 rate limiting 逻辑 (偏好解析复用现有额度)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest, existing `wechat/__tests__/`)
- **Automated tests**: YES (Tests-after)
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend/API**: Use Bash (curl/vitest) - Run tests, assert responses
- **Frontend/UI**: Use Playwright - Navigate, interact, assert DOM, screenshot
- **Cron/Logic**: Use Bash (vitest) - Unit test matching engine, rrule expansion

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - all parallel, no deps):
├── Task 1: Types & Constants [quick]
├── Task 2: DB Schema + Migration [quick]
├── Task 3: RRule Display Utility [quick]
├── Task 4: System User Seed [quick]
├── Task 5: WeChat Skill Registration [quick]
└── Task 6: Template Message Config [quick]

Wave 2 (Core Logic - depends on Wave 1):
├── Task 7: Agent Parsing Endpoint (depends: 1, 2) [deep]
├── Task 8: Preference CRUD tRPC (depends: 1, 2) [unspecified-high]
├── Task 9: WeChat Preference Skill (depends: 5, 7, 8) [unspecified-high]
├── Task 10: Matching Engine Core (depends: 1, 2, 3) [deep]
└── Task 11: Recommended Active Creator (depends: 4, 10) [unspecified-high]

Wave 3 (Integration - depends on Wave 2):
├── Task 12: Cron Job Integration (depends: 10, 11) [unspecified-high]
├── Task 13: Notification Dispatcher (depends: 6, 12) [deep]
├── Task 14: Active → Preference Push (depends: 8, 13) [unspecified-high]
├── Task 15: /me Preferences Card (depends: 8) [visual-engineering]
└── Task 16: Preferences Page (depends: 3, 8) [visual-engineering]

Wave 4 (Frontend Flows + Polish - depends on Wave 3):
├── Task 17: Add Preference Flow (depends: 7, 16) [visual-engineering]
├── Task 18: Recommended Active UI (depends: 11, 15) [visual-engineering]
├── Task 19: Edge Cases & Dedup (depends: 12, 13, 14) [unspecified-high]
└── Task 20: Integration Tests (depends: all) [unspecified-high]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 7, 8, 10 | 1 |
| 2 | - | 7, 8, 10 | 1 |
| 3 | - | 10, 16 | 1 |
| 4 | - | 11 | 1 |
| 5 | - | 9 | 1 |
| 6 | - | 13 | 1 |
| 7 | 1, 2 | 9, 17 | 2 |
| 8 | 1, 2 | 9, 14, 15, 16 | 2 |
| 9 | 5, 7, 8 | - | 2 |
| 10 | 1, 2, 3 | 11, 12 | 2 |
| 11 | 4, 10 | 12, 18 | 2 |
| 12 | 10, 11 | 13, 14, 19 | 3 |
| 13 | 6, 12 | 14, 19 | 3 |
| 14 | 8, 13 | 19 | 3 |
| 15 | 8 | 18 | 3 |
| 16 | 3, 8 | 17 | 3 |
| 17 | 7, 16 | - | 4 |
| 18 | 11, 15 | - | 4 |
| 19 | 12, 13, 14 | - | 4 |
| 20 | all | - | 4 |

### Agent Dispatch Summary

- **Wave 1**: **6** - T1-T6 → `quick`
- **Wave 2**: **5** - T7 → `deep`, T8 → `unspecified-high`, T9 → `unspecified-high`, T10 → `deep`, T11 → `unspecified-high`
- **Wave 3**: **5** - T12 → `unspecified-high`, T13 → `deep`, T14 → `unspecified-high`, T15 → `visual-engineering`, T16 → `visual-engineering`
- **Wave 4**: **4** - T17 → `visual-engineering`, T18 → `visual-engineering`, T19 → `unspecified-high`, T20 → `unspecified-high`
- **FINAL**: **4** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Types & Constants

  **What to do**:
  - 创建 `apps/diceshock/src/shared/preferences/types.ts`:
    - `PreferenceCategory = "trpg" | "boardgame" | "mahjong"`
    - `UserPreference` 接口: id, userId, rawText, rrule (string), categories (PreferenceCategory[]), playerCount (number | null), enabled (boolean), createdAt, updatedAt
    - `PreferenceParseResult`: 解析结果类型 (成功/失败)
    - `MatchResult`: 匹配结果类型
    - `PushNotification`: 推送通知类型
  - 创建 `apps/diceshock/src/shared/preferences/constants.ts`:
    - PUSH_WINDOW_START = 13, PUSH_WINDOW_END = 22
    - MAX_DAILY_PUSHES = 2
    - MATCH_LOOKAHEAD_DAYS = 7
    - SYSTEM_USER_ID (硬编码 UUID)
    - CATEGORY_LABELS: Record<PreferenceCategory, string>
    - 匹配阈值常量 (MAHJONG_MIN_PLAYERS = 3 等)
  - 创建 barrel `apps/diceshock/src/shared/preferences/index.ts`

  **Must NOT do**:
  - 不定义 UI 组件
  - 不引入外部依赖

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Tasks 7, 8, 10
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/shared/mahjong/types.ts` — 类型定义模式 (type unions, interfaces)
  - `apps/diceshock/src/shared/mahjong/constants.ts` — 常量组织方式

  **API/Type References**:
  - `libs/db/src/schema.ts:activesTable` — activesTable 结构参考 (date, time, max_players)
  - `libs/db/src/schema.ts:25-38` — userRoles union type pattern

  **Acceptance Criteria**:

  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. Run: pnpm tsc --noEmit --project apps/diceshock/tsconfig.json 2>&1 | grep -c "preferences"
      2. Verify: 0 errors related to preferences files
    Expected Result: No TypeScript compilation errors in new files
    Evidence: .sisyphus/evidence/task-1-types-compile.txt

  Scenario: Barrel export works
    Tool: Bash
    Steps:
      1. Create temp file importing from "@/shared/preferences"
      2. Run tsc check
    Expected Result: All exports accessible
    Evidence: .sisyphus/evidence/task-1-barrel-export.txt
  ```

  **Commit**: YES (groups with 2, 4)
  - Message: `feat(preferences): add schema, types, and system user`
  - Files: `apps/diceshock/src/shared/preferences/`

- [x] 2. DB Schema + Migration

  **What to do**:
  - 在 `libs/db/src/schema.ts` 末尾新增:
    - `userPreferencesTable`: id (cuid), user_id (FK users), raw_text (NOT NULL), rrule (NOT NULL), categories (JSON array), player_count (int nullable), enabled (boolean default true), created_at, updated_at
    - `preferencePushLogTable`: id (cuid), user_id (FK), preference_id (FK nullable), active_id (FK activesTable nullable), push_type ("preference_match" | "active_match"), push_date (text "YYYY-MM-DD"), sent_at (timestamp_ms), message_summary (text)
    - 对应 relations 定义
    - 给 activesTable 新增 `is_system_recommended` 字段 (boolean, default false)
  - 运行 `pnpm drizzle` 生成 migration
  - 在 `libs/db/src/index.ts` 确保新表被 export

  **Must NOT do**:
  - 不修改现有表的已有字段
  - 不 DROP 任何列

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 8, 10
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `libs/db/src/schema.ts:101-167` — activesTable + relations 定义模式 (FK, relations, JSON fields)
  - `libs/db/src/schema.ts:465-485` — wechatConversationsTable (index 定义模式)

  **API/Type References**:
  - `libs/db/src/schema.ts:7-8` — createId import 和用法
  - `libs/db/src/schema.ts:4` — relations import

  **External References**:
  - Drizzle SQLite: https://orm.drizzle.team/docs/column-types/sqlite

  **Acceptance Criteria**:

  ```
  Scenario: Migration generates successfully
    Tool: Bash
    Steps:
      1. Run: pnpm drizzle
      2. Check: ls drizzle/ for new migration file
    Expected Result: New .sql migration file exists with CREATE TABLE statements
    Evidence: .sisyphus/evidence/task-2-migration.txt

  Scenario: Schema types are correct
    Tool: Bash
    Steps:
      1. Run: pnpm tsc --noEmit
      2. Verify no errors in schema.ts
    Expected Result: TypeScript compilation passes
    Evidence: .sisyphus/evidence/task-2-schema-types.txt
  ```

  **Commit**: YES (groups with 1, 4)
  - Message: `feat(preferences): add schema, types, and system user`
  - Files: `libs/db/src/schema.ts`, `drizzle/`

- [x] 3. RRule Display Utility

  **What to do**:
  - 创建 `apps/diceshock/src/shared/preferences/rruleDisplay.ts`:
    - `rruleToHumanReadable(rrule: string): string` — 将 rrule 字符串转换为中文自然语言
    - 支持: FREQ=WEEKLY + BYDAY + DTSTART/DTEND 时间窗口
    - 例: "FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00" → "每周三 19:00-22:00"
    - 例: "FREQ=WEEKLY;BYDAY=SA,SU;DTSTART=T14:00;DTEND=T22:00" → "每周六、日 14:00-22:00"
    - 例: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;DTSTART=T19:00;DTEND=T22:00" → "工作日 19:00-22:00"
    - 纯规则解析, 不用外部库 (rrule.js 只在 matching engine 用)
  - 创建 `apps/diceshock/src/shared/preferences/rruleExpand.ts`:
    - `expandRruleToDateRanges(rrule: string, fromDate: Date, toDate: Date): DateRange[]` — 展开 rrule 为具体日期+时间范围
    - 安装 rrule 库: `pnpm add rrule -w --filter diceshock`
  - 在 barrel index.ts 中 export

  **Must NOT do**:
  - rruleDisplay 不引入外部 rrule 库 (纯字符串解析)
  - 不处理 MONTHLY/DAILY 等复杂频率 (MVP 只支持 WEEKLY)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 10, 16
  - **Blocked By**: None

  **References**:
  **External References**:
  - RRule 规范: https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.10
  - RRuleSwift 自然语言示例: https://github.com/teambition/RRuleSwift/issues/14

  **Pattern References**:
  - `apps/diceshock/src/shared/utils/dayjs-config.ts` — shared utility pattern

  **Acceptance Criteria**:

  ```
  Scenario: Display converts rrule to Chinese
    Tool: Bash (vitest)
    Steps:
      1. Write test: rruleToHumanReadable("FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00")
      2. Assert result === "每周三 19:00-22:00"
      3. Test "BYDAY=MO,TU,WE,TH,FR" → "工作日"
      4. Test "BYDAY=SA,SU" → "每周六、日"
    Expected Result: All display assertions pass
    Evidence: .sisyphus/evidence/task-3-display.txt

  Scenario: Expand produces correct date ranges
    Tool: Bash (vitest)
    Steps:
      1. Expand "FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00" from 2025-06-23 to 2025-06-30
      2. Assert result includes { date: "2025-06-25", start: "19:00", end: "22:00" }
    Expected Result: Correct expansion with timezone handling
    Evidence: .sisyphus/evidence/task-3-expand.txt
  ```

  **Commit**: YES
  - Message: `feat(preferences): rrule display utility`
  - Files: `apps/diceshock/src/shared/preferences/rruleDisplay.ts`, `apps/diceshock/src/shared/preferences/rruleExpand.ts`

- [x] 4. System User Seed

  **What to do**:
  - 在 migration SQL 中 INSERT 一个系统用户:
    - `users` 表: id = SYSTEM_USER_ID (与 constants.ts 中一致), name = "DiceShock 推荐", email = "system@diceshock.com", role = "admin"
    - `user_info` 表: id = SYSTEM_USER_ID, uid = "SYSTEM", nickname = "DiceShock 推荐"
  - 确保 seed 幂等 (INSERT OR IGNORE)
  - 在 `apps/diceshock/src/shared/preferences/constants.ts` 中导出 SYSTEM_USER_ID

  **Must NOT do**:
  - 不创建单独的 seed 脚本 (放在 migration SQL 中)
  - 不给系统用户创建 account 记录 (不需要登录)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 11
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `libs/db/src/schema.ts:28-38` — users 表结构
  - `libs/db/src/schema.ts:40-54` — userInfoTable 结构

  **Acceptance Criteria**:

  ```
  Scenario: System user exists after migration
    Tool: Bash
    Steps:
      1. Apply migration locally (wrangler d1 execute)
      2. Query: SELECT * FROM user WHERE id = '{SYSTEM_USER_ID}'
    Expected Result: One row returned with name = "DiceShock 推荐"
    Evidence: .sisyphus/evidence/task-4-system-user.txt
  ```

  **Commit**: YES (groups with 1, 2)
  - Message: `feat(preferences): add schema, types, and system user`
  - Files: `drizzle/` (migration SQL)

- [x] 5. WeChat Skill Registration

  **What to do**:
  - 在 `apps/diceshock/src/server/apis/wechat/skills/_directory.ts` 的 NODES 中新增 `preference` 节点:
    - id: "preference"
    - keywords: ["偏好", "喜好", "设置", "提醒", "推荐", "通知", "我想", "帮我找"]
    - description: "偏好管理 - 添加/查看/删除/启停约局偏好"
    - content: 返回 schema + 操作说明
    - children: ["preference.add", "preference.list", "preference.delete"]
  - 添加子节点 (preference.add, preference.list, preference.delete)
  - 在 `_syntax.ts` 添加对应 mutate action 语法 (如有需要)

  **Must NOT do**:
  - 不实现 skill 的实际逻辑 (Task 9 做)
  - 不修改现有 skill 节点

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/skills/_directory.ts:15-68` — 现有 NODES 定义模式 (boardgame, active)
  - `apps/diceshock/src/server/apis/wechat/skills/_directory.ts:72-80` — 子节点模式 (active.create)

  **Acceptance Criteria**:

  ```
  Scenario: Skill is registered and matches keywords
    Tool: Bash (vitest)
    Steps:
      1. Import matchNodes from _directory.ts
      2. Call matchNodes("我想设置偏好")
      3. Assert result includes "preference" node
    Expected Result: "偏好" keyword triggers preference skill
    Evidence: .sisyphus/evidence/task-5-skill-match.txt
  ```

  **Commit**: YES (groups with 6)
  - Message: `feat(wechat): register preference skill and template`
  - Files: `skills/_directory.ts`

- [x] 6. Template Message Config

  **What to do**:
  - 在 `apps/diceshock/src/server/apis/wechat/templateMessage.ts` 的 TEMPLATE_KEYS 新增:
    - `PREFERENCE_MATCH: "wechat:template:preference_match"` — 偏好匹配通知
  - 新增发送函数 `sendPreferenceMatchNotification`:
    - 参数: env, openId, { reason: string, activeTitle: string, activeDate: string, activeUrl: string, manageUrl: string }
    - 模板数据: first (原因说明), keyword1 (约局标题), keyword2 (日期), keyword3 (描述), remark (管理链接)
  - 记录推送 helper: `logPushNotification` (写入 preferencePushLogTable)
  - 检查每日推送上限 helper: `checkDailyPushLimit` (查询 preferencePushLogTable)

  **Must NOT do**:
  - 不修改现有模板消息函数
  - 不实际配置微信后台模板 (需要人工在微信公众号后台操作)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 13
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/templateMessage.ts:16-25` — TEMPLATE_KEYS 常量
  - `apps/diceshock/src/server/apis/wechat/templateMessage.ts:35-80` — sendTemplateMessage 模式

  **API/Type References**:
  - `libs/db/src/schema.ts` — preferencePushLogTable (Task 2 创建)

  **Acceptance Criteria**:

  ```
  Scenario: Template key is registered
    Tool: Bash
    Steps:
      1. grep "PREFERENCE_MATCH" templateMessage.ts
    Expected Result: Key exists in TEMPLATE_KEYS
    Evidence: .sisyphus/evidence/task-6-template-key.txt

  Scenario: Daily push limit check works
    Tool: Bash (vitest)
    Steps:
      1. Mock D1, insert 2 push logs for today
      2. Call checkDailyPushLimit(env, userId)
      3. Assert returns { allowed: false, remaining: 0 }
    Expected Result: Limit correctly enforced at 2/day
    Evidence: .sisyphus/evidence/task-6-push-limit.txt
  ```

  **Commit**: YES (groups with 5)
  - Message: `feat(wechat): register preference skill and template`
  - Files: `templateMessage.ts`

- [x] 7. Agent Parsing Endpoint

  **What to do**:
  - 创建 `apps/diceshock/src/server/apis/trpc/preferenceParser.ts`:
    - `parsePreference` protectedProcedure: 接收 raw_text (string), 调用 DeepSeek 解析为结构化偏好
    - System prompt 指导 agent 输出 JSON: { rrule: string, categories: string[], playerCount: number|null, confidence: number }
    - 使用现有 AI Gateway (env.CF_AI_GATEWAY_ID) + DeepSeek API
    - 解析失败返回 error (confidence < 0.5 或格式不合法)
    - 验证 rrule 合法性 (基础 regex 校验 + rrule 库 parse)
    - 计入现有 rate limiting (复用 rateLimit.ts 逻辑中的 token 计数)
  - 示例 prompt 引导:
    - "工作日周三晚上我想要玩日麻" → { rrule: "FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00", categories: ["mahjong"], playerCount: null }
    - "周末帮我看看有没有龙与地下城" → { rrule: "FREQ=WEEKLY;BYDAY=SA,SU;DTSTART=T14:00;DTEND=T22:00", categories: ["trpg"], playerCount: null }

  **Must NOT do**:
  - 不自己实现 LLM 客户端 (复用现有 DeepSeek 调用模式)
  - 解析失败不猜测、不存储
  - 不做流式响应 (同步返回)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11)
  - **Blocks**: Tasks 9, 17
  - **Blocked By**: Tasks 1, 2

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts:19-41` — DeepSeek 调用模式 (system prompt, tool definitions)
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts:69-76` — ChatWithAgentParams 参数结构
  - `apps/diceshock/src/server/apis/wechat/rateLimit.ts:46-100` — rate limit 检查模式

  **API/Type References**:
  - `apps/diceshock/src/shared/preferences/types.ts` — PreferenceParseResult 类型 (Task 1)
  - `apps/diceshock/src/server/apis/trpc/baseTRPC.ts` — protectedProcedure 定义

  **External References**:
  - DeepSeek API: compatible with OpenAI chat completions format

  **Acceptance Criteria**:

  ```
  Scenario: Happy path - parse "周三晚上打麻将"
    Tool: Bash (vitest)
    Steps:
      1. Mock DeepSeek API response with valid JSON
      2. Call parsePreference.mutate({ rawText: "周三晚上打麻将" })
      3. Assert result.rrule contains "BYDAY=WE"
      4. Assert result.categories includes "mahjong"
    Expected Result: Structured output with valid rrule
    Evidence: .sisyphus/evidence/task-7-parse-happy.txt

  Scenario: Error - invalid input triggers graceful failure
    Tool: Bash (vitest)
    Steps:
      1. Mock DeepSeek returning confidence < 0.5
      2. Call parsePreference.mutate({ rawText: "随便" })
      3. Assert result.success === false with error message
    Expected Result: Returns error without saving anything
    Evidence: .sisyphus/evidence/task-7-parse-error.txt
  ```

  **Commit**: YES (groups with 8)
  - Message: `feat(preferences): agent parsing + CRUD endpoints`
  - Files: `trpc/preferenceParser.ts`

- [x] 8. Preference CRUD tRPC Router

  **What to do**:
  - 创建 `apps/diceshock/src/server/apis/trpc/preferences.ts`:
    - `create` protectedProcedure: 接收 parseResult (已解析结构) + rawText, 写入 userPreferencesTable
    - `list` protectedProcedure: 返回当前用户所有偏好 (按 created_at DESC)
    - `delete` protectedProcedure: 删除指定偏好 (验证 ownership)
    - `toggle` protectedProcedure: 切换 enabled 状态
    - `getCount` protectedProcedure: 返回用户偏好数量 (给 /me 卡片用)
  - 在 `apps/diceshock/src/server/apis/trpc/index.ts` 注册 router
  - 输入验证用 zod

  **Must NOT do**:
  - 不做分页 (偏好数量不会太多)
  - 不做编辑 (删了重建)
  - 不直接接收 raw text 创建 (必须先经过 Task 7 解析)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 14, 15, 16
  - **Blocked By**: Tasks 1, 2

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/trpc/actives.ts:40-65` — create procedure 模式 (protectedProcedure, insert, returning)
  - `apps/diceshock/src/server/apis/trpc/actives.ts:69-80` — list query 模式 (cursor, limit)
  - `apps/diceshock/src/server/apis/trpc/businessCard.ts` — simple CRUD pattern

  **API/Type References**:
  - `libs/db/src/schema.ts` — userPreferencesTable (Task 2)
  - `apps/diceshock/src/server/apis/trpc/baseTRPC.ts:protectedProcedure` — auth context

  **Acceptance Criteria**:

  ```
  Scenario: Create + List flow
    Tool: Bash (vitest)
    Steps:
      1. Call create with valid parseResult
      2. Call list
      3. Assert list returns 1 item with correct rrule and categories
    Expected Result: CRUD operations work correctly
    Evidence: .sisyphus/evidence/task-8-crud.txt

  Scenario: Delete validates ownership
    Tool: Bash (vitest)
    Steps:
      1. Create preference as user A
      2. Try delete as user B
      3. Assert throws authorization error
    Expected Result: Cannot delete another user's preference
    Evidence: .sisyphus/evidence/task-8-ownership.txt
  ```

  **Commit**: YES (groups with 7)
  - Message: `feat(preferences): agent parsing + CRUD endpoints`
  - Files: `trpc/preferences.ts`, `trpc/index.ts`

- [x] 9. WeChat Preference Skill Implementation

  **What to do**:
  - 在 WeChat agent 的 mutate tool 中新增 actions:
    - `add_preference`: 接收 raw_text, 调用 parsing (内联调用, 不走 tRPC), 返回结构化结果让 agent 确认
    - `list_preferences`: 返回用户偏好列表 (简洁格式)
    - `delete_preference`: 删除指定偏好 (by index 或关键词匹配)
    - `toggle_preference`: 启用/停用
  - 更新 `apps/diceshock/src/server/apis/wechat/graphql/mutateActions.ts` 添加新 actions
  - 更新 REQUIRED_PARAMS
  - Agent 对话模式:
    - 用户: "我想每周三晚上打麻将" → agent 解析 → "已添加偏好: 每周三 19:00-22:00 | 日麻。系统会自动为你匹配合适的约局！"
    - 用户: "看看我的偏好" → agent 调用 list → 返回编号列表
    - 用户: "删掉第2个" → agent 调用 delete

  **Must NOT do**:
  - 不做复杂的多轮确认 (一句话直接解析保存, agent 回复确认)
  - 不主动推荐偏好

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2, but depends on 5, 7, 8 conceptually)
  - **Parallel Group**: Wave 2 (late start after 5, 7, 8 完成)
  - **Blocks**: None
  - **Blocked By**: Tasks 5, 7, 8

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:60-72` — REQUIRED_PARAMS 模式
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts:29-57` — resolveUserId 模式
  - `apps/diceshock/src/server/apis/wechat/skills/_directory.ts:53-68` — active skill content 模式

  **API/Type References**:
  - `apps/diceshock/src/server/apis/wechat/graphql/mutateActions.ts` — MutateAction 类型
  - `apps/diceshock/src/server/apis/wechat/types.ts` — ChatMessage 类型

  **Acceptance Criteria**:

  ```
  Scenario: Add preference via WeChat
    Tool: Bash (vitest)
    Steps:
      1. Mock DeepSeek + D1
      2. Simulate message "我想每周三晚上打麻将"
      3. Assert mutate action "add_preference" called
      4. Assert DB has new preference record
    Expected Result: Preference created with correct rrule
    Evidence: .sisyphus/evidence/task-9-wechat-add.txt

  Scenario: List preferences returns formatted text
    Tool: Bash (vitest)
    Steps:
      1. Seed 2 preferences for user
      2. Simulate "看看我的偏好"
      3. Assert response contains numbered list with rrule descriptions
    Expected Result: Human-readable formatted list
    Evidence: .sisyphus/evidence/task-9-wechat-list.txt
  ```

  **Commit**: YES
  - Message: `feat(wechat): implement preference skill`
  - Files: `tools/mutate.ts`, `graphql/mutateActions.ts`, `skills/_directory.ts`

- [x] 10. Matching Engine Core

  **What to do**:
  - 创建 `apps/diceshock/src/server/cron/preferenceMatching.ts`:
    - `runPreferenceMatching(env)`: 主入口
    - Step 1: 获取所有 enabled=true 的偏好
    - Step 2: 用 rruleExpand 展开每条偏好到未来 7 天的具体日期+时间段
    - Step 3 (偏好↔偏好): 按日期+时间段+类别分组, 找到重叠 ≥ 阈值的组
      - 日麻: 同时段 ≥ 3人
      - 桌游: 同时段 ≥ 游戏最佳人数 (无具体游戏时默认 3人)
      - 跑团: 同时段 ≥ 3人 (灵活)
    - Step 4 (偏好↔约局): 查未来7天的 actives, 匹配偏好用户 (类别+时间段重叠)
    - Step 5: 输出 MatchResult[] 供 cron dispatcher 使用
    - 去重: 对比 preferencePushLogTable 避免重复推送
  - 创建测试文件 `apps/diceshock/src/server/cron/__tests__/preferenceMatching.test.ts`

  **Must NOT do**:
  - 不做实时匹配
  - 不创建约局 (Task 11 做)
  - 不发送通知 (Task 13 做)
  - 不用 AI/embedding

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 12
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/cron/leaderboard.ts:1-50` — cron job 结构模式 (imports, helper functions, Shanghai timezone)
  - `apps/diceshock/src/server/cron/leaderboard.ts:46-50` — getTimeWindow 模式

  **API/Type References**:
  - `apps/diceshock/src/shared/preferences/rruleExpand.ts` — expandRruleToDateRanges (Task 3)
  - `apps/diceshock/src/shared/preferences/types.ts` — MatchResult (Task 1)
  - `libs/db/src/schema.ts:101-122` — activesTable (date, time, board_game_id for matching)

  **Acceptance Criteria**:

  ```
  Scenario: Find preference overlap (3 mahjong users same time)
    Tool: Bash (vitest)
    Steps:
      1. Create 3 preferences: all "FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00" + category "mahjong"
      2. Run matching for next Wednesday
      3. Assert 1 MatchResult with 3 user IDs, type "preference_cross"
    Expected Result: Cross-match detected correctly
    Evidence: .sisyphus/evidence/task-10-cross-match.txt

  Scenario: Match preference to existing active
    Tool: Bash (vitest)
    Steps:
      1. Create preference "BYDAY=SA" + "boardgame"
      2. Create active on next Saturday with board_game_id set
      3. Run matching
      4. Assert 1 MatchResult with type "active_match"
    Expected Result: Active correctly matched to preference
    Evidence: .sisyphus/evidence/task-10-active-match.txt

  Scenario: Dedup - already pushed today
    Tool: Bash (vitest)
    Steps:
      1. Insert push log for user+preference+today
      2. Run matching
      3. Assert that match is filtered out
    Expected Result: No duplicate match results
    Evidence: .sisyphus/evidence/task-10-dedup.txt
  ```

  **Commit**: YES (groups with 11)
  - Message: `feat(preferences): matching engine + recommended active creator`
  - Files: `cron/preferenceMatching.ts`, `cron/__tests__/preferenceMatching.test.ts`

- [x] 11. Recommended Active Creator

  **What to do**:
  - 创建 `apps/diceshock/src/server/cron/recommendedActiveCreator.ts`:
    - `createRecommendedActive(env, matchResult)`: 从偏好交汇结果创建系统推荐约局
    - 使用 SYSTEM_USER_ID 作为 creator_id
    - 设置 is_system_recommended = true
    - title 生成: "[推荐] 周三日麻局" (基于匹配的类别+时间)
    - date/time: 从 matchResult 中取最佳时段
    - max_players: 根据类别决定 (日麻=4, 桌游=匹配人数, 跑团=6)
    - 自动将所有匹配用户加入 activeRegistrationsTable (is_watching = true, 即"关注"状态非"报名")
  - 在 activesTable 查询中处理 is_system_recommended 约束:
    - 系统推荐约局不允许用户删除 (在 leave_active/delete 逻辑中检查)

  **Must NOT do**:
  - 不修改现有 leave_active 的完整逻辑 (只加一个 guard check)
  - 不给推荐约局设置 board_game_id (除非类别明确且匹配)
  - 不创建重复的推荐约局 (同一组用户+同一天+同一类别)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 12, 18
  - **Blocked By**: Tasks 4, 10

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/trpc/actives.ts:40-65` — create active + insert registration 模式
  - `apps/diceshock/src/server/apis/wechat/tools/mutate.ts` — leave_active 逻辑位置

  **API/Type References**:
  - `libs/db/src/schema.ts:101-141` — activesTable + activeRegistrationsTable
  - `apps/diceshock/src/shared/preferences/constants.ts` — SYSTEM_USER_ID

  **Acceptance Criteria**:

  ```
  Scenario: Create recommended active from 3-user mahjong match
    Tool: Bash (vitest)
    Steps:
      1. Provide matchResult with 3 users, category "mahjong", date "2025-06-25"
      2. Call createRecommendedActive
      3. Assert active created with is_system_recommended=true, creator_id=SYSTEM_USER_ID
      4. Assert 3 registration rows with is_watching=true
    Expected Result: Active + registrations created correctly
    Evidence: .sisyphus/evidence/task-11-create-recommended.txt

  Scenario: Cannot delete recommended active
    Tool: Bash (vitest)
    Steps:
      1. Create recommended active
      2. Attempt delete as one of the matched users
      3. Assert error thrown
    Expected Result: Delete blocked with appropriate error message
    Evidence: .sisyphus/evidence/task-11-no-delete.txt
  ```

  **Commit**: YES (groups with 10)
  - Message: `feat(preferences): matching engine + recommended active creator`
  - Files: `cron/recommendedActiveCreator.ts`, active delete guard

- [x] 12. Cron Job Integration

  **What to do**:
  - 更新 `apps/diceshock/wrangler.toml`: 新增一个 0:00 的 cron trigger (或在现有 cron handler 中 dispatch)
  - 更新 cron handler (在 `apps/diceshock/src/main.tsx` 或 scheduled event handler):
    - 根据 cron 时间 dispatch: 如果是 0:00 (UTC+8) → 执行 runPreferenceMatching
    - 匹配结果写入 KV 或 D1 (推送队列)
  - 调用顺序: runPreferenceMatching → createRecommendedActive (for cross matches) → 存储推送队列

  **Must NOT do**:
  - 不修改现有 leaderboard/passExpiration cron 逻辑
  - 不在 0:00 发推送 (只做匹配, 推送由 Task 13 在白天处理)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3 (with 13, 14, 15, 16)
  - **Blocks**: Tasks 13, 14, 19
  - **Blocked By**: Tasks 10, 11

  **References**:
  **Pattern References**:
  - `apps/diceshock/wrangler.toml:84` — crons = ["0 4-22 * * *"] 配置方式
  - `apps/diceshock/src/server/cron/leaderboard.ts` — cron job 入口和执行模式
  - `apps/diceshock/src/server/cron/passExpiration.ts` — 简单 cron 模式

  **Acceptance Criteria**:

  ```
  Scenario: Cron triggers matching at scheduled time
    Tool: Bash (vitest)
    Steps:
      1. Mock scheduled event with cron = "0 16 * * *" (0:00 UTC+8)
      2. Assert runPreferenceMatching is called
      3. Assert matching results stored in KV/D1
    Expected Result: Cron correctly dispatches to matching engine
    Evidence: .sisyphus/evidence/task-12-cron-dispatch.txt
  ```

  **Commit**: YES (groups with 13, 14)
  - Message: `feat(preferences): cron integration + notification dispatcher`
  - Files: `wrangler.toml`, cron handler, `main.tsx`

- [x] 13. Notification Dispatcher

  **What to do**:
  - 创建 `apps/diceshock/src/server/cron/notificationDispatcher.ts`:
    - `dispatchPreferenceNotifications(env)`: 读取推送队列, 在 13:00-22:00 窗口内发送
    - 每小时 cron 触发 (复用现有 "0 4-22 * * *")
    - 逻辑:
      1. 检查当前上海时间是否在 13:00-22:00
      2. 读取待推送队列 (KV 或 D1 中 Task 12 存的结果)
      3. 对每个用户: checkDailyPushLimit → 如果未达限 → 发送模板消息
      4. 记录已发送到 preferencePushLogTable
    - 推送内容模板:
      - 偏好↔偏好: "因为你的「{原文}」偏好，我们发现 {N} 人有相似兴趣，已为你创建推荐约局。点击查看详情"
      - 偏好↔约局: "因为你的「{原文}」偏好，发现一个匹配的约局「{title}」({date})。点击查看"
    - 每条消息附 remark: "进入偏好页面管理你的偏好: {manageUrl}"

  **Must NOT do**:
  - 不在 13:00 之前或 22:00 之后发送
  - 不超过每用户每天 2 条
  - 不发送给 openId 为空的用户 (没有关注服务号)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 14, 19
  - **Blocked By**: Tasks 6, 12

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/templateMessage.ts:35-80` — sendTemplateMessage 调用模式
  - `apps/diceshock/src/server/cron/passExpiration.ts` — 简单 cron + 推送模式
  - `apps/diceshock/src/server/apis/wechat/templateMessage.ts:80+` — 现有推送函数参考

  **API/Type References**:
  - Task 6 的 sendPreferenceMatchNotification, checkDailyPushLimit, logPushNotification
  - `libs/db/src/schema.ts` — preferencePushLogTable, accounts 表 (获取 openId)

  **Acceptance Criteria**:

  ```
  Scenario: Dispatches within time window
    Tool: Bash (vitest)
    Steps:
      1. Mock time to 15:00 Shanghai
      2. Seed push queue with 3 items for 2 users
      3. Call dispatchPreferenceNotifications
      4. Assert 2 template messages sent (user A: 2, user B: 0 remaining → only 1 if limit)
    Expected Result: Messages sent within window, limit respected
    Evidence: .sisyphus/evidence/task-13-dispatch-window.txt

  Scenario: Skips outside time window
    Tool: Bash (vitest)
    Steps:
      1. Mock time to 10:00 Shanghai
      2. Call dispatchPreferenceNotifications
      3. Assert 0 messages sent
    Expected Result: No push before 13:00
    Evidence: .sisyphus/evidence/task-13-skip-outside.txt
  ```

  **Commit**: YES (groups with 12, 14)
  - Message: `feat(preferences): cron integration + notification dispatcher`
  - Files: `cron/notificationDispatcher.ts`

- [x] 14. Active → Preference Push (Real-time Active Matching)

  **What to do**:
  - 在约局创建流程 (`trpc/actives.ts` 的 create mutation) 后触发:
    - 用 waitUntil (非阻塞) 检查新约局是否匹配任何用户偏好
    - 匹配逻辑: 约局的 date + time + 类别(从 board_game_id 推断或 is_game) vs 用户偏好的 rrule 展开
    - 匹配到的用户加入推送队列 (不立即推送, 等 dispatcher)
  - 或者: 简化为只在每日 cron 中处理 (偏好↔约局匹配也走 cron)
  - **推荐**: 走 cron (保持简单), 在 Task 10 的 Step 4 中已覆盖

  **实际 scope**: 确保 Task 10 的 active matching 正确工作, 并在 cron 结果中区分两种推送类型:
  - push_type: "preference_match" (偏好交汇) vs "active_match" (现有约局匹配)
  - 推送消息模板不同

  **Must NOT do**:
  - 不在 create active 中做同步 blocking 匹配
  - 不引入 Queues (保持简单, 用 cron)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 8, 13

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/cron/preferenceMatching.ts` — Step 4 active matching (Task 10)

  **API/Type References**:
  - `apps/diceshock/src/shared/preferences/types.ts` — MatchResult.type distinction

  **Acceptance Criteria**:

  ```
  Scenario: Active match produces correct push type
    Tool: Bash (vitest)
    Steps:
      1. Create user preference for "BYDAY=SA" + "boardgame"
      2. Create active on Saturday with is_game=true
      3. Run matching engine
      4. Assert MatchResult has push_type = "active_match"
    Expected Result: Correct type differentiation in push queue
    Evidence: .sisyphus/evidence/task-14-active-push-type.txt
  ```

  **Commit**: YES (groups with 12, 13)
  - Message: `feat(preferences): cron integration + notification dispatcher`
  - Files: `cron/preferenceMatching.ts` (update), notification templates

- [x] 15. /me Preferences Card

  **What to do**:
  - 在 `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx` 添加新 section:
    - 位置: 在"快捷"section 之后, "日麻"section 之前
    - SectionHeader: "偏好"
    - 卡片内容: 显示偏好数量 + 简短摘要 (第一条偏好的 rrule 自然语言)
    - 点击跳转 /preferences
    - 无偏好时: 显示引导文案 "添加偏好, 系统自动为你匹配约局"
  - 调用 `trpcClientPublic.preferences.getCount.query()` 获取数量
  - 使用现有 QuickAction 或创建新的 card 组件 (参考会员 section 样式)

  **Must NOT do**:
  - 不在 /me 页面展示完整偏好列表 (只展示入口卡片)
  - 不引入新 UI 库

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 18
  - **Blocked By**: Task 8

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx:431-446` — QuickAction grid section 模式
  - `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx:510-577` — 会员 section (card with icon + text + link)
  - `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx:103-109` — SectionHeader 组件

  **API/Type References**:
  - `apps/diceshock/src/shared/utils/trpc.ts` — trpcClientPublic 调用方式
  - Task 8 的 preferences.getCount endpoint

  **Acceptance Criteria**:

  ```
  Scenario: Card shows preference count
    Tool: Playwright
    Steps:
      1. Navigate to /me (logged in user with 2 preferences)
      2. Find element with text "偏好"
      3. Assert card shows "2 条偏好" or similar
      4. Click card
      5. Assert URL changes to /preferences
    Expected Result: Card displays count and navigates correctly
    Evidence: .sisyphus/evidence/task-15-me-card.png

  Scenario: Empty state shows guidance
    Tool: Playwright
    Steps:
      1. Navigate to /me (user with 0 preferences)
      2. Find preference section
      3. Assert guidance text visible ("添加偏好" or similar)
    Expected Result: Empty state guides user to add preferences
    Evidence: .sisyphus/evidence/task-15-empty-state.png
  ```

  **Commit**: YES (groups with 16, 17, 18)
  - Message: `feat(preferences): frontend pages and components`
  - Files: `me.tsx`

- [x] 16. Preferences Page

  **What to do**:
  - 创建 `apps/diceshock/src/apps/routers/_with-home-lo/preferences.tsx`:
    - TanStack Router file route: `createFileRoute("/_with-home-lo/preferences")`
    - 页面布局:
      - 顶部: sticky 输入框 (placeholder: "描述你的约局偏好, 如「周三晚上想打麻将」")
      - 偏好列表: 每项显示原文 + rrule 自然语言描述 + 类别 tags + 开关
      - 每项有删除按钮 (确认后删除)
      - 空状态: 引导文案 + 示例
    - 调用 tRPC:
      - `preferences.list` 获取列表
      - `preferences.delete` 删除
      - `preferences.toggle` 切换
    - 输入框逻辑: 输入 → 回车 → 调用 parsePreference → 显示解析结果预览 → 确认 → 调用 create
  - 在 routeTree 中注册 (会自动生成)
  - 样式: 跟随现有 /actives, /inventory 页面风格 (DaisyUI + TailwindCSS)

  **Must NOT do**:
  - 不做分页
  - 不做编辑 (删了重建)
  - 不在这个 task 实现输入框的 agent 调用逻辑 (Task 17 做)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 8

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/apps/routers/_with-home-lo/actives.tsx` — 列表页面模式 (route, data fetching, list rendering)
  - `apps/diceshock/src/apps/routers/_with-home-lo/inventory.tsx` — 另一个列表页参考
  - `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx:56-59` — createFileRoute 模式

  **API/Type References**:
  - Task 8 的 preferences tRPC endpoints
  - Task 3 的 rruleToHumanReadable 函数
  - `apps/diceshock/src/shared/preferences/types.ts` — UserPreference 类型

  **Acceptance Criteria**:

  ```
  Scenario: Page renders preference list
    Tool: Playwright
    Steps:
      1. Seed 3 preferences via API
      2. Navigate to /preferences
      3. Assert 3 preference cards visible
      4. Each card shows: raw text, rrule description, category tags
    Expected Result: All preferences rendered with correct info
    Evidence: .sisyphus/evidence/task-16-list.png

  Scenario: Delete preference
    Tool: Playwright
    Steps:
      1. Navigate to /preferences (1 preference)
      2. Click delete button on first item
      3. Confirm deletion
      4. Assert list is now empty
    Expected Result: Preference removed from list after delete
    Evidence: .sisyphus/evidence/task-16-delete.png
  ```

  **Commit**: YES (groups with 15, 17, 18)
  - Message: `feat(preferences): frontend pages and components`
  - Files: `routers/_with-home-lo/preferences.tsx`

- [x] 17. Add Preference Flow (Frontend Agent Integration)

  **What to do**:
  - 在 preferences.tsx 的 sticky 输入框实现完整交互流程:
    1. 用户输入文字 → 回车
    2. 显示 loading 状态 (skeleton card / spinner)
    3. 调用 `preferenceParser.parsePreference.mutate({ rawText })` (Task 7)
    4. 解析成功 → 显示预览卡片: rrule 自然语言 + 类别 tags + "确认添加" / "取消" 按钮
    5. 用户确认 → 调用 `preferences.create.mutate(...)` → 添加到列表 → 清空输入
    6. 解析失败 → 显示错误提示 (toast), 保留输入文字
  - 处理 rate limit 错误: 显示"额度不足"提示
  - Input UX: autofocus, placeholder 示例, 移动端适配

  **Must NOT do**:
  - 不做流式显示
  - 不做多轮对话修正 (失败就重新输入)
  - 不做 optimistic update (等 API 确认后再加到列表)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 4)
  - **Parallel Group**: Wave 4 (with 18, 19, 20)
  - **Blocks**: None
  - **Blocked By**: Tasks 7, 16

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/apps/routers/_with-home-lo/actives_.new.tsx` — 创建表单 + API 调用模式
  - `apps/diceshock/src/apps/routers/_with-home-lo/me.tsx:259-300` — handleSubmit 模式 (loading state, API call, messages)
  - `apps/diceshock/src/client/hooks/useMessages.ts` — toast 消息 hook

  **API/Type References**:
  - Task 7 的 preferenceParser.parsePreference endpoint
  - Task 8 的 preferences.create endpoint
  - `apps/diceshock/src/shared/preferences/types.ts` — PreferenceParseResult

  **Acceptance Criteria**:

  ```
  Scenario: Full add flow - happy path
    Tool: Playwright
    Steps:
      1. Navigate to /preferences
      2. Type "每周三晚上打麻将" in sticky input
      3. Press Enter
      4. Wait for preview card to appear
      5. Assert preview shows "每周三 19:00-22:00" + "日麻" tag
      6. Click "确认添加"
      7. Assert new preference appears in list
      8. Assert input is cleared
    Expected Result: Full flow completes, preference in list
    Evidence: .sisyphus/evidence/task-17-add-flow.png

  Scenario: Parse failure shows error
    Tool: Playwright
    Steps:
      1. Type "随便" in input
      2. Press Enter
      3. Wait for response
      4. Assert error toast visible
      5. Assert input text preserved
    Expected Result: Error displayed, input not cleared
    Evidence: .sisyphus/evidence/task-17-error-flow.png
  ```

  **Commit**: YES (groups with 15, 16, 18)
  - Message: `feat(preferences): frontend pages and components`
  - Files: `routers/_with-home-lo/preferences.tsx`

- [x] 18. Recommended Active UI Differentiation

  **What to do**:
  - 在约局列表 (`/actives`) 和约局详情页面中区分系统推荐约局:
    - 列表项: 添加 "推荐" badge (小标签, primary color)
    - 详情页: 显示 "这是系统根据多位用户的偏好自动推荐的约局" 提示
    - 隐藏删除/退出按钮 (if is_system_recommended && 当前用户不是 SYSTEM_USER)
    - 显示 "关注中" 而非 "已报名" 状态 (因为初始状态是 is_watching=true)
  - 在 /me 快捷区域的约局入口旁显示推荐约局数量 badge (如有)

  **Must NOT do**:
  - 不大改约局列表/详情的布局
  - 不引入新的路由 (推荐约局复用 /actives 页面)
  - 不修改普通约局的任何行为

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 11, 15

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/apps/routers/_with-home-lo/actives.tsx` — 约局列表渲染
  - `apps/diceshock/src/apps/routers/_with-home-lo/actives_.$id.tsx` — 约局详情页

  **API/Type References**:
  - `libs/db/src/schema.ts:activesTable` — is_system_recommended 字段 (Task 2)
  - `apps/diceshock/src/shared/preferences/constants.ts` — SYSTEM_USER_ID

  **Acceptance Criteria**:

  ```
  Scenario: Recommended active shows badge in list
    Tool: Playwright
    Steps:
      1. Create a recommended active (is_system_recommended=true)
      2. Navigate to /actives
      3. Find the recommended active card
      4. Assert "推荐" badge visible
    Expected Result: Badge distinguishes recommended from regular
    Evidence: .sisyphus/evidence/task-18-badge.png

  Scenario: Delete button hidden for recommended active
    Tool: Playwright
    Steps:
      1. Navigate to recommended active detail page
      2. Assert no delete/退出 button visible
      3. Assert "系统推荐" notice visible
    Expected Result: Users cannot delete recommended actives
    Evidence: .sisyphus/evidence/task-18-no-delete.png
  ```

  **Commit**: YES (groups with 15, 16, 17)
  - Message: `feat(preferences): frontend pages and components`
  - Files: `actives.tsx`, `actives_.$id.tsx`

- [x] 19. Edge Cases & Dedup

  **What to do**:
  - 处理边界情况:
    1. 用户删除偏好后, 已关联的推荐约局怎么办 → 保留约局, 但下次 cron 不再为该用户重复创建
    2. 用户禁用偏好 (enabled=false) → cron 忽略该偏好
    3. 推荐约局过期 (date < today) → 正常显示在历史中, 不清理
    4. 同一组用户重复匹配 → preferencePushLogTable 去重 (push_date + 组合 hash)
    5. 用户没有关注服务号 (无 openId) → 跳过推送, 不报错
    6. 偏好解析出的时间段和实际约局 time 重叠判断边界 (19:00-22:00 匹配 19:30 开始的约局)
  - 补充测试覆盖:
    - 高频用户 (10+ 偏好) 性能
    - 大量用户并发匹配 (100+ 用户)
    - 日期边界 (跨周, 月末)

  **Must NOT do**:
  - 不引入新功能
  - 不改动核心匹配逻辑 (只加 guard 和 edge case handling)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 12, 13, 14

  **References**:
  **Pattern References**:
  - Task 10 matching engine code
  - Task 13 notification dispatcher code

  **Acceptance Criteria**:

  ```
  Scenario: Disabled preference ignored in matching
    Tool: Bash (vitest)
    Steps:
      1. Create 3 preferences, disable 1
      2. Run matching
      3. Assert disabled preference not included in results
    Expected Result: Only enabled preferences participate in matching
    Evidence: .sisyphus/evidence/task-19-disabled.txt

  Scenario: No openId user skipped gracefully
    Tool: Bash (vitest)
    Steps:
      1. Create user without wechat-mp account (no openId)
      2. Create preference for that user
      3. Match + dispatch
      4. Assert no error thrown, push skipped
    Expected Result: Graceful skip without error
    Evidence: .sisyphus/evidence/task-19-no-openid.txt

  Scenario: Duplicate match prevention
    Tool: Bash (vitest)
    Steps:
      1. Run matching → creates push queue
      2. Run matching again same day
      3. Assert no duplicate push queue entries
    Expected Result: Dedup works across runs
    Evidence: .sisyphus/evidence/task-19-dedup.txt
  ```

  **Commit**: YES (groups with 20)
  - Message: `fix(preferences): edge cases, dedup, integration tests`
  - Files: matching engine, dispatcher, tests

- [x] 20. Integration Tests

  **What to do**:
  - 创建 `apps/diceshock/src/server/cron/__tests__/preferenceIntegration.test.ts`:
    - End-to-end flow: 创建偏好 → 跑匹配 → 验证推荐约局创建 → 验证推送队列
    - Mock: D1 (用 in-memory SQLite), DeepSeek API, WeChat template API
    - Test scenarios:
      1. 3 mahjong users same Wednesday → recommended active created
      2. User preference matches existing active → active_match in queue
      3. Push limit respected (3rd push blocked for user with 2 already)
      4. Time window check (no push at 10:00)
  - 创建 `apps/diceshock/src/server/apis/wechat/__tests__/preference-skill.test.ts`:
    - WeChat skill integration: add/list/delete via message simulation
  - 创建 `apps/diceshock/src/shared/preferences/__tests__/rruleDisplay.test.ts`:
    - 全面的 rrule display 测试

  **Must NOT do**:
  - 不测真实 DeepSeek API (全 mock)
  - 不测真实微信推送 (mock fetch)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: All previous tasks

  **References**:
  **Pattern References**:
  - `apps/diceshock/src/server/apis/wechat/__tests__/regression.test.ts` — 现有测试模式 (mock 结构, describe/it)

  **External References**:
  - Vitest docs: https://vitest.dev/api/

  **Acceptance Criteria**:

  ```
  Scenario: All integration tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm vitest run apps/diceshock/src/server/cron/__tests__/preferenceIntegration.test.ts
      2. Run: pnpm vitest run apps/diceshock/src/server/apis/wechat/__tests__/preference-skill.test.ts
      3. Run: pnpm vitest run apps/diceshock/src/shared/preferences/__tests__/rruleDisplay.test.ts
    Expected Result: All tests pass (0 failures)
    Evidence: .sisyphus/evidence/task-20-integration.txt
  ```

  **Commit**: YES (groups with 19)
  - Message: `fix(preferences): edge cases, dedup, integration tests`
  - Files: `__tests__/` directories

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + biome lint + vitest. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Test: add preference via frontend, verify rrule display, check /me card shows count. Test WeChat skill via mock. Verify matching engine produces correct results with test data.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read actual diff. Verify 1:1 compliance. Check "Must NOT do" adherence. Detect scope creep. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Tasks | Commit Message | Files |
|-------|---------------|-------|
| 1-2, 4 | `feat(preferences): add schema, types, and system user` | schema.ts, types, migration |
| 3 | `feat(preferences): rrule display utility` | shared/preferences/ |
| 5-6 | `feat(wechat): register preference skill and template` | skills/, templateMessage.ts |
| 7-8 | `feat(preferences): agent parsing + CRUD endpoints` | trpc/preferences.ts, deepseek |
| 9 | `feat(wechat): implement preference skill` | skills/preference.ts |
| 10-11 | `feat(preferences): matching engine + recommended active creator` | cron/, matching |
| 12-14 | `feat(preferences): cron integration + notification dispatcher` | cron/, push |
| 15-18 | `feat(preferences): frontend pages and components` | routers/, components/ |
| 19-20 | `fix(preferences): edge cases, dedup, integration tests` | tests, edge cases |

---

## Success Criteria

### Verification Commands
```bash
pnpm x diceshock:dev  # Expected: no build errors
pnpm vitest run apps/diceshock/src/server/cron/preferenceMatching.test.ts  # Expected: PASS
pnpm vitest run apps/diceshock/src/server/apis/trpc/__tests__/preferences.test.ts  # Expected: PASS
pnpm vitest run apps/diceshock/src/server/apis/wechat/__tests__/preference-skill.test.ts  # Expected: PASS
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Cron job registered in wrangler.toml
- [ ] Template message configured in KV
