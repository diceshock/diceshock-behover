# 微信服务号 AI 客服重构

## TL;DR

> **Quick Summary**: 将 Diceshock 微信服务号 AI 客服从 2 工具单 prompt 系统重构为支持 5 大功能模块 (账号/桌游/日麻/约局/活动) 的 skill-based 多消息 agent, 接入对话上下文 (D1+R2) 和用户记忆 (Mem0)
> 
> **Deliverables**:
> - 重构后的 `apps/diceshock/src/server/apis/wechat/` 目录
> - 新的 skill 注册表和意图路由器
> - 扩展工具集 (15+ tools)
> - 对话历史存储 (D1 + R2 归档)
> - Mem0 用户记忆集成
> - 多消息 JSON 输出管线 (text/img/totp)
> - 完整测试套件 (vitest + mock)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (基础架构) → Task 4 (消息管线) → Task 8-12 (Skills) → Task 15 (集成测试)

---

## Context

### Original Request
完整重构微信服务号 AI 客服:
1. 支持账号/日麻/桌游/约局/活动全功能查询
2. 每次查询附带相关页面链接 (sitemap 映射)
3. 图片保持为链接, 回复完成后替换为富文本发送
4. Agent 回复 JSON, 多条消息逐条下发
5. 接入对话上下文 (12h, token 限制)
6. 工具调用时显示状态提示, 报错提供联系方式
7. Skill 拆分避免上下文占用
8. 接入 Mem0 用户记忆

### Interview Summary
**Key Discussions**:
- 对话历史: D1 存近期 12h + R2 归档 (写入时判断)
- Mem0: 动态记忆, 有时效, 节约开销, agent 判断是否存储
- Skill: 意图路由模式 — 先判断意图再加载
- 消息格式: 结构化 JSON array [{type, ...}]
- 图片: 独立消息发送 (img type)
- TOTP: 异步图片生成 (二维码+号码+剩余时间)
- 测试: 完整测试, mock 外部 API

**Research Findings**:
- 11+ tRPC routers 覆盖所有数据需求
- 前端路由完整覆盖所有页面
- 现有 9 文件 ~2000 行, 单 prompt 2 tools
- 基础设施: KV, D1, R2, IMAGE_QUEUE, AI_SEARCH, BROWSER

### Metis Review
**Identified Gaps** (addressed):
- WeChat 5s 超时: 已有 async ack+push 模式, 加强 dedup
- MsgId 去重: 作为第一层中间件
- 多消息上限: 限制为 3 条/响应
- 非文本消息: 统一回复 "请发送文字消息"
- 并发消息: 队列化处理
- Mem0 降级: 不可用时仍正常响应
- 写操作: agent 只读/查询, 不执行 mutation, 返回链接引导

---

## Work Objectives

### Core Objective
重构微信 AI 客服为 skill-based 多工具 agent, 支持完整业务查询能力和连续对话

### Concrete Deliverables
- 重构后的 wechat/ 目录 (预计 15-20 个文件)
- 5 个 skill prompt 文件 + 基础 skill
- 15+ 工具定义和实现
- D1 对话历史 schema + migration
- R2 归档逻辑
- Mem0 集成模块
- 消息分发管线 (JSON → 逐条发送)
- 完整 vitest 测试套件

### Definition of Done
- [ ] Agent 能正确响应所有 5 大模块的查询
- [ ] 多条消息正确逐条下发
- [ ] 对话上下文在 12h 内正确保持
- [ ] 用户记忆正确存取
- [ ] 所有测试通过 (`bun run test`)
- [ ] WeChat MsgId 去重正确工作
- [ ] 5s 超时场景正确处理 (ack + async push)

### Must Have
- MsgId 去重中间件 (WeChat 3x 重试)
- 5s 超时 ack + async push 模式
- Skill 意图路由器
- 对话上下文注入 (D1 12h + token 限制)
- 每个查询附带相关页面 URL
- 状态提示和错误联系方式
- Mock 所有外部 API 的测试

### Must NOT Have (Guardrails)
- ❌ 不执行任何写操作/mutation (约局创建/表单提交 → 返回链接)
- ❌ 不处理非文本消息 (图片/语音/视频 → "请发送文字消息")
- ❌ 不支持群聊 (仅 1:1 私聊)
- ❌ 不主动发消息 (仅响应用户消息)
- ❌ 不生成图片 (除 TOTP 二维码外不做图片生成)
- ❌ 单次响应不超过 3 条消息
- ❌ 单个 skill prompt 不超过 2000 tokens
- ❌ 不在 R2 中存储未脱敏的 PII
- ❌ Mem0 单用户记忆条目不超过 20 条
- ❌ Agent 不编造数据 — 所有事实必须来自工具调用
- ❌ 不支持多语言 (仅中文)
- ❌ 不自动发现/生成 skill (手动编写)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest.config.ts)
- **Automated tests**: TDD (tests-after for this refactor since existing code has no tests)
- **Framework**: vitest
- **Mock strategy**: Mock DeepSeek API, WeChat API, Mem0 API, use miniflare D1/KV/R2

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl / vitest) - Run tests, assert outputs
- **Integration**: Use vitest with miniflare environment for Workers-native testing

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - types, schema, shared infrastructure):
├── Task 1: D1 对话历史 schema + migration [quick]
├── Task 2: 消息类型定义 + 链接映射注册表 [quick]
├── Task 3: Skill 类型定义 + 注册表结构 [quick]
└── Task 4: MsgId 去重中间件 [quick]

Wave 2 (Core Engine - agent pipeline):
├── Task 5: 意图路由器 [deep]
├── Task 6: 对话上下文管理 (D1 读写 + R2 归档) [unspecified-high]
├── Task 7: Mem0 集成模块 [unspecified-high]
├── Task 8: 多消息输出管线 (JSON parse → dispatch) [unspecified-high]
├── Task 9: DeepSeek client 重构 (skill-aware) [deep]
└── Task 10: 错误/状态提示模块 [quick]

Wave 3 (Skills + Tools - all independent):
├── Task 11: Skill 账号 + 工具实现 [unspecified-high]
├── Task 12: Skill 桌游 + 工具实现 [unspecified-high]
├── Task 13: Skill 日麻 + 工具实现 [unspecified-high]
├── Task 14: Skill 约局 + 工具实现 [unspecified-high]
├── Task 15: Skill 活动 + 工具实现 [unspecified-high]
└── Task 16: TOTP 验证码工具 (异步图片生成) [unspecified-high]

Wave 4 (Integration + Tests):
├── Task 17: 主消息处理器重构 (串联所有模块) [deep]
├── Task 18: 完整测试套件 [unspecified-high]
└── Task 19: Rate limiter 适配 + 清理旧代码 [quick]

