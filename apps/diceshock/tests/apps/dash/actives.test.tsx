import { describe, expect, it } from "vitest";
import { buildFilter } from "@/apps/routers/dash/actives";
import type { ParsedSearch } from "@/client/lib/searchParser";

describe("buildFilter", () => {
  it("maps free text to search", () => {
    const parsed: ParsedSearch = {
      freeText: "hello",
      filters: {},
      errors: [],
    };
    const result = buildFilter(parsed, []);
    expect(result.search).toBe("hello");
    expect(result.pagination).toEqual({
      cursor: undefined,
      limit: 20,
    });
  });

  it("maps status filter to array", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { status: { operator: "in", value: ["active", "expired"] } },
      errors: [],
    };
    const result = buildFilter(parsed, []);
    expect(result.status).toEqual(["active", "expired"]);
  });

  it("maps single status filter to array", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { status: { operator: "eq", value: "active" } },
      errors: [],
    };
    const result = buildFilter(parsed, []);
    expect(result.status).toEqual(["active"]);
  });

  it("maps type filter", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { type: { operator: "eq", value: "game" } },
      errors: [],
    };
    const result = buildFilter(parsed, []);
    expect(result.type).toBe("game");
  });

  it("maps creator filter", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { creator: { operator: "eq", value: "alice" } },
      errors: [],
    };
    const result = buildFilter(parsed, []);
    expect(result.creator).toBe("alice");
  });

  it("maps store filter", () => {
    const parsed: ParsedSearch = {
      freeText: "",
      filters: { store: { operator: "eq", value: "store-123" } },
      errors: [],
    };
    const result = buildFilter(parsed, []);
    expect(result.store).toBe("store-123");
  });

  it("includes cursor in pagination", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const result = buildFilter(parsed, [], "abc-123");
    expect(result.pagination).toEqual({ cursor: "abc-123", limit: 20 });
  });

  it("returns undefined for empty filter", () => {
    const parsed: ParsedSearch = { freeText: "", filters: {}, errors: [] };
    const result = buildFilter(parsed, []);
    expect(result.search).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.type).toBeUndefined();
    expect(result.creator).toBeUndefined();
    expect(result.store).toBeUndefined();
  });

  it("combines all filters", () => {
    const parsed: ParsedSearch = {
      freeText: "weekly",
      filters: {
        status: { operator: "eq", value: "active" },
        type: { operator: "eq", value: "game" },
        creator: { operator: "eq", value: "bob" },
        store: { operator: "eq", value: "store-42" },
      },
      errors: [],
    };
    const result = buildFilter(parsed, [], "cursor-xyz");
    expect(result).toEqual({
      search: "weekly",
      status: ["active"],
      type: "game",
      creator: "bob",
      store: "store-42",
      pagination: { cursor: "cursor-xyz", limit: 20 },
    });
  });
});
