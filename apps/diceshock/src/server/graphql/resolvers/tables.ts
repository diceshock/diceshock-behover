import dbFactory, {
  drizzle,
  orderPauseLogsTable,
  tableOccupancyTable,
  tablesTable,
  tempIdentitiesTable,
} from "@lib/db";
import { and, asc, desc, eq, inArray, like } from "drizzle-orm";
import { z } from "zod/v4";
import { genNickname } from "@/server/utils/auth";
import { pauseWithReason } from "@/server/utils/pauseOrder";
import {
  fetchTableStateForDO,
  notifyDsSubscription,
} from "@/server/utils/seatTimer";
import { generateTotpSecret } from "@/shared/utils/totp";
import type { GQLContext } from "../context";
import { notFound, validationError } from "../errors";
import { requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

// ─── Constants ────────────────────────────────────────────────────────────

const SHORT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMP_IDENTITY_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ───────────────────────────────────────────────────────────────

type Database = ReturnType<typeof dbFactory>;

function asMs(value: Date | number | string | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toIso(
  value: Date | number | string | null | undefined,
): string | null {
  const ms = asMs(value);
  return ms == null ? null : new Date(ms).toISOString();
}

function toGqlStatus(
  status: string,
  _occupancy?: typeof tableOccupancyTable.$inferSelect,
): string {
  if (status === "active") return "ACTIVE";
  if (status === "paused") return "PAUSED";
  if (status === "settled") return "SETTLED";
  return "ENDED";
}

function storeFilter(
  table: { store_id: string | null },
  storeId: string | null | undefined,
): boolean {
  if (!storeId) return true;
  return table.store_id === storeId;
}

function generateShortCode(len = 6): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(
    arr,
    (b) => SHORT_CODE_CHARS[b % SHORT_CODE_CHARS.length],
  ).join("");
}

async function generateUniqueCode(tdb: Database, len = 6): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateShortCode(len);
    const existing = await tdb.query.tablesTable.findFirst({
      where: (t, { eq }) => eq(t.code, code),
      columns: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("编号生成失败，请重试");
}

// ─── GQL Field Mappers ─────────────────────────────────────────────────────

function toGqlTable(
  row: typeof tablesTable.$inferSelect,
): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    type: row.type.toUpperCase(),
    scope: row.scope.toUpperCase(),
    status: row.status.toUpperCase(),
    capacity: row.capacity,
    code: row.code,
    description: row.description ?? null,
    storeId: row.store_id ?? null,
    occupancies: [],
    createdAt: toIso(row.create_at),
    updatedAt: toIso(row.update_at),
  };
}

function toGqlOccupancy(
  occ: typeof tableOccupancyTable.$inferSelect & {
    nickname?: string | null;
    uid?: string | null;
    phone?: string | null;
  },
): Record<string, unknown> {
  return {
    id: occ.id,
    tableId: occ.table_id,
    userId: occ.user_id ?? null,
    tempId: occ.temp_id ?? null,
    nickname: occ.nickname ?? null,
    uid: occ.uid ?? null,
    phone: occ.phone ?? null,
    seats: occ.seats,
    status: toGqlStatus(occ.status, occ),
    startAt: toIso(occ.start_at),
    endAt: toIso(occ.end_at),
    finalPrice: null,
    pricingSnapshotId: occ.pricing_snapshot_id ?? null,
    priceBreakdown: null,
    settlementSnapshot: null,
    deductedAmount: null,
    table: null,
    user: null,
  };
}

async function enrichOccupancyWithUserInfo(
  tdb: Database,
  occ: typeof tableOccupancyTable.$inferSelect,
): Promise<Record<string, unknown>> {
  let nickname: string | null = null;
  let uid: string | null = null;
  let phone: string | null = null;

  if (occ.user_id) {
    const info = await tdb.query.userInfoTable.findFirst({
      where: (i, { eq }) => eq(i.id, occ.user_id!),
      columns: { nickname: true, uid: true, phone: true },
    });
    nickname = info?.nickname ?? null;
    uid = info?.uid ?? null;
    phone = info?.phone ?? null;
  } else if (occ.temp_id) {
    try {
      const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
        where: (t, { eq }) => eq(t.id, occ.temp_id!),
        columns: { nickname: true },
      });
      nickname = tempInfo?.nickname ?? null;
    } catch (e) { console.error("[tables] tempIdentity lookup error", e); }
    uid = occ.temp_id ? `temp:${occ.temp_id}` : null;
  }

  return toGqlOccupancy({ ...occ, nickname, uid, phone });
}

async function fetchTableWithOccupancies(
  tdb: Database,
  code: string,
  storeId: string | null | undefined,
) {
  const table = await tdb.query.tablesTable.findFirst({
    where: (t, { eq }) => eq(t.code, code),
    with: {
      occupancies: {
        where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
        with: {
          user: { columns: { id: true, name: true } },
        },
      },
    },
  });
  if (!table) return null;

  if (storeId && table.store_id !== storeId) return null;

  return table;
}