Wave FINAL (Review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 6 → Task 9 → Task 17 → Task 18 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 3)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 6, 17 |
| 2 | - | 5, 8, 11-16 |
| 3 | - | 5, 9, 11-16 |
| 4 | - | 17 |
| 5 | 2, 3 | 17 |
| 6 | 1 | 9, 17 |
| 7 | - | 9, 17 |
| 8 | 2 | 17 |
| 9 | 3, 6, 7 | 17 |
| 10 | - | 17 |
| 11-16 | 2, 3 | 17 |
| 17 | 4, 5, 6, 7, 8, 9, 10, 11-16 | 18 |
| 18 | 17 | F1-F4 |
| 19 | 17 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1-T4 → `quick`
- **Wave 2**: 6 tasks — T5,T9 → `deep`, T6-T8,T10 → `unspecified-high`/`quick`
- **Wave 3**: 6 tasks — T11-T16 → `unspecified-high`
- **Wave 4**: 3 tasks — T17 → `deep`, T18 → `unspecified-high`, T19 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. D1 对话历史 Schema + Migration

  **What to do**:
  - 在 `libs/db/src/schema.ts` 中新增 `wechatConversationsTable` 表:
    - `id` (text, primary key, cuid2)
    - `open_id` (text, indexed)
    - `role` ("user" | "assistant" | "tool")
    - `content` (text)
    - `metadata` (text, nullable — JSON: tool_calls, tool_name, message_type 等)
    - `created_at` (integer, unix timestamp, indexed)
  - 生成 drizzle migration (`pnpm drizzle`)
  - 确保表支持按 `open_id` + `created_at` 高效查询最近 12h 记录

  **Must NOT do**:
  - 不修改其他现有表
  - 不添加 foreign key 到 users/accounts 表 (openId 可能未注册)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单表 schema 定义 + migration 生成, 明确直接
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `db-generate`: Medusa 专用, 不适用 Drizzle

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 6, 17
  - **Blocked By**: None

  **References**:
  - `libs/db/src/schema.ts` — 所有现有表定义, 遵循同样的模式 (cuid2 id, timestamp 字段)
  - `drizzle.config.ts` — Drizzle 配置, 了解 migration 生成方式
  - `drizzle/` — 已有 migration 文件格式

  **Acceptance Criteria**:
  - [ ] `libs/db/src/schema.ts` 中包含 `wechatConversationsTable` 定义
  - [ ] `drizzle/` 中生成新 migration 文件
  - [ ] Schema 导出可被其他模块引用

  **QA Scenarios**:
  ```
  Scenario: Schema 定义正确
    Tool: Bash (tsc)
    Preconditions: schema.ts 已添加新表
    Steps:
      1. 运行 `tsc --noEmit` 验证类型无错误
      2. 检查 schema 文件中 wechatConversationsTable 有 open_id, role, content, metadata, created_at 字段
      3. 确认 open_id 和 created_at 有索引
    Expected Result: tsc 无错误, 所有字段和索引存在
    Evidence: .sisyphus/evidence/task-1-schema-valid.txt

  Scenario: Migration 生成成功
    Tool: Bash
    Preconditions: schema 定义完成
    Steps:
      1. 运行 `pnpm drizzle` 或 `npx drizzle-kit generate`
      2. 检查 drizzle/ 目录下新增 migration 文件
      3. 验证 migration SQL 包含 CREATE TABLE 和索引创建
    Expected Result: 新 migration 文件存在且 SQL 正确
    Evidence: .sisyphus/evidence/task-1-migration-generated.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(wechat): add conversation history schema and migration`
  - Files: `libs/db/src/schema.ts`, `drizzle/*.sql`
  - Pre-commit: `tsc --noEmit`

---

