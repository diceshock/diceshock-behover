/**
 * managedEvents resolver tests: DB-level filtering, pagination, and backward
 * compatibility when no filter is provided.
 */

import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";
import type { GQLContext } from "../../context";
import { adminResolvers } from "../admin";

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
    db: null as unknown as GQLContext["db"], // resolver calls dbFactory() internally
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

const resolver = adminResolvers.Query.managedEvents as unknown as (
  _source: unknown,
  args: Record<string, unknown>,
  ctx: GQLContext,
) => Promise<ReturnType<typeof adminResolvers.Query.managedEvents>>;

// ── Tests ─────────────────────────────────────────────────────

describe("managedEvents resolver", () => {
  // ── Auth ────────────────────────────────────────────────────
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

  // ── Filter: search ──────────────────────────────────────────
  it("4 | applies search filter on title", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { search: "mahjong", pagination: { limit: 10 } },
      },
      ctx,
    );
    // verify D1 was called (the query passes through prepare/bind/all)
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: dateFrom / dateTo ───────────────────────────────
  it("5 | applies date range filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { dateFrom: "2025-01-01", dateTo: "2025-12-31" },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: store ───────────────────────────────────────────
  it("6 | applies store filter", async () => {
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
  it("7 | uses default pagination when not provided", async () => {
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

  // ── Filter: sortBy / sortOrder ──────────────────────────────
  it("8 | applies sort with ASC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: { sortBy: "title", sortOrder: "ASC", pagination: { limit: 5 } },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("9 | applies sort with DESC order", async () => {
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
  it("10 | falls back to create_at sort for unknown sortBy value", async () => {
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

  // ── Filter: multiple conditions ─────────────────────────────
  it("11 | combines search, date, and store filters", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          search: "tournament",
          dateFrom: "2025-06-01",
          store: "gg",
          sortBy: "update_at",
          sortOrder: "DESC",
          pagination: { offset: 10, limit: 10 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: empty filter object (treated as filter present) ─
  it("12 | treats empty filter object as filter present", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    const result = await resolver(null, { filter: {} }, ctx);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });
});
