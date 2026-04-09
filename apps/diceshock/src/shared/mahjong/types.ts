import type { Seat } from "./constants";

export type MatchType = "store" | "tournament";
export type MatchMode = "3p" | "4p";
export type MatchFormat = "tonpuu" | "hanchan";
export type TerminationReason =
  | "score_complete"
  | "admin_abort"
  | "order_invalid";

export type MatchPhase =
  | "config_select"
  | "seat_select"
  | "countdown"
  | "playing"
  | "scoring"
  | "ended";

export interface MatchConfig {
  type: MatchType;
  mode: MatchMode;
  format: MatchFormat;
}

export interface PlayerState {
  userId: string;
  nickname: string;
  seat: Seat | null;
  phone: string | null;
  registered: boolean;
  currentPoints: number;
}

export interface MatchState {
  config: MatchConfig | null;
  players: PlayerState[];
  phase: MatchPhase;
  pendingScores: Record<string, number>;
  scoreSubmitters: Record<string, string>;
  scoreConfirmed: Record<string, boolean>;
  terminationReason: TerminationReason | null;
  startedAt: number | null;
  endedAt: number | null;
  step: number;
}

export interface MatchResultForDB {
  matchType: MatchType;
  mode: MatchMode;
  format: MatchFormat;
  startedAt: number;
  endedAt: number;
  terminationReason: TerminationReason;
  players: Array<{
    userId: string;
    nickname: string;
    seat: Seat | null;
    finalScore: number;
  }>;
  config: MatchConfig;
}
