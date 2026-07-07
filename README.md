<div align="center">
  <img src="https://assets.runespark.fun/images/diceshock.favicon.svg" alt="Diceshock Logo" width="120" height="120">
  <h1>Diceshock Behover</h1>
  <p>桌游店管理系统 — 基于 Cloudflare Workers 全栈应用</p>
</div>

## 项目简介

Diceshock 是一套面向桌游店的全栈 SaaS 系统，部署在 Cloudflare Workers 上。涵盖桌台计时计费、会员储值、日麻数据对接、桌游库存管理、活动发布、微信服务号 AI 客服等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Cloudflare Workers |
| 后端框架 | Hono |
| 前端 | React 19 + TanStack Router + TailwindCSS + daisyUI |
| 状态管理 | Jotai |
| API 层 | GraphQL (Pothos schema-builder + Apollo Client + GraphQL Subscriptions via Durable Objects) |
| 数据库 | Cloudflare D1 (SQLite) + Drizzle ORM |
| 存储 | Cloudflare R2 (媒体/图片/桌游库) |
| 缓存 | Cloudflare KV |
| 异步任务 | Cloudflare Queues (图片处理、通知推送、爬虫) |
| AI | DeepSeek V4 (AI SDK) + Workers AI + AI Search |
| 浏览器渲染 | Cloudflare Browser Rendering (OG 卡片生成) |
| 实时通信 | Durable Objects (PubSub + Subscriptions) |
| 认证 | Auth.js + 微信 OAuth + 短信验证码 |
| 国际化 | i18next (zh-CN / en / de / ja) |
| 构建 | Vite 8 + Nx |
| 代码规范 | Biome |
| 测试 | Vitest (单元) + Playwright (E2E) |
| 包管理 | pnpm workspaces |

## 项目结构

```
diceshock-behover/
├── apps/
│   └── diceshock/          # 主应用 (全栈 Worker)
│       ├── src/
│       │   ├── server/     # Hono 路由、GraphQL resolvers、中间件、Durable Objects
│       │   ├── client/     # React 组件、hooks、GraphQL operations
│       │   ├── shared/     # i18n、工具函数、计价逻辑
│       │   └── apps/routers/  # TanStack Router 页面
│       ├── e2e/            # Playwright E2E 测试
│       └── tests/          # Vitest 单元测试
├── libs/
│   ├── db/                 # Drizzle schema + 共享数据库逻辑
│   └── utils/              # 通用工具库
├── plugins/                # 自定义 Vite 插件 (日志、命令监听)
├── scripts/                # 数据迁移、爬虫、种子脚本
└── drizzle/                # D1 数据库迁移文件
```

## 核心功能

- **桌台管理**: 开台/暂停/结台、实时计时、多桌并行、QR 扫码入座
- **计费系统**: 30 分钟梯度计费、多套定价方案 (工作日/假日/夜间)、实时价格计算
- **会员体系**: 储值余额、月卡/年卡、会员等级、充值赠送
- **批量结算**: 多单合并结算、储值抵扣、自定义金额
- **日麻对接**: 全国日麻公式站 (GSZ) 数据同步、战绩统计、排行榜
- **桌游库存**: 游戏信息管理、推荐、分类、BGG 数据
- **活动系统**: 活动发布、报名、签到
- **微信 AI 客服**: DeepSeek V4 Flash 驱动、工具调用 (查活动/库存/战绩)、多轮对话
- **微信登录**: 服务号静默登录、网页授权、PC 扫码登录
- **OG 卡片**: 各页面动态社交分享图 (Browser Rendering + R2 缓存)
- **后台 Dashboard**: 用户管理、订单管理、数据可视化 (ECharts)
- **国际化**: 中/英/德/日四语言支持

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 本地开发

```bash
pnpm dev
# 或
pnpm x diceshock:dev
```

### 构建

```bash
pnpm x diceshock:build
```

### 部署

```bash
pnpm deploy-diceshock
```

### 数据库迁移

```bash
# 生成迁移
pnpm drizzle

# 应用到远程 D1
cd apps/diceshock && npx wrangler d1 migrations apply diceshock --remote
```

### E2E 测试

```bash
pnpm test:e2e:diceshock
```

## 环境变量

复制 `.env.example` 到 `.env` 填入实际值。Workers secrets 通过 `wrangler secret put` 设置。

| 变量 | 说明 |
|------|------|
| `CLOUDFLARE_DATABASE_ID` | D1 数据库 ID |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `AUTH_SECRET` | Auth.js 签名密钥 |
| `WECHAT_MP_APP_ID` | 微信公众号 AppID |
| `WECHAT_MP_APP_SECRET` | 微信公众号 AppSecret |
| `WECHAT_MP_TOKEN` | 服务号消息验签 Token |
| `WECHAT_MP_ENCODING_AES_KEY` | 消息加解密密钥 |
| `WECHAT_OPEN_APP_ID` | 微信开放平台 AppID (PC 扫码) |
| `WECHAT_OPEN_APP_SECRET` | 微信开放平台 AppSecret |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `CF_AI_GATEWAY_ID` | Cloudflare AI Gateway ID |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | 阿里云短信 AccessKey |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | 阿里云短信 Secret |
| `CAPTCHA_PREFIX` | 阿里云验证码 SceneId |

## 配置文件

| 文件 | 用途 |
|------|------|
| `apps/diceshock/wrangler.toml` | Worker 配置、Bindings、Queues、Crons |
| `drizzle.config.ts` | Drizzle ORM 配置 |
| `tsconfig.base.json` | 全局 TypeScript 配置 |
| `biome.json` | 代码风格规则 |
| `nx.json` | Nx workspace 配置 |
