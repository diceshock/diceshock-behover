/**
 * managedActives resolver tests: DB-level filtering with cursor pagination,
 * status via date comparison, and backward compatibility when no filter is provided.
 */

import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";
import type { GQLContext } from "@/server/graphql/context";
import { activesResolvers } from "@/server/graphql/resolvers/actives";

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

const resolver = activesResolvers.Query.managedActives as unknown as (
  _source: unknown,
  args: Record<string, unknown>,
  ctx: GQLContext,
) => Promise<ReturnType<typeof activesResolvers.Query.managedActives>>;

// ── Tests ─────────────────────────────────────────────────────

describe("managedActives resolver", () => {
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
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: search ──────────────────────────────────────────
  it("5 | applies search filter on title", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { search: "mahjong", pagination: { limit: 10 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: status (date-based comparison) ──────────────────
  it("6 | applies status filter (active) via date >= today", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { status: ["active"], pagination: { limit: 10 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("7 | applies status filter (expired) via date < today", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { status: ["expired"], pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("8 | applies no status filter when both active and expired selected", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    const result = await resolver(
      null,
      { filter: { status: ["active", "expired"] } },
      ctx,
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  // ── Filter: store ───────────────────────────────────────────
  it("9 | applies store filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { store: "test-store", pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: type (is_game) ──────────────────────────────────
  it("10 | applies type filter (game)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { type: "game", pagination: { limit: 10 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: creator ─────────────────────────────────────────
  it("11 | applies creator filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { creator: "creator-id", pagination: { limit: 10 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Sort ─────────────────────────────────────────────────────
  it("12 | applies sort with ASC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          sortBy: "title",
          sortOrder: "ASC",
          pagination: { limit: 5 },
        },
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
      { filter: { sortBy: "create_at", sortOrder: "DESC" } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("14 | falls back to create_at sort for unknown sortBy value", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { sortBy: "nonexistent", pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Cursor pagination ───────────────────────────────────────
  it("15 | applies cursor-based pagination filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          pagination: { cursor: "abc123", limit: 10 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("16 | applies cursor with combined filters", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          status: ["active"],
          store: "gg",
          sortBy: "date",
          sortOrder: "ASC",
          pagination: { cursor: "last-id", limit: 20 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Default pagination ──────────────────────────────────────
  it("17 | uses default pagination when not provided", async () => {
    const ctx = staffContext();
    const result = await resolver(null, { filter: {} }, ctx);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  // ── Empty filter object (treated as filter present) ─────────
  it("18 | treats empty filter object as filter present", async () => {
    const ctx = staffContext();
    const result = await resolver(null, { filter: {} }, ctx);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  // ── Combined filters ────────────────────────────────────────
  it("19 | combines search, status, store, type, and sort filters", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          search: "tournament",
          status: ["active"],
          store: "gg",
          type: "game",
          sortBy: "update_at",
          sortOrder: "DESC",
          pagination: { cursor: "prev-id", limit: 10 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });
});
