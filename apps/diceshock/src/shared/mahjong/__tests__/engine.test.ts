import { describe, expect, it } from "vitest";
import {
  addPlayer,
  allScoresSubmitted,
  allSeated,
  backToConfig,
  beginScoring,
  castVote,
  confirmScores,
  createInitialState,
  endRound,
  getDealerUserId,
  getRanking,
  initiateVote,
  isVoteFailed,
  isVotePassed,
  resetKeepConfig,
  resolveVote,
  resolveVoteByTimeout,
  selectSeat,
  serializeForDB,
  setConfig,
  startMatch,
  startSeatSelect,
  submitScore,
} from "../engine";
import type { MatchState } from "../types";

function make4pPlaying(): MatchState {
  let s = createInitialState();
  s = setConfig(s, { mode: "4p", format: "hanchan" });
  s = startSeatSelect(s);
  s = addPlayer(s, {
    userId: "A",
    nickname: "Alice",
    phone: "111",
    registered: true,
  });
  s = addPlayer(s, {
    userId: "B",
    nickname: "Bob",
    phone: "222",
    registered: true,
  });
  s = addPlayer(s, {
    userId: "C",
    nickname: "Carol",
    phone: "333",
    registered: true,
  });
  s = addPlayer(s, {
    userId: "D",
    nickname: "Dave",
    phone: "444",
    registered: true,
  });
  s = selectSeat(s, "A", "east");
  s = selectSeat(s, "B", "south");
  s = selectSeat(s, "C", "west");
  s = selectSeat(s, "D", "north");
  s = startMatch(s);
  return s;
}

function make3pPlaying(): MatchState {
  let s = createInitialState();
  s = setConfig(s, { mode: "3p", format: "tonpuu" });
  s = startSeatSelect(s);
  s = addPlayer(s, {
    userId: "A",
    nickname: "Alice",
    phone: "111",
    registered: true,
  });
  s = addPlayer(s, {
    userId: "B",
    nickname: "Bob",
    phone: "222",
    registered: true,
  });
  s = addPlayer(s, {
    userId: "C",
    nickname: "Carol",
    phone: "333",
    registered: true,
  });
  s = selectSeat(s, "A", "east");
  s = selectSeat(s, "B", "south");
  s = selectSeat(s, "C", "west");
  s = startMatch(s);
  return s;
}

function playRound(
  state: MatchState,
  scores: Record<string, number>,
  result: "dealer_win" | "non_dealer_win" | "draw",
): MatchState {
  let s = beginScoring(state);
  for (const [userId, pts] of Object.entries(scores)) {
    s = submitScore(s, userId, pts);
  }
  s = confirmScores(s);
  s = endRound(s, result);
  return s;
}

describe("engine - initial state", () => {
  it("creates initial state with default config", () => {
    const s = createInitialState();
    expect(s.phase).toBe("config_select");
    expect(s.players).toHaveLength(0);
    expect(s.config).toEqual({ mode: "4p", format: "hanchan" });
  });
});

describe("engine - config and setup", () => {
  it("sets config and stays in config_select", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "4p", format: "hanchan" });
    expect(s.phase).toBe("config_select");
    expect(s.config?.mode).toBe("4p");
    expect(s.config?.format).toBe("hanchan");
  });

  it("allows config change during config_select", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "4p", format: "hanchan" });
    s = setConfig(s, { mode: "3p", format: "tonpuu" });
    expect(s.config?.mode).toBe("3p");
    expect(s.config?.format).toBe("tonpuu");
  });

  it("startSeatSelect transitions to seat_select", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "4p", format: "hanchan" });
    s = startSeatSelect(s);
    expect(s.phase).toBe("seat_select");
  });

  it("backToConfig returns from seat_select to config_select", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "4p", format: "hanchan" });
    s = startSeatSelect(s);
    s = addPlayer(s, {
      userId: "A",
      nickname: "A",
      phone: null,
      registered: true,
    });
    s = selectSeat(s, "A", "east");
    s = backToConfig(s);
    expect(s.phase).toBe("config_select");
    expect(s.players).toHaveLength(0);
    expect(s.config?.mode).toBe("4p");
  });

  it("rejects config change outside config_select and lobby", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "4p", format: "hanchan" });
    s = startSeatSelect(s);
    s = addPlayer(s, {
      userId: "A",
      nickname: "A",
      phone: null,
      registered: true,
    });
    s = addPlayer(s, {
      userId: "B",
      nickname: "B",
      phone: null,
      registered: true,
    });
    s = addPlayer(s, {
      userId: "C",
      nickname: "C",
      phone: null,
      registered: true,
    });
    s = addPlayer(s, {
      userId: "D",
      nickname: "D",
      phone: null,
      registered: true,
    });
    s = selectSeat(s, "A", "east");
    s = selectSeat(s, "B", "south");
    s = selectSeat(s, "C", "west");
    s = selectSeat(s, "D", "north");
    s = startMatch(s);
    expect(() => setConfig(s, { mode: "3p", format: "tonpuu" })).toThrow();
  });

  it("resetKeepConfig preserves config and resets to config_select", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "4p", format: "hanchan" });
    const reset = resetKeepConfig(s);
    expect(reset.config?.mode).toBe("4p");
    expect(reset.config?.format).toBe("hanchan");
    expect(reset.phase).toBe("config_select");
    expect(reset.players).toHaveLength(0);
  });

  it("rejects north seat in 3p mode", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "3p", format: "tonpuu" });
    s = startSeatSelect(s);
    s = addPlayer(s, {
      userId: "A",
      nickname: "Alice",
      phone: "111",
      registered: true,
    });
    expect(() => selectSeat(s, "A", "north")).toThrow("Invalid seat");
  });

  it("rejects duplicate seat selection", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "4p", format: "hanchan" });
    s = startSeatSelect(s);
    s = addPlayer(s, {
      userId: "A",
      nickname: "Alice",
      phone: "111",
      registered: true,
    });
    s = addPlayer(s, {
      userId: "B",
      nickname: "Bob",
      phone: "222",
      registered: true,
    });
    s = selectSeat(s, "A", "east");
    expect(() => selectSeat(s, "B", "east")).toThrow("already taken");
  });
});

