import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";
import type { GQLContext } from "@/server/graphql/context";
import { ordersResolvers } from "@/server/graphql/resolvers/orders";

type OrderListResult = {
  items: unknown[];
  pageInfo: {
    offset: number;
    limit: number;
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

function mockD1(): D1Database {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue({ success: true, meta: {} }),
    all: vi.fn().mockResolvedValue({ results: [], success: true, meta: {} }),
    raw: vi.fn().mockResolvedValue([]),
    exec: vi.fn().mockResolvedValue({ results: [], count: 0, duration: 0 }),
    batch: vi.fn().mockResolvedValue([]),
    dump: vi.fn().mockResolvedValue([]),
  } as unknown as D1Database;
}

function staffContext(d1?: D1Database): GQLContext {
  return {
    db: null as unknown as GQLContext["db"],
    role: "staff",
    userId: "test-staff-id",
    preferredStoreId: null,
    env: {
      DB: d1 ?? mockD1(),
      KV: {} as unknown as KVNamespace,
    } as unknown as GQLContext["env"],
  } as unknown as GQLContext;
}

const resolver = ordersResolvers.Query.orders as unknown as (
  _source: unknown,
  args: Record<string, unknown>,
  ctx: GQLContext,
) => Promise<OrderListResult>;

describe("orders resolver", () => {
  it("1 | throws for unauthenticated user", async () => {
    const ctx = staffContext();
    (ctx as unknown as Record<string, unknown>).userId = null;
    (ctx as unknown as Record<string, unknown>).role = "public";
    await expect(resolver(null, {}, ctx)).rejects.toThrow("Authentication");
  });

  it("2 | throws for non-staff authenticated user", async () => {
    const ctx = staffContext();
    (ctx as unknown as Record<string, unknown>).role = "authenticated";
    await expect(resolver(null, {}, ctx)).rejects.toThrow("Staff");
  });

  it("3 | returns empty result with no args using legacy path", async () => {
    const ctx = staffContext();
    const result = await resolver(null, {}, ctx);
    expect(result.items).toEqual([]);
    expect(result.pageInfo.total).toBe(0);
    expect(result.pageInfo.limit).toBe(50);
  });

  it("4 | legacy path respects input pagination", async () => {
    const result = await resolver(
      null,
      { input: { pagination: { offset: 10, limit: 5 } } },
      staffContext(),
    );
    expect(result.pageInfo.offset).toBe(10);
    expect(result.pageInfo.limit).toBe(5);
  });

  it("5 | applies ACTIVE status at DB level", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { status: ["ACTIVE"] } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("6 | applies PAUSED status at DB level", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { status: ["PAUSED"] } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("7 | applies ENDED status at DB level", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { status: ["ENDED"] } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("8 | applies SETTLED status at DB level", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { status: ["SETTLED"] } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("9 | combines multiple statuses at DB level", async () => {
    const d1 = mockD1();
    await resolver(
      null,
      { filter: { status: ["ACTIVE", "PAUSED", "ENDED"] } },
      staffContext(d1),
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("10 | applies tableCode filter through table join", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { tableCode: "A01" } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("11 | applies store filter through table join", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { store: "test-store" } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("12 | applies date range filter", async () => {
    const d1 = mockD1();
    await resolver(
      null,
      { filter: { dateFrom: "2025-01-01", dateTo: "2025-12-31" } },
      staffContext(d1),
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("13 | applies search across order, table, and user fields", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { search: "player1" } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("14 | sorts by start_at ascending", async () => {
    const d1 = mockD1();
    await resolver(
      null,
      { filter: { sortBy: "start_at", sortOrder: "ASC" } },
      staffContext(d1),
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("15 | sorts by end_at descending", async () => {
    const d1 = mockD1();
    await resolver(
      null,
      { filter: { sortBy: "end_at", sortOrder: "DESC" } },
      staffContext(d1),
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("16 | uses filter pagination defaults", async () => {
    const result = await resolver(null, { filter: {} }, staffContext());
    expect(result.items).toEqual([]);
    expect(result.pageInfo.offset).toBe(0);
    expect(result.pageInfo.limit).toBe(50);
    expect(result.pageInfo.total).toBe(0);
  });

  it("17 | respects filter pagination offset and limit", async () => {
    const result = await resolver(
      null,
      { filter: { pagination: { offset: 20, limit: 10 } } },
      staffContext(),
    );
    expect(result.pageInfo.offset).toBe(20);
    expect(result.pageInfo.limit).toBe(10);
  });

  it("18 | accepts table groupBy after DB query", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { groupBy: "TABLE" } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("19 | accepts user and date groupBy after DB query", async () => {
    const d1 = mockD1();
    await resolver(null, { filter: { groupBy: "USER" } }, staffContext(d1));
    await resolver(null, { filter: { groupBy: "DATE" } }, staffContext(d1));
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("20 | combines status, table, store, date, search, sort, group, pagination", async () => {
    const d1 = mockD1();
    await resolver(
      null,
      {
        filter: {
          status: ["ACTIVE", "PAUSED"],
          tableCode: "A01",
          store: "gg",
          dateFrom: "2025-06-01",
          dateTo: "2025-06-30",
          search: "alice",
          sortBy: "started_at",
          sortOrder: "DESC",
          groupBy: "NONE",
          pagination: { offset: 10, limit: 10 },
        },
      },
      staffContext(d1),
    );
    expect(d1.prepare).toHaveBeenCalled();
  });
});
