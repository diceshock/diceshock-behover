## Notepad: Learnings
<!-- Append-only. Do NOT overwrite. -->

## [2026-06-18] Session Start
- Project uses Drizzle ORM with D1 (SQLite)
- Package manager: pnpm
- Build: Vite + Nx
- Lint: Biome
- Test: vitest
- Existing tables use cuid2 IDs, integer timestamps
- WeChat API proxied via diceshock.com/wx-proxy
- DeepSeek V4 Flash via CF AI Gateway

## [2026-06-18] CF Docs Reference
- AI Search: https://developers.cloudflare.com/ai-search/ (current RAG binding: AI_SEARCH)
- Vectorize: https://developers.cloudflare.com/vectorize/ (vector DB, potential for Mem0-like local memory)
- AI Gateway: https://developers.cloudflare.com/ai-gateway/ (proxy for DeepSeek, provides logging/caching/rate limiting)

## [2026-06-18] Wave 1 Complete
- wechatConversationsTable uses raw integer `created_at` (no timestamp_ms mode) for easy 12h arithmetic
- Schema uses `(table) => [index(...)]` syntax for indexes (Drizzle v3)
- skills/ directory imports SkillId from ../types (cross-file dependency)
- dedup inserted AFTER toUser/fromUser check, BEFORE msgType handling
- linkRegistry returns PageLink[] per skill via getRelatedLinks(skillId, context?)
