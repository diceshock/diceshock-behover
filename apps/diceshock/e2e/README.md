# Diceshock full-flow vibe testing

This folder is the executable full-flow test harness for vibe coding.

It combines three surfaces:

1. **LLM customer simulation** — `e2e/scenarios/personas.ts` creates realistic customer/staff/system steps for each business journey. By default it is deterministic. Set `VIBE_TEST_LLM_ENDPOINT`, `VIBE_TEST_LLM_API_KEY`, and optionally `VIBE_TEST_LLM_MODEL` to use an OpenAI-compatible LLM as the customer simulator.
2. **Playwright browser execution** — page journeys use a real Chromium browser against the local Cloudflare Vite dev server.
3. **Worker/API smoke and contracts** — HTTP journeys hit `/wechat`, `/graphql`, sitemap, fonts, shortlinks, and other Worker routes.

## Commands

From the repo root:

```bash
pnpm test:e2e:diceshock
pnpm test:e2e:diceshock:ui
pnpm test:e2e:diceshock:report
```

From `apps/diceshock`:

```bash
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:report
```

The Playwright config starts the app with:

```bash
pnpm run dev -- --host 127.0.0.1 --port 5173
```

Use an already-running server with:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm test:e2e
```

## How vibe-coding agents should extend tests

1. Open `e2e/scenarios/feature-catalog.ts`.
2. Find the feature and journey being changed.
3. Add or update acceptance criteria first.
4. Add executable assertions in one of:
   - `e2e/fullstack/agent-wechat.spec.ts` for LLM/customer WeChat behavior
   - `e2e/fullstack/page-core.spec.ts` for browser UI behavior
   - `e2e/fullstack/api-contracts.spec.ts` for Worker/API behavior
   - a new focused spec under `e2e/fullstack/` for the feature
5. Run `pnpm test:e2e`.

## Current coverage contract

`feature-catalog.spec.ts` enforces that all 18 functional projects have:

- source files
- realistic actor goals
- entrypoints
- execution surfaces (`agent`, `page`, `api`, `queue`, `cron`, `subscription`)
- acceptance criteria

This makes incomplete vibe-coded work visible immediately: if a feature is added or changed without a journey and acceptance criteria, the catalog contract fails.

## LLM customer simulator

Default deterministic mode is CI-safe and stable. To use a real LLM customer simulator:

```bash
export VIBE_TEST_LLM_ENDPOINT="https://your-openai-compatible-endpoint/v1/chat/completions"
export VIBE_TEST_LLM_API_KEY="..."
export VIBE_TEST_LLM_MODEL="your-model"
pnpm test:e2e
```

The LLM must return compact JSON:

```json
{
  "message": "顾客自然语言输入",
  "intent": "business intent",
  "expectedSurface": "wechat"
}
```

If the LLM endpoint fails, tests fall back to deterministic mode.

## Future hardening checklist

- Add data-testid attributes to core UI controls.
- Add seed/reset helpers for D1 local state.
- Add feature-specific specs for orders, table seating, activities, mahjong/GSZ, and membership.
- Mock external server-side dependencies (DeepSeek, WeChat, GSZ, Browser Rendering, R2/Queues) for deterministic deep integration.
- Add accessibility and visual-regression projects after stable selectors exist.
