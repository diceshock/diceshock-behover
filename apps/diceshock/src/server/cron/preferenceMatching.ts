import db, {
  activesTable,
  drizzle,
  preferencePushLogTable,
  userPreferencesTable,
} from "@lib/db";
import {
  BOARDGAME_MIN_PLAYERS,
  MAHJONG_MIN_PLAYERS,
  MATCH_LOOKAHEAD_DAYS,
  TRPG_MIN_PLAYERS,
} from "@/shared/preferences/constants";
import { expandRruleToDateRanges } from "@/shared/preferences/rruleExpand";
import type {
  MatchResult,
  PreferenceCategory,
} from "@/shared/preferences/types";

const { and, eq, gte, lte } = drizzle;

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DEFAULT_ACTIVE_START = "19:00";
const DEFAULT_ACTIVE_DURATION_MINUTES = 3 * 60;

interface ExpandedPreference {
  preferenceId: string;
  userId: string;
  date: string;
  start: string;
  end: string;
  categories: PreferenceCategory[];
}

interface DraftMatch extends MatchResult {
  pushType: "preference_match" | "active_match";
  preferenceIdsByUser: Map<string, Set<string>>;
}

function shanghaiNow(): Date {
  return new Date(Date.now() + SHANGHAI_OFFSET_MS);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMatchWindow(): { start: Date; endExclusive: Date } {
  const now = shanghaiNow();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(0, 0, 0, 0);

  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + MATCH_LOOKAHEAD_DAYS);

  return { start, endExclusive };
}

function getThresholdForCategory(category: PreferenceCategory | null): number {
  switch (category) {
    case "mahjong":
      return MAHJONG_MIN_PLAYERS;
    case "boardgame":
      return BOARDGAME_MIN_PLAYERS;
    case "trpg":
      return TRPG_MIN_PLAYERS;
    default:
      return 3;
  }
}

function normalizeCategories(
  categories: string[] | null,
): PreferenceCategory[] {
  return (categories ?? []).filter(isPreferenceCategory);
}

function isPreferenceCategory(value: string): value is PreferenceCategory {
  return value === "mahjong" || value === "boardgame" || value === "trpg";
}

function toMinutes(time: string): number | null {
  const [hour, minute] = time.split(":").map(Number);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return hour * 60 + minute;
}

function formatMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function inferActiveTimeRange(time: string | null): {
  timeStart: string;
  timeEnd: string;
} {
  const timeStart = time ?? DEFAULT_ACTIVE_START;
  const startMinutes = toMinutes(timeStart) ?? toMinutes(DEFAULT_ACTIVE_START)!;
  return {
    timeStart,
    timeEnd: formatMinutes(startMinutes + DEFAULT_ACTIVE_DURATION_MINUTES),
  };
}

function timeRangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  const firstStartMinutes = toMinutes(firstStart);
  const firstEndMinutes = toMinutes(firstEnd);
  const secondStartMinutes = toMinutes(secondStart);
  const secondEndMinutes = toMinutes(secondEnd);

  if (
    firstStartMinutes === null ||
    firstEndMinutes === null ||
    secondStartMinutes === null ||
    secondEndMinutes === null
  ) {
    return false;
  }

  return (
    firstStartMinutes < secondEndMinutes && secondStartMinutes < firstEndMinutes
  );
}

function getPreferenceIdsByUser(
  preferences: ExpandedPreference[],
): Map<string, Set<string>> {
  const preferenceIdsByUser = new Map<string, Set<string>>();
  for (const preference of preferences) {
    const preferenceIds =
      preferenceIdsByUser.get(preference.userId) ?? new Set<string>();
    preferenceIds.add(preference.preferenceId);
    preferenceIdsByUser.set(preference.userId, preferenceIds);
  }
  return preferenceIdsByUser;
}

function pushLogKey(
  userId: string,
  pushType: "preference_match" | "active_match",
  activeId: string | null,
  preferenceId: string | null,
): string {
  return `${userId}|${pushType}|${activeId ?? ""}|${preferenceId ?? ""}`;
}

function dedupeMatches(
  matches: DraftMatch[],
  pushedKeys: Set<string>,
): MatchResult[] {
  const deduped: MatchResult[] = [];

  for (const match of matches) {
    const userIds = match.userIds.filter((userId) => {
      const preferenceIds = match.preferenceIdsByUser.get(userId);
      if (!preferenceIds || preferenceIds.size === 0) {
        return !pushedKeys.has(
          pushLogKey(userId, match.pushType, match.activeId ?? null, null),
        );
      }

      return [...preferenceIds].some(
        (preferenceId) =>
          !pushedKeys.has(
            pushLogKey(
              userId,
              match.pushType,
              match.activeId ?? null,
              preferenceId,
            ),
          ),
      );
    });

    if (userIds.length === 0) continue;

    deduped.push({
      type: match.type,
      date: match.date,
      timeStart: match.timeStart,
      timeEnd: match.timeEnd,
      category: match.category,
      userIds,
      preferenceIds: match.preferenceIds,
      activeId: match.activeId,
      activeTitle: match.activeTitle,
    });
  }

  return deduped;
}

