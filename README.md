<div align="center">
  <img src="https://assets.runespark.fun/images/diceshock.favicon.svg" alt="Diceshock Logo" width="120" height="120">
  <h1>Diceshock Behover</h1>
  <p>A full-stack monorepo built on Cloudflare Workers using Hono, React, GraphQL, and Drizzle ORM.</p>
</div>

## Project Structure

```
diceshock-behover/
├── apps/
│   ├── runespark/      # Runespark app (GraphQL + React)
│   └── diceshock/      # Diceshock app
├── libs/
│   ├── db/             # Shared database library (Drizzle ORM)
│   └── utils/          # Utility functions library
├── plugins/            # Vite plugins
└── drizzle/            # Database migrations
```

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Frontend**: React 19 + TanStack Router
- **GraphQL**: Pothos + gqty + GraphQL Workers Subscriptions
- **Database**: Drizzle ORM + D1 (SQLite)
- **Build Tools**: Vite + Nx
- **Code Quality**: Biome
- **Package Manager**: pnpm (workspaces)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Run applications using Nx:

```bash
# Run runespark app
pnpm x runespark:dev

# Run diceshock app
pnpm x diceshock:dev
```

### Build

```bash
pnpm x runespark:build
pnpm x diceshock:build
```

### Preview

```bash
pnpm x runespark:preview
pnpm x diceshock:preview
```

### Deploy

```bash
pnpm x runespark:deploy
pnpm x diceshock:deploy
```

## Database

### Generate Migrations

```bash
pnpm drizzle
```

### Apply Migrations

```bash
# Apply subscriptions database migrations
pnpm x runespark:migrations:subscriptions
```

## Type Generation

### Cloudflare Workers Types

Generate types based on Worker configuration:

```bash
pnpm x runespark:cf-typegen
```

Use `CloudflareBindings` type in your code:

```ts
import type { CloudflareBindings } from "./worker-configuration";

const app = new Hono<{ Bindings: CloudflareBindings }>();
```

### GraphQL Types (gqty)

Types are automatically generated in development mode when GraphQL schema changes. You can also run manually:

```bash
pnpm x runespark:exec -- gqty generate
```

## Code Quality

### Lint

```bash
pnpm lint
```

### Format

```bash
pnpm lint --write
```

## Features

- **微信服务号 AI 聊天机器人**: DeepSeek V4 Flash 驱动，支持工具调用 (活动查询、桌游库存、日麻战绩等)
- **微信登录**: 支持服务号静默登录 (snsapi_base)、网页授权 (snsapi_userinfo)、PC 扫码登录
- **OG 卡片生成**: 全站各页面动态生成社交分享图 (Browser Run + R2 缓存)
- **图片处理队列**: Cloudflare Queues + Browser Run 异步生成卡片图片
- **角色权限控制 (RBAC)**: 应用层角色管理，替代 CF Zero Trust
- **日麻数据**: 对接全国日麻公式站 (GSZ) API

## Environment Variables

复制 `.env.example` 到 `.env` 填入实际值。Cloudflare Workers secrets 通过 `wrangler secret put` 设置。

| 变量 | 说明 |
|------|------|
| `CLOUDFLARE_DATABASE_ID` | D1 数据库 ID |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_D1_TOKEN` | Cloudflare API Token (D1 访问) |
| `CAPTCHA_PREFIX` | 阿里云验证码 2.0 SceneId |
| `AUTH_SECRET` | Auth.js 签名密钥 |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | 阿里云短信 AccessKey |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | 阿里云短信 Secret |
| `WECHAT_OPEN_APP_ID` | 微信开放平台 AppID (PC 扫码登录) |
| `WECHAT_OPEN_APP_SECRET` | 微信开放平台 AppSecret |
| `WECHAT_MP_APP_ID` | 微信公众号 AppID |
| `WECHAT_MP_APP_SECRET` | 微信公众号 AppSecret |
| `WECHAT_MP_TOKEN` | 服务号消息验签 Token |
| `WECHAT_MP_ENCODING_AES_KEY` | 消息加解密密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek V4 Flash API Key |
| `CF_AI_GATEWAY_ID` | Cloudflare AI Gateway ID |
| `GSZ_TOKEN` | 全国日麻公式站 API Token |

## Configuration

- **Cloudflare Workers**: `apps/{app}/wrangler.toml`
- **Database**: `drizzle.config.ts`
- **TypeScript**: `tsconfig.base.json` and `apps/{app}/tsconfig.json`
