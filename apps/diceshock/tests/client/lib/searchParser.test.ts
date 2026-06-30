import { describe, expect, it } from "vitest";
import {
  ACTIVE_SEARCH_GRAMMAR,
  EVENT_SEARCH_GRAMMAR,
  GSZ_SEARCH_GRAMMAR,
  getAvailableKeys,
  ORDER_SEARCH_GRAMMAR,
  type ParsedSearch,
  parseSearch,
  serialize,
  TABLE_SEARCH_GRAMMAR,
  toGqlVariables,
  USER_SEARCH_GRAMMAR,
} from "@/client/lib/searchParser";

describe("searchParser", () => {
  it("parses key:value pairs into equality filters", () => {
    expect(
      parseSearch("status:active table:A1", ORDER_SEARCH_GRAMMAR),
    ).toMatchObject({
      freeText: "",
      filters: {
        status: { operator: "eq", value: "active" },
        table: { operator: "eq", value: "A1" },
      },
      errors: [],
    });
  });

  it("collects free text terms in order", () => {
    expect(
      parseSearch("张三 status:active VIP 客人", ORDER_SEARCH_GRAMMAR),
    ).toMatchObject({
      freeText: "张三 VIP 客人",
      filters: { status: { operator: "eq", value: "active" } },
    });
  });

  it("parses date greater-than operators", () => {
    expect(
      parseSearch("date:>2024-06-01", ORDER_SEARCH_GRAMMAR).filters.date,
    ).toEqual({
      operator: "gt",
      value: "2024-06-01",
    });
  });

  it("parses date less-than operators", () => {
    expect(
      parseSearch("date:<2024-06-01", ORDER_SEARCH_GRAMMAR).filters.date,
    ).toEqual({
      operator: "lt",
      value: "2024-06-01",
    });
  });

  it("parses date range operators", () => {
    expect(
      parseSearch("date:2024-06-01..2024-06-30", ORDER_SEARCH_GRAMMAR).filters
        .date,
    ).toEqual({ operator: "range", value: ["2024-06-01", "2024-06-30"] });
  });

  it("parses boolean is: operators as equality filters", () => {
    expect(parseSearch("is:active", ORDER_SEARCH_GRAMMAR).filters.is).toEqual({
      operator: "eq",
      value: "active",
    });
  });

  it("parses comma-separated values as in filters", () => {
    expect(
      parseSearch("status:active,paused", ORDER_SEARCH_GRAMMAR).filters.status,
    ).toEqual({
      operator: "in",
      value: ["active", "paused"],
    });
  });

  it("records unrecognized keys as errors and skips their filters", () => {
    const parsed = parseSearch(
      "status:active unknown:value",
      ORDER_SEARCH_GRAMMAR,
    );
    expect(parsed.filters).toEqual({
      status: { operator: "eq", value: "active" },
    });
    expect(parsed.errors).toEqual([
      {
        key: "unknown",
        value: "value",
        message: "Unsupported search key: unknown",
      },
    ]);
  });

  it("validates enum values against the selected grammar", () => {
    const parsed = parseSearch("status:cancelled", ORDER_SEARCH_GRAMMAR);
    expect(parsed.filters).toEqual({});
    expect(parsed.errors[0]).toMatchObject({
      key: "status",
      value: "cancelled",
      message: "Invalid value for status: cancelled",
    });
  });

  it("validates every value in enum in-lists", () => {
    const parsed = parseSearch("status:active,cancelled", ORDER_SEARCH_GRAMMAR);
    expect(parsed.filters).toEqual({});
    expect(parsed.errors[0]).toMatchObject({
      key: "status",
      value: "active,cancelled",
    });
  });

  it("rejects date operators on non-date fields", () => {
    const parsed = parseSearch("status:>active", ORDER_SEARCH_GRAMMAR);
    expect(parsed.filters).toEqual({});
    expect(parsed.errors[0]).toMatchObject({
      key: "status",
      value: ">active",
      message: "Operator gt is not supported for status",
    });
  });

  it("treats malformed key tokens as free text", () => {
    expect(parseSearch("status active", ORDER_SEARCH_GRAMMAR)).toMatchObject({
      freeText: "status active",
      filters: {},
      errors: [],
    });
  });

  it("supports quoted free text and filter values", () => {
    expect(
      parseSearch('name:"张 三" "vip user"', USER_SEARCH_GRAMMAR),
    ).toMatchObject({
      freeText: "vip user",
      filters: { name: { operator: "eq", value: "张 三" } },
    });
  });

  it("serializes equality filters and free text", () => {
    const parsed: ParsedSearch = {
      freeText: "张三",
      filters: { status: { operator: "eq", value: "active" } },
      errors: [],
    };
    expect(serialize(parsed, ORDER_SEARCH_GRAMMAR)).toBe("status:active 张三");
  });

  it("serializes date operators", () => {
    expect(
      serialize(
        {
          freeText: "",
          filters: {
            after: { operator: "gt", value: "2024-06-01" },
            before: { operator: "lt", value: "2024-06-30" },
          },
          errors: [],
        },
        { after: { type: "date" }, before: { type: "date" } },
      ),
    ).toBe("after:>2024-06-01 before:<2024-06-30");
  });

  it("serializes date ranges", () => {
    expect(
      serialize(
        {
          freeText: "",
          filters: {
            date: { operator: "range", value: ["2024-06-01", "2024-06-30"] },
          },
          errors: [],
        },
        ORDER_SEARCH_GRAMMAR,
      ),
    ).toBe("date:2024-06-01..2024-06-30");
  });

  it("serializes in filters", () => {
    expect(
      serialize(
        {
          freeText: "",
          filters: { status: { operator: "in", value: ["active", "paused"] } },
          errors: [],
        },
        ORDER_SEARCH_GRAMMAR,
      ),
    ).toBe("status:active,paused");
  });

  it("quotes serialized tokens that contain spaces", () => {
    expect(
      serialize(
        {
          freeText: "vip user",
          filters: { name: { operator: "eq", value: "张 三" } },
          errors: [],
        },
        USER_SEARCH_GRAMMAR,
      ),
    ).toBe('name:"张 三" "vip user"');
  });

  it("round-trips parse -> serialize -> parse for a complex query", () => {
    const parsed = parseSearch(
      "status:active,paused date:2024-06-01..2024-06-30 table:A1 张三",
      ORDER_SEARCH_GRAMMAR,
    );
    expect(
      parseSearch(
        serialize(parsed, ORDER_SEARCH_GRAMMAR),
        ORDER_SEARCH_GRAMMAR,
      ),
    ).toEqual(parsed);
  });

  it("returns grammar keys for autocomplete", () => {
    expect(getAvailableKeys(GSZ_SEARCH_GRAMMAR)).toEqual([
      "mode",
      "format",
      "sync",
      "completion",
      "table",
      "date",
    ]);
  });

  it("exports expected table-specific grammar keys", () => {
    expect(getAvailableKeys(ORDER_SEARCH_GRAMMAR)).toEqual([
      "status",
      "table",
      "user",
      "date",
      "store",
      "is",
    ]);
    expect(getAvailableKeys(USER_SEARCH_GRAMMAR)).toEqual([
      "role",
      "store",
      "name",
    ]);
    expect(getAvailableKeys(TABLE_SEARCH_GRAMMAR)).toEqual([
      "type",
      "status",
      "store",
      "name",
    ]);
    expect(getAvailableKeys(ACTIVE_SEARCH_GRAMMAR)).toEqual([
      "status",
      "type",
      "store",
      "creator",
    ]);
    expect(getAvailableKeys(EVENT_SEARCH_GRAMMAR)).toEqual([
      "status",
      "type",
      "date",
      "store",
    ]);
  });

  it("maps order searches to GraphQL variable shape", () => {
    expect(
      toGqlVariables(
        parseSearch("status:ended store:gg 张三", ORDER_SEARCH_GRAMMAR),
        "orders",
      ),
    ).toEqual({ search: "张三", status: "SETTLED", storeId: "gg" });
  });

  it("maps order active boolean alias to status", () => {
    expect(
      toGqlVariables(parseSearch("is:paused", ORDER_SEARCH_GRAMMAR), "orders"),
    ).toEqual({
      status: "PAUSED",
    });
  });

  it("maps user searches to UserSearchInput-compatible variables", () => {
    expect(
      toGqlVariables(
        parseSearch("name:张三 role:staff", USER_SEARCH_GRAMMAR),
        "users",
      ),
    ).toEqual({
      searchWords: "张三",
      role: "STAFF",
    });
  });

  it("maps GSZ filters to MahjongManagementListInput-compatible variables", () => {
    expect(
      toGqlVariables(
        parseSearch(
          "mode:3p format:hanchan sync:unsynced completion:completed table:T1 date:>2024-06-01 东风",
          GSZ_SEARCH_GRAMMAR,
        ),
        "gsz",
      ),
    ).toEqual({
      search: "东风",
      mode: "THREE_PLAYER",
      format: "HANCHAN",
      gszSync: "UNSYNCED",
      completion: "COMPLETED",
      tableId: "T1",
      startDate: "2024-06-01",
    });
  });

  it("maps date ranges to startDate and endDate for GSZ", () => {
    expect(
      toGqlVariables(
        parseSearch("date:2024-06-01..2024-06-30", GSZ_SEARCH_GRAMMAR),
        "mahjong",
      ),
    ).toEqual({ startDate: "2024-06-01", endDate: "2024-06-30" });
  });

  it("drops parse errors when mapping to GraphQL variables", () => {
    expect(
      toGqlVariables(
        parseSearch("unknown:x 张三", ORDER_SEARCH_GRAMMAR),
        "orders",
      ),
    ).toEqual({
      search: "张三",
    });
  });
});
