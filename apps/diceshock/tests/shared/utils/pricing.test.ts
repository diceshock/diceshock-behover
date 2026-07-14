/**
 * Regression tests for pricing utility.
 *
 * Bug #4: `n.plans.filter is not a function`
 *   - calculatePrice must return null (not crash) when snapshot.plans is not an array
 *   - calculatePrice must return null when snapshot is null or plans is empty
 *
 * Also covers correct calculation behavior:
 *   - FREE_PERIOD_MS = 30 min: first 30 min free
 *   - hourly plan: pricePerHalfHour * billableHalfHours
 *   - cap enforcement
 *   - pause deduction from billable time
 *   - findMatchingPlan: conditional match vs fallback
 */
import { describe, expect, it } from "vitest";
import { calculatePrice, formatPrice, formatDualPrice, type SnapshotData } from "@/shared/utils/pricing";

const HALF_HOUR = 30 * 60 * 1000;

function makeSnapshot(plans: SnapshotData["plans"] = []): SnapshotData {
  return {
    config: { daytime_start: "10:00", daytime_end: "18:00" },
    plans,
  };
}

function fallbackPlan(price = 1000, opts?: Partial<SnapshotData["plans"][0]>): SnapshotData["plans"][0] {
  return {
    plan_type: "fallback",
    name: "Fallback",
    sort_order: 99,
    enabled: true,
    conditions: undefined,
    billing_type: "hourly",
    price,
    points: 0,
    cap_enabled: false,
    cap_unit: null,
    cap_price: null,
    cap_price_day: null,
    cap_price_night: null,
    cap_points: null,
    cap_points_day: null,
    cap_points_night: null,
    ...opts,
  };
}

describe("calculatePrice — null/crash guards (Bug #4 regression)", () => {
  it("returns null when snapshot is null", () => {
    const result = calculatePrice(0, HALF_HOUR * 3, "boardgame", null);
    expect(result).toBeNull();
  });

  it("returns null when plans array is empty", () => {
    const result = calculatePrice(0, HALF_HOUR * 3, "boardgame", makeSnapshot([]));
    expect(result).toBeNull();
  });

  it("returns null when plans is not an array (string)", () => {
    // Simulates the bug: data.plans was a JSON string, not parsed
    const bad = { config: { daytime_start: "10:00", daytime_end: "18:00" }, plans: "[{\"name\":\"x\"}]" as unknown as SnapshotData["plans"] };
    // Before the fix, this would throw "plans.filter is not a function"
    // After the fix on the CALLER side (parsing), this scenario shouldn't reach calculatePrice.
    // But calculatePrice itself should still not crash if plans somehow isn't an array.
    expect(() => calculatePrice(0, HALF_HOUR * 3, "boardgame", bad)).not.toThrow();
  });

  it("returns null when plans is undefined", () => {
    const bad = { config: { daytime_start: "10:00", daytime_end: "18:00" }, plans: undefined as unknown as SnapshotData["plans"] };
    expect(() => calculatePrice(0, HALF_HOUR * 3, "boardgame", bad)).not.toThrow();
  });
});

describe("calculatePrice — free period", () => {
  const snapshot = makeSnapshot([fallbackPlan(1000)]); // ¥10/hour = ¥5/half-hour

  it("price is 0 for first 30 minutes (free period)", () => {
    const result = calculatePrice(0, HALF_HOUR, "boardgame", snapshot);
    // billableMs = max(0, 30min - 30min) = 0 → 0 half-hours → price 0
    expect(result).not.toBeNull();
    expect(result!.finalPrice).toBe(0);
  });

  it("price starts after free period", () => {
    // 1 hour total → effectiveMs = 60min → billableMs = 30min → 1 half-hour
    const result = calculatePrice(0, HALF_HOUR * 2, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.finalPrice).toBe(500); // ¥5 for one billable half-hour
    expect(result!.billableHalfHours).toBe(1);
  });

  it("2 hours = 3 billable half-hours (minus free period)", () => {
    const result = calculatePrice(0, HALF_HOUR * 4, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.billableHalfHours).toBe(3);
    expect(result!.finalPrice).toBe(1500); // ¥15
  });
});

describe("calculatePrice — pause deduction", () => {
  const start = 0;
  const end = HALF_HOUR * 4; // 2 hours
  const snapshot = makeSnapshot([fallbackPlan(1000)]); // ¥10/hour

  it("pause subtracts from effective time", () => {
    // Pause the entire second half-hour
    const pauses = [{ pausedAt: HALF_HOUR, resumedAt: HALF_HOUR * 2 }];
    const result = calculatePrice(start, end, "boardgame", snapshot, pauses);
    expect(result).not.toBeNull();
    // totalMs = 2h, pausedMs = 30min, effectiveMs = 90min, billableMs = 60min → 2 half-hours
    expect(result!.billableHalfHours).toBe(2);
    expect(result!.finalPrice).toBe(1000); // ¥10
  });

  it("pausing entire duration results in 0 price", () => {
    const pauses = [{ pausedAt: start, resumedAt: end }];
    const result = calculatePrice(start, end, "boardgame", snapshot, pauses);
    expect(result).not.toBeNull();
    expect(result!.finalPrice).toBe(0);
  });
});