describe("engine - seating and start", () => {
  it("detects all seated correctly", () => {
    let s = createInitialState();
    s = setConfig(s, { mode: "3p", format: "tonpuu" });
    s = startSeatSelect(s);
    s = addPlayer(s, {
      userId: "A",
      nickname: "Alice",
      phone: "111",
      registered: true,
    });
    s = addPlayer(s, {
      userId: "B",
      nickname: "Bob",
      phone: "222",
      registered: true,
    });
    s = addPlayer(s, {
      userId: "C",
      nickname: "Carol",
      phone: "333",
      registered: true,
    });
    s = selectSeat(s, "A", "east");
    s = selectSeat(s, "B", "south");
    expect(allSeated(s)).toBe(false);
    s = selectSeat(s, "C", "west");
    expect(allSeated(s)).toBe(true);
  });

  it("starts match with correct initial points", () => {
    const s = make4pPlaying();
    expect(s.phase).toBe("playing");
    expect(s.players.every((p) => p.currentPoints === 25000)).toBe(true);
    expect(s.currentRound.wind).toBe("east");
    expect(s.currentRound.roundNumber).toBe(1);
  });

  it("3p starts with 35000 points", () => {
    const s = make3pPlaying();
    expect(s.players.every((p) => p.currentPoints === 35000)).toBe(true);
  });
});

describe("engine - dealer rotation (4p)", () => {
  it("連庄: dealer stays on dealer_win", () => {
    let s = make4pPlaying();
    const dealerBefore = getDealerUserId(s);
    s = playRound(s, { A: 33000, B: 22000, C: 22000, D: 23000 }, "dealer_win");
    expect(s.phase).toBe("playing");
    expect(getDealerUserId(s)).toBe(dealerBefore);
    expect(s.currentRound.honba).toBe(1);
  });

  it("連庄: dealer stays on draw", () => {
    let s = make4pPlaying();
    const dealerBefore = getDealerUserId(s);
    s = playRound(s, { A: 25000, B: 25000, C: 25000, D: 25000 }, "draw");
    expect(getDealerUserId(s)).toBe(dealerBefore);
    expect(s.currentRound.honba).toBe(1);
  });

  it("輪庄: dealer rotates on non_dealer_win", () => {
    let s = make4pPlaying();
    expect(getDealerUserId(s)).toBe("A");
    s = playRound(
      s,
      { A: 20000, B: 30000, C: 25000, D: 25000 },
      "non_dealer_win",
    );
    expect(getDealerUserId(s)).toBe("B");
    expect(s.currentRound.honba).toBe(0);
    expect(s.currentRound.roundNumber).toBe(2);
  });

  it("full east round rotation (4p: 4 rotations)", () => {
    let s = make4pPlaying();
    s = playRound(
      s,
      { A: 20000, B: 30000, C: 25000, D: 25000 },
      "non_dealer_win",
    );
    expect(getDealerUserId(s)).toBe("B");
    s = playRound(
      s,
      { A: 25000, B: 25000, C: 30000, D: 20000 },
      "non_dealer_win",
    );
    expect(getDealerUserId(s)).toBe("C");
    s = playRound(
      s,
      { A: 25000, B: 25000, C: 20000, D: 30000 },
      "non_dealer_win",
    );
    expect(getDealerUserId(s)).toBe("D");
    expect(s.currentRound.wind).toBe("east");
    expect(s.currentRound.roundNumber).toBe(4);
  });
});

