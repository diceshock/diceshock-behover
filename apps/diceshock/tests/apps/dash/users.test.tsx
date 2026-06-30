import { describe, expect, it } from "vitest";
import { buildFilter } from "@/apps/routers/dash/users";
import type { ParsedSearch } from "@/client/lib/searchParser";

describe("buildFilter", () => {
  it("maps free text to search", () => {
    const parsed: ParsedSearch = {
      freeText: "alice",
      filters: {},
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBe("alice");
    expect(result.pagination).toEqual({ offset: 0, limit: 30 });
    expect(result.role).toBeUndefined();
    expect(result.store).toBeUndefined();
  });

  it("maps name filter combined with free text into search", () => {
    const parsed: ParsedSearch = {
      freeText: "hello",
      filters: { name: { operator: "eq", value: "bob" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBe("hello bob");
  });

  it("maps role filter to uppercase array (single)", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { role: { operator: "eq", value: "admin" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.role).toEqual(["ADMIN"]);
  });

  it("maps role filter to uppercase array (multiple)", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: {
        role: { operator: "in", value: ["admin", "staff"] },
      },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.role).toEqual(["ADMIN", "STAFF"]);
  });

  it("maps store filter", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { store: { operator: "eq", value: "gg" } },
      errors: [],
    };
    const result = buildFilter(parsed, 1, []);
    expect(result.store).toBe("gg");
  });

  it("maps sortBy and sortOrder from sorting state", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const asc = buildFilter(parsed, 1, [{ id: "name", desc: false }]);
    expect(asc.sortBy).toBe("name");
    expect(asc.sortOrder).toBe("ASC");
    const desc = buildFilter(parsed, 1, [{ id: "name", desc: true }]);
    expect(desc.sortOrder).toBe("DESC");
  });

  it("computes pagination offset from page", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    expect(buildFilter(parsed, 1, []).pagination).toEqual({
      offset: 0,
      limit: 30,
    });
    expect(buildFilter(parsed, 3, []).pagination).toEqual({
      offset: 60,
      limit: 30,
    });
  });

  it("returns undefined for empty filter", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBeUndefined();
    expect(result.role).toBeUndefined();
    expect(result.store).toBeUndefined();
    expect(result.sortBy).toBeUndefined();
  });

  it("handles multiple filters combined", () => {
    const parsed: ParsedSearch = {
      freeText: "search text",
      filters: {
        role: { operator: "eq", value: "admin" },
        store: { operator: "eq", value: "jdk" },
        name: { operator: "eq", value: "john" },
      },
      errors: [],
    };
    const result = buildFilter(parsed, 2, [{ id: "name", desc: true }]);
    expect(result.search).toBe("search text john");
    expect(result.role).toEqual(["ADMIN"]);
    expect(result.store).toBe("jdk");
    expect(result.sortBy).toBe("name");
    expect(result.sortOrder).toBe("DESC");
    expect(result.pagination).toEqual({ offset: 30, limit: 30 });
  });

  it("handles empty ParsedSearch", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const result = buildFilter(parsed, 1, []);
    expect(result.search).toBeUndefined();
    expect(result.role).toBeUndefined();
    expect(result.store).toBeUndefined();
    expect(result.sortBy).toBeUndefined();
    expect(result.pagination).toEqual({ offset: 0, limit: 30 });
  });
});
