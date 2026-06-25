import { describe, expect, it } from "vitest";
import { buildFilter } from "@/apps/routers/dash/tables";
import type { ParsedSearch } from "@/client/lib/searchParser";

describe("buildFilter", () => {
  it("maps free text and name filter to search", () => {
    const parsed: ParsedSearch = {
      freeText: "hello",
      filters: { name: { operator: "eq", value: "table1" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBe("hello table1");
    expect(result.pagination).toEqual({ offset: 0, limit: 20 });
    expect(result.sortBy).toBeUndefined();
  });

  it("maps type filter to uppercase array", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { type: { operator: "in", value: ["fixed", "solo"] } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.type).toEqual(["FIXED", "SOLO"]);
  });

  it("maps single type filter to uppercase array", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { type: { operator: "eq", value: "fixed" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.type).toEqual(["FIXED"]);
  });

  it("maps status filter to uppercase array", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { status: { operator: "in", value: ["active", "inactive"] } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.status).toEqual(["ACTIVE", "INACTIVE"]);
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
    const asc = buildFilter(parsed, 1, [{ id: "name", desc: false }]);
    expect(asc.sortBy).toBe("name");
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
    expect(result.type).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.store).toBeUndefined();
  });

  it("returns search=undefined when freeText and name are empty", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: {
        type: { operator: "eq", value: "fixed" },
      },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBeUndefined();
    expect(result.type).toEqual(["FIXED"]);
  });
});