- [x] 2. 消息类型定义 + 链接映射注册表

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/types.ts`:
    - `AgentMessage` 联合类型: `TextMessage | ImgMessage | TotpMessage`
    - `TextMessage`: `{ type: "text", content: string }`
    - `ImgMessage`: `{ type: "img", url: string, alt?: string }`
    - `TotpMessage`: `{ type: "totp", qrcode_url: string, code: string, remaining_seconds: number }`
    - `AgentResponse`: `{ messages: AgentMessage[], status?: string }`
    - `SkillId` 枚举: `"account" | "boardgame" | "mahjong" | "active" | "event" | "general"`
    - `ToolResult` 接口: `{ data: unknown, links: PageLink[] }`
    - `PageLink`: `{ url: string, title: string, description?: string }`
  - 新建 `apps/diceshock/src/server/apis/wechat/linkRegistry.ts`:
    - 导出 `SITE_LINKS` 对象, 包含所有页面 URL 生成函数:
      - `inventory()` → `/inventory`
      - `inventoryDetail(id)` → `/inventory/${id}`
      - `actives()` → `/actives`
      - `activeDetail(id)` → `/actives/${id}`
      - `activeNew()` → `/actives/new`
      - `riichi()` → `/riichi`
      - `myRiichi()` → `/my-riichi`
      - `matchDetail(id)` → `/my-riichi/${id}`
      - `me()` → `/me`
      - `table(code)` → `/t/${code}`
      - `eventDetail(id)` → `/events/${id}`
      - `contactUs()` → `/contact-us`
    - 每个函数返回完整 URL (`https://diceshock.com${path}`)
    - 导出 `getRelatedLinks(skillId, context)` 辅助函数

  **Must NOT do**:
  - 不实现任何业务逻辑, 仅类型和映射
  - 不修改现有 routeTree.gen.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型定义和简单映射函数, 无复杂逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 8, 11-16
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/apps/routeTree.gen.ts` — 完整前端路由列表, 确保映射覆盖所有页面
  - `apps/diceshock/src/server/apis/wechat/tools.ts:13-48` — 现有 ToolDefinition 接口, 新类型需兼容
  - `apps/diceshock/src/server/utils/ogMeta.ts` — OG 元数据映射模式, 链接注册表可参考

  **Acceptance Criteria**:
  - [ ] types.ts 中定义了 AgentMessage, AgentResponse, SkillId, ToolResult, PageLink
  - [ ] linkRegistry.ts 覆盖所有 12+ 前端页面
  - [ ] `tsc --noEmit` 无错误

  **QA Scenarios**:
  ```
  Scenario: 类型定义完整性
    Tool: Bash (tsc + grep)
    Preconditions: types.ts 已创建
    Steps:
      1. 运行 `tsc --noEmit` 验证无编译错误
      2. 确认 AgentMessage 联合类型包含 text/img/totp 三种
      3. 确认 SkillId 包含 6 个值
    Expected Result: 编译通过, 所有类型存在
    Evidence: .sisyphus/evidence/task-2-types-check.txt

  Scenario: 链接映射覆盖所有页面
    Tool: Bash (grep)
    Preconditions: linkRegistry.ts 已创建
    Steps:
      1. 对比 routeTree.gen.ts 中的公开路由和 linkRegistry.ts 中的映射
      2. 确认 inventory, actives, riichi, me, events, contact-us, t/:code 均有映射
      3. 调用每个函数验证返回格式: https://diceshock.com/...
    Expected Result: 所有公开路由都有对应链接生成器
    Evidence: .sisyphus/evidence/task-2-links-coverage.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(wechat): add message types and link registry`
  - Files: `wechat/types.ts`, `wechat/linkRegistry.ts`
  - Pre-commit: `tsc --noEmit`

---

- [x] 3. Skill 类型定义 + 注册表结构

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/skills/index.ts`:
    - `SkillDefinition` 接口:
      - `id`: SkillId
      - `name`: string (显示名)
      - `description`: string (意图匹配用)
      - `systemPrompt`: string (该 skill 的系统提示词, <2000 tokens)
      - `tools`: ToolDefinition[] (该 skill 可用的工具)
      - `keywords`: string[] (意图匹配关键词)
    - `skillRegistry`: Map<SkillId, SkillDefinition> (所有 skill 注册表)
    - `getSkillById(id)`: 获取 skill
    - `BASE_SYSTEM_PROMPT`: 基础系统提示词 (角色定义 + 通用规则, ~500 tokens)
  - 新建 skill 目录结构:
    - `apps/diceshock/src/server/apis/wechat/skills/account.ts` (空导出占位)
    - `apps/diceshock/src/server/apis/wechat/skills/boardgame.ts` (空导出占位)
    - `apps/diceshock/src/server/apis/wechat/skills/mahjong.ts` (空导出占位)
    - `apps/diceshock/src/server/apis/wechat/skills/active.ts` (空导出占位)
    - `apps/diceshock/src/server/apis/wechat/skills/event.ts` (空导出占位)
    - `apps/diceshock/src/server/apis/wechat/skills/general.ts` (兜底 skill)

  **Must NOT do**:
  - 不编写具体 skill prompt 内容 (Wave 3 做)
  - 不实现具体工具 (Wave 3 做)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 结构搭建, 无业务逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 5, 9, 11-16
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts:5-15` — 现有 SYSTEM_PROMPT 作为 BASE_SYSTEM_PROMPT 参考
  - `apps/diceshock/src/server/apis/wechat/tools.ts:13-48` — 现有 ToolDefinition 接口, skill tools 复用此类型

  **Acceptance Criteria**:
  - [ ] skills/index.ts 导出 SkillDefinition, skillRegistry, getSkillById, BASE_SYSTEM_PROMPT
  - [ ] 6 个 skill 文件存在 (account, boardgame, mahjong, active, event, general)
  - [ ] BASE_SYSTEM_PROMPT 包含角色定义和通用规则
  - [ ] `tsc --noEmit` 无错误

  **QA Scenarios**:
  ```
  Scenario: Skill 注册表结构正确
    Tool: Bash (tsc)
    Preconditions: skills/ 目录已创建
    Steps:
      1. 运行 `tsc --noEmit`
      2. 确认 skillRegistry 包含 6 个 key
      3. 确认 getSkillById("general") 返回有效 SkillDefinition
    Expected Result: 编译通过, 结构正确
    Evidence: .sisyphus/evidence/task-3-skill-registry.txt

  Scenario: BASE_SYSTEM_PROMPT 不超限
    Tool: Bash
    Preconditions: index.ts 已编写
    Steps:
      1. 读取 BASE_SYSTEM_PROMPT 内容
      2. 粗略估算 token 数 (中文字数 * 1.5)
      3. 确认不超过 500 tokens
    Expected Result: prompt 简洁, 不超 500 tokens
    Evidence: .sisyphus/evidence/task-3-prompt-size.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(wechat): add skill definition types and registry structure`
  - Files: `wechat/skills/*.ts`
  - Pre-commit: `tsc --noEmit`

---

- [x] 4. MsgId 去重中间件

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/dedup.ts`:
    - `isDuplicate(c, msgId)`: 检查 KV 中是否已处理过此 MsgId
    - `markProcessed(c, msgId)`: 在 KV 中标记 MsgId 已处理 (TTL 30s, 覆盖 WeChat 3 次重试)
    - KV key 格式: `wechat:dedup:{msgId}`
  - 在 wechat message handler 入口 (index.ts 的 wechatMessage 函数) 中:
    - 提取 msg.MsgId (文本消息) 或 msg.MsgId || `${msg.FromUserName}:${msg.CreateTime}` (事件)
    - 如果 isDuplicate 返回 true, 直接返回 buildEmptyReply()
    - 否则 markProcessed 后继续处理

  **Must NOT do**:
  - 不重构整个 index.ts (仅添加 dedup 检查)
  - 不改变现有消息处理流程

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单 KV 读写逻辑, 几十行代码
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 17
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/server/apis/wechat/index.ts:42-132` — wechatMessage 函数, dedup 检查插入位置
  - `apps/diceshock/src/server/apis/wechat/rateLimit.ts` — KV 使用模式参考 (c.env.KV)
  - `apps/diceshock/src/server/apis/wechat/xmlUtils.ts:3-12` — parseXml 返回的 msg 对象结构

  **Acceptance Criteria**:
  - [ ] dedup.ts 导出 isDuplicate 和 markProcessed
  - [ ] KV key 使用 `wechat:dedup:{msgId}` 格式, TTL 30s
  - [ ] 重复 MsgId 请求直接返回空回复, 不触发处理逻辑

  **QA Scenarios**:
  ```
  Scenario: 首次消息正常处理
    Tool: Bash (vitest)
    Preconditions: mock KV (miniflare)
    Steps:
      1. 构造 MsgId="test123" 的消息
      2. 调用 isDuplicate — 期望 false
      3. 调用 markProcessed
      4. 验证 KV 中写入了 wechat:dedup:test123
    Expected Result: 首次不重复, KV 写入成功
    Evidence: .sisyphus/evidence/task-4-dedup-first.txt

  Scenario: 重复消息被拦截
    Tool: Bash (vitest)
    Preconditions: KV 中已有 wechat:dedup:test123
    Steps:
      1. 构造相同 MsgId="test123" 的消息
      2. 调用 isDuplicate — 期望 true
      3. 确认不继续处理
    Expected Result: 重复消息返回 true, 被拦截
    Evidence: .sisyphus/evidence/task-4-dedup-repeat.txt

  Scenario: TTL 过期后可再次处理
    Tool: Bash (vitest)
    Preconditions: mock KV 支持 TTL 模拟
    Steps:
      1. markProcessed MsgId="test456"
      2. 模拟 30s 后 KV 过期
      3. isDuplicate 返回 false
    Expected Result: 过期后不再被认为重复
    Evidence: .sisyphus/evidence/task-4-dedup-expire.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(wechat): add MsgId deduplication middleware`
  - Files: `wechat/dedup.ts`, `wechat/index.ts` (minimal change)
  - Pre-commit: `tsc --noEmit`

---

- [x] 5. 意图路由器

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/intentRouter.ts`:
    - `detectIntent(userMessage, conversationHistory?)`: 接受用户消息和可选历史, 返回 `SkillId`
    - 实现方式: 关键词匹配 + 简单规则 (不需要 LLM 调用):
      - 账号相关: "昵称", "名片", "手机", "通行证", "储值", "会员", "绑定", "注册" → account
      - 桌游: "桌游", "游戏", "库存", "在架", "几人", "推荐" → boardgame
      - 日麻: "日麻", "麻将", "排行", "PP", "战绩", "对局" → mahjong
      - 约局: "约局", "组局", "报名", "活动报名", "参加" → active
      - 活动: "活动", "新闻", "公告", "通知" → event
      - 兜底: general
    - 支持上下文延续: 如果最近消息在某个 skill 上下文中, 优先保持 (避免频繁切换)
    - 导出 `IntentResult`: `{ skillId: SkillId, confidence: "high" | "medium" | "low" }`

  **Must NOT do**:
  - 不使用 LLM 做意图检测 (成本/延迟考虑)
  - 不做 NLU 训练, 仅规则匹配
  - 不处理多意图 (一次只匹配一个 skill)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要设计合理的关键词匹配策略和上下文延续逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/server/apis/wechat/skills/index.ts` — SkillDefinition.keywords 字段用于匹配
  - `apps/diceshock/src/server/apis/wechat/types.ts` — SkillId 类型定义

  **Acceptance Criteria**:
  - [ ] detectIntent 正确分类已知关键词到对应 skill
  - [ ] 未匹配时返回 "general"
  - [ ] 上下文延续: 连续对话中不频繁切换 skill

  **QA Scenarios**:
  ```
  Scenario: 关键词正确路由
    Tool: Bash (vitest)
    Preconditions: intentRouter 已实现
    Steps:
      1. detectIntent("我想查一下桌游库存") → boardgame
      2. detectIntent("我的战绩怎么样") → mahjong
      3. detectIntent("最近有什么活动") → event
      4. detectIntent("今天的约局") → active
      5. detectIntent("修改我的昵称") → account
      6. detectIntent("你好") → general
    Expected Result: 6 个测试全部匹配正确
    Evidence: .sisyphus/evidence/task-5-intent-routing.txt

  Scenario: 上下文延续
    Tool: Bash (vitest)
    Preconditions: 提供对话历史
    Steps:
      1. history 中最近 3 条都是 boardgame 相关
      2. detectIntent("还有吗?", history) → boardgame (而非 general)
      3. detectIntent("换个话题, 我的通行证呢", history) → account
    Expected Result: 模糊消息延续上下文, 明确切换时能正确切换
    Evidence: .sisyphus/evidence/task-5-intent-context.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(wechat): implement intent router with keyword matching`
  - Files: `wechat/intentRouter.ts`
  - Pre-commit: `vitest run --reporter=verbose`

---

- [x] 6. 对话上下文管理 (D1 读写 + R2 归档)

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/conversationContext.ts`:
    - `saveMessage(c, openId, role, content, metadata?)`: 写入 D1
      - 写入前检查该 openId 下超过 12h 的记录 → 批量归档到 R2 → 删除 D1 中对应行
    - `getRecentHistory(c, openId, maxTokens?)`: 从 D1 读取最近 12h 消息
      - 按 created_at desc 获取, 限制条数 (估算 token: 中文字符数 * 1.5)
      - 截断至 maxTokens (默认 2000)
      - 返回 `ChatMessage[]` 格式 (role + content)
    - `archiveToR2(c, openId, messages)`: 归档消息到 R2
      - R2 key: `conversations/${openId}/${YYYY-MM-DD}.json`
      - 内容: JSON array of messages (append to existing if same day)
    - Token 估算函数: `estimateTokens(text)` — 简单按字符数估算

  **Must NOT do**:
  - 不存储未脱敏的敏感信息 (phone, 身份证等不出现在对话内容中)
  - R2 归档后不主动回查 (纯存储/审计)
  - 不实现复杂的 token 精确计算 (估算即可)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 D1 + R2 两个存储, 有归档逻辑和 token 估算
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7-10)
  - **Blocks**: Tasks 9, 17
  - **Blocked By**: Task 1

  **References**:
  - `libs/db/src/schema.ts` — wechatConversationsTable (Task 1 创建)
  - `libs/db/src/index.ts` — db(env.DB) 使用模式
  - `apps/diceshock/src/server/apis/wechat/tools.ts:73-118` — D1 查询模式参考
  - `apps/diceshock/src/server/apis/wechat/rateLimit.ts` — KV 使用模式参考

  **Acceptance Criteria**:
  - [ ] saveMessage 正确写入 D1 并触发归档
  - [ ] getRecentHistory 返回 12h 内消息, 按 token 截断
  - [ ] archiveToR2 正确写入 R2 (JSON 格式)
  - [ ] 归档后 D1 中旧记录被删除

  **QA Scenarios**:
  ```
  Scenario: 保存和读取消息
    Tool: Bash (vitest + miniflare D1)
    Preconditions: D1 中无数据
    Steps:
      1. saveMessage(openId="test", role="user", content="你好")
      2. saveMessage(openId="test", role="assistant", content="你好!")
      3. getRecentHistory(openId="test") → 返回 2 条消息
    Expected Result: 保存和读取正确, 顺序正确
    Evidence: .sisyphus/evidence/task-6-save-read.txt

  Scenario: 12h 超时消息被归档
    Tool: Bash (vitest + miniflare D1/R2)
    Preconditions: D1 中有 13h 前的消息
    Steps:
      1. 插入 created_at = 13h ago 的旧消息
      2. 调用 saveMessage 写入新消息
      3. 验证旧消息从 D1 中删除
      4. 验证 R2 中存在归档文件
    Expected Result: 旧消息归档到 R2, D1 中仅剩 12h 内记录
    Evidence: .sisyphus/evidence/task-6-archive.txt

  Scenario: Token 截断
    Tool: Bash (vitest)
    Preconditions: D1 中有大量消息 (>2000 tokens)
    Steps:
      1. 插入 50 条消息
      2. getRecentHistory(maxTokens=500) 
      3. 验证返回消息总 token < 500 (估算)
    Expected Result: 结果被截断到 maxTokens 以内
    Evidence: .sisyphus/evidence/task-6-truncate.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(wechat): implement conversation context with D1 storage and R2 archival`
  - Files: `wechat/conversationContext.ts`
  - Pre-commit: `vitest run`

---

- [x] 7. Mem0 集成模块

  **What to do**:
  - 安装 `mem0ai` 依赖: `pnpm add mem0ai`
  - 新建 `apps/diceshock/src/server/apis/wechat/memory.ts`:
    - `searchMemory(c, openId, query)`: 调用 mem0 client.search(query, {user_id: openId})
      - 返回相关记忆字符串 (拼接 top 3 results)
      - 如果 Mem0 不可用 (超时/503), 返回空字符串 (graceful degradation)
    - `addMemory(c, openId, messages)`: 调用 mem0 client.add(messages, {user_id: openId})
      - 仅在 agent 判断有值得记住的信息时调用
      - 超过 20 条时不再添加 (硬上限)
    - `getMemoryCount(c, openId)`: 获取当前用户记忆条目数
    - 初始化: `MemoryClient({ apiKey: env.MEM0_API_KEY })`
  - 环境变量: `MEM0_API_KEY` (通过 wrangler secret 设置)

  **Must NOT do**:
  - 不在每轮都调用 add (由 agent 决定, 或消息处理器判断)
  - Mem0 单用户不超过 20 条记忆
  - Mem0 不可用时不 block 主流程

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 第三方 SDK 集成, 需要处理错误和降级
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8-10)
  - **Blocks**: Tasks 9, 17
  - **Blocked By**: None

  **References**:
  - Mem0 SDK 文档 (用户提供的 API 用法): `MemoryClient`, `client.add()`, `client.search()`
  - `apps/diceshock/src/server/apis/wechat/rateLimit.ts` — 错误处理和降级模式参考

  **Acceptance Criteria**:
  - [ ] memory.ts 导出 searchMemory, addMemory, getMemoryCount
  - [ ] Mem0 不可用时 searchMemory 返回空字符串, 不抛错
  - [ ] addMemory 检查条目上限 (20 条)
  - [ ] `package.json` 中包含 `mem0ai` 依赖

  **QA Scenarios**:
  ```
  Scenario: 记忆搜索正常
    Tool: Bash (vitest)
    Preconditions: Mock mem0ai client
    Steps:
      1. Mock client.search 返回 [{memory: "喜欢卡坦岛"}]
      2. searchMemory(openId, "推荐桌游") → "喜欢卡坦岛"
    Expected Result: 正确返回记忆内容
    Evidence: .sisyphus/evidence/task-7-mem0-search.txt

  Scenario: Mem0 不可用时降级
    Tool: Bash (vitest)
    Preconditions: Mock mem0ai client 抛出网络错误
    Steps:
      1. Mock client.search 抛出 Error("Network timeout")
      2. searchMemory(openId, "query") → "" (空字符串)
      3. 确认无 unhandled rejection
    Expected Result: 降级成功, 返回空, 不 crash
    Evidence: .sisyphus/evidence/task-7-mem0-degraded.txt

  Scenario: 记忆上限
    Tool: Bash (vitest)
    Preconditions: Mock getMemoryCount 返回 20
    Steps:
      1. getMemoryCount 返回 20
      2. addMemory 被调用 → 应跳过 (不调用 client.add)
    Expected Result: 超过 20 条时不再写入
    Evidence: .sisyphus/evidence/task-7-mem0-limit.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(wechat): integrate Mem0 for user memory with graceful degradation`
  - Files: `wechat/memory.ts`, `package.json`
  - Pre-commit: `vitest run`

---

- [x] 8. 多消息输出管线 (JSON parse → dispatch)

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/messagePipeline.ts`:
    - `parseAgentOutput(rawOutput)`: 解析 DeepSeek 返回的 JSON string → `AgentMessage[]`
      - 处理 JSON 解析失败 → 降级为单条 text 消息
      - 验证消息数量不超过 3 条
      - 验证每条消息 type 合法
    - `dispatchMessages(c, openId, messages)`: 逐条发送消息
      - `text` → `sendCustomerTextMessage(env, openId, content)`
      - `img` → `uploadImageToWechat(env, url)` → `sendCustomerImageMessage(env, openId, mediaId)`
      - `totp` → 触发 IMAGE_QUEUE 生成图片 → 等待完成 → 发送图片
      - 每条消息之间间隔 200ms (避免微信限流)
      - 任一条失败不阻塞后续
    - `sendStatusMessage(c, openId, status)`: 发送状态提示 (如 "查询桌游库存...")
      - 在工具调用前发送, 让用户知道在处理中

  **Must NOT do**:
  - 不超过 3 条消息 / 响应
  - totp 类型的图片生成不在此模块实现 (调用现有 IMAGE_QUEUE)
  - 不做消息队列 (直接顺序发送)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 消息分发涉及多种类型处理和错误容错
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-7, 9-10)
  - **Blocks**: Task 17
  - **Blocked By**: Task 2

  **References**:
  - `apps/diceshock/src/server/apis/wechat/wechatApi.ts` — sendCustomerTextMessage, sendCustomerImageMessage, uploadImageToWechat
  - `apps/diceshock/src/server/apis/wechat/types.ts` — AgentMessage 类型 (Task 2)
  - `apps/diceshock/src/server/apis/wechat/membershipCard.tsx:1-50` — IMAGE_QUEUE 使用模式

  **Acceptance Criteria**:
  - [ ] parseAgentOutput 正确解析 JSON array
  - [ ] parseAgentOutput 对非 JSON 输入降级为单条 text
  - [ ] dispatchMessages 按类型正确调用不同发送方法
  - [ ] 消息数量硬限制为 3

  **QA Scenarios**:
  ```
  Scenario: 正常 JSON 解析和分发
    Tool: Bash (vitest)
    Preconditions: Mock WeChat API
    Steps:
      1. parseAgentOutput('[{"type":"text","content":"hello"},{"type":"img","url":"https://r2.example.com/img.png"}]')
      2. 验证返回 2 条消息
      3. dispatchMessages → 验证 sendCustomerTextMessage 被调用 1 次, uploadImageToWechat + sendCustomerImageMessage 被调用 1 次
    Expected Result: 解析正确, 分发正确
    Evidence: .sisyphus/evidence/task-8-pipeline-normal.txt

  Scenario: 非 JSON 降级
    Tool: Bash (vitest)
    Preconditions: 无
    Steps:
      1. parseAgentOutput("这是一段普通文字回复")
      2. 验证返回 [{type: "text", content: "这是一段普通文字回复"}]
    Expected Result: 降级为单条 text 消息
    Evidence: .sisyphus/evidence/task-8-pipeline-fallback.txt

  Scenario: 超过 3 条消息被截断
    Tool: Bash (vitest)
    Preconditions: 无
    Steps:
      1. parseAgentOutput 包含 5 条消息的 JSON
      2. 验证返回仅 3 条 (前 3 条)
    Expected Result: 截断到 3 条
    Evidence: .sisyphus/evidence/task-8-pipeline-limit.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(wechat): implement multi-message output pipeline`
  - Files: `wechat/messagePipeline.ts`
  - Pre-commit: `vitest run`

---

- [x] 9. DeepSeek Client 重构 (skill-aware)

  **What to do**:
  - 重写 `apps/diceshock/src/server/apis/wechat/deepseekClient.ts`:
    - `chatWithAgent(c, params)` 新签名:
      - `params.userMessage`: string
      - `params.openId`: string
      - `params.skill`: SkillDefinition
      - `params.conversationHistory`: ChatMessage[]
      - `params.ragContext?`: string
      - `params.memory?`: string (Mem0 搜索结果)
    - System prompt 组装: `BASE_SYSTEM_PROMPT + skill.systemPrompt + memory + ragContext`
    - Tools 列表来自 `skill.tools`
    - 返回值改为 `{ rawOutput: string, tokensUsed: number }`
      - rawOutput 是 agent 的原始文本输出 (JSON string, 由 messagePipeline 解析)
    - 保持: CF AI Gateway 路由, 最多 3 轮 tool call, token 记录
    - 新增: 告知 agent 输出 JSON 格式 (在 system prompt 末尾加指令)

  **Must NOT do**:
  - 不改变 API endpoint 或认证方式
  - 不修改 tool call 执行逻辑 (仍由 executeTool 处理)
  - 不硬编码任何 skill 内容

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心 LLM 交互逻辑重构, 需要正确组装 prompt 和管理对话流
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-8, 10)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 6, 7

  **References**:
  - `apps/diceshock/src/server/apis/wechat/deepseekClient.ts` — 完整现有实现, 在此基础上重构
  - `apps/diceshock/src/server/apis/wechat/skills/index.ts` — BASE_SYSTEM_PROMPT, SkillDefinition
  - `apps/diceshock/src/server/apis/wechat/conversationContext.ts` — getRecentHistory 返回格式
  - `apps/diceshock/src/server/apis/wechat/memory.ts` — searchMemory 返回格式

  **Acceptance Criteria**:
  - [ ] chatWithAgent 接受新参数结构
  - [ ] system prompt 由 base + skill + memory + rag 组合
  - [ ] tools 来自 skill.tools (非硬编码)
  - [ ] 输出为原始 JSON string (不预解析)
  - [ ] 保持 AI Gateway 路由和 token 记录

  **QA Scenarios**:
  ```
  Scenario: Skill-aware prompt 组装
    Tool: Bash (vitest)
    Preconditions: Mock fetch (DeepSeek API)
    Steps:
      1. 调用 chatWithAgent 传入 boardgame skill
      2. 捕获发送给 DeepSeek 的 messages[0] (system)
      3. 验证 system content 包含 BASE_SYSTEM_PROMPT + boardgame skill prompt
      4. 验证 tools 为 boardgame skill 的 tools
    Expected Result: prompt 正确组装, tools 正确传递
    Evidence: .sisyphus/evidence/task-9-skill-prompt.txt

  Scenario: 对话历史注入
    Tool: Bash (vitest)
    Preconditions: Mock fetch
    Steps:
      1. 传入 conversationHistory = [{role:"user",content:"之前的问题"}, {role:"assistant",content:"之前的回答"}]
      2. 验证 DeepSeek 收到的 messages 包含历史 + 当前消息
    Expected Result: 历史消息正确注入到对话中
    Evidence: .sisyphus/evidence/task-9-history-inject.txt

  Scenario: JSON 输出指令
    Tool: Bash (vitest)
    Preconditions: Mock fetch
    Steps:
      1. 验证 system prompt 末尾包含 JSON 输出格式指令
      2. Mock DeepSeek 返回有效 JSON string
      3. 验证 rawOutput 为该 JSON string
    Expected Result: agent 被指示输出 JSON, rawOutput 透传
    Evidence: .sisyphus/evidence/task-9-json-output.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(wechat): refactor DeepSeek client to be skill-aware`
  - Files: `wechat/deepseekClient.ts`
  - Pre-commit: `vitest run`

---

- [x] 10. 错误/状态提示模块

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/statusMessages.ts`:
    - `STATUS_MESSAGES` 常量:
      - `THINKING`: "正在思考中..."
      - `QUERYING_INVENTORY`: "正在查询桌游库存..."
      - `QUERYING_ACTIVE`: "正在查询约局信息..."
      - `QUERYING_MAHJONG`: "正在查询日麻数据..."
      - `QUERYING_MEMBERSHIP`: "正在查询会员信息..."
      - `QUERYING_EVENT`: "正在查询活动信息..."
    - `ERROR_MESSAGES` 常量:
      - `SERVER_ERROR`: "服务端错误, 请联系管理员\n微信: diceshock_admin"
      - `BUSY`: "当前服务繁忙, 请稍后再试\n微信: diceshock_admin"
      - `RATE_LIMITED`: "今日咨询次数已达上限, 明天再来吧~\n如有紧急问题请联系: diceshock_admin"
      - `TEXT_ONLY`: "目前只支持文字消息哦~ 请发送文字描述你的问题"
      - `AI_UNAVAILABLE`: "AI 服务暂时不可用, 请稍后再试\n如有紧急问题请联系: diceshock_admin"
    - `getToolStatusMessage(toolName)`: 根据工具名返回对应状态提示
    - `CONTACT_INFO`: "微信: diceshock_admin"

  **Must NOT do**:
  - 不实现发送逻辑 (仅提供消息文本常量)
  - 联系方式硬编码 (简单直接)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯常量定义, 10 分钟完成
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-9)
  - **Blocks**: Task 17
  - **Blocked By**: None

  **References**:
  - `apps/diceshock/src/server/apis/wechat/messageHandler.ts:9` — 现有 TYPING_REPLY 常量

  **Acceptance Criteria**:
  - [ ] STATUS_MESSAGES 和 ERROR_MESSAGES 导出
  - [ ] 所有错误消息包含联系方式
  - [ ] getToolStatusMessage 覆盖所有工具名

  **QA Scenarios**:
  ```
  Scenario: 状态消息完整性
    Tool: Bash (grep)
    Preconditions: statusMessages.ts 已创建
    Steps:
      1. 确认 STATUS_MESSAGES 至少包含 6 条
      2. 确认 ERROR_MESSAGES 至少包含 5 条
      3. 所有 ERROR_MESSAGES 包含 "diceshock_admin"
    Expected Result: 消息完整, 联系方式存在
    Evidence: .sisyphus/evidence/task-10-status-msgs.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(wechat): add status and error message constants`
  - Files: `wechat/statusMessages.ts`
  - Pre-commit: `tsc --noEmit`

---

- [x] 11. Skill 账号 + 工具实现

  **What to do**:
  - 实现 `apps/diceshock/src/server/apis/wechat/skills/account.ts`:
    - systemPrompt: 账号相关查询助手角色 (昵称/名片/手机/通行证/储值/会员计划/扫码/桌台)
    - keywords: ["昵称", "名片", "手机", "绑定", "通行证", "储值", "会员", "余额", "注册", "扫码", "桌台", "我的"]
    - tools:
      - `query_membership_status` (改造现有): 查通行证 + 储值余额
      - `query_all_membership_plans`: 查所有会员计划方案 (public pricing)
      - `query_my_active_table`: 查当前用户占用的桌台
      - `get_user_profile`: 获取用户昵称/uid 信息
      - `get_my_business_card`: 获取我的名片
    - 所有工具返回附带相关链接: `/me`, 对应桌台链接 `/t/:code`
  - 实现工具函数: 复用 D1 查询逻辑 (参考现有 tools.ts + trpc routers)
  - 对于需要写操作的请求 (修改昵称/绑定手机): 返回引导用户前往 `/me` 页面的链接

  **Must NOT do**:
  - 不执行任何 mutation (修改昵称/绑定手机 → 返回链接引导)
  - 不暴露 admin/staff 功能
  - systemPrompt 不超过 2000 tokens

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 5 个工具实现 + D1 查询逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12-16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools.ts:141-234` — 现有 queryMembershipStatus 实现, 直接复用/改造
  - `apps/diceshock/src/server/apis/trpc/membershipPlans.ts:64-72` — getMyPlans 查询逻辑
  - `apps/diceshock/src/server/apis/trpc/tables.ts:211-223` — getMyActiveOccupancy 查询逻辑
  - `apps/diceshock/src/server/apis/trpc/businessCard.ts:14-23` — getMyBusinessCard 查询逻辑
  - `apps/diceshock/src/server/apis/wechat/linkRegistry.ts` — SITE_LINKS.me(), SITE_LINKS.table(code)

  **Acceptance Criteria**:
  - [ ] account skill 注册到 skillRegistry
  - [ ] 5 个工具全部实现并可执行
  - [ ] 所有工具返回包含相关 links
  - [ ] 修改类请求返回页面链接引导

  **QA Scenarios**:
  ```
  Scenario: 会员状态查询
    Tool: Bash (vitest + miniflare D1)
    Preconditions: D1 中有测试用户的 membership 数据
    Steps:
      1. executeTool("query_membership_status", {}, "test-openid")
      2. 验证返回包含 stored_value 和 time_plans
      3. 验证返回包含 links: [{url: "https://diceshock.com/me", ...}]
    Expected Result: 数据正确, 链接存在
    Evidence: .sisyphus/evidence/task-11-account-membership.txt

  Scenario: 修改昵称 → 返回链接
    Tool: Bash (vitest)
    Preconditions: 用户说 "我要改昵称"
    Steps:
      1. skill systemPrompt 指导 agent 返回链接引导
      2. 验证 agent 不调用任何 mutation 工具
    Expected Result: 返回 /me 页面链接, 不执行修改
    Evidence: .sisyphus/evidence/task-11-account-nowrite.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(wechat): implement account skill with 5 tools`
  - Files: `wechat/skills/account.ts`, `wechat/tools/account.ts`
  - Pre-commit: `vitest run`

---

- [x] 12. Skill 桌游 + 工具实现

  **What to do**:
  - 实现 `apps/diceshock/src/server/apis/wechat/skills/boardgame.ts`:
    - systemPrompt: 桌游查询助手 (库存/搜索/详情/推荐/筛选)
    - keywords: ["桌游", "游戏", "库存", "在架", "几人", "推荐", "规则", "攻略", "人数"]
    - tools:
      - `query_board_game_inventory` (改造现有): 按名称模糊搜索, 返回增强结果 (含链接)
      - `query_board_game_count`: 查库存总数/在架数/最新入库日期
      - `query_board_game_detail`: 按 ID 查详情 (名称/人数/评分/标签等)
      - `query_board_game_filter`: 按人数/标签筛选桌游列表
    - 链接: `/inventory`, `/inventory/:id`

  **Must NOT do**:
  - 不实现推荐算法 (仅基于筛选条件)
  - systemPrompt 不超过 2000 tokens

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13-16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools.ts:73-118` — 现有 queryBoardGameInventory, 改造扩展
  - `apps/diceshock/src/server/apis/trpc/owned.ts:7-105` — get (筛选), getCount, getById 完整实现
  - `libs/db/src/schema.ts` — boardGamesTable 字段定义

  **Acceptance Criteria**:
  - [ ] 4 个工具全部实现
  - [ ] 搜索支持中文和英文名模糊匹配
  - [ ] 筛选支持人数和标签
  - [ ] 所有结果附带库存页/详情页链接

  **QA Scenarios**:
  ```
  Scenario: 桌游搜索
    Tool: Bash (vitest + miniflare D1)
    Preconditions: D1 中有 "卡坦岛" 桌游数据
    Steps:
      1. executeTool("query_board_game_inventory", {name: "卡坦"})
      2. 验证返回包含卡坦岛
      3. 验证返回包含 links: [{url: ".../inventory/xxx"}]
    Expected Result: 搜索成功, 含详情页链接
    Evidence: .sisyphus/evidence/task-12-boardgame-search.txt

  Scenario: 按人数筛选
    Tool: Bash (vitest + miniflare D1)
    Preconditions: D1 中有不同人数的桌游
    Steps:
      1. executeTool("query_board_game_filter", {numOfPlayers: 4})
      2. 验证返回的所有桌游 player_num 包含 4
    Expected Result: 筛选结果正确
    Evidence: .sisyphus/evidence/task-12-boardgame-filter.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(wechat): implement boardgame skill with search and filter tools`
  - Files: `wechat/skills/boardgame.ts`, `wechat/tools/boardgame.ts`
  - Pre-commit: `vitest run`

---

- [x] 13. Skill 日麻 + 工具实现

  **What to do**:
  - 实现 `apps/diceshock/src/server/apis/wechat/skills/mahjong.ts`:
    - systemPrompt: 日麻数据查询助手 (排行/战绩/PP/徽章)
    - keywords: ["日麻", "麻将", "排行", "PP", "战绩", "对局", "排名", "徽章", "榜"]
    - tools:
      - `query_leaderboard`: 查公共排行榜 (category + period)
      - `query_my_rankings`: 查当前用户所有排名
      - `query_my_match_history`: 查我的对局历史 (分页)
      - `query_my_pp_stats`: 查我的 PP 统计
      - `query_my_badges`: 查我的徽章
    - 链接: `/riichi`, `/my-riichi`, `/my-riichi/:id`

  **Must NOT do**:
  - 不暴露 GSZ 注册功能 (需要 SMS 验证, 不适合 agent)
  - 不暴露 staff-only 的 gsz/gszManagement router

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-12, 14-16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/server/apis/trpc/leaderboard.ts:23-302` — 完整排行榜/战绩/PP/徽章查询
  - `apps/diceshock/src/server/apis/trpc/mahjong.ts:63-80` — getMyMatches 查询
  - `apps/diceshock/src/shared/mahjong/pp.ts` — PP 计算逻辑参考

  **Acceptance Criteria**:
  - [ ] 5 个工具全部实现
  - [ ] 排行榜支持按 category 和 period 查询
  - [ ] 战绩历史支持分页
  - [ ] 所有结果附带日麻页/对局详情链接

  **QA Scenarios**:
  ```
  Scenario: 排行榜查询
    Tool: Bash (vitest + miniflare D1)
    Preconditions: D1 中有 leaderboard snapshot 数据
    Steps:
      1. executeTool("query_leaderboard", {category: "store_4p_hanchan", period: "week"})
      2. 验证返回排行列表 (entries)
      3. 验证附带 /riichi 链接
    Expected Result: 排行数据正确, 链接存在
    Evidence: .sisyphus/evidence/task-13-mahjong-leaderboard.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(wechat): implement mahjong skill with leaderboard and stats tools`
  - Files: `wechat/skills/mahjong.ts`, `wechat/tools/mahjong.ts`
  - Pre-commit: `vitest run`

---

- [x] 14. Skill 约局 + 工具实现

  **What to do**:
  - 实现 `apps/diceshock/src/server/apis/wechat/skills/active.ts`:
    - systemPrompt: 约局查询助手 (查看/创建引导)
    - keywords: ["约局", "组局", "报名", "参加", "拼桌", "一起玩"]
    - tools:
      - `query_actives_list`: 查约局列表 (支持日期筛选: today/week/month)
      - `query_active_detail`: 查单个约局详情 (参与者/桌游/时间)
      - `query_active_notifications`: 查询用户参与的约局 (通知场景)
    - 对于创建约局: 返回 `/actives/new` 链接引导
    - 对于加入约局: 返回 `/actives/:id` 链接引导
    - 链接: `/actives`, `/actives/:id`, `/actives/new`

  **Must NOT do**:
  - 不通过 agent 创建或加入约局 (mutation → 链接)
  - 不暴露其他用户的名片/联系方式

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-13, 15-16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/server/apis/trpc/actives.ts:62-185` — list (分页/筛选), getById 完整实现
  - `libs/db/src/schema.ts` — activesTable, activeRegistrationsTable 结构

  **Acceptance Criteria**:
  - [ ] 3 个查询工具实现
  - [ ] 列表支持日期范围筛选
  - [ ] 创建/加入请求返回链接引导
  - [ ] 所有结果附带约局页链接

  **QA Scenarios**:
  ```
  Scenario: 约局列表查询
    Tool: Bash (vitest + miniflare D1)
    Preconditions: D1 中有本周约局数据
    Steps:
      1. executeTool("query_actives_list", {dateRange: "week"})
      2. 验证返回约局列表
      3. 验证附带 /actives 和各 /actives/:id 链接
    Expected Result: 列表正确, 链接完整
    Evidence: .sisyphus/evidence/task-14-active-list.txt

  Scenario: 创建约局 → 返回链接
    Tool: Bash (vitest)
    Preconditions: 用户说 "我想约一局卡坦"
    Steps:
      1. 验证 agent 不调用任何 create mutation
      2. 验证响应包含 /actives/new 链接
    Expected Result: 引导用户去页面创建, 不直接创建
    Evidence: .sisyphus/evidence/task-14-active-nowrite.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(wechat): implement active (meetup) skill with query tools`
  - Files: `wechat/skills/active.ts`, `wechat/tools/active.ts`
  - Pre-commit: `vitest run`

---

- [x] 15. Skill 活动 + 工具实现

  **What to do**:
  - 实现 `apps/diceshock/src/server/apis/wechat/skills/event.ts`:
    - systemPrompt: 活动/新闻查询助手
    - keywords: ["活动", "新闻", "公告", "通知", "最近"]
    - tools:
      - `query_events_list`: 查已发布活动列表
      - `query_event_detail`: 查单个活动详情 (content)
    - 链接: `/events/:id`
    - 活动 cover_image_url 作为 img type 消息返回 (如果有)

  **Must NOT do**:
  - 不暴露未发布活动
  - 不暴露 staff event management

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-14, 16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/server/apis/trpc/events.ts:4-27` — list + getById 完整实现 (非常简单)
  - `libs/db/src/schema.ts` — eventsTable 字段 (title, description, cover_image_url, content, is_published)

  **Acceptance Criteria**:
  - [ ] 2 个工具实现
  - [ ] 仅返回 is_published=true 的活动
  - [ ] 有 cover_image_url 时以 img type 返回
  - [ ] 附带活动详情页链接

  **QA Scenarios**:
  ```
  Scenario: 活动列表查询
    Tool: Bash (vitest + miniflare D1)
    Preconditions: D1 中有 2 个已发布 + 1 个未发布活动
    Steps:
      1. executeTool("query_events_list", {})
      2. 验证仅返回 2 个已发布活动
      3. 验证附带 /events/:id 链接
    Expected Result: 仅已发布活动, 链接正确
    Evidence: .sisyphus/evidence/task-15-event-list.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(wechat): implement event skill with query tools`
  - Files: `wechat/skills/event.ts`, `wechat/tools/event.ts`
  - Pre-commit: `vitest run`

---

- [x] 16. TOTP 验证码工具 (异步图片生成)

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/tools/totp.ts`:
    - `generateTotpMessage(c, openId)`: 
      - 从 D1/KV 获取用户的 TOTP secret
      - 计算当前 TOTP code + 剩余有效秒数
      - 如果剩余时间 < 配置参数 (如 10s), 等待下一个周期
      - 通过 IMAGE_QUEUE 生成 TOTP 展示图片 (QR code + 验证码 + 剩余时间)
      - 返回 `TotpMessage` type
    - 使用现有 `src/shared/utils/totp.ts` 的 TOTP 逻辑
    - 图片生成: 提交 `html2image` 任务到 IMAGE_QUEUE, 等待完成, 返回 R2 URL

  **Must NOT do**:
  - 不重新实现 TOTP 算法 (使用 shared/utils/totp.ts)
  - 不在 agent 内直接返回文字验证码 (必须图片化展示)
  - 不暴露 TOTP secret

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 TOTP 计算 + 异步图片生成 + 队列交互
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-15)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/diceshock/src/shared/utils/totp.ts` — TOTP 算法实现
  - `apps/diceshock/src/server/apis/wechat/membershipCard.tsx:1-50` — IMAGE_QUEUE 使用模式 (submit + poll KV)
  - `apps/diceshock/src/server/apis/trpc/auth.ts:326` — getTotpSecret 获取用户 TOTP secret
  - `apps/diceshock/src/server/apis/wechat/types.ts` — TotpMessage type

  **Acceptance Criteria**:
  - [ ] generateTotpMessage 返回 TotpMessage
  - [ ] 剩余时间不足时等待下一周期
  - [ ] 图片通过 IMAGE_QUEUE 生成
  - [ ] 不在文本中暴露 TOTP secret 或 raw code

  **QA Scenarios**:
  ```
  Scenario: TOTP 图片生成
    Tool: Bash (vitest)
    Preconditions: Mock KV (TOTP secret), Mock IMAGE_QUEUE
    Steps:
      1. Mock 用户有 TOTP secret
      2. generateTotpMessage(openId)
      3. 验证 IMAGE_QUEUE.send 被调用
      4. Mock 图片生成完成 (KV status = done)
      5. 验证返回 TotpMessage 包含 qrcode_url, code, remaining_seconds
    Expected Result: 完整流程成功, 返回格式正确
    Evidence: .sisyphus/evidence/task-16-totp-generate.txt

  Scenario: 剩余时间不足等待下一周期
    Tool: Bash (vitest)
    Preconditions: Mock 当前 TOTP 剩余 5s (< 阈值 10s)
    Steps:
      1. 模拟当前 code 剩余 5s
      2. generateTotpMessage 应使用下一周期的 code
      3. remaining_seconds 应接近 30s (新周期)
    Expected Result: 使用下一周期 code, 保证足够展示时间
    Evidence: .sisyphus/evidence/task-16-totp-nextcycle.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(wechat): implement TOTP display tool with async image generation`
  - Files: `wechat/tools/totp.ts`
  - Pre-commit: `vitest run`

---

- [x] 17. 主消息处理器重构 (串联所有模块)

  **What to do**:
  - 重写 `apps/diceshock/src/server/apis/wechat/messageHandler.ts`:
    - `handleTextMessage(c, msg)` 新流程:
      1. 提取 openId, content
      2. MsgId 去重检查 (Task 4)
      3. Rate limit 检查 (保持现有)
      4. 立即返回 "收到" ack (buildTextReply)
      5. `ctx.waitUntil(processMessage(c, openId, content))`
    - `processMessage(c, openId, content)` 异步流程:
      1. `getRecentHistory(c, openId)` → 对话历史 (Task 6)
      2. `searchMemory(c, openId, content)` → 用户记忆 (Task 7)
      3. `detectIntent(content, history)` → 意图路由 (Task 5)
      4. `getSkillById(intent.skillId)` → 加载 skill (Task 3)
      5. `sendStatusMessage(c, openId, toolStatus)` (Task 10) — 可选, 在工具调用时
      6. `searchKnowledgeBase(c, content)` → RAG (保持现有)
      7. `chatWithAgent(c, {...})` → LLM 调用 (Task 9)
      8. `recordTokenUsage(c, openId, tokens)` (保持)
      9. `parseAgentOutput(rawOutput)` → AgentMessage[] (Task 8)
      10. `dispatchMessages(c, openId, messages)` → 逐条发送 (Task 8)
      11. `saveMessage(c, openId, "user", content)` (Task 6)
      12. `saveMessage(c, openId, "assistant", rawOutput)` (Task 6)
      13. `addMemory(c, openId, [...])` — 条件性, 由输出决定 (Task 7)
    - 保持 `handleMenuEvent` 不变 (现有菜单事件处理)
    - 错误处理: 任何环节失败 → 发送 ERROR_MESSAGES 对应错误 (Task 10)
  - 更新 `apps/diceshock/src/server/apis/wechat/index.ts`:
    - 加入 MsgId 去重逻辑
    - 非文本消息 → 返回 TEXT_ONLY 提示
  - 清理旧的 `processAndReplyAsync` (被新 processMessage 替代)

  **Must NOT do**:
  - 不改变 WeChat verify 逻辑
  - 不改变 crypto/xmlUtils (保持)
  - 不改变 wechatApi.ts (保持)
  - 不处理非文本消息 (图片/语音/视频)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心编排逻辑, 串联所有模块, 错误处理复杂
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 4)
  - **Blocks**: Tasks 18, 19
  - **Blocked By**: Tasks 4, 5, 6, 7, 8, 9, 10, 11-16

  **References**:
  - `apps/diceshock/src/server/apis/wechat/messageHandler.ts` — 现有实现, 在此基础上重构
  - `apps/diceshock/src/server/apis/wechat/index.ts` — 消息入口, 需增加 dedup + 非文本处理
  - 所有 Wave 1-3 task 的输出模块

  **Acceptance Criteria**:
  - [ ] 完整消息处理流程: dedup → rate limit → ack → 意图 → skill → LLM → parse → dispatch
  - [ ] 非文本消息返回友好提示
  - [ ] 错误时发送含联系方式的错误消息
  - [ ] 对话历史正确保存 (user + assistant)
  - [ ] 所有导入/依赖无编译错误

  **QA Scenarios**:
  ```
  Scenario: 完整消息处理流程 (happy path)
    Tool: Bash (vitest)
    Preconditions: 全量 mock (DeepSeek, WeChat API, D1, KV, Mem0)
    Steps:
      1. 模拟用户发送 "桌游库存有卡坦岛吗"
      2. 验证: dedup check → rate limit → ack sent → intent=boardgame
      3. 验证: skill loaded → chatWithAgent called with boardgame skill
      4. Mock DeepSeek 返回 JSON 多条消息
      5. 验证: parseAgentOutput → dispatchMessages (逐条发送)
      6. 验证: D1 中保存了 user + assistant 消息
    Expected Result: 全流程串联成功
    Evidence: .sisyphus/evidence/task-17-full-flow.txt

  Scenario: 非文本消息拒绝
    Tool: Bash (vitest)
    Preconditions: Mock WeChat API
    Steps:
      1. 模拟收到 msgType="image" 的消息
      2. 验证返回 TEXT_ONLY 提示
      3. 验证不触发 processMessage
    Expected Result: 友好拒绝, 不处理
    Evidence: .sisyphus/evidence/task-17-non-text.txt

  Scenario: DeepSeek 超时错误处理
    Tool: Bash (vitest)
    Preconditions: Mock DeepSeek 超时
    Steps:
      1. Mock chatWithAgent 抛出超时错误
      2. 验证用户收到 AI_UNAVAILABLE 错误消息
      3. 验证错误消息包含联系方式
    Expected Result: 优雅降级, 用户得到通知
    Evidence: .sisyphus/evidence/task-17-error-handling.txt
  ```

  **Commit**: YES
  - Message: `feat(wechat): refactor message handler to orchestrate full agent pipeline`
  - Files: `wechat/messageHandler.ts`, `wechat/index.ts`
  - Pre-commit: `vitest run`

---

- [x] 18. 完整测试套件

  **What to do**:
  - 新建 `apps/diceshock/src/server/apis/wechat/__tests__/` 目录:
    - `intentRouter.test.ts` — 意图路由测试 (所有关键词, 上下文延续, 边界)
    - `conversationContext.test.ts` — 对话历史 CRUD + 归档 + 截断
    - `memory.test.ts` — Mem0 集成 (search/add/降级/上限)
    - `messagePipeline.test.ts` — JSON 解析 + 分发 + 降级 + 上限
    - `deepseekClient.test.ts` — prompt 组装 + tool calling loop + 超时
    - `dedup.test.ts` — MsgId 去重 (正常/重复/过期)
    - `tools/account.test.ts` — 账号工具 (membership/table/profile/card)
    - `tools/boardgame.test.ts` — 桌游工具 (search/filter/count/detail)
    - `tools/mahjong.test.ts` — 日麻工具 (leaderboard/rankings/history/stats)
    - `tools/active.test.ts` — 约局工具 (list/detail/notifications)
    - `tools/event.test.ts` — 活动工具 (list/detail)
    - `integration.test.ts` — 端到端集成测试 (全流程)
  - Mock 策略:
    - `vi.mock("mem0ai")` — mock MemoryClient
    - Mock fetch for DeepSeek API
    - 使用 miniflare 提供 D1/KV/R2 测试环境
    - Mock IMAGE_QUEUE.send
  - 覆盖率目标: 所有工具 + 核心管线 + 边界场景

  **Must NOT do**:
  - 不依赖任何真实外部 API (DeepSeek, WeChat, Mem0, GSZ)
  - 不跳过边界场景 (空输入, 超时, API 错误)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 大量测试文件, 需要覆盖所有模块
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 19)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Task 17

  **References**:
  - `vitest.config.ts` — 项目 vitest 配置
  - `apps/diceshock/src/shared/mahjong/__tests__/engine.test.ts` — 现有测试模式参考
  - 所有 Task 1-17 的 QA Scenarios — 可直接转化为测试用例

  **Acceptance Criteria**:
  - [ ] 12+ 测试文件
  - [ ] `vitest run` 全部通过
  - [ ] 覆盖: 正常流程 + 错误降级 + 边界场景
  - [ ] 无真实 API 调用

  **QA Scenarios**:
  ```
  Scenario: 全部测试通过
    Tool: Bash
    Preconditions: 所有模块已实现
    Steps:
      1. 运行 `vitest run --reporter=verbose`
      2. 验证 0 failures
      3. 检查测试数量 >= 40
    Expected Result: All tests pass, no failures
    Evidence: .sisyphus/evidence/task-18-test-results.txt

  Scenario: 集成测试覆盖完整流程
    Tool: Bash
    Preconditions: integration.test.ts 存在
    Steps:
      1. 运行 `vitest run integration.test.ts`
      2. 验证覆盖: text message → full pipeline → multi-message dispatch
      3. 验证覆盖: dedup, rate limit, error, non-text rejection
    Expected Result: 集成测试覆盖所有主要场景
    Evidence: .sisyphus/evidence/task-18-integration.txt
  ```

  **Commit**: YES
  - Message: `test(wechat): add comprehensive test suite for refactored agent`
  - Files: `wechat/__tests__/*.ts`
  - Pre-commit: `vitest run`

---

- [x] 19. Rate limiter 适配 + 清理旧代码

  **What to do**:
  - 审查 `rateLimit.ts`: 确保与新流程兼容 (无需大改)
  - 删除旧的 `tools.ts` 中的硬编码 TOOLS 数组 (已被 skills 替代)
  - 确保旧文件中不再有孤立引用
  - 更新 `apps/diceshock/src/server/apis/wechat/` barrel export (如有)
  - 确保 `tsc --noEmit` 无错误
  - 确保 `biome check` 无 lint 错误

  **Must NOT do**:
  - 不删除 crypto.ts, xmlUtils.ts, wechatApi.ts (仍被使用)
  - 不删除 membershipCard.tsx (菜单事件仍使用)
  - 不修改 rateLimit 的限制值

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 清理工作, 删除旧代码, 确保编译通过
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 18)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Task 17

  **References**:
  - `apps/diceshock/src/server/apis/wechat/tools.ts` — 旧 TOOLS 定义, 需评估是否完全删除
  - `apps/diceshock/src/server/apis/wechat/rateLimit.ts` — 确认兼容性

  **Acceptance Criteria**:
  - [ ] 无孤立文件/未使用 import
  - [ ] `tsc --noEmit` 0 errors
  - [ ] `biome check` 0 issues
  - [ ] 旧 TOOLS 硬编码已移除

  **QA Scenarios**:
  ```
  Scenario: 编译和 lint 通过
    Tool: Bash
    Preconditions: 所有重构完成
    Steps:
      1. `tsc --noEmit` → 0 errors
      2. `biome check apps/diceshock/src/server/apis/wechat/` → 0 issues
      3. `vitest run` → all pass (确认未破坏)
    Expected Result: 零编译/lint 错误, 测试全过
    Evidence: .sisyphus/evidence/task-19-cleanup.txt
  ```

  **Commit**: YES
  - Message: `refactor(wechat): clean up legacy tools and adapt rate limiter`
  - Files: `wechat/tools.ts` (deleted/modified), various imports
  - Pre-commit: `tsc --noEmit && biome check`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + biome lint + `vitest run`. Review all changed files for: `as any`, empty catches, console.log in prod, commented-out code, unused imports. Check for over-abstraction and generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task using vitest. Test cross-task integration. Test edge cases: empty state, invalid input, concurrent messages, timeout, Mem0 down.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| Wave | Commit | Message | Files |
|------|--------|---------|-------|
| 1 | 1 | `feat(wechat): add conversation schema and message type definitions` | schema, types, dedup |
| 2 | 2 | `feat(wechat): implement agent core engine (router, context, mem0, pipeline)` | router, context, mem0, pipeline, deepseek |
| 3 | 3 | `feat(wechat): implement all skills and tools (account, boardgame, mahjong, active, event)` | skills/, tools/ |
| 4 | 4 | `feat(wechat): integrate agent pipeline and add test suite` | messageHandler, tests |

---

## Success Criteria

### Verification Commands
```bash
vitest run --reporter=verbose  # Expected: all tests pass
tsc --noEmit  # Expected: 0 errors
biome check apps/diceshock/src/server/apis/wechat/  # Expected: 0 issues
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Agent handles 5s timeout correctly
- [ ] MsgId dedup works
- [ ] Multi-message JSON correctly parsed and dispatched
- [ ] Conversation context preserved across messages within 12h
- [ ] Mem0 graceful degradation (works when Mem0 is down)
- [ ] R2 archival triggers on write
- [ ] Every tool response includes relevant page URL
