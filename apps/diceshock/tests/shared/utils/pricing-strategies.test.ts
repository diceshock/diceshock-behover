/**
 * Comprehensive pricing strategy combination tests.
 *
 * Covers ALL condition combinations and billing modes:
 *   - Fixed billing type
 *   - Points-only and combined price+points
 *   - Split day/night caps (price and points)
 *   - Per_day caps with points
 *   - Weekly/monthly/fixed date conditions
 *   - Priority ordering (sort_order) when multiple conditionals match
 *   - Disabled plans skipped
 *   - Mixed hourly + fixed across time boundaries
 *   - Scope filtering with multiple scopes
 *   - Edge cases: 0-price plans, all-disabled plans
 */
import { describe, expect, it } from "vitest";
import { calculatePrice, type SnapshotData } from "@/shared/utils/pricing";

const HALF_HOUR = 30 * 60 * 1000;

function makeSnapshot(
  plans: SnapshotData["plans"],
  config?: Partial<SnapshotData["config"]>,
): SnapshotData {
  return {
    config: { daytime_start: "10:00", daytime_end: "18:00", ...config },
    plans,
  };
}

function plan(
  overrides: Partial<SnapshotData["plans"][0]> & { name: string },
): SnapshotData["plans"][0] {
  return {
    plan_type: "conditional",
    sort_order: 1,
    enabled: true,
    conditions: undefined,
    billing_type: "hourly",
    price: 1000,
    points: 0,
    cap_enabled: false,
    cap_unit: null,
    cap_price: null,
    cap_price_day: null,
    cap_price_night: null,
    cap_points: null,
    cap_points_day: null,
    cap_points_night: null,
    ...overrides,
  };
}

function fallback(
  overrides?: Partial<SnapshotData["plans"][0]>,
): SnapshotData["plans"][0] {
  return plan({
    name: "Fallback",
    plan_type: "fallback",
    sort_order: 99,
    ...overrides,
  });
}

// Known timestamps for deterministic testing:
// 2024-01-08 = Monday, 2024-01-07 = Sunday, 2024-01-13 = Saturday
// 2024-01-15 = Monday (3rd week)
const MONDAY_10AM = new Date("2024-01-08T10:00:00").getTime();
const MONDAY_17PM = new Date("2024-01-08T17:00:00").getTime();
const MONDAY_19PM = new Date("2024-01-08T19:00:00").getTime();
const MONDAY_20PM = new Date("2024-01-08T20:00:00").getTime();
const SUNDAY_10AM = new Date("2024-01-07T10:00:00").getTime();
const SATURDAY_14PM = new Date("2024-01-13T14:00:00").getTime();
const WEDNESDAY_10AM = new Date("2024-01-10T10:00:00").getTime();
const JAN_15_10AM = new Date("2024-01-15T10:00:00").getTime(); // Monday, 15th