describe("engine - wind progression", () => {
  it("4p hanchan: east → south after full rotation", () => {
    let s = make4pPlaying();
    s = playRound(
      s,
      { A: 20000, B: 30000, C: 25000, D: 25000 },
      "non_dealer_win",
    );
    s = playRound(
      s,
      { A: 25000, B: 20000, C: 30000, D: 25000 },
      "non_dealer_win",
    );
    s = playRound(
      s,
      { A: 25000, B: 25000, C: 20000, D: 30000 },
      "non_dealer_win",
    );
    s = playRound(
      s,
      { A: 30000, B: 25000, C: 25000, D: 20000 },
      "non_dealer_win",
    );
    expect(s.phase).toBe("playing");
    expect(s.currentRound.wind).toBe("south");
    expect(s.currentRound.roundNumber).toBe(1);
    expect(getDealerUserId(s)).toBe("A");
  });

  it("4p hanchan: ends after south round completes", () => {
    let s = make4pPlaying();
    for (let i = 0; i < 4; i++) {
      s = playRound(
        s,
        { A: 25000, B: 25000, C: 25000, D: 25000 },
        "non_dealer_win",
      );
    }
    expect(s.currentRound.wind).toBe("south");
    for (let i = 0; i < 4; i++) {
      s = playRound(
        s,
        { A: 25000, B: 25000, C: 25000, D: 25000 },
        "non_dealer_win",
      );
    }
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("format_complete");
  });

  it("3p tonpuu: ends after east round (3 rotations)", () => {
    let s = make3pPlaying();
    s = playRound(s, { A: 30000, B: 37500, C: 37500 }, "non_dealer_win");
    s = playRound(s, { A: 35000, B: 30000, C: 40000 }, "non_dealer_win");
    s = playRound(s, { A: 35000, B: 35000, C: 35000 }, "non_dealer_win");
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("format_complete");
  });
});

describe("engine - bust detection", () => {
  it("ends match when a player reaches 0 points", () => {
    let s = make4pPlaying();
    s = playRound(s, { A: 0, B: 50000, C: 25000, D: 25000 }, "non_dealer_win");
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("bust");
  });

  it("ends match when a player goes negative", () => {
    let s = make4pPlaying();
    s = playRound(
      s,
      { A: -5000, B: 55000, C: 25000, D: 25000 },
      "non_dealer_win",
    );
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("bust");
  });
});

describe("engine - voting", () => {
  it("4p: 3/4 votes yes → match ends", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    expect(s.phase).toBe("voting");
    s = castVote(s, "A", true);
    s = castVote(s, "B", true);
    s = castVote(s, "C", true);
    expect(isVotePassed(s)).toBe(true);
    s = resolveVote(s);
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("vote");
  });

  it("4p: 2/4 votes yes → vote fails", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", true);
    s = castVote(s, "B", true);
    s = castVote(s, "C", false);
    s = castVote(s, "D", false);
    expect(isVotePassed(s)).toBe(false);
    expect(isVoteFailed(s)).toBe(true);
    s = resolveVote(s);
    expect(s.phase).toBe("playing");
  });

  it("3p: 2/3 votes yes → match ends", () => {
    let s = make3pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", true);
    s = castVote(s, "B", true);
    expect(isVotePassed(s)).toBe(true);
    s = resolveVote(s);
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("vote");
  });

  it("3p: 1/3 yes, 2/3 no → vote fails early", () => {
    let s = make3pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", true);
    s = castVote(s, "B", false);
    expect(isVoteFailed(s)).toBe(false);
    s = castVote(s, "C", false);
    expect(isVoteFailed(s)).toBe(true);
  });

  it("rejects duplicate vote", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", true);
    expect(() => castVote(s, "A", false)).toThrow("Already voted");
  });

  it("initiateVote sets voteStartedAt", () => {
    let s = make4pPlaying();
    expect(s.voteStartedAt).toBeNull();
    s = initiateVote(s);
    expect(s.voteStartedAt).toBeGreaterThan(0);
  });

  it("resolveVote clears voteStartedAt", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", false);
    s = castVote(s, "B", false);
    s = castVote(s, "C", false);
    s = castVote(s, "D", false);
    s = resolveVote(s);
    expect(s.voteStartedAt).toBeNull();
    expect(s.phase).toBe("playing");
  });

  it("resolveVoteByTimeout with majority yes ends match", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", true);
    s = castVote(s, "B", true);
    s = castVote(s, "C", false);
    s = resolveVoteByTimeout(s);
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("vote");
    expect(s.voteStartedAt).toBeNull();
  });

  it("resolveVoteByTimeout with tie continues", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", true);
    s = castVote(s, "B", false);
    s = resolveVoteByTimeout(s);
    expect(s.phase).toBe("playing");
    expect(s.votes).toHaveLength(0);
    expect(s.voteStartedAt).toBeNull();
  });

  it("resolveVoteByTimeout with majority no continues", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    s = castVote(s, "A", true);
    s = castVote(s, "B", false);
    s = castVote(s, "C", false);
    s = resolveVoteByTimeout(s);
    expect(s.phase).toBe("playing");
    expect(s.voteStartedAt).toBeNull();
  });

  it("resolveVoteByTimeout with no votes continues", () => {
    let s = make4pPlaying();
    s = initiateVote(s);
    s = resolveVoteByTimeout(s);
    expect(s.phase).toBe("playing");
    expect(s.voteStartedAt).toBeNull();
  });
});