// ─── PubSub Helpers ────────────────────────────────────────────────────────

type EnvWithPubSub = GQLContext["env"] & { PUBSUB: DurableObjectNamespace };

function envWithPubSub(ctx: GQLContext): EnvWithPubSub {
  return ctx.env as EnvWithPubSub;
}

async function publishSeatEvent(
  ctx: GQLContext,
  code: string,
  event: { type: string; payload: Record<string, unknown> },
): Promise<void> {
  try {
    const env = envWithPubSub(ctx);
    const pubsubId = env.PUBSUB.idFromName(`seat:${code}`);
    const stub = env.PUBSUB.get(pubsubId);
    await stub.fetch("https://internal/publish", {
      method: "POST",
      body: JSON.stringify({
        type: event.type,
        payload: event.payload,
        timestamp: Date.now(),
      }),
    });
  } catch (e) { console.error("[tables] publishSeatEvent error", e); }
}

// ─── DsSubscription Helpers ──────────────────────────────────────────────────────

async function notifyDsSubscriptionFromTable(
  ctx: GQLContext,
  tdb: Database,
  code: string,
  tableId: string,
): Promise<void> {
  try {
    const fresh = await fetchTableStateForDO(tdb, tableId);
    if (fresh) {
      await notifyDsSubscription(ctx.env, code, fresh.table, fresh.occupancies);
    }
  } catch (e) { console.error("[tables] notifyDsSubscription error", e); }
}

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const codeSchema = z.object({ code: z.string().min(1) });
const tableByCodeSchema = z.object({
  code: z.string().min(1),
  storeId: z.string().nullable().optional(),
});

const occupyInputSchema = z.object({
  code: z.string().min(1),
});

const leaveInputSchema = z.object({
  occupancyId: z.string().min(1),
  code: z.string().min(1),
});

const createTableSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["FIXED", "SOLO"]),
  scope: z.enum(["TRPG", "BOARDGAME", "CONSOLE", "MAHJONG"]),
  capacity: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
  storeId: z.string().nullable().optional(),
});

const updateTableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["FIXED", "SOLO"]).optional(),
  scope: z.enum(["TRPG", "BOARDGAME", "CONSOLE", "MAHJONG"]).optional(),
  capacity: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
});

const idSchema = z.object({ id: z.string().min(1) });
const addOccupancySchema = z.object({
  tableId: z.string().min(1),
  userId: z.string().min(1),
});

const tempOccupySchema = z.object({
  tempId: z.string().min(1),
  code: z.string().min(1),
});

const tempLeaveSchema = z.object({
  tempId: z.string().min(1),
  occupancyId: z.string().min(1),
  code: z.string().min(1),
});

const transferSchema = z.object({
  tempId: z.string().min(1),
  userId: z.string().min(1),
});

// ─── TypeDefs ──────────────────────────────────────────────────────────────