// ═════════════════════════════════════════════════════════════════════════════
// Fixed Billing Type
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — fixed billing", () => {
  it("charges once regardless of duration", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Fixed Day Pass",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        billing_type: "fixed",
        price: 5000,
        points: 100,
      }),
      fallback(),
    ]);

    // 4 hours
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 8,
      "boardgame",
      snapshot,
    );
    expect(result).not.toBeNull();
    expect(result!.billingType).toBe("fixed");
    expect(result!.finalPrice).toBe(5000);
    expect(result!.finalPoints).toBe(100);
  });

  it("fixed price is same for 1 hour or 8 hours", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Fixed",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        billing_type: "fixed",
        price: 3000,
        points: 0,
      }),
      fallback(),
    ]);

    const r1 = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 2,
      "boardgame",
      snapshot,
    );
    const r8 = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 16,
      "boardgame",
      snapshot,
    );
    expect(r1!.finalPrice).toBe(3000);
    expect(r8!.finalPrice).toBe(3000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Points Billing
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — points billing", () => {
  it("accumulates points per half-hour segment", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Points Plan",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 0,
        points: 200, // 200 points/hour = 100 points/half-hour
      }),
      fallback(),
    ]);

    // 2 hours = 4 half-hours
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(0);
    expect(result!.finalPoints).toBe(400); // 4 × 100
  });

  it("combined price + points both accumulate", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Combo",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600, // ¥3/half-hour
        points: 100, // 50 points/half-hour
      }),
      fallback(),
    ]);

    // 1.5 hours = 3 half-hours
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 3,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(900); // 3 × 300
    expect(result!.finalPoints).toBe(150); // 3 × 50
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Split Day/Night Caps
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — split day/night caps", () => {
  const mkSplitCapPlan = (name: string, price: number) =>
    plan({
      name,
      conditions: {
        date: { type: "workdays" },
        time: { type: "all_day" },
        member: { type: "irrelevant" },
        scope: [],
      },
      price,
      points: 100,
      cap_enabled: true,
      cap_unit: "split_day_night",
      cap_price_day: 3000,
      cap_price_night: 2000,
      cap_points_day: 500,
      cap_points_night: 300,
    });

  it("applies daytime cap when session is during daytime", () => {
    const snapshot = makeSnapshot([mkSplitCapPlan("Day Capped", 1000), fallback()]);

    // Monday 10:00 to 18:00 (8 hours daytime, 16 half-hours × ¥5 = ¥80)
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 16,
      "boardgame",
      snapshot,
    );
    expect(result!.capApplied).toBe(true);
    expect(result!.capType).toBe("daytime");
    expect(result!.finalPrice).toBe(3000); // capped at ¥30
  });

  it("applies nighttime cap when session is during nighttime", () => {
    const snapshot = makeSnapshot([mkSplitCapPlan("Night Capped", 1000), fallback()]);

    // Monday 19:00 to 23:00 (4 hours nighttime, 8 half-hours × ¥5 = ¥40)
    const result = calculatePrice(
      MONDAY_19PM,
      MONDAY_19PM + HALF_HOUR * 8,
      "boardgame",
      snapshot,
    );
    expect(result!.capApplied).toBe(true);
    expect(result!.capType).toBe("nighttime");
    expect(result!.finalPrice).toBe(2000); // capped at ¥20
  });

  it("caps points independently (daytime)", () => {
    const snapshot = makeSnapshot([mkSplitCapPlan("Pts Capped", 200), fallback()]);

    // Monday 10:00 to 20:00 (10 hours, 20 half-hours)
    // Points: 20 × 50 = 1000 → capped at 500
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 20,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPoints).toBe(500);
  });

  it("no cap when under both limits", () => {
    const snapshot = makeSnapshot([mkSplitCapPlan("Under Cap", 1000), fallback()]);

    // 1 hour daytime: 2 half-hours × ¥5 = ¥10 (under ¥30 cap)
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 2,
      "boardgame",
      snapshot,
    );
    expect(result!.capApplied).toBe(false);
    expect(result!.finalPrice).toBe(1000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Per-Day Caps with Points
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — per_day cap with points", () => {
  it("caps both price and points independently", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Full Capped",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1000,
        points: 200,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 4000,
        cap_points: 600,
      }),
      fallback(),
    ]);

    // 10 hours = 20 half-hours
    // Raw price: 20 × 500 = 10000, capped at 4000
    // Raw points: 20 × 100 = 2000, capped at 600
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 20,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(4000);
    expect(result!.finalPoints).toBe(600);
    expect(result!.capApplied).toBe(true);
  });

  it("price caps but points do not when only price exceeds", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Price Only Cap",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 2000, // ¥10/half-hour
        points: 50, // 25 points/half-hour
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 5000,
        cap_points: 9999, // very high, won't be hit
      }),
      fallback(),
    ]);

    // 4 hours = 8 half-hours → price: 8000 > 5000, points: 200 < 9999
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 8,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(5000);
    expect(result!.finalPoints).toBe(200); // uncapped
    expect(result!.capApplied).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Weekly / Monthly / Fixed Date Conditions
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — date condition types", () => {
  it("weekly: matches specific days (Wed + Sat)", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "WedSat Special",
        conditions: {
          date: { type: "weekly", days: [3, 6] }, // Wed=3, Sat=6
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600,
      }),
      fallback({ price: 1000 }),
    ]);

    // Wednesday → matches
    const wed = calculatePrice(
      WEDNESDAY_10AM,
      WEDNESDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(wed!.planName).toBe("WedSat Special");
    expect(wed!.finalPrice).toBe(1200); // 4 × 300

    // Saturday → matches
    const sat = calculatePrice(
      SATURDAY_14PM,
      SATURDAY_14PM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(sat!.planName).toBe("WedSat Special");

    // Monday → doesn't match, falls to Fallback
    const mon = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(mon!.planName).toBe("Fallback");
    expect(mon!.finalPrice).toBe(2000); // 4 × 500
  });

  it("monthly: matches specific day of month (15th)", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "15th Special",
        conditions: {
          date: { type: "monthly", nth: 15, unit: "natural" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 400,
      }),
      fallback({ price: 1000 }),
    ]);

    // Jan 15 → matches
    const jan15 = calculatePrice(
      JAN_15_10AM,
      JAN_15_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(jan15!.planName).toBe("15th Special");
    expect(jan15!.finalPrice).toBe(800); // 4 × 200

    // Jan 8 → doesn't match
    const jan8 = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(jan8!.planName).toBe("Fallback");
  });

  it("fixed date range: matches within MM-DD range", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Summer Special",
        conditions: {
          date: { type: "fixed", start: "01-05", end: "01-20" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 500,
      }),
      fallback({ price: 1000 }),
    ]);

    // Jan 8 (within 01-05 to 01-20) → matches
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("Summer Special");
    expect(result!.finalPrice).toBe(1000); // 4 × 250

    // Feb 8 → doesn't match
    const feb8 = new Date("2024-02-08T10:00:00").getTime();
    const r2 = calculatePrice(
      feb8,
      feb8 + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(r2!.planName).toBe("Fallback");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Priority Ordering (sort_order)
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — sort_order priority", () => {
  it("lower sort_order wins when multiple conditions match", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Low Priority",
        sort_order: 5,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 2000,
      }),
      plan({
        name: "High Priority",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600,
      }),
      fallback({ price: 1000 }),
    ]);

    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("High Priority");
    expect(result!.finalPrice).toBe(1200); // 4 × 300
  });

  it("plans with same sort_order: first in array wins (stable sort)", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "First",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 800,
      }),
      plan({
        name: "Second",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1200,
      }),
      fallback(),
    ]);

    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("First");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Disabled Plans
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — disabled plans skipped", () => {
  it("skips disabled conditional plans", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Disabled Cheap",
        sort_order: 1,
        enabled: false,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 100,
      }),
      plan({
        name: "Enabled Normal",
        sort_order: 2,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 800,
      }),
      fallback({ price: 1000 }),
    ]);

    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("Enabled Normal");
    expect(result!.finalPrice).toBe(1600); // 4 × 400
  });

  it("falls to fallback when all conditionals disabled", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Disabled",
        sort_order: 1,
        enabled: false,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 100,
      }),
      fallback({ price: 1000 }),
    ]);

    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("Fallback");
    expect(result!.finalPrice).toBe(2000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Custom Time Condition
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — custom time range", () => {
  it("matches within custom time window", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Happy Hour",
        conditions: {
          date: { type: "workdays" },
          time: { type: "custom", start: "14:00", end: "17:00" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 400,
      }),
      fallback({ price: 1000 }),
    ]);

    // Monday 14:00 → matches
    const mon14 = new Date("2024-01-08T14:00:00").getTime();
    const result = calculatePrice(
      mon14,
      mon14 + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("Happy Hour");
    expect(result!.finalPrice).toBe(800); // 4 × 200
  });

  it("does NOT match outside custom time window", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Happy Hour",
        conditions: {
          date: { type: "workdays" },
          time: { type: "custom", start: "14:00", end: "17:00" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 400,
      }),
      fallback({ price: 1000 }),
    ]);

    // Monday 10:00 → outside 14:00-17:00
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("Fallback");
  });

  it("segments crossing custom boundary use different plans", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Happy Hour",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "custom", start: "17:00", end: "19:00" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 400, // ¥2/half-hour
      }),
      fallback({ price: 1000 }), // ¥5/half-hour
    ]);

    // Monday 16:00 to 18:00 (4 half-hours)
    // 16:00-16:30 → fallback (outside 17:00-19:00) → ¥5
    // 16:30-17:00 → fallback → ¥5
    // 17:00-17:30 → happy hour → ¥2
    // 17:30-18:00 → happy hour → ¥2
    const mon16 = new Date("2024-01-08T16:00:00").getTime();
    const result = calculatePrice(
      mon16,
      mon16 + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(1400); // 2×500 + 2×200
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Scope Filtering
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — scope filtering", () => {
  it("empty scope matches all table types", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "All Scope",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 800,
      }),
      fallback({ price: 1000 }),
    ]);

    const boardgame = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 2,
      "boardgame",
      snapshot,
    );
    const mahjong = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 2,
      "mahjong",
      snapshot,
    );
    expect(boardgame!.planName).toBe("All Scope");
    expect(mahjong!.planName).toBe("All Scope");
  });

  it("specific scope only matches listed types", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Mahjong Special",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: ["mahjong"],
        },
        price: 2000,
      }),
      plan({
        name: "Board+TRPG",
        sort_order: 2,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: ["boardgame", "trpg"],
        },
        price: 800,
      }),
      fallback({ price: 1000 }),
    ]);

    const mahjong = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "mahjong",
      snapshot,
    );
    expect(mahjong!.planName).toBe("Mahjong Special");
    expect(mahjong!.finalPrice).toBe(4000); // 4 × 1000

    const boardgame = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(boardgame!.planName).toBe("Board+TRPG");
    expect(boardgame!.finalPrice).toBe(1600); // 4 × 400

    const trpg = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "trpg",
      snapshot,
    );
    expect(trpg!.planName).toBe("Board+TRPG");

    // console → no scope match on either conditional → fallback
    const console = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 4,
      "console",
      snapshot,
    );
    expect(console!.planName).toBe("Fallback");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Mixed Strategies Across Time Boundaries
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — mixed strategies across time boundaries", () => {
  it("hourly daytime + different hourly nighttime with respective caps", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Day Rate",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "daytime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1000, // ¥5/half-hour
        points: 100,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 3000,
        cap_points: 400,
      }),
      plan({
        name: "Night Rate",
        sort_order: 2,
        conditions: {
          date: { type: "workdays" },
          time: { type: "nighttime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600, // ¥3/half-hour
        points: 50,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 2000,
        cap_points: 200,
      }),
      fallback({ price: 1000 }),
    ]);

    // Monday 16:00 to 20:00 (8 half-hours crossing day→night at 18:00)
    // Day: 16:00-16:30, 16:30-17:00, 17:00-17:30, 17:30-18:00 → 4 × 500 = 2000, 4 × 50pts = 200pts
    // Night: 18:00-18:30, 18:30-19:00, 19:00-19:30, 19:30-20:00 → 4 × 300 = 1200, 4 × 25pts = 100pts
    // Day uncapped (2000 ≤ 3000), Night uncapped (1200 ≤ 2000)
    const mon16 = new Date("2024-01-08T16:00:00").getTime();
    const result = calculatePrice(
      mon16,
      mon16 + HALF_HOUR * 8,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(2000 + 1200); // 3200
    expect(result!.finalPoints).toBe(200 + 100); // 300
    expect(result!.capApplied).toBe(false);
  });

  it("hourly daytime hits cap, nighttime does not", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Day Capped",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "daytime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1000,
        points: 0,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 2000,
        cap_points: null,
      }),
      plan({
        name: "Night Uncapped",
        sort_order: 2,
        conditions: {
          date: { type: "workdays" },
          time: { type: "nighttime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600,
        points: 0,
        cap_enabled: false,
        cap_unit: null,
        cap_price: null,
        cap_points: null,
      }),
      fallback({ price: 1000 }),
    ]);

    // Monday 14:00 to 20:00 (12 half-hours: 8 daytime + 4 nighttime)
    // Day: 8 × 500 = 4000 → capped at 2000
    // Night: 4 × 300 = 1200 → no cap
    const mon14 = new Date("2024-01-08T14:00:00").getTime();
    const result = calculatePrice(
      mon14,
      mon14 + HALF_HOUR * 12,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(2000 + 1200); // 3200
    expect(result!.capApplied).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Edge Cases
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — edge cases", () => {
  it("0-price plan returns 0 total", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Free Plan",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 0,
        points: 0,
      }),
      fallback({ price: 1000 }),
    ]);

    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 10,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(0);
    expect(result!.finalPoints).toBe(0);
    expect(result!.planName).toBe("Free Plan");
  });

  it("very long session (24h) with cap", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "All Day",
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1000,
        points: 0,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 8000,
        cap_points: null,
      }),
      fallback(),
    ]);

    // 24 hours = 48 half-hours × ¥5 = ¥240, capped at ¥80
    const result = calculatePrice(
      MONDAY_10AM,
      MONDAY_10AM + HALF_HOUR * 48,
      "boardgame",
      snapshot,
    );
    expect(result!.finalPrice).toBe(8000);
    expect(result!.capApplied).toBe(true);
    expect(result!.billableHalfHours).toBe(48);
    expect(result!.rawPrice).toBe(24000);
  });

  it("holidays condition matches weekend", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Holiday Rate",
        conditions: {
          date: { type: "holidays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1500,
      }),
      fallback({ price: 1000 }),
    ]);

    // Sunday → holiday
    const result = calculatePrice(
      SUNDAY_10AM,
      SUNDAY_10AM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(result!.planName).toBe("Holiday Rate");
    expect(result!.finalPrice).toBe(3000); // 4 × 750

    // Saturday → holiday
    const sat = calculatePrice(
      SATURDAY_14PM,
      SATURDAY_14PM + HALF_HOUR * 4,
      "boardgame",
      snapshot,
    );
    expect(sat!.planName).toBe("Holiday Rate");
  });

  it("paused session crossing plan boundaries", () => {
    const snapshot = makeSnapshot([
      plan({
        name: "Day",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "daytime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1000,
      }),
      plan({
        name: "Night",
        sort_order: 2,
        conditions: {
          date: { type: "workdays" },
          time: { type: "nighttime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600,
      }),
      fallback(),
    ]);

    // Monday 17:00 to 19:00, paused 17:30-18:00
    // Effective: 17:00-17:30 (day) + 18:00-18:30 (night) + 18:30-19:00 (night) = 90min
    // billable = ceil(90min / 30min) = 3 half-hours
    const mon17 = new Date("2024-01-08T17:00:00").getTime();
    const pauses = [{
      pausedAt: mon17 + HALF_HOUR,       // 17:30
      resumedAt: mon17 + HALF_HOUR * 2,  // 18:00
    }];
    const result = calculatePrice(
      mon17,
      mon17 + HALF_HOUR * 4,
      "boardgame",
      snapshot,
      pauses,
    );
    expect(result).not.toBeNull();
    expect(result!.billableHalfHours).toBe(3);
    // Segment timestamps: 17:00 (day), 18:00 (night), 18:30 (night)
    // Price: 500 + 300 + 300 = 1100
    expect(result!.finalPrice).toBe(1100);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// No-fallback scenario: last matched plan continues
// ═════════════════════════════════════════════════════════════════════════════

describe("calculatePrice — no fallback, gaps filled by last matched plan", () => {
  it("daytime-only plan continues to charge for nighttime segments (no fallback)", () => {
    // Simulates the user's bug: only a daytime plan exists, no fallback, no nighttime plan
    const snapshot = makeSnapshot([
      plan({
        name: "工作日白天定价",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "daytime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1000, // ¥10/hour → ¥5/half-hour
        points: 0,
      }),
      // NO fallback, NO nighttime plan
    ]);

    // Monday 14:13 to 21:47 (~7.5h, crosses 18:00 boundary)
    const start = new Date("2024-01-08T14:13:00").getTime();
    const end = new Date("2024-01-08T21:47:00").getTime();
    const result = calculatePrice(start, end, "boardgame", snapshot);

    expect(result).not.toBeNull();
    // Total effective: ~454 min → ceil(454/30) = 16 half-hours
    // First half-hour is free (<= 30min check): no, 454 > 30, so all 16 are billed
    const expectedHalfHours = Math.ceil((end - start) / (30 * 60 * 1000));
    expect(result!.billableHalfHours).toBe(expectedHalfHours);
    // All segments should charge ¥5 each (daytime plan continues into night)
    expect(result!.finalPrice).toBe(expectedHalfHours * 500);
  });

  it("only nighttime plan: daytime segments use last matched plan from initial match", () => {
    // If session starts daytime but only a nighttime plan exists (odd config)
    // First segments have no match → lastMatchedPlan is null → skip
    // Once nighttime hits → matches → charges from then on
    const snapshot = makeSnapshot([
      plan({
        name: "Night Only",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "nighttime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600, // ¥3/half-hour
        points: 0,
      }),
    ]);

    // Monday 17:00 to 20:00 (6 half-hours)
    // 17:00 daytime → no match, no lastMatched → skip
    // 17:30 daytime → skip
    // 18:00 nighttime → matches "Night Only" → ¥3
    // 18:30 nighttime → ¥3
    // 19:00 nighttime → ¥3
    // 19:30 nighttime → ¥3
    const mon17 = new Date("2024-01-08T17:00:00").getTime();
    const result = calculatePrice(
      mon17,
      mon17 + 30 * 60 * 1000 * 6,
      "boardgame",
      snapshot,
    );
    expect(result).not.toBeNull();
    expect(result!.finalPrice).toBe(4 * 300); // only 4 nighttime segments charged
  });

  it("gap between two time-scoped plans uses last matched plan", () => {
    // Plan A: 10:00-14:00, Plan B: 16:00-22:00, no fallback
    // Session 13:00-17:00: segments at 13:00, 13:30 → A; 14:00, 14:30...15:30 → gap filled by A; 16:00, 16:30 → B
    const snapshot = makeSnapshot([
      plan({
        name: "Morning",
        sort_order: 1,
        conditions: {
          date: { type: "workdays" },
          time: { type: "custom", start: "10:00", end: "14:00" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 1000, // ¥5/half-hour
      }),
      plan({
        name: "Afternoon",
        sort_order: 2,
        conditions: {
          date: { type: "workdays" },
          time: { type: "custom", start: "16:00", end: "22:00" },
          member: { type: "irrelevant" },
          scope: [],
        },
        price: 600, // ¥3/half-hour
      }),
    ]);

    // Monday 13:00 to 17:00 (8 half-hours)
    // 13:00, 13:30 → Morning (¥5 each)
    // 14:00, 14:30, 15:00, 15:30 → no match, lastMatched = Morning → ¥5 each
    // 16:00, 16:30 → Afternoon (¥3 each)
    const mon13 = new Date("2024-01-08T13:00:00").getTime();
    const result = calculatePrice(
      mon13,
      mon13 + 30 * 60 * 1000 * 8,
      "boardgame",
      snapshot,
    );
    expect(result).not.toBeNull();
    // Morning: 6 segments × ¥5 = ¥30, Afternoon: 2 segments × ¥3 = ¥6
    expect(result!.finalPrice).toBe(6 * 500 + 2 * 300);
  });
});
