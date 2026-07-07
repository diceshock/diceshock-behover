# Learnings

## 2026-06-21 Task: Session Start
- Project uses Cloudflare Workers + Hono + React 19 + TanStack Router + Vite
- SSR with `vite-ssr-components/plugin` and `@cloudflare/vite-plugin`
- Current fonts: Sarasa (10 .ttc files, each 10-30MB), Dots (brand font, keep)
- Font files hosted on R2: assets.runespark.fun/fonts/
- 9 locales: zh_Hans, zh_Hant, en, ja, ru, es, pt, fr, de
- Locale determined from URL path: `{store}-{locale}` pattern
- I18nProvider uses React context, getTranslation() reads from static TRANSLATIONS map
- All 9 locale JSONs currently statically imported in shared/i18n/index.ts
- zh_Hans is the base/fallback locale
- Current font-family in body: "Sarasa", sans-serif
- Tailwind CSS v4 + daisyUI used for styling

## 2026-06-21 Task: Dynamic Locale Chunks
- `getTranslation()` remains synchronous by reading a runtime registry seeded only with `zh_Hans`
- Non-base locale JSONs should be loaded with `loadLocale(locale)` and registered via `setTranslations(locale, dict)` before render/assertions
- `loadLocale()` uses Vite dynamic import for non-`zh_Hans` locales so each locale JSON can become its own chunk
- Tests that assert non-base translations must explicitly preload those locales instead of relying on static imports

## 2026-06-21 Task: SSR→Client Translation Pipeline

- Created `I18nScript` component (in `useI18nData.tsx`) that serializes translations into `<script>window.__I18N_DATA__ = {locale, dict}</script>`
  - Placed OUTSIDE `<div id="root">` (before it in `<body>`) to avoid React hydration mismatch
  - Uses `getAllTranslations(locale)` which reads from the runtime registry after `setTranslations()` was called
- Created `useI18nDataRegister()` hook that reads `window.__I18N_DATA__` and calls `setTranslations()` before hydration
  - Has early return (`typeof window === "undefined"`) so it's inert during SSR
  - Called in `__root.tsx` RootComponent alongside `useCrossDataRegister()` and `useAuthRegister()`

### SSR Flow (fileRoute.tsx)
1. `storeLocale` middleware sets `c.var.LocaleCode` in the Hono context
2. `fileRoute.tsx` reads locale, calls `await loadLocale(locale)`, then `setTranslations(locale, dict)`
3. During `renderRouterToStream`, all `getTranslation()` calls find the correct locale dict
4. `I18nScript` component serializes the dict into a `window.__I18N_DATA__` script tag

### Client Flow (hydration)
1. Browser parses HTML, encounters `<script>window.__I18N_DATA__ = ...</script>` (before `#root`) → executes immediately
2. React hydrates `#root`, `__root.tsx` RootComponent renders
3. `useI18nDataRegister()` reads `window.__I18N_DATA__`, calls `setTranslations(locale, dict)`
4. All `useTranslation()` calls now return correct locale-specific strings → no hydration mismatch

### Key design decisions
- No LZString compression: translation JSONs are ~25-30KB, plain JSON is fine and avoids extra dependency
- Variable name `__I18N_DATA__` (distinct from `__SYFT_SERVER_CTX_DATA__`)
- `I18nProvider` component API unchanged: still accepts `locale` prop, still provides `t()` via context
- `useTranslation()` hook API unchanged
- Language switch = page refresh (no runtime locale changing)
- `activeLocale` fallback: `locale ?? DEFAULT_LOCALE` (zh_Hans) so translations are always loaded

## 2026-06-21 Task: Font Mirror Build Script

- Created `scripts/font-mirror.ts` — mirrors Google Fonts woff2 files + CSS to R2
- Script fetches CSS from `fonts.googleapis.com/css2` with Chrome UA to trigger woff2 format
- Font families: Noto Sans SC (zh_Hans), Noto Sans TC (zh_Hant), Noto Sans JP (ja), Inter (en/de/fr/es/pt/ru)
- Weights fetched: 200, 300, 400, 600, 700 + all italic variants
- CJK fonts (Noto Sans) may lack italic variants — handled gracefully
- Google Fonts pre-splits CJK into unicode-range slices (~100-120 per weight)
- Output structure: `.font-build/fonts/{family}/*.woff2` + `.font-build/css/{locale}.css`
- All @font-face rules use unified `font-family: "DiceShock Sans"` with `font-display: swap`
- Inter locales (en, de, fr, es, pt, ru) share the same CSS — generated once, copied per locale
- `--upload` flag pushes to R2 via `wrangler r2 object put`
- `.font-build/` added to `.gitignore`; `font-mirror` script added to package.json
- Script is idempotent: skips already-downloaded files

## 2026-06-21 Task: Dynamic Font CSS Worker Route

- Replaced static R2 font CSS generation with `GET /fonts/css/:locale.css` served by the Diceshock Worker
- Route validates locale with `isValidLocale()` and maps locales to Google Fonts families at request time
- Google Fonts CSS is fetched with a modern Chrome User-Agent so the returned `@font-face` rules use woff2 URLs on `fonts.gstatic.com`
- CSS rewrites Google `font-family` declarations to the unified `"DiceShock Sans"` family and guarantees `font-display: swap`
- Responses set long-lived `Cache-Control` and `CDN-Cache-Control` headers so Cloudflare can cache deterministic per-locale CSS at the edge
- `scripts/font-mirror.ts`, `.font-build/`, and the root `font-mirror` package script are obsolete after this change
