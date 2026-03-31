import { describe, expect, it } from "vitest";
import {
  addPlayer,
  beginScoring,
  createInitialState,
  resetKeepConfig,
  selectSeat,
  setConfig,
  startMatch,
  startSeatSelect,
  submitScore,
} from "../engine";

describe("step field", () => {
  it("createInitialState returns step: 0", () => {
    const s = createInitialState();
    expect(s.step).toBe(0);
  });

  it("resetKeepConfig returns step: 0", () => {
    const s = createInitialState();
    const reset = resetKeepConfig(s);
    expect(reset.step).toBe(0);
  });

  it("engine transitions preserve step without modifying it", () => {
    let s = createInitialState();
    expect(s.step).toBe(0);

    s = setConfig(s, { mode: "4p", format: "hanchan" });
    expect(s.step).toBe(0);

    s = startSeatSelect(s);
    expect(s.step).toBe(0);

    s = addPlayer(s, {
      userId: "A",
      nickname: "Alice",
      phone: "111",
      registered: true,
    });
    expect(s.step).toBe(0);

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
    expect(s.step).toBe(0);

    s = startMatch(s);
    expect(s.step).toBe(0);

    s = beginScoring(s);
    expect(s.step).toBe(0);

    s = submitScore(s, "A", 30000);
    expect(s.step).toBe(0);
  });

  it("step with non-zero value is preserved through transitions", () => {
    let s = createInitialState();
    (s as { step: number }).step = 42;

    s = setConfig(s, { mode: "3p", format: "tonpuu" });
    expect(s.step).toBe(42);

    s = startSeatSelect(s);
    expect(s.step).toBe(42);
  });
});
