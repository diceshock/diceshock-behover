# Codex 交接说明 · 2026-11-22

> 给接手的 AI / 开发者：本文件自包含，读完这一份就能继续工作。
> 核实时间：2026-11-22（PR #20 仍 OPEN，`user_credentials` 仍为 0 条）。

---

## 一、项目是什么

**骰子奇兵（Diceshock）** —— 线下桌游/跑团门店的预约与管理平台。

| 部分 | 说明 |
|---|---|
| 后台 + 网站 | Cloudflare Workers（Hono + Vite + TanStack Router + React 19 + Apollo） |
| 小程序 | 微信小程序（TypeScript + weapp-vite） |
| 数据 | D1（SQLite）、KV、Durable Objects、R2、Queues |
| 仓库 | pnpm monorepo + nx |
| 本地路径 | `C:\Users\Administrator\Documents\ChatGPT\diceshock-behover` |
| 远程 | `https://github.com/diceshock/diceshock-behover.git`（`origin`） |

---

## 二、当前状态（务必先读）

### 已上线
- PR #19 已合并（`1dd19bd`）：后台登录三入口（账号密码 / 小程序扫码 / 微信）、`user_credentials` 表（迁移 0061）、扫码 `create→confirm→status→exchange`

### 待合并
- **PR #20**（OPEN，`feat/admin-set-password-and-miniapp-rule-filter`）
  - 用户详情页「登录密码」卡片（调用后端已有的 `setUserPassword`，仅管理员）
  - 小程序场次筛选「规则系统」改下拉（选项来自已加载场次的 `gameSystem` 去重）
  - CI 已通过（Workers Builds + CodeRabbit），已请求 @1216892614 review

### 待人工操作
- 小程序 **1.0.4 已上传**（218.8 KB，AppID `wx2dea4e74c1ecc1c5`），需在微信后台「版本管理」选为体验版
- **管理员密码仍未写入**（`user_credentials` 0 条）→ 后台密码登录不可用

### 阻塞点（最关键）

```
生产 D1 user_credentials 表：0 条记录
→ 账号密码登录必然失败
→ 需要「有生产写权限」的账号执行一条 INSERT
```

SQL 与执行方式见 `docs/handoff-set-admin-password.md`。

**当前登录身份的权限**：对生产 D1 **只读**（写操作返回 `code: 7500`）。

---

## 三、环境

| 环境 | 地址 | Cloudflare 账号 | 写权限 |
|---|---|---|---|
| 生产 | https://diceshock.com | `3244c8f91cd34317ce18652158e5853a`（Hndppt@outlook.com） | ❌ 只读 |
| 测试 | https://diceshock-test.gahontian.workers.dev | `a0c741a1c6cf7b582435fd16bbefc952`（Gahontian） | ✅ |
| 本地 | http://127.0.0.1:5173 | — | 本地 D1 |

生产配置文件：`apps/diceshock/wrangler.toml`；测试：`apps/diceshock/wrangler.test.toml`。

---

## 四、开发规范（摘自 AGENTS.md，必须遵守）

- `main` 受保护，禁止直接 push；从 `main` 拉功能分支；PR 标题用 Conventional Commits；至少 1 个 approval + 所有 checks 通过才能合并
- **开源项目，代码与配置禁止出现任何密钥/Token**（Workers secrets 用 `wrangler secret put`）
- Biome 是唯一 lint/format；pre-commit 会跑 `biome check --error-on-warnings .` + 三端 `tsc`
- 严禁 `any`、严禁 `@ts-ignore`（用 `@ts-expect-error` + 注释）
- GraphQL schema 用 Pothos 生成，不手写 SDL
- DB 变更只走 `drizzle/` 顺序迁移，已应用的迁移不可修改
- 不要手改生成文件：`worker-configuration.d.ts`、`routeTree.gen.ts`、`__generated__/`
- 测试文件放 `apps/diceshock/tests/`，镜像 `src/` 结构

---

## 五、已知坑（这几个月踩过的，别再踩）

