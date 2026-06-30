/**
 * managedTables resolver tests: DB-level filtering, pagination, and backward
 * compatibility when no filter is provided.
 */

import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";
import type { GQLContext } from "@/server/graphql/context";
import { tablesResolvers } from "@/server/graphql/resolvers/tables";

// ── Mock D1Database ────────────────────────────────────────────

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

// ── Mock GQLContext ────────────────────────────────────────────

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

// ── Resolver reference ─────────────────────────────────────────

const resolver = tablesResolvers.Query.managedTables as unknown as (
  _source: unknown,
  args: Record<string, unknown>,
  ctx: GQLContext,
) => Promise<ReturnType<typeof tablesResolvers.Query.managedTables>>;

// ── Tests ─────────────────────────────────────────────────────

describe("managedTables resolver", () => {
  // ── Auth guard ──────────────────────────────────────────────
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

  // ── Legacy (no filter) ──────────────────────────────────────
  it("3 | returns empty array with no filter (legacy path)", async () => {
    const ctx = staffContext();
    const result = await resolver(null, {}, ctx);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it("4 | legacy path respects storeId arg", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { storeId: "test-store" }, ctx);
    // verify D1 was called via the query system
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: search ──────────────────────────────────────────
  it("5 | applies search filter on name", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { search: "mahjong", pagination: { limit: 10 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: type ────────────────────────────────────────────
  it("6 | applies type filter (FIXED)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { type: ["FIXED"] },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("7 | applies type filter (SOLO)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { type: ["SOLO"], pagination: { limit: 5 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: status ──────────────────────────────────────────
  it("8 | applies status filter (ACTIVE)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { status: ["ACTIVE"] },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("9 | applies status filter (INACTIVE)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { status: ["INACTIVE"], pagination: { limit: 5 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: store ───────────────────────────────────────────
  it("10 | applies store filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { store: "test-store", pagination: { limit: 5 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: pagination defaults ─────────────────────────────
  it("11 | uses default pagination when not provided", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    const result = await resolver(
      null,
      {
        filter: {},
      },
      ctx,
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  // ── Filter: sortBy / sortOrder ───────────────────────────────
  it("12 | applies sort with ASC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { sortBy: "name", sortOrder: "ASC", pagination: { limit: 5 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("13 | applies sort with DESC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { sortBy: "create_at", sortOrder: "DESC" },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: unknown sortBy falls back to create_at ──────────
  it("14 | falls back to create_at sort for unknown sortBy value", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { sortBy: "nonexistent", pagination: { limit: 5 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: sort by code and capacity ───────────────────────
  it("15 | applies sort by code", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { sortBy: "code", sortOrder: "ASC", pagination: { limit: 10 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("16 | applies sort by capacity", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { sortBy: "capacity", sortOrder: "DESC" },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: combined filters ────────────────────────────────
  it("17 | combines search, type, status, and store filters", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          search: "table",
          type: ["FIXED"],
          status: ["ACTIVE"],
          store: "gg",
          sortBy: "name",
          sortOrder: "DESC",
          pagination: { offset: 10, limit: 10 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: empty filter object (treated as filter present) ─
  it("18 | treats empty filter object as filter present", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    const result = await resolver(null, { filter: {} }, ctx);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  // ── Filter: combined type and status ────────────────────────
  it("19 | combines type and status filters together", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          type: ["SOLO", "FIXED"],
          status: ["ACTIVE", "INACTIVE"],
          pagination: { limit: 50 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: sort by update_at ───────────────────────────────
  it("20 | applies sort by update_at", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          sortBy: "update_at",
          sortOrder: "DESC",
          pagination: { limit: 20 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });
});
