import { describe, expect, it } from "vitest";
import { buildFilter } from "@/apps/routers/dash/events";
import type { ParsedSearch } from "@/client/lib/searchParser";

describe("buildFilter", () => {
  it("maps free text and type to search", () => {
    const parsed: ParsedSearch = {
      freeText: "hello",
      filters: { type: { operator: "eq", value: "game" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBe("hello game");
    expect(result.pagination).toEqual({ offset: 0, limit: 20 });
    expect(result.sortBy).toBeUndefined();
  });

  it("maps status filter to uppercase array", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { status: { operator: "in", value: ["active", "ended"] } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.status).toEqual(["ACTIVE", "ENDED"]);
  });

  it("maps single status filter to uppercase array", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { status: { operator: "eq", value: "active" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.status).toEqual(["ACTIVE"]);
  });

  it("maps date filter (eq) to dateFrom/dateTo", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { date: { operator: "eq", value: "2025-01-15" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.dateFrom).toBe("2025-01-15");
    expect(result.dateTo).toBe("2025-01-15");
  });

  it("maps date range filter to dateFrom/dateTo", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: {
        date: { operator: "range", value: ["2025-01-01", "2025-06-30"] },
      },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.dateFrom).toBe("2025-01-01");
    expect(result.dateTo).toBe("2025-06-30");
  });

  it("maps store filter", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { store: { operator: "eq", value: "store-123" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.store).toBe("store-123");
  });

  it("maps sortBy and sortOrder from sorting state", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const asc = buildFilter(parsed, 1, [{ id: "createdAt", desc: false }]);
    expect(asc.sortBy).toBe("createdAt");
    expect(asc.sortOrder).toBe("ASC");
    const desc = buildFilter(parsed, 1, [{ id: "createdAt", desc: true }]);
    expect(desc.sortOrder).toBe("DESC");
  });

  it("computes pagination offset from page", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    expect(buildFilter(parsed, 1, []).pagination).toEqual({
      offset: 0,
      limit: 20,
    });
    expect(buildFilter(parsed, 3, []).pagination).toEqual({
      offset: 40,
      limit: 20,
    });
  });

  it("returns undefined for empty filter", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.store).toBeUndefined();
  });
});
