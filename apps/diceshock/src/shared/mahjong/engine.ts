import {
  SEATS_3P,
  SEATS_4P,
  STARTING_POINTS_3P,
  STARTING_POINTS_4P,
  WINDS,
} from "./constants";
import type {
  MatchConfig,
  MatchResultForDB,
  MatchState,
  PlayerState,
  RoundRecord,
  RoundResult,
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

function windCount(format: "tonpuu" | "hanchan"): number {
  return format === "tonpuu" ? 1 : 2;
}

export function createInitialState(): MatchState {
  return {
    config: { mode: "4p", format: "hanchan" },
    players: [],
    currentRound: { wind: "east", roundNumber: 1, honba: 0, dealerIndex: 0 },
    phase: "config_select",
    votes: [],
    voteStartedAt: null,
    roundHistory: [],
    pendingScores: {},
    roundCounter: 0,
    terminationReason: null,
    startedAt: null,
    endedAt: null,
    step: 0,
  };
}

export function resetKeepConfig(prev: MatchState): MatchState {
  const fresh = createInitialState();
  if (prev.config) {
    fresh.config = { ...prev.config };
  }
  return fresh;
}

export function setConfig(state: MatchState, config: MatchConfig): MatchState {
  if (state.phase !== "config_select" && state.phase !== "lobby")
    throw new Error("Can only set config in config_select or lobby");

  return {
    ...state,
    config,
    phase: "config_select",
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
  if (existing) {
    return {
      ...state,
      players: state.players.map((p) =>
        p.userId === userId ? { ...p, seat } : p,
      ),
    };
  }

  throw new Error("Player not found");
}

export function addPlayer(
  state: MatchState,
  player: Pick<PlayerState, "userId" | "nickname" | "phone" | "registered">,
): MatchState {
  if (state.players.find((p) => p.userId === player.userId)) return state;

  const pts = state.config ? startingPoints(state.config.mode) : 0;
  return {
    ...state,
    players: [
      ...state.players,
      {
        ...player,
        seat: null,
        ready: false,
        currentPoints: pts,
      },
    ],
  };
}

export function setReady(
  state: MatchState,
  userId: string,
  ready: boolean,
): MatchState {
  if (state.phase !== "seat_select")
    throw new Error("Can only set ready during seat_select");
  const player = state.players.find((p) => p.userId === userId);
  if (!player) throw new Error("Player not found");
  if (!player.seat) throw new Error("Must select seat first");

  return {
    ...state,
    players: state.players.map((p) =>
      p.userId === userId ? { ...p, ready } : p,
    ),
  };
}

export function allReady(state: MatchState): boolean {
  if (!state.config) return false;
  const needed = playerCount(state.config.mode);
  const readyPlayers = state.players.filter((p) => p.ready && p.seat);
  return readyPlayers.length === needed;
}

export function allSeated(state: MatchState): boolean {
  if (!state.config) return false;
  const needed = playerCount(state.config.mode);
  const seatedPlayers = state.players.filter((p) => p.seat);
  return seatedPlayers.length === needed;
}

export function startMatch(state: MatchState): MatchState {
  if (!allSeated(state)) throw new Error("Not all players seated");
  if (!state.config) throw new Error("Config not set");

  const pts = startingPoints(state.config.mode);
  const eastPlayer = state.players.findIndex((p) => p.seat === "east");
  if (eastPlayer === -1) throw new Error("No east player found");

  return {
    ...state,
    phase: "playing",
    startedAt: Date.now(),
    currentRound: {
      wind: "east",
      roundNumber: 1,
      honba: 0,
      dealerIndex: eastPlayer,
    },
    players: state.players.map((p) => ({
      ...p,
      currentPoints: pts,
      ready: false,
    })),
    roundCounter: 0,
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

export function allScoresSubmitted(state: MatchState): boolean {
  if (!state.config) return false;
  const needed = playerCount(state.config.mode);
  return Object.keys(state.pendingScores).length >= needed;
}

export function beginScoring(state: MatchState): MatchState {
  if (state.phase !== "playing")
    throw new Error("Can only begin scoring from playing phase");
  return { ...state, phase: "scoring", pendingScores: {} };
}

export function endRound(state: MatchState, result: RoundResult): MatchState {
  if (state.phase !== "round_review")
    throw new Error("Can only end round from round_review phase");
  if (!state.config) throw new Error("Config not set");

  const record: RoundRecord = {
    round: state.roundCounter + 1,
    wind: state.currentRound.wind,
    honba: state.currentRound.honba,
    dealerUserId: state.players[state.currentRound.dealerIndex].userId,
    scores: { ...state.pendingScores },
    result,
  };

  const newPlayers = state.players.map((p) => ({
    ...p,
    currentPoints: state.pendingScores[p.userId] ?? p.currentPoints,
  }));

  const hasBust = newPlayers.some((p) => p.currentPoints <= 0);

  if (hasBust) {
    return {
      ...state,
      players: newPlayers,
      roundHistory: [...state.roundHistory, record],
      roundCounter: state.roundCounter + 1,
      phase: "ended",
      terminationReason: "bust",
      endedAt: Date.now(),
      pendingScores: {},
    };
  }

  const nextRound = advanceRound(state, result);

  if (!nextRound) {
    return {
      ...state,
      players: newPlayers,
      roundHistory: [...state.roundHistory, record],
      roundCounter: state.roundCounter + 1,
      phase: "ended",
      terminationReason: "format_complete",
      endedAt: Date.now(),
      pendingScores: {},
    };
  }

  return {
    ...state,
    players: newPlayers,
    currentRound: nextRound,
    roundHistory: [...state.roundHistory, record],
    roundCounter: state.roundCounter + 1,
    phase: "playing",
    pendingScores: {},
  };
}

export function confirmScores(state: MatchState): MatchState {
  if (state.phase !== "scoring")
    throw new Error("Can only confirm scores from scoring phase");
  if (!allScoresSubmitted(state)) throw new Error("Not all scores submitted");

  return { ...state, phase: "round_review" };
}

function advanceRound(
  state: MatchState,
  result: RoundResult,
): MatchState["currentRound"] | null {
  if (!state.config) return null;

  const { currentRound, config } = state;
  const count = playerCount(config.mode);
  const maxWinds = windCount(config.format);

  if (result === "dealer_win" || result === "draw") {
    return {
      ...currentRound,
      honba: currentRound.honba + 1,
    };
  }

  const nextDealerIndex = (currentRound.dealerIndex + 1) % count;
  const dealerWrapped = nextDealerIndex === 0;

  if (!dealerWrapped) {
    return {
      ...currentRound,
      dealerIndex: nextDealerIndex,
      roundNumber: currentRound.roundNumber + 1,
      honba: 0,
    };
  }

  const windIndex = WINDS.indexOf(currentRound.wind);
  const nextWindIndex = windIndex + 1;

  if (nextWindIndex >= maxWinds) {
    return null;
  }

  return {
    wind: WINDS[nextWindIndex],
    roundNumber: 1,
    honba: 0,
    dealerIndex: 0,
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

export function getRanking(
  state: MatchState,
): Array<PlayerState & { rank: number }> {
  const sorted = [...state.players].sort(
    (a, b) => b.currentPoints - a.currentPoints,
  );
  return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
}

export function getDealerUserId(state: MatchState): string | null {
  if (state.currentRound.dealerIndex >= state.players.length) return null;
  return state.players[state.currentRound.dealerIndex].userId;
}

export function canEndMatch(state: MatchState): boolean {
  if (state.phase === "ended") return false;
  const hasBust = state.players.some((p) => p.currentPoints <= 0);
  return hasBust;
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
    mode: state.config.mode,
    format: state.config.format,
    startedAt: state.startedAt ?? Date.now(),
    endedAt: state.endedAt ?? Date.now(),
    terminationReason: state.terminationReason,
    players: state.players.map((p) => ({
      userId: p.userId,
      nickname: p.nickname,
      seat: p.seat!,
      finalScore: p.currentPoints,
    })),
    roundHistory: state.roundHistory,
    config: state.config,
  };
}
