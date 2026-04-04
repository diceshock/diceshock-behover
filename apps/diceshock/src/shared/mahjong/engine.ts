import {
  SEATS_3P,
  SEATS_4P,
  STARTING_POINTS_3P,
  STARTING_POINTS_4P,
} from "./constants";
import type {
  MatchConfig,
  MatchResultForDB,
  MatchState,
  PlayerState,
} from "./types";

function playerCount(mode: "3p" | "4p"): number {
  return mode === "3p" ? 3 : 4;
}

function startingPoints(mode: "3p" | "4p"): number {
  return mode === "3p" ? STARTING_POINTS_3P : STARTING_POINTS_4P;
}

function seatsForMode(mode: "3p" | "4p") {
  return mode === "3p" ? SEATS_3P : SEATS_4P;
}

export function createInitialState(): MatchState {
  return {
    config: null,
    players: [],
    phase: "config_select",
    votes: [],
    voteStartedAt: null,
    pendingScores: {},
    scoreConfirmed: {},
    terminationReason: null,
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedDuration: 0,
    step: 0,
  };
}

export function setConfig(state: MatchState, config: MatchConfig): MatchState {
  if (state.phase !== "config_select")
    throw new Error("Can only set config in config_select");

  const enforced: MatchConfig =
    config.type === "tournament"
      ? { type: "tournament", mode: "4p", format: "hanchan" }
      : config;

  return {
    ...state,
    config: enforced,
    players: [],
  };
}

export function startSeatSelect(state: MatchState): MatchState {
  if (state.phase !== "config_select")
    throw new Error("Can only start seat select from config_select");
  if (!state.config) throw new Error("Config not set");

  return {
    ...state,
    phase: "seat_select",
    players: [],
  };
}

export function backToConfig(state: MatchState): MatchState {
  if (state.phase !== "seat_select")
    throw new Error("Can only go back from seat_select");

  return {
    ...state,
    phase: "config_select",
    players: [],
  };
}

export function addPlayer(
  state: MatchState,
  player: Pick<PlayerState, "userId" | "nickname" | "phone" | "registered">,
): MatchState {
  const existing = state.players.find((p) => p.userId === player.userId);
  if (existing) {
    if (
      existing.registered === player.registered &&
      existing.nickname === player.nickname
    )
      return state;
    return {
      ...state,
      players: state.players.map((p) =>
        p.userId === player.userId
          ? { ...p, registered: player.registered, nickname: player.nickname }
          : p,
      ),
    };
  }

  const pts = state.config ? startingPoints(state.config.mode) : 0;
  return {
    ...state,
    players: [
      ...state.players,
      {
        ...player,
        seat: null,
        currentPoints: pts,
      },
    ],
  };
}

export function selectSeat(
  state: MatchState,
  userId: string,
  seat: (typeof SEATS_4P)[number],
): MatchState {
  if (state.phase !== "seat_select")
    throw new Error("Can only select seat during seat_select");
  if (!state.config) throw new Error("Config not set");

  const validSeats = seatsForMode(state.config.mode);
  if (!validSeats.includes(seat))
    throw new Error(`Invalid seat ${seat} for ${state.config.mode}`);

  const taken = state.players.find(
    (p) => p.seat === seat && p.userId !== userId,
  );
  if (taken) throw new Error(`Seat ${seat} already taken by ${taken.nickname}`);

  const existing = state.players.find((p) => p.userId === userId);
  if (!existing) throw new Error("Player not found");

  return {
    ...state,
    players: state.players.map((p) =>
      p.userId === userId ? { ...p, seat } : p,
    ),
  };
}

export function allSeated(state: MatchState): boolean {
  if (!state.config) return false;
  const needed = playerCount(state.config.mode);
  const seatedPlayers = state.players.filter((p) => p.seat);
  return seatedPlayers.length === needed;
}

