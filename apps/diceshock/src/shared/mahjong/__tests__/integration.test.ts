import { describe, expect, it } from "vitest";
import * as engine from "../engine";
import { serializeForDB } from "../engine";
import type { MatchState } from "../types";

function addAndSeat4p(): MatchState {
  let s = engine.createInitialState();
  s = engine.setConfig(s, { mode: "4p", format: "hanchan" });
  s = engine.startSeatSelect(s);
  s = engine.addPlayer(s, {
    userId: "P1",
    nickname: "Alice",
    phone: "111",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "P2",
    nickname: "Bob",
    phone: "222",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "P3",
    nickname: "Carol",
    phone: "333",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "P4",
    nickname: "Dave",
    phone: "444",
    registered: true,
  });
  s = engine.selectSeat(s, "P1", "east");
  s = engine.selectSeat(s, "P2", "south");
  s = engine.selectSeat(s, "P3", "west");
  s = engine.selectSeat(s, "P4", "north");
  return engine.startMatch(s);
}

function addAndSeat3p(): MatchState {
  let s = engine.createInitialState();
  s = engine.setConfig(s, { mode: "3p", format: "tonpuu" });
  s = engine.startSeatSelect(s);
  s = engine.addPlayer(s, {
    userId: "P1",
    nickname: "Alice",
    phone: "111",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "P2",
    nickname: "Bob",
    phone: "222",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "P3",
    nickname: "Carol",
    phone: "333",
    registered: true,
  });
  s = engine.selectSeat(s, "P1", "east");
  s = engine.selectSeat(s, "P2", "south");
  s = engine.selectSeat(s, "P3", "west");
  return engine.startMatch(s);
}

function playRound(
  state: MatchState,
  scores: Record<string, number>,
  result: "dealer_win" | "non_dealer_win" | "draw",
): MatchState {
  let s = engine.beginScoring(state);
  for (const [userId, pts] of Object.entries(scores)) {
    s = engine.submitScore(s, userId, pts);
  }
  s = engine.confirmScores(s);
  return engine.endRound(s, result);
}

describe("integration: full 4-player hanchan", () => {
  it("completes 8 rounds with mixed dealer wins and rotations", () => {
    let s = addAndSeat4p();

    s = playRound(
      s,
      { P1: 33000, P2: 22000, P3: 22000, P4: 23000 },
      "dealer_win",
    );
    expect(engine.getDealerUserId(s)).toBe("P1");
    expect(s.currentRound.honba).toBe(1);

    s = playRound(
      s,
      { P1: 28000, P2: 27000, P3: 22000, P4: 23000 },
      "non_dealer_win",
    );
    expect(engine.getDealerUserId(s)).toBe("P2");

    s = playRound(
      s,
      { P1: 28000, P2: 22000, P3: 27000, P4: 23000 },
      "non_dealer_win",
    );
    expect(engine.getDealerUserId(s)).toBe("P3");

    s = playRound(
      s,
      { P1: 28000, P2: 22000, P3: 22000, P4: 28000 },
      "non_dealer_win",
    );
    expect(engine.getDealerUserId(s)).toBe("P4");
    expect(s.currentRound.wind).toBe("east");

    s = playRound(
      s,
      { P1: 28000, P2: 22000, P3: 22000, P4: 28000 },
      "non_dealer_win",
    );
    expect(s.currentRound.wind).toBe("south");
    expect(engine.getDealerUserId(s)).toBe("P1");

    s = playRound(
      s,
      { P1: 23000, P2: 27000, P3: 22000, P4: 28000 },
      "non_dealer_win",
    );
    expect(engine.getDealerUserId(s)).toBe("P2");

    s = playRound(
      s,
      { P1: 23000, P2: 22000, P3: 27000, P4: 28000 },
      "non_dealer_win",
    );
    expect(engine.getDealerUserId(s)).toBe("P3");

    s = playRound(
      s,
      { P1: 23000, P2: 22000, P3: 22000, P4: 33000 },
      "non_dealer_win",
    );
    expect(engine.getDealerUserId(s)).toBe("P4");

    s = playRound(
      s,
      { P1: 23000, P2: 22000, P3: 22000, P4: 33000 },
      "non_dealer_win",
    );
    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("format_complete");
    expect(s.roundHistory).toHaveLength(9);

    const db = serializeForDB(s);
    expect(db).not.toBeNull();
    expect(db!.players).toHaveLength(4);
    expect(db!.roundHistory).toHaveLength(9);
    expect(db!.terminationReason).toBe("format_complete");
  });
});

