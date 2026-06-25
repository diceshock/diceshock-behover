import { describe, expect, it } from "vitest";
import { buildFilter } from "@/apps/routers/dash/orders";
import type { ParsedSearch } from "@/client/lib/searchParser";

describe("buildFilter", () => {
  it("maps free text and user to search", () => {
    const parsed: ParsedSearch = {
      freeText: "hello",
      filters: { user: { operator: "eq", value: "张三" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBe("hello 张三");
    expect(result.pagination).toEqual({ offset: 0, limit: 50 });
  });

  it("maps status quick filter to server status", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { status: { operator: "eq", value: "active" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.status).toEqual(["ACTIVE"]);
  });

  it("maps ended status to settled orders", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { status: { operator: "eq", value: "ended" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.status).toEqual(["SETTLED"]);
  });

  it("prefers is filter for active and paused aliases", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { is: { operator: "eq", value: "paused" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.status).toEqual(["PAUSED"]);
  });

  it("maps table and store filters", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: {
        table: { operator: "eq", value: "A1" },
        store: { operator: "eq", value: "gg" },
      },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.tableCode).toBe("A1");
    expect(result.store).toBe("gg");
  });

  it("maps date comparison filters", () => {
    const after: ParsedSearch = {
      freeText: "",
      filters: { date: { operator: "gt", value: "2024-06-01" } },
      errors: [],
    };
    expect(buildFilter(after, 1, []).dateFrom).toBe("2024-06-01");

    const before: ParsedSearch = {
      freeText: "",
      filters: { date: { operator: "lt", value: "2024-07-01" } },
      errors: [],
    };
    expect(buildFilter(before, 1, []).dateTo).toBe("2024-07-01");
  });

  it("maps date equality and range filters", () => {
    const exact: ParsedSearch = {
      freeText: "",
      filters: { date: { operator: "eq", value: "2024-06-15" } },
      errors: [],
    };
    expect(buildFilter(exact, 1, []).dateFrom).toBe("2024-06-15");
    expect(buildFilter(exact, 1, []).dateTo).toBe("2024-06-15");

    const range: ParsedSearch = {
      freeText: "",
      filters: {
        date: { operator: "range", value: ["2024-06-01", "2024-06-30"] },
      },
      errors: [],
    };
    expect(buildFilter(range, 1, []).dateFrom).toBe("2024-06-01");
    expect(buildFilter(range, 1, []).dateTo).toBe("2024-06-30");
  });

  it("maps sorting and groupBy", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const asc = buildFilter(
      parsed,
      1,
      [{ id: "start_at", desc: false }],
      "table",
    );
    expect(asc.sortBy).toBe("start_at");
    expect(asc.sortOrder).toBe("ASC");
    expect(asc.groupBy).toBe("table");

    const desc = buildFilter(parsed, 1, [{ id: "end_at", desc: true }], "user");
    expect(desc.sortBy).toBe("end_at");
    expect(desc.sortOrder).toBe("DESC");
    expect(desc.groupBy).toBe("user");
  });

  it("computes offset pagination from page", () => {
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
    expect(result.status).toBeUndefined();
    expect(result.tableCode).toBeUndefined();
    expect(result.store).toBeUndefined();
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.sortBy).toBeUndefined();
    expect(result.sortOrder).toBeUndefined();
  });
});
