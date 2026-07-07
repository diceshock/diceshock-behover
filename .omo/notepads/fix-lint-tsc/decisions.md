# Decisions

## 2026-06-20 Task: Planning
- Use `"pg": "8.11.3"` override (not "false") because mem0ai needs pg at runtime
- Edit worker-configuration.d.ts directly (git-tracked) rather than creating separate augmentation file
- biome auto-fix runs AFTER T1 pnpm install (needs node_modules)
- For useExhaustiveDeps: only add biome-ignore for genuine mount-only effects, with comment
- For noDangerouslySetInnerHtml: allow biome-ignore when HTML is server-sanitized
