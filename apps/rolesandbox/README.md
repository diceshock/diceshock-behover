# RoleSandbox

三维体素协作沙箱编辑器 — GraphQL + WebSocket + Yjs + Cloudflare Durable Object + Three.js

## 开发

```bash
# 启动开发服务器 (含 HMR + DO 本地模拟)
pnpm --filter rolesandbox dev

# 类型检查
cd apps/rolesandbox && npx tsc --noEmit
```

## 构建

```bash
# 生产构建 (Worker + Client SPA)
pnpm --filter rolesandbox build
```

产出:
- `dist/rolesandbox/` — Worker bundle
- `dist/client/` — 静态 SPA 资源

## 部署

```bash
# 部署到 Cloudflare Workers
pnpm --filter rolesandbox deploy
```

首次部署前需要:
1. 在 `wrangler.toml` 中填入 `account_id`
2. 确保已登录 `wrangler login`

## 在其他项目中集成

```ts
// server (Hono worker)
import { createRoleSandboxRouter, VoxelSyncDO } from "@lib/rolesandbox-server";

app.route("/sandbox", createRoleSandboxRouter());
export { VoxelSyncDO };

// client (React)
import { VoxelEditor, useVoxelSync } from "@lib/rolesandbox-client";
```

wrangler.toml 中需要添加:

```toml
[[durable_objects.bindings]]
name = "VOXEL_SYNC"
class_name = "VoxelSyncDO"

[[migrations]]
tag = "v1"
new_classes = ["VoxelSyncDO"]
```
