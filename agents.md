# Agents

## 日志系统

所有根目录 scripts 的输出自动写入 `.agents/output-<name>-<起始行>-<结束行>.log`。

- 终端输出完全不受影响（颜色、格式保留），日志文件自动去除 ANSI 码
- 每行带 ISO 时间戳，连续重复行合并为 `[xN]`
- 单文件最多 20000 行，写满自动轮转
- 日志文件第一行记录原始命令
- 重跑时旧 log 移入 `.agents/trash/`，trash 保留最新 15 个文件

`.agents/` 目录已 gitignore。

### 架构

| 文件 | 用途 |
|---|---|
| `plugins/x.ts` | 统一入口 — `--dev` 多 app 启动 / 默认 nx target / `--run` 任意命令 |
| `plugins/log.ts` | `RotatingLog` 核心 — 轮转、去重、时间戳、trash 归档 |

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
