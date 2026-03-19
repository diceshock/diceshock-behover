# Agents

## 日志系统

所有根目录 scripts 的输出自动写入 `.agents/output-<name>-<起始行>-<结束行>.log`。

- 每行带 ISO 时间戳，连续重复行合并为 `[xN]`
- 单文件最多 20000 行，写满自动轮转，同一 name 保留最新 3 个文件
- 日志文件第一行记录原始命令

`.agents/` 目录已 gitignore。

### 架构

| 文件 | 用途 |
|---|---|
| `plugins/log.ts` | `RotatingLog` 核心 — 轮转、去重、时间戳 |
| `plugins/dev-log.ts` | `pnpm dev` 专用 — 同时启动 diceshock + runespark |
| `plugins/run-log.ts` | 通用 runner — 包装任意单命令，`--nx` 模式包装 nx target |

### 命令

```bash
pnpm dev                  # 同时启动两个 app dev server
pnpm x diceshock:dev      # nx run diceshock:dev (带日志)
pnpm x diceshock:build    # nx run diceshock:build (带日志)
pnpm lint                 # biome check
pnpm drizzle              # drizzle-kit (后接子命令, e.g. pnpm drizzle generate)
pnpm build                # nx run-many --target=build
```

所有 `pnpm x <project:target>` 调用都自动产生 `output-<project>-<target>-*.log`。