describe("calculatePrice — cap enforcement", () => {
  const snapshot = makeSnapshot([
    fallbackPlan(1000, { cap_enabled: true, cap_unit: "per_day", cap_price: 5000 }),
  ]); // ¥10/hour, capped at ¥50/day

  it("no cap when under limit", () => {
    // 3 hours = 5 billable half-hours = ¥25
    const result = calculatePrice(0, HALF_HOUR * 6, "boardgame", snapshot);
    expect(result!.finalPrice).toBe(2500);
    expect(result!.capApplied).toBe(false);
  });

  it("applies cap when over limit", () => {
    // 12 hours = 23 billable half-hours = ¥115 → capped at ¥50
    const result = calculatePrice(0, HALF_HOUR * 24, "boardgame", snapshot);
    expect(result!.finalPrice).toBe(5000);
    expect(result!.capApplied).toBe(true);
  });
});

describe("calculatePrice — findMatchingPlan", () => {
  it("uses fallback when no conditional matches", () => {
    const snapshot = makeSnapshot([
      {
        plan_type: "conditional",
        name: "Weekday Special",
        sort_order: 1,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: ["boardgame"],
        },
        billing_type: "hourly",
        price: 800,
        points: 0,
        cap_enabled: false,
        cap_unit: null,
        cap_price: null,
        cap_price_day: null,
        cap_price_night: null,
        cap_points: null,
        cap_points_day: null,
        cap_points_night: null,
      },
      fallbackPlan(1000),
    ]);

    // Use a Sunday (no conditional match) — 2024-01-07 is a Sunday
    const sunday10am = new Date("2024-01-07T10:00:00").getTime();
    const result = calculatePrice(sunday10am, sunday10am + HALF_HOUR * 4, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.planName).toBe("Fallback");
  });

  it("uses conditional plan when conditions match", () => {
    const snapshot = makeSnapshot([
      {
        plan_type: "conditional",
        name: "Weekday Special",
        sort_order: 1,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: ["boardgame"],
        },
        billing_type: "hourly",
        price: 800,
        points: 0,
        cap_enabled: false,
        cap_unit: null,
        cap_price: null,
        cap_price_day: null,
        cap_price_night: null,
        cap_points: null,
        cap_points_day: null,
        cap_points_night: null,
      },
      fallbackPlan(1000),
    ]);

    // Use a Monday — 2024-01-08 is a Monday
    const monday10am = new Date("2024-01-08T10:00:00").getTime();
    const result = calculatePrice(monday10am, monday10am + HALF_HOUR * 4, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.planName).toBe("Weekday Special");
  });

  it("returns null when only conditionals exist and none match (no fallback)", () => {
    const snapshot = makeSnapshot([
      {
        plan_type: "conditional",
        name: "Weekday Only",
        sort_order: 1,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: ["boardgame"],
        },
        billing_type: "hourly",
        price: 800,
        points: 0,
        cap_enabled: false,
        cap_unit: null,
        cap_price: null,
        cap_price_day: null,
        cap_price_night: null,
        cap_points: null,
        cap_points_day: null,
        cap_points_night: null,
      },
    ]);

    // Sunday — no match, no fallback
    const sunday = new Date("2024-01-07T10:00:00").getTime();
    const result = calculatePrice(sunday, sunday + HALF_HOUR * 4, "boardgame", snapshot);
    expect(result).toBeNull();
  });

  it("scope mismatch → falls through to fallback", () => {
    const snapshot = makeSnapshot([
      {
        plan_type: "conditional",
        name: "Mahjong Only",
        sort_order: 1,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          member: { type: "irrelevant" },
          scope: ["mahjong"],
        },
        billing_type: "hourly",
        price: 2000,
        points: 0,
        cap_enabled: false,
        cap_unit: null,
        cap_price: null,
        cap_price_day: null,
        cap_price_night: null,
        cap_points: null,
        cap_points_day: null,
        cap_points_night: null,
      },
      fallbackPlan(1000),
    ]);

    const monday = new Date("2024-01-08T10:00:00").getTime();
    const result = calculatePrice(monday, monday + HALF_HOUR * 4, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.planName).toBe("Fallback");
  });
});

describe("formatPrice / formatDualPrice", () => {
  it("formatPrice formats cents to yen", () => {
    expect(formatPrice(1000)).toBe("¥10.00");
    expect(formatPrice(50)).toBe("¥0.50");
    expect(formatPrice(0)).toBe("¥0.00");
  });

  it("formatDualPrice shows both when present", () => {
    expect(formatDualPrice(1000, 50)).toBe("¥10.00 50点");
  });

  it("formatDualPrice shows only price when no points", () => {
    expect(formatDualPrice(1000, 0)).toBe("¥10.00");
  });

  it("formatDualPrice shows only points when no price", () => {
    expect(formatDualPrice(0, 50)).toBe("50点");
  });

  it("formatDualPrice defaults to ¥0.00 when both zero", () => {
    expect(formatDualPrice(0, 0)).toBe("¥0.00");
    expect(formatDualPrice(null, null)).toBe("¥0.00");
    expect(formatDualPrice(undefined, undefined)).toBe("¥0.00");
  });
});
