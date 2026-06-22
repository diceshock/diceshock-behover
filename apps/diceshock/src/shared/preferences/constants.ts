// ─── User Preferences Constants ───────────────────────────────────

import type { PreferenceCategory } from "./types";

/** Earliest hour push notifications may be sent (13:00 local) */
export const PUSH_WINDOW_START = 13;

/** Latest hour push notifications may be sent (22:00 local) */
export const PUSH_WINDOW_END = 22;

/** Maximum push notifications per user per day */
export const MAX_DAILY_PUSHES = 2;

/** How many days ahead the matcher looks for active/preference overlaps */
export const MATCH_LOOKAHEAD_DAYS = 7;

/** System user UUID v4 — used as the creator of auto-generated activities */
export const SYSTEM_USER_ID = "00000000-0000-4000-a000-000000000001";

/** All valid preference categories */
export const PREFERENCE_CATEGORIES = ["trpg", "boardgame", "mahjong"] as const;

/** Chinese display labels for each category */
export const CATEGORY_LABELS: Record<PreferenceCategory, string> = {
  trpg: "跑团",
  boardgame: "桌游",
  mahjong: "日麻",
};

/** Minimum players required for a mahjong match */
export const MAHJONG_MIN_PLAYERS = 3;

/** Minimum players required for a board game session */
export const BOARDGAME_MIN_PLAYERS = 3;

/** Minimum players required for a TRPG session */
export const TRPG_MIN_PLAYERS = 3;