export function startCountdown(state: MatchState): MatchState {
  if (state.phase !== "seat_select")
    throw new Error("Can only start countdown from seat_select");
  if (!allSeated(state)) throw new Error("Not all players seated");

  return {
    ...state,
    phase: "countdown",
  };
}

export function startMatch(state: MatchState): MatchState {
  if (state.phase !== "countdown")
    throw new Error("Can only start match from countdown");

  return {
    ...state,
    phase: "playing",
    startedAt: Date.now(),
  };
}

export function beginScoring(state: MatchState): MatchState {
  if (state.phase !== "playing")
    throw new Error("Can only begin scoring from playing phase");

  return {
    ...state,
    phase: "scoring",
    pendingScores: {},
    scoreConfirmed: {},
    pausedAt: Date.now(),
  };
}

export function cancelScoring(state: MatchState): MatchState {
  if (state.phase !== "scoring")
    throw new Error("Can only cancel scoring from scoring phase");

  const elapsed = state.pausedAt ? Date.now() - state.pausedAt : 0;
  return {
    ...state,
    phase: "playing",
    pendingScores: {},
    scoreConfirmed: {},
    pausedAt: null,
    pausedDuration: state.pausedDuration + elapsed,
  };
}

export function submitScore(
  state: MatchState,
  userId: string,
  points: number,
): MatchState {
  if (state.phase !== "scoring")
    throw new Error("Can only submit scores during scoring phase");
  if (!state.players.find((p) => p.userId === userId))
    throw new Error("Player not found");

  return {
    ...state,
    pendingScores: { ...state.pendingScores, [userId]: points },
  };
}

export function confirmScore(state: MatchState, userId: string): MatchState {
  if (state.phase !== "scoring")
    throw new Error("Can only confirm score during scoring phase");
  if (!(userId in state.pendingScores))
    throw new Error("Must submit score before confirming");

  return {
    ...state,
    scoreConfirmed: { ...state.scoreConfirmed, [userId]: true },
  };
}

export function cancelConfirm(state: MatchState, userId: string): MatchState {
  if (state.phase !== "scoring")
    throw new Error("Can only cancel confirm during scoring phase");
  if (allScoresConfirmed(state))
    throw new Error("Cannot cancel after all players confirmed");

  return {
    ...state,
    scoreConfirmed: { ...state.scoreConfirmed, [userId]: false },
  };
}

export function allScoresSubmitted(state: MatchState): boolean {
  if (!state.config) return false;
  const needed = playerCount(state.config.mode);
  return Object.keys(state.pendingScores).length >= needed;
}

export function allScoresConfirmed(state: MatchState): boolean {
  if (!state.config) return false;
  if (!allScoresSubmitted(state)) return false;
  const needed = playerCount(state.config.mode);
  const confirmed = Object.values(state.scoreConfirmed).filter(Boolean).length;
  return confirmed >= needed;
}

export function finalizeScoring(state: MatchState): MatchState {
  if (state.phase !== "scoring")
    throw new Error("Can only finalize from scoring phase");
  if (!allScoresConfirmed(state)) throw new Error("Not all scores confirmed");

  const newPlayers = state.players.map((p) => ({
    ...p,
    currentPoints: state.pendingScores[p.userId] ?? p.currentPoints,
  }));

  return {
    ...state,
    players: newPlayers,
    phase: "ended",
    terminationReason: "score_complete",
    endedAt: Date.now(),
    pendingScores: {},
    scoreConfirmed: {},
  };
}

export function initiateVote(state: MatchState): MatchState {
  if (state.phase !== "playing")
    throw new Error("Can only vote during playing phase");
  return { ...state, phase: "voting", votes: [], voteStartedAt: Date.now() };
}

export function castVote(
  state: MatchState,
  userId: string,
  vote: boolean,
): MatchState {
  if (state.phase !== "voting")
    throw new Error("Can only cast vote during voting phase");
  if (!state.players.find((p) => p.userId === userId))
    throw new Error("Player not found");
  if (state.votes.find((v) => v.userId === userId))
    throw new Error("Already voted");

  return {
    ...state,
    votes: [...state.votes, { userId, vote }],
  };
}