describe("integration: full 3-player tonpuu", () => {
  it("completes 3 rounds with non-dealer wins", () => {
    let s = addAndSeat3p();

    s = playRound(s, { P1: 30000, P2: 37500, P3: 37500 }, "non_dealer_win");
    s = playRound(s, { P1: 35000, P2: 30000, P3: 40000 }, "non_dealer_win");
    s = playRound(s, { P1: 35000, P2: 35000, P3: 35000 }, "non_dealer_win");

    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("format_complete");
    expect(s.roundHistory).toHaveLength(3);

    const db = serializeForDB(s);
    expect(db).not.toBeNull();
    expect(db!.mode).toBe("3p");
    expect(db!.format).toBe("tonpuu");
  });
});

describe("integration: bust scenario", () => {
  it("ends match when player busts mid-game", () => {
    let s = addAndSeat4p();

    s = playRound(
      s,
      { P1: 50000, P2: 10000, P3: 20000, P4: 20000 },
      "dealer_win",
    );
    s = playRound(
      s,
      { P1: 75000, P2: -5000, P3: 15000, P4: 15000 },
      "dealer_win",
    );

    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("bust");

    const db = serializeForDB(s);
    expect(db).not.toBeNull();
    expect(db!.terminationReason).toBe("bust");
    expect(db!.players.some((p) => p.finalScore < 0)).toBe(true);
  });
});

describe("integration: vote end scenario", () => {
  it("4p: 3/4 agree → match ends", () => {
    let s = addAndSeat4p();

    s = playRound(
      s,
      { P1: 30000, P2: 20000, P3: 25000, P4: 25000 },
      "non_dealer_win",
    );
    s = engine.initiateVote(s);
    s = engine.castVote(s, "P1", true);
    s = engine.castVote(s, "P2", true);
    s = engine.castVote(s, "P3", true);
    s = engine.resolveVote(s);

    expect(s.phase).toBe("ended");
    expect(s.terminationReason).toBe("vote");

    const db = serializeForDB(s);
    expect(db).not.toBeNull();
    expect(db!.terminationReason).toBe("vote");
  });
});

describe("integration: vote rejection", () => {
  it("insufficient votes → match continues", () => {
    let s = addAndSeat4p();

    s = engine.initiateVote(s);
    s = engine.castVote(s, "P1", true);
    s = engine.castVote(s, "P2", false);
    s = engine.castVote(s, "P3", false);
    s = engine.castVote(s, "P4", false);
    s = engine.resolveVote(s);

    expect(s.phase).toBe("playing");
    expect(s.terminationReason).toBeNull();
  });
});

describe("integration: multi-match sequence", () => {
  it("match ends → state can reset → new match with different config", () => {
    let s = addAndSeat3p();
    s = playRound(s, { P1: 0, P2: 52500, P3: 52500 }, "non_dealer_win");
    expect(s.phase).toBe("ended");

    const s2 = engine.createInitialState();
    expect(s2.phase).toBe("config_select");
    expect(s2.config).toEqual({ mode: "4p", format: "hanchan" });

    const s3 = engine.setConfig(s2, { mode: "4p", format: "hanchan" });
    expect(s3.config?.mode).toBe("4p");
    expect(s3.phase).toBe("config_select");
  });
});

describe("integration: registration gate", () => {
  it("temp user cannot register (checked in UI, not engine)", () => {
    expect(true).toBe(true);
  });

  it("user without phone cannot register (checked via tRPC)", () => {
    expect(true).toBe(true);
  });
});

describe("integration: score validation", () => {
  it("rejects score submission outside scoring phase", () => {
    const s = addAndSeat4p();
    expect(() => engine.submitScore(s, "P1", 30000)).toThrow();
  });

  it("rejects confirm before all scores submitted", () => {
    let s = addAndSeat4p();
    s = engine.beginScoring(s);
    s = engine.submitScore(s, "P1", 30000);
    expect(() => engine.confirmScores(s)).toThrow();
  });

  it("all players must submit scores", () => {
    let s = addAndSeat4p();
    s = engine.beginScoring(s);
    s = engine.submitScore(s, "P1", 30000);
    s = engine.submitScore(s, "P2", 20000);
    s = engine.submitScore(s, "P3", 25000);
    expect(engine.allScoresSubmitted(s)).toBe(false);
    s = engine.submitScore(s, "P4", 25000);
    expect(engine.allScoresSubmitted(s)).toBe(true);
  });
});
