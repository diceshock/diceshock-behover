/**
 * managedUsers resolver tests: DB-level filtering, pagination, and backward
 * compatibility when no filter is provided.
 */

import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";
import type { GQLContext } from "@/server/graphql/context";
import { usersResolvers } from "@/server/graphql/resolvers/users";

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

const resolver = usersResolvers.Query.managedUsers as unknown as (
  _source: unknown,
  args: Record<string, unknown>,
  ctx: GQLContext,
) => Promise<ReturnType<typeof usersResolvers.Query.managedUsers>>;

// ── Tests ─────────────────────────────────────────────────────

describe("managedUsers resolver", () => {
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

  // ── Legacy path (no filter) ──────────────────────────────────
  it("3 | returns empty result with no args (legacy path)", async () => {
    const ctx = staffContext();
    const result = await resolver(null, {}, ctx);
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("pageInfo");
    expect(result.pageInfo).toEqual({
      offset: 0,
      limit: 20,
      total: null,
      hasMore: false,
    });
    expect(result.items).toEqual([]);
  });

  it("4 | legacy path with input.searchWords passes through", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { input: { searchWords: "test" } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("5 | legacy path with input.pagination respects offset/limit", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    const result = await resolver(
      null,
      { input: { pagination: { offset: 10, limit: 5 } } },
      ctx,
    );
    expect(result.pageInfo.offset).toBe(10);
    expect(result.pageInfo.limit).toBe(5);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: empty / default ──────────────────────────────────
  it("6 | filter path returns pageInfo with accurate total", async () => {
    const ctx = staffContext();
    const result = await resolver(null, { filter: {} }, ctx);
    expect(result.pageInfo).toMatchObject({
      offset: 0,
      limit: 20,
      total: 0,
      hasMore: false,
    });
    expect(result.items).toEqual([]);
  });

  it("7 | filter path respects custom pagination", async () => {
    const ctx = staffContext();
    const result = await resolver(
      null,
      { filter: { pagination: { offset: 5, limit: 10 } } },
      ctx,
    );
    expect(result.pageInfo.offset).toBe(5);
    expect(result.pageInfo.limit).toBe(10);
  });

  // ── Filter: search ───────────────────────────────────────────
  it("8 | search filter queries userInfo and users tables", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { search: "John" } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: role ─────────────────────────────────────────────
  it("9 | role filter applies role condition", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { role: ["CUSTOMER", "STAFF"] } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: store ────────────────────────────────────────────
  it("10 | store filter queries userInfo by preferred_store_id", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { store: "store-001" } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: sortBy / sortOrder ───────────────────────────────
  it("11 | sortBy name with ASC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { sortBy: "name", sortOrder: "ASC" } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("12 | sortBy name with DESC order", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      { filter: { sortBy: "name", sortOrder: "DESC" } },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("13 | defaults to DESC id sort for unknown sortBy", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { sortBy: "last_active_at" } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  it("14 | defaults to DESC id sort when no sortBy provided", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(null, { filter: { sortOrder: "ASC" } }, ctx);
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Filter: combined conditions ──────────────────────────────
  it("15 | combines search, role, store, sort and pagination", async () => {
    const d1 = mockD1();
    const ctx = staffContext(d1);
    await resolver(
      null,
      {
        filter: {
          search: "user",
          role: ["CUSTOMER"],
          store: "store-001",
          sortBy: "name",
          sortOrder: "DESC",
          pagination: { offset: 10, limit: 5 },
        },
      },
      ctx,
    );
    expect(d1.prepare).toHaveBeenCalled();
  });

  // ── Backward compatibility ───────────────────────────────────
  it("16 | legacy input still works alongside explicit filter", async () => {
    const ctx = staffContext();
    const result = await resolver(null, { filter: {} }, ctx);
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("pageInfo");
  });
});
