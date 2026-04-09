import { describe, expect, it } from "vitest";
import * as engine from "../engine";
import type { MatchConfig, MatchState } from "../types";

function makeStoreConfig(): MatchConfig {
  return { type: "store", mode: "4p", format: "hanchan" };
}

function make3pStoreConfig(): MatchConfig {
  return { type: "store", mode: "3p", format: "tonpuu" };
}

function addFourPlayers(state: MatchState): MatchState {
  let s = state;
  s = engine.addPlayer(s, {
    userId: "u1",
    nickname: "P1",
    phone: "111",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "u2",
    nickname: "P2",
    phone: "222",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "u3",
    nickname: "P3",
    phone: "333",
    registered: true,
  });
  s = engine.addPlayer(s, {
    userId: "u4",
    nickname: "P4",
    phone: "444",
    registered: true,
  });
  return s;
}

function seatFourPlayers(state: MatchState): MatchState {
  let s = state;
  s = engine.selectSeat(s, "u1", "east");
  s = engine.selectSeat(s, "u2", "south");
  s = engine.selectSeat(s, "u3", "west");
  s = engine.selectSeat(s, "u4", "north");
  return s;
}

function toPlaying(): MatchState {
  let s = engine.createInitialState();
  s = engine.setConfig(s, makeStoreConfig());
  s = engine.startSeatSelect(s);
  s = addFourPlayers(s);
  s = seatFourPlayers(s);
  s = engine.startCountdown(s);
  s = engine.startMatch(s);
  return s;
}

