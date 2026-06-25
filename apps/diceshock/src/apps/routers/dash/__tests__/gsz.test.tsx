import { describe, expect, it } from "vitest";
import { buildFilter } from "@/apps/routers/dash/gsz";
import type { ParsedSearch } from "@/client/lib/searchParser";

describe("buildFilter", () => {
  it("maps free text to search field", () => {
    const parsed: ParsedSearch = {
      freeText: "hello",
      filters: {},
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBe("hello");
    expect(result.pagination).toEqual({ offset: 0, limit: 50 });
  });

  it("maps mode filter 3p to THREE_PLAYER", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { mode: { operator: "eq", value: "3p" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.mode).toEqual(["THREE_PLAYER"]);
  });

  it("maps mode filter 4p to FOUR_PLAYER", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { mode: { operator: "eq", value: "4p" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.mode).toEqual(["FOUR_PLAYER"]);
  });

  it("maps format filter tonpuu to TONPUU", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { format: { operator: "eq", value: "tonpuu" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.format).toEqual(["TONPUU"]);
  });

  it("maps format filter hanchan to HANCHAN", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { format: { operator: "eq", value: "hanchan" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.format).toEqual(["HANCHAN"]);
  });

  it("maps sync filter synced to SYNCED", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { sync: { operator: "eq", value: "synced" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.syncStatus).toEqual(["SYNCED"]);
  });

  it("maps sync filter unsynced to UNSYNCED", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { sync: { operator: "eq", value: "unsynced" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.syncStatus).toEqual(["UNSYNCED"]);
  });

  it("maps completion filter completed to COMPLETED", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { completion: { operator: "eq", value: "completed" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.completion).toEqual(["COMPLETED"]);
  });

  it("maps completion filter incomplete to INCOMPLETE", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { completion: { operator: "eq", value: "incomplete" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.completion).toEqual(["INCOMPLETE"]);
  });

  it("maps table filter to tableCode", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { table: { operator: "eq", value: "A1" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.tableCode).toBe("A1");
  });

  it("maps date eq filter to dateFrom/dateTo", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { date: { operator: "eq", value: "2024-06-15" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.dateFrom).toBe("2024-06-15");
    expect(result.dateTo).toBe("2024-06-15");
  });

  it("maps date range filter to dateFrom/dateTo", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: {
        date: { operator: "range", value: ["2024-06-01", "2024-06-30"] },
      },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.dateFrom).toBe("2024-06-01");
    expect(result.dateTo).toBe("2024-06-30");
  });

  it("maps sortBy and sortOrder from sorting state", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const asc = buildFilter(parsed, 1, [{ id: "startedAt", desc: false }]);
    expect(asc.sortBy).toBe("startedAt");
    expect(asc.sortOrder).toBe("ASC");
    const desc = buildFilter(parsed, 1, [{ id: "startedAt", desc: true }]);
    expect(desc.sortOrder).toBe("DESC");
  });

  it("computes pagination offset from page", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    expect(buildFilter(parsed, 1, []).pagination).toEqual({
      offset: 0,
      limit: 50,
    });
    expect(buildFilter(parsed, 3, []).pagination).toEqual({
      offset: 100,
      limit: 50,
    });
  });

  it("returns undefined for empty filter fields", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBeUndefined();
    expect(result.mode).toBeUndefined();
    expect(result.format).toBeUndefined();
    expect(result.syncStatus).toBeUndefined();
    expect(result.completion).toBeUndefined();
    expect(result.tableCode).toBeUndefined();
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.sortBy).toBeUndefined();
    expect(result.sortOrder).toBe("ASC");
  });

  it("handles combined filters", () => {
    const parsed: ParsedSearch = {
      freeText: "test",
      filters: {
        mode: { operator: "eq", value: "3p" },
        format: { operator: "in", value: ["tonpuu", "hanchan"] },
        table: { operator: "eq", value: "A1" },
        date: { operator: "range", value: ["2024-01-01", "2024-12-31"] },
      },
      errors: [],
    };
    const result = buildFilter(parsed, 2, [{ id: "endedAt", desc: true }]);
    expect(result.search).toBe("test");
    expect(result.mode).toEqual(["THREE_PLAYER"]);
    expect(result.format).toEqual(["TONPUU", "HANCHAN"]);
    expect(result.tableCode).toBe("A1");
    expect(result.dateFrom).toBe("2024-01-01");
    expect(result.dateTo).toBe("2024-12-31");
    expect(result.sortBy).toBe("endedAt");
    expect(result.sortOrder).toBe("DESC");
    expect(result.pagination).toEqual({ offset: 50, limit: 50 });
  });
});