export const tablesTypeDefs = `
  enum TableType {
    FIXED
    SOLO
  }

  enum TableScope {
    TRPG
    BOARDGAME
    CONSOLE
    MAHJONG
  }

  enum TableStatus {
    ACTIVE
    INACTIVE
  }

  enum OrderStatus {
    ACTIVE
    PAUSED
    SETTLED
    CANCELLED
    ENDED
  }

  type TableOccupancy {
    id: ID!
    tableId: ID!
    userId: ID
    tempId: ID
    nickname: String
    uid: String
    phone: String
    seats: Int!
    status: OrderStatus!
    startAt: String!
    endAt: String
    finalPrice: Int
    pricingSnapshotId: ID
    priceBreakdown: String
    settlementSnapshot: String
    table: Table
    user: UserProfile
  }

  type Table {
    id: ID!
    name: String!
    type: TableType!
    scope: TableScope!
    status: TableStatus!
    capacity: Int!
    code: String!
    description: String
    storeId: ID
    occupancies: [TableOccupancy!]!
    createdAt: String
    updatedAt: String
  }

  type ActiveOccupancySummary {
    code: String!
    name: String!
    status: OrderStatus!
  }

  type OccupyTableResult {
    occupancy: TableOccupancy!
    table: Table!
  }

  type TempIdentity {
    id: ID!
    nickname: String!
    totpSecret: String!
    expiresAt: String!
    valid: Boolean!
  }

  type TempIdentityTransferResult {
    transferred: Boolean!
    occupancy: TableOccupancy
  }

  type SettlementResult {
    order: TableOccupancy!
    price: Int!
    snapshot: String
    storedValueDeduction: StoredValueDeduction
  }

  type StoredValueDeduction {
    deducted: Boolean!
    amount: Int!
    note: String!
    balanceBefore: Int!
    balanceAfter: Int!
  }

  input OccupyTableInput {
    code: String!
  }

  input LeaveTableInput {
    occupancyId: ID!
    code: String!
  }

  input CreateTableInput {
    name: String!
    type: TableType!
    scope: TableScope!
    capacity: Int
    description: String
    storeId: ID
  }

  input UpdateTableInput {
    id: ID!
    name: String
    type: TableType
    scope: TableScope
    capacity: Int
    description: String
  }

  input TableFilterInput {
    search: String
    type: [String!]
    status: [String!]
    store: String
    sortBy: String
    sortOrder: SortOrder
    pagination: PaginationInput
  }

  input AddOccupancyInput {
    tableId: ID!
    userId: ID!
  }

  input TempIdentityOccupyInput {
    tempId: ID!
    code: String!
  }

  input TempIdentityLeaveInput {
    tempId: ID!
    occupancyId: ID!
    code: String!
  }

  extend type Query {
    tableByCode(code: String!, storeId: ID): Table!
    myActiveOccupancies(storeId: ID): [ActiveOccupancySummary!]!
    managedTables(storeId: ID, filter: TableFilterInput): [Table!]!
    managedTable(id: ID!): Table!
    managedTableByCode(code: String!, storeId: ID): Table!
    occupanciesByUser(userId: ID!): [TableOccupancy!]!
    validateTempIdentity(tempId: ID!): TempIdentity!
    tempIdentityActiveOccupancies(tempId: ID!): [ActiveOccupancySummary!]!
  }

  extend type Mutation {
    occupyTable(input: OccupyTableInput!): OccupyTableResult!
    leaveTable(input: LeaveTableInput!): TableOccupancy!
    pauseMyOrder(input: LeaveTableInput!): TableOccupancy!
    createTable(input: CreateTableInput!): Table!
    updateTable(input: UpdateTableInput!): Table!
    toggleTableStatus(id: ID!): Table!
    removeTable(id: ID!): Table!
    regenerateTableCode(id: ID!): Table!
    addTableOccupancy(input: AddOccupancyInput!): TableOccupancy!
    removeTableOccupancy(id: ID!): TableOccupancy!
    createTempIdentity: TempIdentity!
    occupyTableWithTempIdentity(input: TempIdentityOccupyInput!): OccupyTableResult!
    leaveTableWithTempIdentity(input: TempIdentityLeaveInput!): SettlementResult!
    transferTempIdentity(tempId: ID!, userId: ID!): TempIdentityTransferResult!
  }
`;

// ─── Resolvers ─────────────────────────────────────────────────────────────