describe("engine", () => {
  describe("createInitialState", () => {
    it("returns config_select phase with empty state", () => {
      const s = engine.createInitialState();
      expect(s.phase).toBe("config_select");
      expect(s.config).toBeNull();
      expect(s.players).toEqual([]);
      expect(s.pendingScores).toEqual({});
      expect(s.scoreConfirmed).toEqual({});
      expect(s.startedAt).toBeNull();
      expect(s.endedAt).toBeNull();
    });
  });

  describe("setConfig", () => {
    it("sets config in config_select phase", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, makeStoreConfig());
      expect(s.config).toEqual({
        type: "store",
        mode: "4p",
        format: "hanchan",
      });
    });

    it("forces 4p hanchan for tournament", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, {
        type: "tournament",
        mode: "3p",
        format: "tonpuu",
      });
      expect(s.config!.mode).toBe("4p");
      expect(s.config!.format).toBe("hanchan");
      expect(s.config!.type).toBe("tournament");
    });

    it("throws if not in config_select", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, makeStoreConfig());
      s = engine.startSeatSelect(s);
      expect(() => engine.setConfig(s, makeStoreConfig())).toThrow();
    });
  });

  describe("seat select flow", () => {
    it("transitions config_select → seat_select → countdown", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, makeStoreConfig());
      expect(s.phase).toBe("config_select");

      s = engine.startSeatSelect(s);
      expect(s.phase).toBe("seat_select");

      s = addFourPlayers(s);
      s = seatFourPlayers(s);
      expect(engine.allSeated(s)).toBe(true);

      s = engine.startCountdown(s);
      expect(s.phase).toBe("countdown");
    });

    it("backToConfig clears players", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, makeStoreConfig());
      s = engine.startSeatSelect(s);
      s = engine.addPlayer(s, {
        userId: "u1",
        nickname: "P1",
        phone: "111",
        registered: true,
      });
      s = engine.backToConfig(s);
      expect(s.phase).toBe("config_select");
      expect(s.players).toEqual([]);
    });

    it("prevents duplicate player add", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, makeStoreConfig());
      s = engine.startSeatSelect(s);
      s = engine.addPlayer(s, {
        userId: "u1",
        nickname: "P1",
        phone: null,
        registered: false,
      });
      const before = s.players.length;
      s = engine.addPlayer(s, {
        userId: "u1",
        nickname: "P1",
        phone: null,
        registered: false,
      });
      expect(s.players.length).toBe(before);
    });

    it("validates seat for mode", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, make3pStoreConfig());
      s = engine.startSeatSelect(s);
      s = engine.addPlayer(s, {
        userId: "u1",
        nickname: "P1",
        phone: null,
        registered: false,
      });
      expect(() => engine.selectSeat(s, "u1", "north")).toThrow(/Invalid seat/);
    });
  });

  describe("countdown → playing", () => {
    it("sets startedAt on startMatch", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, makeStoreConfig());
      s = engine.startSeatSelect(s);
      s = addFourPlayers(s);
      s = seatFourPlayers(s);
      s = engine.startCountdown(s);
      expect(s.startedAt).toBeNull();

      s = engine.startMatch(s);
      expect(s.phase).toBe("playing");
      expect(s.startedAt).toBeTypeOf("number");
    });

    it("throws startMatch if not in countdown", () => {
      const s = toPlaying();
      expect(() => engine.startMatch(s)).toThrow();
    });
  });

  describe("scoring flow", () => {
    it("full scoring happy path: submit → confirm → finalize", () => {
      let s = toPlaying();
      s = engine.beginScoring(s);
      expect(s.phase).toBe("scoring");
      expect(s.pendingScores).toEqual({});
      expect(s.scoreConfirmed).toEqual({});

      s = engine.submitScore(s, "u1", "u1", 30000);
      s = engine.submitScore(s, "u2", "u2", 25000);
      s = engine.submitScore(s, "u3", "u3", 22000);
      s = engine.submitScore(s, "u4", "u4", 23000);
      expect(engine.allScoresSubmitted(s)).toBe(true);

      s = engine.confirmScore(s, "u1");
      s = engine.confirmScore(s, "u2");
      s = engine.confirmScore(s, "u3");
      expect(engine.allScoresConfirmed(s)).toBe(false);

      s = engine.confirmScore(s, "u4");
      expect(engine.allScoresConfirmed(s)).toBe(true);

      s = engine.finalizeScoring(s);
      expect(s.phase).toBe("ended");
      expect(s.terminationReason).toBe("score_complete");
      expect(s.endedAt).toBeTypeOf("number");
      expect(s.players.find((p) => p.userId === "u1")!.currentPoints).toBe(
        30000,
      );
    });

    it("allows cancel confirm before all confirmed", () => {
      let s = toPlaying();
      s = engine.beginScoring(s);
      s = engine.submitScore(s, "u1", "u1", 30000);
      s = engine.confirmScore(s, "u1");
      expect(s.scoreConfirmed["u1"]).toBe(true);

      s = engine.cancelConfirm(s, "u1");
      expect(s.scoreConfirmed["u1"]).toBe(false);
    });

    it("prevents cancel confirm after all confirmed", () => {
      let s = toPlaying();
      s = engine.beginScoring(s);
      for (const id of ["u1", "u2", "u3", "u4"]) {
        s = engine.submitScore(s, id, id, 25000);
        s = engine.confirmScore(s, id);
      }
      expect(() => engine.cancelConfirm(s, "u1")).toThrow(/Cannot cancel/);
    });

    it("prevents confirm without submitting score", () => {
      let s = toPlaying();
      s = engine.beginScoring(s);
      expect(() => engine.confirmScore(s, "u1")).toThrow(/Must submit score/);
    });
  });

  describe("resetKeepConfig (auto-new-match)", () => {
    it("resets to countdown with same config and players", () => {
      let s = toPlaying();
      s = engine.beginScoring(s);
      for (const id of ["u1", "u2", "u3", "u4"]) {
        s = engine.submitScore(s, id, id, 25000);
        s = engine.confirmScore(s, id);
      }
      s = engine.finalizeScoring(s);
      expect(s.phase).toBe("ended");

      s = engine.resetKeepConfig(s);
      expect(s.phase).toBe("countdown");
      expect(s.config).toEqual(makeStoreConfig());
      expect(s.players.length).toBe(4);
      expect(s.players[0].currentPoints).toBe(25000);
      expect(s.startedAt).toBeNull();
      expect(s.endedAt).toBeNull();
      expect(s.terminationReason).toBeNull();
    });
  });

  describe("resetToConfig (after abort)", () => {
    it("resets to config_select with no players", () => {
      let s = toPlaying();
      s = engine.abortMatch(s, "admin_abort");
      expect(s.phase).toBe("ended");

      s = engine.resetToConfig(s);
      expect(s.phase).toBe("config_select");
      expect(s.players).toEqual([]);
      expect(s.config).toEqual(makeStoreConfig());
    });
  });

  describe("getRanking", () => {
    it("sorts by currentPoints descending", () => {
      let s = toPlaying();
      s = engine.beginScoring(s);
      s = engine.submitScore(s, "u1", "u1", 30000);
      s = engine.submitScore(s, "u2", "u2", 20000);
      s = engine.submitScore(s, "u3", "u3", 28000);
      s = engine.submitScore(s, "u4", "u4", 22000);
      for (const id of ["u1", "u2", "u3", "u4"]) {
        s = engine.confirmScore(s, id);
      }
      s = engine.finalizeScoring(s);

      const ranking = engine.getRanking(s);
      expect(ranking[0].userId).toBe("u1");
      expect(ranking[0].rank).toBe(1);
      expect(ranking[1].userId).toBe("u3");
      expect(ranking[3].userId).toBe("u2");
    });
  });

  describe("abortMatch", () => {
    it("ends match from any active phase", () => {
      let s = toPlaying();
      s = engine.abortMatch(s, "admin_abort");
      expect(s.phase).toBe("ended");
      expect(s.terminationReason).toBe("admin_abort");
    });

    it("does nothing if already ended", () => {
      let s = toPlaying();
      s = engine.abortMatch(s, "admin_abort");
      const endedAt = s.endedAt;
      s = engine.abortMatch(s, "order_invalid");
      expect(s.terminationReason).toBe("admin_abort");
      expect(s.endedAt).toBe(endedAt);
    });
  });

  describe("serializeForDB", () => {
    it("returns correct shape for ended match", () => {
      let s = toPlaying();
      s = engine.beginScoring(s);
      for (const id of ["u1", "u2", "u3", "u4"]) {
        s = engine.submitScore(s, id, id, 25000);
        s = engine.confirmScore(s, id);
      }
      s = engine.finalizeScoring(s);

      const result = engine.serializeForDB(s);
      expect(result).not.toBeNull();
      expect(result!.matchType).toBe("store");
      expect(result!.mode).toBe("4p");
      expect(result!.format).toBe("hanchan");
      expect(result!.terminationReason).toBe("score_complete");
      expect(result!.players.length).toBe(4);
      expect(result!.config).toEqual(makeStoreConfig());
    });

    it("returns null for non-ended match", () => {
      const s = toPlaying();
      expect(engine.serializeForDB(s)).toBeNull();
    });
  });

  describe("3p mode", () => {
    it("works with 3 players", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, make3pStoreConfig());
      s = engine.startSeatSelect(s);
      s = engine.addPlayer(s, {
        userId: "u1",
        nickname: "P1",
        phone: null,
        registered: false,
      });
      s = engine.addPlayer(s, {
        userId: "u2",
        nickname: "P2",
        phone: null,
        registered: false,
      });
      s = engine.addPlayer(s, {
        userId: "u3",
        nickname: "P3",
        phone: null,
        registered: false,
      });
      s = engine.selectSeat(s, "u1", "east");
      s = engine.selectSeat(s, "u2", "south");
      s = engine.selectSeat(s, "u3", "west");
      expect(engine.allSeated(s)).toBe(true);

      s = engine.startCountdown(s);
      s = engine.startMatch(s);
      expect(s.phase).toBe("playing");
      expect(s.players[0].currentPoints).toBe(35000);
    });

  });

  describe("store mode allows unregistered players", () => {
    it("addPlayer works for unregistered (temp) users in store mode", () => {
      let s = engine.createInitialState();
      s = engine.setConfig(s, makeStoreConfig());
      s = engine.startSeatSelect(s);
      s = engine.addPlayer(s, {
        userId: "temp1",
        nickname: "Temp",
        phone: null,
        registered: false,
      });
      expect(s.players.length).toBe(1);
      expect(s.players[0].registered).toBe(false);
    });
  });
});
