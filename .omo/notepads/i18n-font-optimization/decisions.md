# Decisions

## 2026-06-21 Task: Planning
- Font-family unified name: "DiceShock Sans" (all locales use this, actual font varies by locale CSS)
- CJK fonts: Noto Sans SC (zh_Hans), Noto Sans TC (zh_Hant), Noto Sans JP (ja)
- Latin/Cyrillic font: Inter (en, de, fr, es, pt, ru)
- Font weights to keep: 200, 300, 400, 600, 700 (all italic variants too)
- Translation fallback: zh_Hans stays synchronously loaded (inline in main bundle)
- SSR injects translation data via `<script>window.__I18N_DATA__={...}</script>`
- Font CSS loaded via `<link>` in `<head>`, NOT inlined (CJK CSS can be large)
- font-display: swap for all @font-face rules
- Dots font: remains globally loaded, stays in style.css
