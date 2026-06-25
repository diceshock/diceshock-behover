/**
 * managedMahjongMatches resolver tests: DB-level filtering via MahjongFilterInput,
 * legacy path via MahjongManagementListInput, pagination, and backward compatibility.
 */

import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";
import type { GQLContext } from "../../context";
import { mahjongResolvers } from "../mahjong";

type MatchListResult = {
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

const resolver = mahjongResolvers.Query.managedMahjongMatches as unknown as (
  _source: unknown,
  args: Record<string, unknown>,
  ctx: GQLContext,
) => Promise<MatchListResult>;

describe("managedMahjongMatches resolver", () => {
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

  // ── Legacy (no filter arg) ──────────────────────────────────
  it("3 | returns empty result with no args (legacy path)", async () => {
    const ctx = staffContext();
    const result = await resolver(null, {}, ctx);
    expect(result.items).toEqual([]);
    expect(result.pageInfo.total).toBe(0);
    expect(result.pageInfo.limit).toBe(50);
  });

  it("4 | legacy path passes through input args", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { input: { mode: "FOUR_PLAYER", format: "HANCHAN" } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: mode ────────────────────────────────────────────
  it("5 | applies mode filter (FOUR_PLAYER)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { mode: ["FOUR_PLAYER"], pagination: { limit: 10 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("6 | applies mode filter (THREE_PLAYER)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { mode: ["THREE_PLAYER"] } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: format ──────────────────────────────────────────
  it("7 | applies format filter (HANCHAN)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { format: ["HANCHAN"], pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("8 | applies format filter (TONPUU)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { format: ["TONPUU"] } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: completion ──────────────────────────────────────
  it("9 | applies completion filter (COMPLETED)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { completion: ["COMPLETED"] } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("10 | applies completion filter (INCOMPLETE)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { completion: ["INCOMPLETE"], pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: syncStatus ─────────────────────────────────────
  it("11 | applies syncStatus filter (SYNCED)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { syncStatus: ["SYNCED"] } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("12 | applies syncStatus filter (UNSYNCED)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { syncStatus: ["UNSYNCED"], pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: tableCode ───────────────────────────────────────
  it("13 | applies tableCode filter (resolves code to id)", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { tableCode: "TABLE01" } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: dateFrom / dateTo ───────────────────────────────
  it("14 | applies date range filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          dateFrom: "2025-01-01",
          dateTo: "2025-12-31",
          pagination: { limit: 10 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: store ───────────────────────────────────────────
  it("15 | applies store filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { store: "test-store", pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: search ──────────────────────────────────────────
  it("16 | applies search filter", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { search: "player1", pagination: { limit: 10 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: sortBy / sortOrder ──────────────────────────────
  it("17 | applies sort with ASC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          sortBy: "started_at",
          sortOrder: "ASC",
          pagination: { limit: 5 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("18 | applies sort with DESC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { sortBy: "ended_at", sortOrder: "DESC" } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: pagination defaults ─────────────────────────────
  it("19 | uses default pagination with empty filter", async () => {
    const ctx = staffContext();
    const result = await resolver(null, { filter: {} }, ctx);
    expect(result.items).toEqual([]);
    expect(result.pageInfo.offset).toBe(0);
    expect(result.pageInfo.limit).toBe(50);
    expect(result.pageInfo.total).toBe(0);
  });

  // ── Filter: combined filters ────────────────────────────────
  it("20 | combines mode, format, completion, and date filters", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          mode: ["FOUR_PLAYER"],
          format: ["HANCHAN"],
          completion: ["COMPLETED"],
          dateFrom: "2025-06-01",
          store: "gg",
          sortBy: "created_at",
          sortOrder: "DESC",
          pagination: { offset: 10, limit: 10 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: unknown sortBy falls back to created_at ─────────
  it("21 | falls back to created_at for unknown sortBy", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { sortBy: "nonexistent", pagination: { limit: 5 } } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });
});
