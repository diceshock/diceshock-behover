# Decisions

## 2026-06-25 Task: Planning
- Escape hatch: `@ts-expect-error` with mandatory reason comment, budget ≤ 10
- Generated files: excluded via Biome overrides, content not patched
- Tests: same strict rules, no `as any` even in mocks
- `as unknown as T` pattern: forbidden (same as `as any` — type laundering)
- No runtime behavior changes permitted
- New type files centralized in `src/types/` directory
