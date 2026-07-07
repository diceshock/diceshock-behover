# Learnings

## 2026-06-20 Task: Initial Setup
- Project uses pnpm workspaces, Nx, Biome (linter), TypeScript 5.9
- Monorepo: apps/diceshock, apps/runespark, libs/db, libs/utils
- Only diceshock has tsc errors (208) and biome issues (115 errors + 78 warnings)
- worker-configuration.d.ts is git-tracked, can be edited directly
- mem0ai is in use (wechat/memory.ts) — cannot remove
- pg dual instance (8.11.3 + 8.21.0) causes 3 drizzle-orm installations
- TanStack Router uses `{-$storeLocale}` format (not `$storeLocale`)
- validateSearch returns explicit objects → TanStack infers all fields as required
- i18n hook is `useTranslation` providing `{ t }`