describe("engine - score submission", () => {
  it("tracks pending scores correctly", () => {
    let s = make4pPlaying();
    s = beginScoring(s);
    s = submitScore(s, "A", 30000);
    s = submitScore(s, "B", 20000);
    expect(allScoresSubmitted(s)).toBe(false);
    s = submitScore(s, "C", 25000);
    s = submitScore(s, "D", 25000);
    expect(allScoresSubmitted(s)).toBe(true);
  });

  it("rejects score submission outside scoring phase", () => {
    const s = make4pPlaying();
    expect(() => submitScore(s, "A", 30000)).toThrow();
  });
});

describe("engine - ranking", () => {
  it("returns players sorted by points descending", () => {
    let s = make4pPlaying();
    s = playRound(
      s,
      { A: 30000, B: 20000, C: 35000, D: 15000 },
      "non_dealer_win",
    );
    const ranking = getRanking(s);
    expect(ranking[0].userId).toBe("C");
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].userId).toBe("A");
    expect(ranking[2].userId).toBe("B");
    expect(ranking[3].userId).toBe("D");
  });
});

describe("engine - phase transitions", () => {
  it("rejects invalid phase transitions", () => {
    const lobby = createInitialState();
    expect(() => startMatch(lobby)).toThrow();
    expect(() => beginScoring(lobby)).toThrow();
    expect(() => initiateVote(lobby)).toThrow();
  });

  it("rejects scoring when not in playing phase", () => {
    const s = make4pPlaying();
    expect(() => confirmScores(s)).toThrow();
  });
});

describe("engine - serialization", () => {
  it("serializes ended match for DB", () => {
    let s = make4pPlaying();
    s = playRound(s, { A: 0, B: 50000, C: 25000, D: 25000 }, "non_dealer_win");
    const result = serializeForDB(s);
    expect(result).not.toBeNull();
    expect(result!.mode).toBe("4p");
    expect(result!.format).toBe("hanchan");
    expect(result!.terminationReason).toBe("bust");
    expect(result!.players).toHaveLength(4);
    expect(result!.roundHistory).toHaveLength(1);
    expect(result!.startedAt).toBeGreaterThan(0);
  });

  it("returns null for non-ended match", () => {
    const s = make4pPlaying();
    expect(serializeForDB(s)).toBeNull();
  });
});

describe("engine - multi-round simulation", () => {
  it("4p hanchan full game with mixed results", () => {
    let s = make4pPlaying();

    s = playRound(s, { A: 33000, B: 22000, C: 22000, D: 23000 }, "dealer_win");
    expect(getDealerUserId(s)).toBe("A");
    expect(s.currentRound.honba).toBe(1);

    s = playRound(
      s,
      { A: 28000, B: 27000, C: 22000, D: 23000 },
      "non_dealer_win",
    );
    expect(getDealerUserId(s)).toBe("B");
    expect(s.currentRound.honba).toBe(0);

    s = playRound(s, { A: 28000, B: 27000, C: 22000, D: 23000 }, "draw");
    expect(getDealerUserId(s)).toBe("B");
    expect(s.currentRound.honba).toBe(1);

    s = playRound(
      s,
      { A: 28000, B: 22000, C: 27000, D: 23000 },
      "non_dealer_win",
    );
    expect(getDealerUserId(s)).toBe("C");

    s = playRound(
      s,
      { A: 28000, B: 22000, C: 27000, D: 23000 },
      "non_dealer_win",
    );
    expect(getDealerUserId(s)).toBe("D");
    expect(s.currentRound.wind).toBe("east");

    s = playRound(
      s,
      { A: 28000, B: 22000, C: 27000, D: 23000 },
      "non_dealer_win",
    );
    expect(s.currentRound.wind).toBe("south");
    expect(getDealerUserId(s)).toBe("A");

    expect(s.roundHistory).toHaveLength(6);
    expect(s.phase).toBe("playing");
  });
});
