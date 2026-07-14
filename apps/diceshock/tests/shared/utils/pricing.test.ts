/**
 * Tests for pricing utility.
 *
 * Key behaviors:
 *   - Free period: ≤30 min effective time → free; >30 min → ALL half-hours billed (no deduction)
 *   - Per-segment plan matching: each half-hour independently evaluates conditions
 *   - Cap enforcement per plan
 *   - Pause deduction from effective time
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

describe("calculatePrice — null/crash guards", () => {
  it("returns null when snapshot is null", () => {
    const result = calculatePrice(0, HALF_HOUR * 3, "boardgame", null);
    expect(result).toBeNull();
  });

  it("returns null when plans array is empty", () => {
    const result = calculatePrice(0, HALF_HOUR * 3, "boardgame", makeSnapshot([]));
    expect(result).toBeNull();
  });

  it("returns null when plans is not an array (string)", () => {
    const bad = { config: { daytime_start: "10:00", daytime_end: "18:00" }, plans: "[{\"name\":\"x\"}]" as unknown as SnapshotData["plans"] };
    expect(() => calculatePrice(0, HALF_HOUR * 3, "boardgame", bad)).not.toThrow();
  });

  it("returns null when plans is undefined", () => {
    const bad = { config: { daytime_start: "10:00", daytime_end: "18:00" }, plans: undefined as unknown as SnapshotData["plans"] };
    expect(() => calculatePrice(0, HALF_HOUR * 3, "boardgame", bad)).not.toThrow();
  });
});

describe("calculatePrice — free period (≤30min free, >30min bills all)", () => {
  const snapshot = makeSnapshot([fallbackPlan(1000)]); // ¥10/hour = ¥5/half-hour

  it("price is 0 for exactly 30 minutes (within free period)", () => {
    const result = calculatePrice(0, HALF_HOUR, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.finalPrice).toBe(0);
    expect(result!.billableHalfHours).toBe(0);
  });

  it("price is 0 for 15 minutes (within free period)", () => {
    const result = calculatePrice(0, HALF_HOUR / 2, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.finalPrice).toBe(0);
    expect(result!.billableHalfHours).toBe(0);
  });

  it("1 hour = 2 billable half-hours (exceeds 30min, all time billed)", () => {
    const result = calculatePrice(0, HALF_HOUR * 2, "boardgame", snapshot);
    expect(result).not.toBeNull();
    // effectiveMs = 60min > 30min → bill all: ceil(60min / 30min) = 2 half-hours
    expect(result!.billableHalfHours).toBe(2);
    expect(result!.finalPrice).toBe(1000); // 2 × ¥5
  });

  it("31 minutes = 2 billable half-hours (exceeds 30min, all billed)", () => {
    const result = calculatePrice(0, HALF_HOUR + 60000, "boardgame", snapshot);
    expect(result).not.toBeNull();
    // 31min > 30min → ceil(31min / 30min) = 2 half-hours
    expect(result!.billableHalfHours).toBe(2);
    expect(result!.finalPrice).toBe(1000); // 2 × ¥5
  });

  it("2 hours = 4 billable half-hours (all billed)", () => {
    const result = calculatePrice(0, HALF_HOUR * 4, "boardgame", snapshot);
    expect(result).not.toBeNull();
    expect(result!.billableHalfHours).toBe(4);
    expect(result!.finalPrice).toBe(2000); // 4 × ¥5
  });
});

describe("calculatePrice — pause deduction", () => {
  const start = 0;
  const end = HALF_HOUR * 4; // 2 hours
  const snapshot = makeSnapshot([fallbackPlan(1000)]); // ¥10/hour

  it("pause subtracts from effective time, remains above free threshold", () => {
    // Pause the entire second half-hour (30min paused)
    const pauses = [{ pausedAt: HALF_HOUR, resumedAt: HALF_HOUR * 2 }];
    const result = calculatePrice(start, end, "boardgame", snapshot, pauses);
    expect(result).not.toBeNull();
    // totalMs = 2h, pausedMs = 30min, effectiveMs = 90min > 30min → bill all
    // billableHalfHours = ceil(90min / 30min) = 3
    expect(result!.billableHalfHours).toBe(3);
    expect(result!.finalPrice).toBe(1500); // 3 × ¥5
  });

  it("pause reduces effective time to exactly 30min → free", () => {
    // 1 hour total, 30 min paused → effectiveMs = 30min ≤ 30min → free
    const pauses = [{ pausedAt: HALF_HOUR, resumedAt: HALF_HOUR * 2 }];
    const result = calculatePrice(start, HALF_HOUR * 2, "boardgame", snapshot, pauses);
    expect(result).not.toBeNull();
    expect(result!.finalPrice).toBe(0);
    expect(result!.billableHalfHours).toBe(0);
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
    // 3 hours = 6 billable half-hours = ¥30
    const result = calculatePrice(0, HALF_HOUR * 6, "boardgame", snapshot);
    expect(result!.finalPrice).toBe(3000);
    expect(result!.capApplied).toBe(false);
  });

  it("applies cap when over limit", () => {
    // 12 hours = 24 billable half-hours = ¥120 → capped at ¥50
    const result = calculatePrice(0, HALF_HOUR * 24, "boardgame", snapshot);
    expect(result!.finalPrice).toBe(5000);
    expect(result!.capApplied).toBe(true);
  });
});

describe("calculatePrice — per-segment plan matching", () => {
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
    // 2 hours = 4 half-hours × ¥4/half-hour (800/2) = ¥16
    expect(result!.finalPrice).toBe(1600);
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

  it("different half-hours match different plans when time conditions change", () => {
    // Daytime plan ends at 18:00, nighttime plan starts at 18:00
    const snapshot = makeSnapshot([
      {
        plan_type: "conditional",
        name: "Daytime Rate",
        sort_order: 1,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "daytime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        billing_type: "hourly",
        price: 800, // ¥4/half-hour
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
      {
        plan_type: "conditional",
        name: "Nighttime Rate",
        sort_order: 2,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "nighttime" },
          member: { type: "irrelevant" },
          scope: [],
        },
        billing_type: "hourly",
        price: 600, // ¥3/half-hour
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

    // Monday 17:00 to 19:00 (2 hours, crosses day/night at 18:00)
    // config: daytime 10:00-18:00
    const monday17 = new Date("2024-01-08T17:00:00").getTime();
    const result = calculatePrice(monday17, monday17 + HALF_HOUR * 4, "boardgame", snapshot);
    expect(result).not.toBeNull();
    // 4 half-hours total:
    //   17:00-17:30 → daytime → ¥4
    //   17:30-18:00 → daytime → ¥4
    //   18:00-18:30 → nighttime → ¥3
    //   18:30-19:00 → nighttime → ¥3
    expect(result!.billableHalfHours).toBe(4);
    expect(result!.finalPrice).toBe(1400); // 2×400 + 2×300
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
