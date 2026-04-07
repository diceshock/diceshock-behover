import {
  SEATS_3P,
  SEATS_4P,
  type Seat,
  STARTING_POINTS_3P,
  STARTING_POINTS_4P,
} from "./constants";
import type { MatchFormat, MatchMode, MatchType } from "./types";

// ─── PP Configuration per mode ─────────────────────────────────

interface PPConfig {
  startingPoints: number;
  returnPoints: number;
  pointsPerPP: number;
  placementBonus: readonly number[];
  seatOrder: readonly Seat[];
}

const PP_CONFIG_4P: PPConfig = {
  startingPoints: STARTING_POINTS_4P,
  returnPoints: STARTING_POINTS_4P,
  pointsPerPP: 1000,
  placementBonus: [30, 10, -10, -30] as const,
  seatOrder: SEATS_4P,
};

const PP_CONFIG_3P: PPConfig = {
  startingPoints: STARTING_POINTS_3P,
  returnPoints: STARTING_POINTS_3P,
  pointsPerPP: 1000,
  placementBonus: [30, 0, -30] as const,
  seatOrder: SEATS_3P,
};

function getConfig(mode: MatchMode): PPConfig {
  return mode === "3p" ? PP_CONFIG_3P : PP_CONFIG_4P;
}

// ─── Types ─────────────────────────────────────────────────────

export interface PlayerPP {
  userId: string;
  rank: number;
  rawPP: number;
  placementBonus: number;
  totalPP: number;
}

export interface MatchPPResult {
  mode: MatchMode;
  format: MatchFormat;
  matchType: MatchType;
  players: PlayerPP[];
}

export type PPCategory =
  | "tournament"
  | "store_4p_hanchan"
  | "store_4p_tonpuu"
  | "store_3p_hanchan"
  | "store_3p_tonpuu";

export const PP_CATEGORY_LABELS: Record<PPCategory, string> = {
  tournament: "公式战 PP",
  store_4p_hanchan: "四麻半庄 PP",
  store_4p_tonpuu: "四麻东风 PP",
  store_3p_hanchan: "三麻半庄 PP",
  store_3p_tonpuu: "三麻东风 PP",
};

// ─── Core Calculation ──────────────────────────────────────────

interface PlayerInput {
  userId: string;
  seat: Seat | string | null;
  finalScore: number;
}

function rankPlayers(players: PlayerInput[], config: PPConfig): PlayerInput[] {
  const seatIndex = (seat: string | null): number => {
    if (!seat) return 999;
    const idx = config.seatOrder.indexOf(seat as Seat);
    return idx === -1 ? 999 : idx;
  };

  return [...players].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return seatIndex(a.seat) - seatIndex(b.seat);
  });
}

// PP = (finalScore - returnPoints) / pointsPerPP + placementBonus[rank]
// returnPoints: 25000 (4p), 35000 (3p) | pointsPerPP: 1000
// Ties broken by seat order: East > South > West > North
export function calculateMatchPP(
  players: PlayerInput[],
  mode: MatchMode,
  format: MatchFormat,
  matchType: MatchType,
): MatchPPResult {
  const config = getConfig(mode);
  const ranked = rankPlayers(players, config);

  const ppPlayers: PlayerPP[] = ranked.map((p, idx) => {
    const rawPP = (p.finalScore - config.returnPoints) / config.pointsPerPP;
    const bonus = config.placementBonus[idx] ?? 0;
    return {
      userId: p.userId,
      rank: idx + 1,
      rawPP: Math.round(rawPP * 10) / 10,
      placementBonus: bonus,
      totalPP: Math.round((rawPP + bonus) * 10) / 10,
    };
  });

  return { mode, format, matchType, players: ppPlayers };
}

export function getPPCategory(
  matchType: MatchType,
  mode: MatchMode,
  format: MatchFormat,
): PPCategory {
  if (matchType === "tournament") return "tournament";
  return `store_${mode}_${format}` as PPCategory;
}

export function getPlayerPP(
  players: PlayerInput[],
  userId: string,
  mode: MatchMode,
  format: MatchFormat,
  matchType: MatchType,
): PlayerPP | null {
  const result = calculateMatchPP(players, mode, format, matchType);
  return result.players.find((p) => p.userId === userId) ?? null;
}

export function formatPP(pp: number): string {
  const rounded = Math.round(pp * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}`;
  if (rounded < 0) return rounded.toFixed(1);
  return "±0.0";
}

// ─── Aggregation ───────────────────────────────────────────────

export interface PPAggregateStats {
  category: PPCategory;
  totalPP: number;
  matchCount: number;
  avgPP: number;
}

interface MatchDataForAggregate {
  players: PlayerInput[];
  mode: MatchMode;
  format: MatchFormat;
  matchType: MatchType;
  terminationReason: string;
}

function isValidForPP(terminationReason: string): boolean {
  return terminationReason === "score_complete" || terminationReason === "vote";
}

export function aggregatePP(
  matches: MatchDataForAggregate[],
  userId: string,
): PPAggregateStats[] {
  const categoryMap = new Map<PPCategory, { total: number; count: number }>();

  for (const match of matches) {
    if (!isValidForPP(match.terminationReason)) continue;
    if (!match.players.some((p) => p.userId === userId)) continue;

    const category = getPPCategory(match.matchType, match.mode, match.format);
    const playerPP = getPlayerPP(
      match.players,
      userId,
      match.mode,
      match.format,
      match.matchType,
    );
    if (!playerPP) continue;

    const existing = categoryMap.get(category) ?? { total: 0, count: 0 };
    existing.total += playerPP.totalPP;
    existing.count += 1;
    categoryMap.set(category, existing);
  }

  const results: PPAggregateStats[] = [];
  for (const [category, data] of categoryMap) {
    results.push({
      category,
      totalPP: Math.round(data.total * 10) / 10,
      matchCount: data.count,
      avgPP:
        data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
    });
  }

  return results;
}

export function getMatchPPIfValid(
  players: PlayerInput[],
  mode: MatchMode,
  format: MatchFormat,
  matchType: MatchType,
  terminationReason: string,
): MatchPPResult | null {
  if (!isValidForPP(terminationReason)) return null;
  return calculateMatchPP(players, mode, format, matchType);
}
