import { describe, expect, it, vi } from "vitest";

vi.mock("@lib/db", () => {
  const query = {
    select: vi.fn(() => query),
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn(() => query),
    values: vi.fn(() => query),
    returning: vi.fn(async () => []),
  };
  return {
    default: vi.fn(() => query),
    drizzle: { and: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn() },
    userPreferencesTable: {},
    activesTable: {},
    preferencePushLogTable: {},
    activeRegistrationsTable: {},
  };
});

vi.mock("@/shared/preferences/rruleExpand", () => ({
  expandRruleToDateRanges: vi.fn((rrule: string, _from: Date, _to: Date) => {
    if (rrule.includes("BYDAY=WE")) {
      return [{ date: "2025-06-25", start: "19:00", end: "22:00" }];
    }
    if (rrule.includes("BYDAY=SA")) {
      return [{ date: "2025-06-28", start: "14:00", end: "22:00" }];
    }
    return [];
  }),
}));

describe("preferenceMatching", () => {
  it("exports runPreferenceMatching as a function", async () => {
    const mod = await import("../preferenceMatching");
    expect(mod.runPreferenceMatching).toBeDefined();
    expect(typeof mod.runPreferenceMatching).toBe("function");
  });

  it("resolves all module imports without error", async () => {
    const mod = await import("../preferenceMatching");
    expect(mod).toBeTruthy();
  });
});