export async function runPreferenceMatching(env: {
  DB: D1Database;
}): Promise<MatchResult[]> {
  const tdb = db(env.DB);
  const { start, endExclusive } = getMatchWindow();
  const endInclusive = new Date(endExclusive.getTime() - 1);
  const matches: DraftMatch[] = [];

  const preferences = await tdb
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.enabled, true));

  if (preferences.length === 0) return [];

  const expanded: ExpandedPreference[] = [];
  for (const preference of preferences) {
    const ranges = expandRruleToDateRanges(
      preference.rrule,
      start,
      endInclusive,
    );
    const categories = normalizeCategories(preference.categories);

    for (const range of ranges) {
      expanded.push({
        preferenceId: preference.id,
        userId: preference.user_id,
        date: range.date,
        start: range.start,
        end: range.end,
        categories,
      });
    }
  }

  const groups = new Map<string, ExpandedPreference[]>();
  for (const expandedPreference of expanded) {
    const categories =
      expandedPreference.categories.length > 0
        ? expandedPreference.categories
        : (["any"] as const);

    for (const category of categories) {
      const key = `${expandedPreference.date}|${expandedPreference.start}|${expandedPreference.end}|${category}`;
      const group = groups.get(key) ?? [];
      group.push(expandedPreference);
      groups.set(key, group);
    }
  }

  for (const [key, group] of groups) {
    const [date, timeStart, timeEnd, categoryKey] = key.split("|");
    const category = isPreferenceCategory(categoryKey) ? categoryKey : null;
    const uniqueUserIds = [...new Set(group.map((item) => item.userId))];

    if (uniqueUserIds.length < getThresholdForCategory(category)) continue;

    matches.push({
      type: "preference_cross",
      date,
      timeStart,
      timeEnd,
      category,
      userIds: uniqueUserIds,
      preferenceIds: [...new Set(group.map((item) => item.preferenceId))],
      pushType: "preference_match",
      preferenceIdsByUser: getPreferenceIdsByUser(group),
    });
  }

  const futureActives = await tdb
    .select()
    .from(activesTable)
    .where(
      and(
        gte(activesTable.date, formatDate(start)),
        lte(activesTable.date, formatDate(endInclusive)),
      ),
    );

  for (const active of futureActives) {
    const activeCategory: PreferenceCategory | null = active.is_game
      ? "boardgame"
      : null;
    const { timeStart, timeEnd } = inferActiveTimeRange(active.time);
    const matchingPreferences = expanded.filter((preference) => {
      if (preference.date !== active.date) return false;
      if (
        !timeRangesOverlap(preference.start, preference.end, timeStart, timeEnd)
      ) {
        return false;
      }
      if (preference.categories.length === 0 || activeCategory === null)
        return true;
      return preference.categories.includes(activeCategory);
    });

    const matchedUserIds = [
      ...new Set(
        matchingPreferences
          .filter((preference) => preference.userId !== active.creator_id)
          .map((preference) => preference.userId),
      ),
    ];

    if (matchedUserIds.length === 0) continue;

    const pushedPreferences = matchingPreferences.filter((preference) =>
      matchedUserIds.includes(preference.userId),
    );

    matches.push({
      type: "active_match",
      date: active.date,
      timeStart,
      timeEnd,
      category: activeCategory,
      userIds: matchedUserIds,
      preferenceIds: [
        ...new Set(
          pushedPreferences.map((preference) => preference.preferenceId),
        ),
      ],
      activeId: active.id,
      activeTitle: active.title,
      pushType: "active_match",
      preferenceIdsByUser: getPreferenceIdsByUser(pushedPreferences),
    });
  }

  if (matches.length === 0) return [];

  const existingLogs = await tdb
    .select()
    .from(preferencePushLogTable)
    .where(eq(preferencePushLogTable.push_date, formatDate(shanghaiNow())));

  const pushedKeys = new Set(
    existingLogs.map((log) =>
      pushLogKey(
        log.user_id,
        log.push_type,
        log.active_id ?? null,
        log.preference_id ?? null,
      ),
    ),
  );

  return dedupeMatches(matches, pushedKeys);
}