export function isVotePassed(state: MatchState): boolean {
  if (!state.config) return false;
  const count = playerCount(state.config.mode);
  const threshold = count === 3 ? 2 : 3;
  const yesVotes = state.votes.filter((v) => v.vote).length;
  return yesVotes >= threshold;
}

export function isVoteFailed(state: MatchState): boolean {
  if (!state.config) return false;
  const count = playerCount(state.config.mode);
  const threshold = count === 3 ? 2 : 3;
  const noVotes = state.votes.filter((v) => !v.vote).length;
  const maxPossibleYes = count - noVotes;
  return maxPossibleYes < threshold;
}

export function resolveVote(state: MatchState): MatchState {
  if (state.phase !== "voting")
    throw new Error("Can only resolve vote during voting phase");

  if (isVotePassed(state)) {
    return {
      ...state,
      phase: "ended",
      terminationReason: "vote",
      endedAt: Date.now(),
      voteStartedAt: null,
    };
  }

  return {
    ...state,
    phase: "playing",
    votes: [],
    voteStartedAt: null,
  };
}

export function resolveVoteByTimeout(state: MatchState): MatchState {
  if (state.phase !== "voting")
    throw new Error("Can only resolve vote during voting phase");

  const yesVotes = state.votes.filter((v) => v.vote).length;
  const noVotes = state.votes.filter((v) => !v.vote).length;
  const hasVotes = state.votes.length > 0;

  if (hasVotes && yesVotes > noVotes) {
    return {
      ...state,
      phase: "ended",
      terminationReason: "vote",
      endedAt: Date.now(),
      voteStartedAt: null,
    };
  }

  return {
    ...state,
    phase: "playing",
    votes: [],
    voteStartedAt: null,
  };
}

export function resetKeepConfig(prev: MatchState): MatchState {
  if (!prev.config) throw new Error("No config to keep");

  const pts = startingPoints(prev.config.mode);
  return {
    config: { ...prev.config },
    players: prev.players.map((p) => ({
      ...p,
      currentPoints: pts,
    })),
    phase: "countdown",
    votes: [],
    voteStartedAt: null,
    pendingScores: {},
    scoreConfirmed: {},
    terminationReason: null,
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedDuration: 0,
    step: 0,
  };
}

export function resetToConfig(prev: MatchState): MatchState {
  return {
    config: prev.config ? { ...prev.config } : null,
    players: [],
    phase: "config_select",
    votes: [],
    voteStartedAt: null,
    pendingScores: {},
    scoreConfirmed: {},
    terminationReason: null,
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedDuration: 0,
    step: 0,
  };
}

export function getRanking(
  state: MatchState,
): Array<PlayerState & { rank: number }> {
  const sorted = [...state.players].sort(
    (a, b) => b.currentPoints - a.currentPoints,
  );
  return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
}

export function abortMatch(
  state: MatchState,
  reason: "admin_abort" | "order_invalid",
): MatchState {
  if (state.phase === "ended") return state;

  return {
    ...state,
    phase: "ended",
    terminationReason: reason,
    endedAt: Date.now(),
  };
}

export function serializeForDB(state: MatchState): MatchResultForDB | null {
  if (state.phase !== "ended") return null;
  if (!state.config || !state.terminationReason) return null;

  return {
    matchType: state.config.type,
    mode: state.config.mode,
    format: state.config.format,
    startedAt: state.startedAt ?? Date.now(),
    endedAt: state.endedAt ?? Date.now(),
    terminationReason: state.terminationReason,
    players: state.players.map((p) => ({
      userId: p.userId,
      nickname: p.nickname,
      seat: p.seat,
      finalScore: p.currentPoints,
    })),
    config: state.config,
  };
}
