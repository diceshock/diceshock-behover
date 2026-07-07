# Learnings

## 2026-06-20 Session Start
- Stack: Cloudflare Workers + Hono + React 19 + TanStack Router + Drizzle ORM + D1 (SQLite)
- Monorepo: Nx + pnpm workspaces
- DB schema: `libs/db/src/schema.ts` (686 lines, 22 tables)
- Uses `createId()` from `@paralleldrive/cuid2` for PKs (NOT nanoid)
- Test runner: vitest (configured in root vitest.config.ts)
- Build: `pnpm x diceshock:build`
- Tasks 1, 2, 3 all modify same file (schema.ts) — MUST combine into single delegation
