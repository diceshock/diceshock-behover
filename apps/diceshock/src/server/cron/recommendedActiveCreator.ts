import db, { activeRegistrationsTable, activesTable, drizzle } from "@lib/db";
import {
  CATEGORY_LABELS,
  SYSTEM_USER_ID,
} from "@/shared/preferences/constants";
import type { MatchResult } from "@/shared/preferences/types";

const { eq, and } = drizzle;

function generateTitle(match: MatchResult): string {
  const categoryLabel = match.category
    ? CATEGORY_LABELS[match.category]
    : "聚会";
  const date = new Date(match.date);
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
  const dayName = dayNames[date.getDay()];
  return `[推荐] 周${dayName}${categoryLabel}局`;
}

function getMaxPlayers(match: MatchResult): number {
  switch (match.category) {
    case "mahjong":
      return 4;
    case "trpg":
      return 6;
    case "boardgame":
      return Math.max(match.userIds.length + 1, 4);
    default:
      return match.userIds.length + 2;
  }
}

export async function createRecommendedActive(
  env: { DB: D1Database },
  match: MatchResult,
): Promise<string | null> {
  const tdb = db(env.DB);

  const existingActives = await tdb
    .select()
    .from(activesTable)
    .where(
      and(
        eq(activesTable.creator_id, SYSTEM_USER_ID),
        eq(activesTable.date, match.date),
        eq(activesTable.is_system_recommended, true),
      ),
    );

  for (const existing of existingActives) {
    if (
      existing.title.includes(
        match.category ? CATEGORY_LABELS[match.category] : "",
      )
    ) {
      return null;
    }
  }

  const title = generateTitle(match);
  const [active] = await tdb
    .insert(activesTable)
    .values({
      creator_id: SYSTEM_USER_ID,
      title,
      date: match.date,
      time: match.timeStart,
      max_players: getMaxPlayers(match),
      is_game: match.category !== "trpg",
      is_system_recommended: true,
      content: `系统根据 ${match.userIds.length} 位用户的偏好自动推荐`,
    })
    .returning();

  for (const userId of match.userIds) {
    await tdb.insert(activeRegistrationsTable).values({
      active_id: active.id,
      user_id: userId,
      is_watching: true,
    });
  }

  return active.id;
}