1. **Windows 大小写冲突**：仓库里 `AGENTS.md` 与 `agents.md` 同时存在，Windows 上只有一个物理文件。**读规范必须用 `git show HEAD:AGENTS.md`**，直接读路径可能拿到空内容。
2. **迁移链断裂**：`drizzle/0043` 引用 `actives` 表，但没有任何迁移创建它。全新空库无法从 0000 迁到 0060。
3. **生产迁移记录漂移**：0053/0054 曾被手工执行但未登记，直接 `migrations apply` 会中断。先补 `d1_migrations` 记录。
4. **`@alicloud` SDK 不能打包进 Worker**：`@alicloud/captcha20230305` 面向 Node，Workers Builds 构建失败（本地侥幸能过）。验证码已改为 `fetch` + Web Crypto 直接调 API。
5. **pnpm 11 不读 `package.json` 的 `pnpm` 字段**：`allowBuilds` 配置在 `pnpm-workspace.yaml`；`@alicloud/openapi-core` 必须设为 `false`，否则它的 postinstall 会让 `pnpm install` 整体失败。
6. **Windows CRLF 导致 biome 全仓报错**：`git config core.autocrlf false` 并统一为 LF。
7. **pre-commit hook 找不到 `pnpm`**：本机需要一个 pnpm shim 加入 PATH。
8. **daisyUI v5** 移除了 `form-control` / `label-text`，用了不生效（表单间距会塌）。
9. **路由 locale 前缀**：无前缀路径会被 302 到 `/{store}-{locale}/...`，新增公开路由要放 `apps/diceshock/src/apps/routers/{-$storeLocale}/`。
10. **Auth.js cookie**：`__Secure-authjs.session-token` 只在 https 有效；本地 http 需用 `authjs.session-token`。
11. **`workers.dev` 国内不稳定**：手机端常打不开，需自定义域名或反代。
12. **登录会话与账号绑定**：三种登录方式分别按「手机号 / 小程序会话 / 微信 openid」找人，**没有跨渠道绑定**，同一个人可能被拆成多条 `user` 记录（详见第六节）。

---

## 六、账号现状（生产库实测）

管理员 `Gahon` 有 **3 条** user 记录：

| user.id | 绑定 | 手机号 | 角色 |
|---|---|---|---|
| `95f967e5-194d-46f8-84b2-159bffa7a90e` | `wechat-miniapp` | 176****3562 | admin |
| `47c74397-f62d-465c-bd31-14ad15dbcc12` | `wechat-open`（网页微信） | 无 | admin |
| `be382afc-a3f9-48ff-91f5-e5da34896162` | 无 | 无 | admin |

- 账号密码 / 小程序扫码 → 命中 `95f967e5`（有手机号）
- 网页微信登录 → 命中 `47c74397`（无手机号）

待写入的密码：`<管理员密码：见内部交接>`，对应 `95f967e5`（hash 见交接 SQL）。

---

## 七、下一步优先级

| 顺序 | 任务 | 前置 | 负责人 |
|---|---|---|---|
| 1 | 执行 SQL 写入管理员密码 | 需要生产写权限 | 伙伴或用户 |
| 2 | 合并 PR #20 | 需要 review | 伙伴 |
| 3 | 小程序 1.0.4 选为体验版 | 微信后台操作 | 用户 |
| 4 | 阶段 2：合并重复账号 | 先出清单、备份、测试环境演练 | 开发 |
| 5 | 阶段 3：权限判断统一 + 后端能力/前端入口对照 | — | 开发 |
| 6 | 阶段 4：拆大页面、统一数据层、类型收紧 | — | 开发 |

详细计划见 `docs/dev-plan-2026-11-20.md` 与 `docs/frontend-review-2026-11-20.md`。

---

## 八、常用命令

```bash
# 同步与分支
git fetch origin --prune
git checkout -b <feat/xxx> origin/main

# 构建 / 检查
pnpm --filter diceshock build
pnpm --filter diceshock exec tsc --noEmit -p tsconfig.json
pnpm exec biome check --error-on-warnings .
pnpm --filter diceshock-miniapp run typecheck
pnpm --filter diceshock-miniapp run build:release

# 数据库（生产只读）
cd apps/diceshock
CLOUDFLARE_ACCOUNT_ID=3244c8f91cd34317ce18652158e5853a \
  npx wrangler d1 execute diceshock --remote --config wrangler.toml --command "select 1"

# 小程序上传
"D:\微信web开发者工具\cli.bat" upload --project dist/miniapp-release -v 1.0.x -d "说明"
```

---

## 九、验证登录是否恢复（写密码后）

```bash
# 用手机号 + 密码请求登录，检查是否返回 role: admin
# 预期：/api/auth/session 返回 {"user":{...,"role":"admin"}}
```

或直接访问 https://diceshock.com/login，输入 `176****3562` / `<管理员密码：见内部交接>`。

---

## 十、工作方式约定（前任的习惯，供参考）

- 动代码前先 `git fetch origin --prune`，确认落后/领先，基线永远是 `origin/main`
- 改代码前读 `AGENTS.md`（用 `git show HEAD:AGENTS.md`）和同类文件当模板
- 每步给用户「能看懂的证据」：截图、真实接口返回、对比数据
- 验证优先用真实请求，不靠"应该能跑"
