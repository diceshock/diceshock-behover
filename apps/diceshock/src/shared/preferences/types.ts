// ─── User Preferences Types ───────────────────────────────────

export type PreferenceCategory = "trpg" | "boardgame" | "mahjong";

export interface UserPreference {
  id: string;
  userId: string;
  rawText: string;
  rrule: string;
  categories: PreferenceCategory[];
  playerCount: number | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PreferenceParseResult =
  | {
      success: true;
      rrule: string;
      categories: PreferenceCategory[];
      playerCount: number | null;
      confidence: number;
    }
  | { success: false; error: string };

export interface MatchResult {
  type: "preference_cross" | "active_match";
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:mm
  timeEnd: string; // HH:mm
  category: PreferenceCategory | null;
  userIds: string[];
  preferenceIds: string[];
  activeId?: string; // only for active_match
  activeTitle?: string;
}

export interface PushNotification {
  userId: string;
  openId: string;
  pushType: "preference_match" | "active_match";
  reason: string;
  activeId: string;
  activeTitle: string;
  activeDate: string;
  activeUrl: string;
  manageUrl: string;
  preferenceId: string | null;
}
