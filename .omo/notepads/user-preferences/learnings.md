## Learnings

(initialized)

- Preference matching cron uses `db(env.DB)` with shared Drizzle schema and returns rule-based `MatchResult[]` only; notification sending and activity creation remain out of scope.
- Matching window is tomorrow through the next `MATCH_LOOKAHEAD_DAYS` Shanghai dates, excluding today for both expanded preferences and active lookup.
- Push-log dedupe must account for `push_type`, `active_id`, and per-user `preference_id`; cross matches use `preference_match`, active matches use `active_match`.

- 2026-06-22: DeepSeek calls in `apps/diceshock` use `DEEPSEEK_API_KEY`, optional `CF_AI_GATEWAY_ID`, and optional `CF_ACCOUNT_ID`; gateway URLs follow `https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/deepseek`, while direct calls use `https://api.deepseek.com/v1`.
- 2026-06-22: The existing WeChat DeepSeek client uses model `deepseek-v4-flash` and posts to `{baseUrl}/chat/completions`, so the preference parser should match that one-shot call pattern instead of adding `/v1` twice.

- 2026-06-22: Edge case review — all 4 guards confirmed present in existing code:
  1. Disabled preferences filtered: `preferenceMatching.ts:220` — `.where(eq(userPreferencesTable.enabled, true))`
  2. No-openId users skipped: `notificationDispatcher.ts:91-92` — `if (!openId) continue;`
  3. Duplicate prevention: `preferenceMatching.ts:342-358` — dedupe via `preferencePushLogTable` using `pushLogKey()`
  4. Time overlap correctness: `timeRangesOverlap()` uses minute-based interval overlap (`firstStart < secondEnd && secondStart < firstEnd`), so 19:30 active correctly matches 19:00-22:00 preference window. No date-only comparison issues.
