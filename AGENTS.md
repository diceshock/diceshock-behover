# AGENTS.md

参阅 `README.md` 了解技术栈、项目结构和常用命令。本文件只列开发规范。

## 分支与 PR

- `main` 受保护，禁止直接 push。所有变更必须通过 PR，至少 1 个 approval 后合并。
- 所有 status checks 通过、所有 review conversation resolved 后才能合并。
- PR 标题遵循 Conventional Commits：`feat(scope):`, `fix(scope):`, `refactor(scope):` 等。
- 从 `main` 拉功能分支开发，完成后开 PR。

## 安全

- **本项目开源，禁止在代码或配置文件中提交任何密钥、Token、Secret。**
- 环境变量参考 `.env.example`，本地开发用 `.env`（已 gitignore）。
- Workers secrets 通过 `wrangler secret put` 设置，不进仓库。

## 静态资源

- 图片、字体、视频等静态资源不放项目目录，上传到 Cloudflare R2。
- 代码中通过 R2 URL 引用，不要 import 本地文件。
- 唯一例外：SVG 图标组件（`src/client/assets/svg/`）可以留在项目中。


## 运行时

- 项目要求 Node.js 24+，原生运行 TypeScript（strip types）。
- 禁止引入 `tsx`、`ts-node` 等 TS 运行时，脚本直接 `node script.ts` 执行。

## 编码规范

- Biome 为唯一 lint/format 工具，提交前跑 `pnpm lint`。
- 严禁 `any`（`noExplicitAny: error`），生成文件除外。
- 严禁 `@ts-ignore`，用 `@ts-expect-error` + 注释说明替代。
- GraphQL schema 用 Pothos schema-builder，不手写 SDL。
- DB 变更只通过 `drizzle/` 下的顺序迁移文件，已应用的迁移不可修改，只能追加。

## 自动生成文件（不要手动编辑）

- `worker-configuration.d.ts` — wrangler 生成
- `routeTree.gen.ts` — TanStack Router 生成
- `__generated__/` — GraphQL codegen 生成