export const tablesResolvers = {
  Query: {
    // ── Public queries ──────────────────────────────────────────────

    async tableByCode(
      _source: unknown,
      args: { code: string; storeId?: string | null },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(tableByCodeSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const table = await fetchTableWithOccupancies(
        tdb,
        input.code,
        input.storeId,
      );
      if (!table) throw notFound("Table not found");
      if (table.status === "inactive")
        throw validationError("code", "Table is inactive");

      const occupancies = await Promise.all(
        table.occupancies.map((occ) => enrichOccupancyWithUserInfo(tdb, occ)),
      );

      return {
        ...toGqlTable(table),
        occupancies,
      };
    },

    // ── Auth queries ────────────────────────────────────────────────

    async myActiveOccupancies(
      _source: unknown,
      args: { storeId?: string | null },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);

      const occs = await tdb.query.tableOccupancyTable.findMany({
        where: (o, { eq, ne, and }) =>
          and(eq(o.user_id, ctx.userId), ne(o.status, "ended"), ne(o.status, "settled")),
        with: {
          table: { columns: { code: true, name: true, store_id: true } },
        },
      });

      return occs
        .filter((occ) => !args.storeId || occ.table.store_id === args.storeId)
        .map((occ) => ({
          code: occ.table.code,
          name: occ.table.name,
          status: toGqlStatus(occ.status, occ),
        }));
    },

    // ── Temp identity queries ───────────────────────────────────────

    async validateTempIdentity(
      _source: unknown,
      args: { tempId: string },
      ctx: GQLContext,
    ) {
      const { tempId } = zodToGraphQLError(
        z.object({ tempId: z.string().min(1) }),
        args,
      );
      const tdb = dbFactory(ctx.env.DB);

      let row: typeof tempIdentitiesTable.$inferSelect | undefined;
      try {
        row = await tdb.query.tempIdentitiesTable.findFirst({
          where: (t, { eq }) => eq(t.id, tempId),
        });
      } catch {
        return {
          id: tempId,
          nickname: "Anonymous",
          totpSecret: "",
          expiresAt: new Date(0).toISOString(),
          valid: false,
        };
      }

      if (!row) {
        return {
          id: tempId,
          nickname: "Anonymous",
          totpSecret: "",
          expiresAt: new Date(0).toISOString(),
          valid: false,
        };
      }

      const createdAt = asMs(row.created_at) ?? 0;
      const expiresAt = createdAt + TEMP_IDENTITY_TTL_MS;
      const valid = Date.now() <= expiresAt;

      return {
        id: row.id,
        nickname: row.nickname ?? "Anonymous",
        totpSecret: row.totp_secret ?? "",
        expiresAt: new Date(expiresAt).toISOString(),
        valid,
      };
    },

    async tempIdentityActiveOccupancies(
      _source: unknown,
      args: { tempId: string },
      ctx: GQLContext,
    ) {
      const { tempId } = zodToGraphQLError(
        z.object({ tempId: z.string().min(1) }),
        args,
      );
      const tdb = dbFactory(ctx.env.DB);

      const occs = await tdb.query.tableOccupancyTable.findMany({
        where: (o, { eq, ne, and }) =>
          and(eq(o.temp_id, tempId), ne(o.status, "ended"), ne(o.status, "settled")),
        with: { table: { columns: { code: true, name: true } } },
      });

      return occs.map((occ) => ({
        code: occ.table.code,
        name: occ.table.name,
        status: toGqlStatus(occ.status, occ),
      }));
    },

    // ── Staff queries ───────────────────────────────────────────────

    async managedTables(
      _source: unknown,
      args: {
        storeId?: string | null;
        filter?: {
          search?: string | null;
          type?: (string | null)[] | null;
          status?: (string | null)[] | null;
          store?: string | null;
          sortBy?: string | null;
          sortOrder?: "ASC" | "DESC" | null;
          pagination?: { offset?: number | null; limit?: number | null } | null;
        } | null;
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = dbFactory(ctx.env.DB);

      // ── No filter: legacy behavior ──────────────────────────────────
      if (!args.filter) {
        const tables = await tdb.query.tablesTable.findMany({
          where: args.storeId
            ? (t, { eq }) => eq(t.store_id, args.storeId!)
            : undefined,
          orderBy: (t, { desc }) => desc(t.create_at),
          with: {
            occupancies: {
              where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
              columns: {
                id: true,
                user_id: true,
                start_at: true,
                status: true,
                temp_id: true,
                seats: true,
                table_id: true,
                end_at: true,
                settled_at: true,
                note: true,
                pricing_snapshot_id: true,
                final_price: true,
                final_points: true,
                settled_price: true,
                settled_points: true,
              },
            },
          },
        });

        return Promise.all(
          tables.map(async (table) => {
            const occupancies = await Promise.all(
              table.occupancies.map((occ) =>
                enrichOccupancyWithUserInfo(tdb, occ),
              ),
            );
            return { ...toGqlTable(table), occupancies };
          }),
        );
      }

      const { filter } = args;

      // ── DB-level filtering (SQL builder API) ─────────────────────────
      const conditions: ReturnType<typeof eq>[] = [];

      if (filter.search) {
        const term = `%${filter.search}%`;
        conditions.push(like(tablesTable.name, term));
      }
      if (filter.type && filter.type.length > 0) {
        const dbTypes = filter.type
          .filter((t): t is string => t != null)
          .map((t) => t.toLowerCase());
        if (dbTypes.length > 0) {
          conditions.push(
            inArray(tablesTable.type, dbTypes as ("fixed" | "solo")[]),
          );
        }
      }
      if (filter.status && filter.status.length > 0) {
        const dbStatuses = filter.status
          .filter((s): s is string => s != null)
          .map((s) => s.toLowerCase());
        if (dbStatuses.length > 0) {
          conditions.push(
            inArray(
              tablesTable.status,
              dbStatuses as ("active" | "inactive")[],
            ),
          );
        }
      }
      const storeId = filter.store || args.storeId || ctx.preferredStoreId;
      if (storeId) {
        conditions.push(eq(tablesTable.store_id, storeId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const pagination = filter.pagination ?? { offset: 0, limit: 20 };
      const limit = pagination.limit ?? 20;
      const offset = pagination.offset ?? 0;

      const orderFn = filter.sortOrder === "ASC" ? asc : desc;
      const base = filter.sortBy ?? "create_at";

      let query = tdb.select().from(tablesTable).$dynamic();
      if (where) query = query.where(where);

      switch (base) {
        case "name":
          query = query.orderBy(orderFn(tablesTable.name));
          break;
        case "type":
          query = query.orderBy(orderFn(tablesTable.type));
          break;
        case "status":
          query = query.orderBy(orderFn(tablesTable.status));
          break;
        case "code":
          query = query.orderBy(orderFn(tablesTable.code));
          break;
        case "capacity":
          query = query.orderBy(orderFn(tablesTable.capacity));
          break;
        case "update_at":
          query = query.orderBy(orderFn(tablesTable.update_at));
          break;
        default:
          query = query.orderBy(orderFn(tablesTable.create_at));
          break;
      }

      query = query.limit(limit).offset(offset);

      const rows = await query;

      // Fetch occupancies and enrich each row
      const tables = await tdb.query.tablesTable.findMany({
        where: (t, { inArray: pgInArray }) =>
          pgInArray(
            t.id,
            rows.map((r) => r.id),
          ),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
            columns: {
              id: true,
              user_id: true,
              start_at: true,
              status: true,
              temp_id: true,
              seats: true,
              table_id: true,
              end_at: true,
              settled_at: true,
              note: true,
              pricing_snapshot_id: true,
            },
          },
        },
      });

      // Build a map for quick lookup
      const tableMap = new Map(
        tables.map((t) => [
          t.id,
          t.occupancies as Array<typeof tableOccupancyTable.$inferSelect>,
        ]),
      );

      return Promise.all(
        rows.map(async (row) => {
          const occs = tableMap.get(row.id) ?? [];
          const occupancies = await Promise.all(
            occs.map((occ) => enrichOccupancyWithUserInfo(tdb, occ)),
          );
          return { ...toGqlTable(row), occupancies };
        }),
      );
    },

    async managedTable(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        with: {
          occupancies: {
            columns: {
              id: true,
              user_id: true,
              start_at: true,
              status: true,
              temp_id: true,
              seats: true,
              table_id: true,
              end_at: true,
              settled_at: true,
              note: true,
              pricing_snapshot_id: true,
              final_price: true,
              final_points: true,
              settled_price: true,
              settled_points: true,
            },
          },
        },
      });
      if (!table) throw notFound("Table not found");

      const occupancies = await Promise.all(
        table.occupancies.map((occ) => enrichOccupancyWithUserInfo(tdb, occ)),
      );

      return { ...toGqlTable(table), occupancies };
    },

    async managedTableByCode(
      _source: unknown,
      args: { code: string; storeId?: string | null },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(tableByCodeSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const table = await fetchTableWithOccupancies(
        tdb,
        input.code,
        input.storeId,
      );
      if (!table) throw notFound("Table not found");

      const occupancies = await Promise.all(
        table.occupancies.map((occ) => enrichOccupancyWithUserInfo(tdb, occ)),
      );

      return { ...toGqlTable(table), occupancies };
    },

    async occupanciesByUser(
      _source: unknown,
      args: { userId: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const { userId } = zodToGraphQLError(
        z.object({ userId: z.string().min(1) }),
        args,
      );
      const tdb = dbFactory(ctx.env.DB);

      const occupancies = await tdb.query.tableOccupancyTable.findMany({
        where: (o, { eq }) => eq(o.user_id, userId),
        with: {
          table: {
            columns: { id: true, name: true, type: true, status: true },
          },
        },
      });

      return Promise.all(
        occupancies.map((occ) => enrichOccupancyWithUserInfo(tdb, occ)),
      );
    },
  },

  Mutation: {
    // ── Authenticated mutations ─────────────────────────────────────

    async occupyTable(
      _source: unknown,
      args: { input: { code: string } },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const { code } = zodToGraphQLError(occupyInputSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const existingOccupancy = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq, ne, and }) =>
          and(eq(o.user_id, ctx.userId), ne(o.status, "ended"), ne(o.status, "settled")),
        with: {
          table: { columns: { code: true, name: true, id: true } },
        },
      });

      if (existingOccupancy && existingOccupancy.table.code === code) {
        throw validationError("code", "You are already occupying this table");
      }

      if (existingOccupancy && existingOccupancy.status === "active") {
        await pauseWithReason(
          tdb,
          existingOccupancy.id,
          "auto_transfer",
          ctx.env,
        );
      }

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.code, code),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
            columns: { id: true },
          },
        },
      });
      if (!table) throw notFound("Table not found");
      if (table.status === "inactive")
        throw validationError("code", "Table is inactive");

      if (table.type !== "solo") {
        const totalOccupied = table.occupancies.length;
        if (totalOccupied + 1 > table.capacity) {
          throw validationError(
            "code",
            `Table is full (${totalOccupied}/${table.capacity})`,
          );
        }
      }

      const id = crypto.randomUUID();
      await tdb.insert(tableOccupancyTable).values({
        id,
        table_id: table.id,
        user_id: ctx.userId,
        seats: 1,
        start_at: new Date(),
      });

      await notifyDsSubscriptionFromTable(ctx, tdb, code, table.id);
      await publishSeatEvent(ctx, code, {
        type: "SEAT_OCCUPIED",
        payload: {
          tableId: table.id,
          userId: ctx.userId,
          occupancyId: id,
        },
      });

      const freshTable = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, table.id),
        with: {
          occupancies: {
            where: (o, { eq }) => eq(o.id, id),
          },
        },
      });

      const occupancy = freshTable?.occupancies[0];
      if (!occupancy) throw notFound("Failed to create occupancy");

      return {
        occupancy: await enrichOccupancyWithUserInfo(tdb, occupancy),
        table: toGqlTable(table),
      };
    },

    async leaveTable(
      _source: unknown,
      args: { input: { occupancyId: string; code: string } },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(leaveInputSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const occ = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.occupancyId),
      });
      if (!occ) throw notFound("Occupancy not found");
      if (occ.user_id !== ctx.userId)
        throw validationError(
          "occupancyId",
          "Can only leave your own occupancy",
        );

      await tdb
        .update(tableOccupancyTable)
        .set({ status: "ended", end_at: new Date() })
        .where(drizzle.eq(tableOccupancyTable.id, input.occupancyId));

      const openLog = await tdb.query.orderPauseLogsTable.findFirst({
        where: (l, { eq, isNull, and }) =>
          and(eq(l.occupancy_id, input.occupancyId), isNull(l.resumed_at)),
      });
      if (openLog) {
        const now = new Date();
        await tdb
          .update(orderPauseLogsTable)
          .set({ resumed_at: now })
          .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
      }

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.code, input.code),
        columns: { id: true, code: true },
      });
      if (table) {
        await notifyDsSubscriptionFromTable(ctx, tdb, input.code, table.id);
      }

      await publishSeatEvent(ctx, input.code, {
        type: "SEAT_LEFT",
        payload: {
          occupancyId: input.occupancyId,
          userId: ctx.userId,
        },
      });

      const updated = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.occupancyId),
      });
      if (!updated) throw notFound("Occupancy not found after update");

      return enrichOccupancyWithUserInfo(tdb, updated);
    },

    async pauseMyOrder(
      _source: unknown,
      args: { input: { occupancyId: string; code: string } },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(leaveInputSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const occ = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.occupancyId),
      });
      if (!occ) throw notFound("Occupancy not found");
      if (occ.user_id !== ctx.userId)
        throw validationError(
          "occupancyId",
          "Can only pause your own occupancy",
        );
      if (occ.status !== "active")
        throw validationError("occupancyId", "Can only pause active occupancy");

      await pauseWithReason(tdb, input.occupancyId, "manual", ctx.env);

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.code, input.code),
        columns: { id: true, code: true },
      });
      if (table) {
        await notifyDsSubscriptionFromTable(ctx, tdb, input.code, table.id);
      }

      await publishSeatEvent(ctx, input.code, {
        type: "SEAT_PAUSED",
        payload: {
          occupancyId: input.occupancyId,
          userId: ctx.userId,
        },
      });

      const updated = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.occupancyId),
      });
      if (!updated) throw notFound("Occupancy not found after pause");

      return enrichOccupancyWithUserInfo(tdb, updated);
    },

    // ── Staff mutations ─────────────────────────────────────────────

    async createTable(
      _source: unknown,
      args: { input: Record<string, unknown> },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(createTableSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const now = new Date();
      const id = crypto.randomUUID();
      const code = await generateUniqueCode(tdb);
      const dbType = input.type === "FIXED" ? "fixed" : "solo";
      const dbScope = input.scope.toLowerCase() as
        | "trpg"
        | "boardgame"
        | "console"
        | "mahjong";

      await tdb.insert(tablesTable).values({
        id,
        name: input.name.trim(),
        type: dbType,
        scope: dbScope,
        status: "active",
        capacity: dbType === "solo" ? 0 : (input.capacity ?? 4),
        description: input.description?.trim() || null,
        code,
        store_id: input.storeId ?? undefined,
        create_at: now,
        update_at: now,
      });

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
          },
        },
      });
      if (!table) throw notFound("Table not found after creation");

      return toGqlTable(table);
    },

    async updateTable(
      _source: unknown,
      args: { input: Record<string, unknown> },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(updateTableSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = { update_at: new Date() };

      if (fields.name !== undefined) updateData.name = fields.name.trim();
      if (fields.type !== undefined)
        updateData.type = fields.type === "SOLO" ? "solo" : "fixed";
      if (fields.scope !== undefined)
        updateData.scope = fields.scope.toLowerCase();
      if (fields.capacity !== undefined) updateData.capacity = fields.capacity;
      if (fields.description !== undefined)
        updateData.description = fields.description;

      if (Object.keys(updateData).length <= 1) {
        throw validationError("input", "No fields to update");
      }

      await tdb
        .update(tablesTable)
        .set(updateData)
        .where(drizzle.eq(tablesTable.id, id));

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
          },
        },
      });
      if (!table) throw notFound("Table not found after update");

      return toGqlTable(table);
    },

    async toggleTableStatus(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        columns: { id: true, status: true },
      });
      if (!table) throw notFound("Table not found");

      const newStatus = table.status === "active" ? "inactive" : "active";
      await tdb
        .update(tablesTable)
        .set({ status: newStatus, update_at: new Date() })
        .where(drizzle.eq(tablesTable.id, input.id));

      const updated = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
          },
        },
      });
      if (!updated) throw notFound("Table not found after toggle");

      return toGqlTable(updated);
    },

    async removeTable(_source: unknown, args: { id: string }, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const now = new Date();

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
          },
        },
      });
      if (!table) throw notFound("Table not found");

      const result = toGqlTable(table);

      for (const occ of table.occupancies) {
        const openLog = await tdb.query.orderPauseLogsTable.findFirst({
          where: (l, { eq, and, isNull }) =>
            and(eq(l.occupancy_id, occ.id), isNull(l.resumed_at)),
          orderBy: (l, { desc }) => desc(l.paused_at),
        });
        if (openLog) {
          await tdb
            .update(orderPauseLogsTable)
            .set({ resumed_at: now })
            .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
        }
        await tdb
          .update(tableOccupancyTable)
          .set({ status: "ended", end_at: now })
          .where(drizzle.eq(tableOccupancyTable.id, occ.id));
      }

      await tdb.delete(tablesTable).where(drizzle.eq(tablesTable.id, input.id));

      return result;
    },

    async regenerateTableCode(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const newCode = await generateUniqueCode(tdb);
      await tdb
        .update(tablesTable)
        .set({ code: newCode, update_at: new Date() })
        .where(drizzle.eq(tablesTable.id, input.id));

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
          },
        },
      });
      if (!table) throw notFound("Table not found after code regeneration");

      return toGqlTable(table);
    },

    async addTableOccupancy(
      _source: unknown,
      args: { input: Record<string, unknown> },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(addOccupancySchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.tableId),
        columns: { id: true, status: true, code: true },
      });
      if (!table) throw notFound("Table not found");
      if (table.status === "inactive")
        throw validationError("tableId", "Table is inactive");

      const id = crypto.randomUUID();
      await tdb.insert(tableOccupancyTable).values({
        id,
        table_id: input.tableId,
        user_id: input.userId,
        seats: 1,
        start_at: new Date(),
      });

      await notifyDsSubscriptionFromTable(ctx, tdb, table.code, table.id);

      const occ = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, id),
      });
      if (!occ) throw notFound("Occupancy not found after creation");

      return enrichOccupancyWithUserInfo(tdb, occ);
    },

    async removeTableOccupancy(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const occ = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.id),
        columns: { id: true, table_id: true, status: true },
      });
      if (!occ) throw notFound("Occupancy not found");

      const openLog = await tdb.query.orderPauseLogsTable.findFirst({
        where: (l, { eq, isNull, and }) =>
          and(eq(l.occupancy_id, input.id), isNull(l.resumed_at)),
      });
      if (openLog) {
        await tdb
          .update(orderPauseLogsTable)
          .set({ resumed_at: new Date() })
          .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
      }

      await tdb
        .update(tableOccupancyTable)
        .set({ status: "ended", end_at: new Date() })
        .where(drizzle.eq(tableOccupancyTable.id, input.id));

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, occ.table_id),
        columns: { id: true, code: true },
      });
      if (table) {
        await notifyDsSubscriptionFromTable(ctx, tdb, table.code, table.id);
      }

      const updated = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.id),
      });
      if (!updated) throw notFound("Occupancy not found after removal");

      return enrichOccupancyWithUserInfo(tdb, updated);
    },

    // ── Temp identity mutations ─────────────────────────────────────

    async createTempIdentity(
      _source: unknown,
      _args: unknown,
      ctx: GQLContext,
    ) {
      const tdb = dbFactory(ctx.env.DB);

      const id = crypto.randomUUID();
      const nickname = genNickname();
      const totpSecret = generateTotpSecret();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TEMP_IDENTITY_TTL_MS);

      await tdb.insert(tempIdentitiesTable).values({
        id,
        nickname,
        totp_secret: totpSecret,
        created_at: now,
      });

      return {
        id,
        nickname,
        totpSecret,
        expiresAt: expiresAt.toISOString(),
        valid: true,
      };
    },

    async occupyTableWithTempIdentity(
      _source: unknown,
      args: { input: Record<string, unknown> },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(tempOccupySchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      let tempRow: typeof tempIdentitiesTable.$inferSelect | undefined;
      try {
        tempRow = await tdb.query.tempIdentitiesTable.findFirst({
          where: (t, { eq }) => eq(t.id, input.tempId),
        });
      } catch {
        throw validationError("tempId", "Temp identity unavailable");
      }
      if (!tempRow) throw validationError("tempId", "Temp identity not found");

      const createdAt = asMs(tempRow.created_at) ?? 0;
      const expiresAt = createdAt + TEMP_IDENTITY_TTL_MS;
      if (Date.now() > expiresAt)
        throw validationError("tempId", "Temp identity expired");

      const existingOccupancy = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq, ne, and }) =>
          and(eq(o.temp_id, input.tempId), ne(o.status, "ended"), ne(o.status, "settled")),
        with: { table: { columns: { code: true, name: true, id: true } } },
      });

      if (existingOccupancy && existingOccupancy.table.code === input.code) {
        throw validationError("code", "Already occupying this table");
      }

      if (existingOccupancy && existingOccupancy.status === "active") {
        await pauseWithReason(
          tdb,
          existingOccupancy.id,
          "auto_transfer",
          ctx.env,
        );
      }

      // Find table
      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.code, input.code),
        with: {
          occupancies: {
            where: (o, { and, ne }) => and(ne(o.status, "ended"), ne(o.status, "settled")),
            columns: { id: true },
          },
        },
      });
      if (!table) throw notFound("Table not found");
      if (table.status === "inactive")
        throw validationError("code", "Table is inactive");

      if (table.type !== "solo") {
        const totalOccupied = table.occupancies.length;
        if (totalOccupied + 1 > table.capacity) {
          throw validationError(
            "code",
            `Table is full (${totalOccupied}/${table.capacity})`,
          );
        }
      }

      const id = crypto.randomUUID();
      await tdb.insert(tableOccupancyTable).values({
        id,
        table_id: table.id,
        temp_id: input.tempId,
        seats: 1,
        start_at: new Date(),
      });

      await notifyDsSubscriptionFromTable(ctx, tdb, input.code, table.id);

      await publishSeatEvent(ctx, input.code, {
        type: "SEAT_OCCUPIED",
        payload: {
          tableId: table.id,
          tempId: input.tempId,
          occupancyId: id,
        },
      });

      const freshTable = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, table.id),
        with: {
          occupancies: {
            where: (o, { eq }) => eq(o.id, id),
          },
        },
      });

      const occupancy = freshTable?.occupancies[0];
      if (!occupancy) throw notFound("Failed to create occupancy");

      return {
        occupancy: await enrichOccupancyWithUserInfo(tdb, occupancy),
        table: toGqlTable(table),
      };
    },

    async leaveTableWithTempIdentity(
      _source: unknown,
      args: { input: Record<string, unknown> },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(tempLeaveSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);
      const now = new Date();

      const occ = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.occupancyId),
      });
      if (!occ) throw notFound("Occupancy not found");
      if (occ.temp_id !== input.tempId)
        throw validationError("tempId", "Can only leave your own occupancy");

      const openLog = await tdb.query.orderPauseLogsTable.findFirst({
        where: (l, { eq, isNull, and }) =>
          and(eq(l.occupancy_id, input.occupancyId), isNull(l.resumed_at)),
      });
      if (openLog) {
        await tdb
          .update(orderPauseLogsTable)
          .set({ resumed_at: now })
          .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
      }

      await tdb
        .update(tableOccupancyTable)
        .set({ status: "ended", end_at: now })
        .where(drizzle.eq(tableOccupancyTable.id, input.occupancyId));

      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.code, input.code),
        columns: { id: true, code: true },
      });
      if (table) {
        await notifyDsSubscriptionFromTable(ctx, tdb, input.code, table.id);
      }

      await publishSeatEvent(ctx, input.code, {
        type: "SEAT_LEFT",
        payload: {
          occupancyId: input.occupancyId,
          tempId: input.tempId,
        },
      });

      const updated = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, input.occupancyId),
      });
      if (!updated) throw notFound("Occupancy not found after leave");

      return {
        order: await enrichOccupancyWithUserInfo(tdb, updated),
        price: 0,
        snapshot: null,
        storedValueDeduction: null,
      };
    },

    async transferTempIdentity(
      _source: unknown,
      args: { tempId: string; userId: string },
      ctx: GQLContext,
    ) {
      const input = zodToGraphQLError(transferSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      const activeOccupancy = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq, ne, and }) =>
          and(eq(o.temp_id, input.tempId), ne(o.status, "ended"), ne(o.status, "settled")),
        with: { table: { columns: { code: true, id: true } } },
      });

      if (!activeOccupancy) {
        return { transferred: false, occupancy: null };
      }

      await tdb
        .update(tableOccupancyTable)
        .set({ user_id: input.userId, temp_id: null })
        .where(drizzle.eq(tableOccupancyTable.id, activeOccupancy.id));

      await notifyDsSubscriptionFromTable(
        ctx,
        tdb,
        activeOccupancy.table.code,
        activeOccupancy.table.id,
      );

      const updated = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { eq }) => eq(o.id, activeOccupancy.id),
      });
      if (!updated) {
        return { transferred: false, occupancy: null };
      }

      return {
        transferred: true,
        occupancy: await enrichOccupancyWithUserInfo(tdb, updated),
      };
    },
  },
};
