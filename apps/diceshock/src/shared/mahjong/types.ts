import type { Seat, Wind } from "./constants";

export type MatchMode = "3p" | "4p";
export type MatchFormat = "tonpuu" | "hanchan";
export type RoundResult = "dealer_win" | "non_dealer_win" | "draw";
export type TerminationReason = "format_complete" | "bust" | "vote";

export type MatchPhase =
  | "lobby"
  | "config_select"
  | "seat_select"
  | "countdown"
  | "playing"
  | "scoring"
  | "round_review"
  | "voting"
  | "ended";

export interface MatchConfig {
  mode: MatchMode;
  format: MatchFormat;
}

export interface PlayerState {
  userId: string;
  nickname: string;
  seat: Seat | null;
  phone: string | null;
  registered: boolean;
  ready: boolean;
  currentPoints: number;
}

export interface RoundState {
  wind: Wind;
  roundNumber: number;
  honba: number;
  dealerIndex: number;
}

export interface RoundRecord {
  round: number;
  wind: Wind;
  honba: number;
  dealerUserId: string;
  scores: Record<string, number>;
  result: RoundResult;
}

export interface Vote {
  userId: string;
  vote: boolean;
}

export interface MatchState {
  config: MatchConfig | null;
  players: PlayerState[];
  currentRound: RoundState;
  phase: MatchPhase;
  votes: Vote[];
  roundHistory: RoundRecord[];
  pendingScores: Record<string, number>;
  roundCounter: number;
  terminationReason: TerminationReason | null;
  startedAt: number | null;
  endedAt: number | null;
}

export interface MatchResultForDB {
  mode: MatchMode;
  format: MatchFormat;
  startedAt: number;
  endedAt: number;
  terminationReason: TerminationReason;
  players: Array<{
    userId: string;
    nickname: string;
    seat: Seat;
    finalScore: number;
  }>;
  roundHistory: RoundRecord[];
  config: MatchConfig;
}
