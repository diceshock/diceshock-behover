import dbFactory, {
  drizzle,
  orderPauseLogsTable,
  type pricingSnapshotsTable,
  tableOccupancyTable,
  tablesTable,
  userInfoTable,
  userMembershipPlansTable,
  users,
} from "@lib/db";
import type { SQL } from "drizzle-orm";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  or,
} from "drizzle-orm";
import { z } from "zod/v4";
import {
  calculatePrice,
  type PriceBreakdown,
  type SnapshotData,
} from "@/shared/utils/pricing";
import type { GQLContext } from "../context";
import { notFound, validationError } from "../errors";
import { requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

type Database = ReturnType<typeof dbFactory>;
type TableRow = typeof tablesTable.$inferSelect;
type OccupancyRow = typeof tableOccupancyTable.$inferSelect & {
  table?: TableRow | null;
  pauseLogs?: PauseLogRow[];
};
type PauseLogRow = typeof orderPauseLogsTable.$inferSelect;
type MembershipPlanRow = typeof userMembershipPlansTable.$inferSelect;
type SettlementSnapshot = NonNullable<
  typeof tableOccupancyTable.$inferSelect.settlement_snapshot
>;

type NormalizedStatus = "ACTIVE" | "PAUSED" | "ENDED" | "SETTLED";

const RECENT_SETTLEMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const paginationSchema = z
  .object({
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .default({ offset: 0, limit: 50 });

const orderFilterSchema = z.object({
  search: z.string().nullable().optional(),
  status: z.array(z.string()).nullable().optional(),
  tableCode: z.string().nullable().optional(),
  store: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  sortBy: z.string().nullable().optional(),
  sortOrder: z.enum(["ASC", "DESC"]).nullable().optional(),
  groupBy: z.string().nullable().optional(),
  pagination: paginationSchema.optional(),
});

const ordersSchema = z.object({
  filter: orderFilterSchema.optional(),
  pagination: paginationSchema.optional(),
  input: z
    .object({
      search: z.string().optional(),
      status: z
        .enum(["ALL", "ACTIVE", "PAUSED", "ENDED", "SETTLED", "CANCELLED"])
        .default("ALL"),
      pagination: paginationSchema.optional(),
      storeId: z.string().optional(),
    })
    .optional(),
});

type LegacyOrderInput = NonNullable<z.infer<typeof ordersSchema>["input"]>;
type OrderFilter = z.infer<typeof orderFilterSchema>;

type DbOrderStatus = "active" | "paused" | "ended";

function normalizeFilterStatus(
  status: string,
): NormalizedStatus | "ALL" | null {
  const normalized = status.toUpperCase();
  if (normalized === "ALL") return "ALL";
  if (
    normalized === "ACTIVE" ||
    normalized === "PAUSED" ||
    normalized === "ENDED" ||
    normalized === "SETTLED"
  ) {
    return normalized;
  }
  return null;
}

function buildStatusCondition(
  statuses: string[] | null | undefined,
): SQL | null {
  if (!statuses?.length) return null;
  const normalized = statuses.map(normalizeFilterStatus).filter(Boolean);
  if (normalized.includes("ALL")) return null;

  const rawStatuses = normalized
    .filter(
      (status): status is "ACTIVE" | "PAUSED" =>
        status === "ACTIVE" || status === "PAUSED",
    )
    .map((status) => status.toLowerCase() as DbOrderStatus);

  const conditions: SQL[] = [];
  if (rawStatuses.length === 1) {
    conditions.push(eq(tableOccupancyTable.status, rawStatuses[0]!));
  } else if (rawStatuses.length > 1) {
    conditions.push(inArray(tableOccupancyTable.status, rawStatuses));
  }
  if (normalized.includes("ENDED")) {
    conditions.push(
      and(
        eq(tableOccupancyTable.status, "ended"),
        isNull(tableOccupancyTable.final_price),
        isNull(tableOccupancyTable.settlement_snapshot),
      ) as SQL,
    );
  }
  if (normalized.includes("SETTLED")) {
    conditions.push(
      or(
        isNotNull(tableOccupancyTable.final_price),
        isNotNull(tableOccupancyTable.settlement_snapshot),
      ) as SQL,
    );
  }

  if (conditions.length === 0) return eq(tableOccupancyTable.id, "__none__");
  return conditions.length === 1 ? conditions[0]! : (or(...conditions) as SQL);
}

function buildLegacyFilter(input: LegacyOrderInput) {
  return {
    search: input.search,
    status: input.status,
    tableId: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
    storeId: input.storeId,
  };
}

function applyOrderGrouping(rows: OccupancyRow[], groupBy?: string | null) {
  if (!groupBy || groupBy.toUpperCase() === "NONE") return rows;

  const groups = new Map<string, OccupancyRow[]>();
  for (const row of rows) {
    let key = "";
    switch (groupBy.toUpperCase()) {
      case "TABLE":
        key = row.table_id;
        break;
      case "USER":
        key = row.user_id ?? row.temp_id ?? "unknown";
        break;
      case "DATE":
        key = toIso(row.start_at)?.slice(0, 10) ?? "unknown";
        break;
      default:
        key = "";
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return Array.from(groups.values()).flat();
}

async function fetchFilteredOrders(tdb: Database, filter: OrderFilter) {
  const pagination = filter.pagination ?? { offset: 0, limit: 50 };
  const conditions: SQL[] = [];
  const statusCondition = buildStatusCondition(filter.status);
  if (statusCondition) conditions.push(statusCondition);

  if (filter.tableCode?.trim()) {
    conditions.push(eq(tablesTable.code, filter.tableCode.trim()));
  }
  if (filter.store?.trim()) {
    conditions.push(eq(tablesTable.store_id, filter.store.trim()));
  }
  if (filter.dateFrom) {
    conditions.push(
      gte(tableOccupancyTable.start_at, new Date(filter.dateFrom)),
    );
  }
  if (filter.dateTo) {
    conditions.push(lte(tableOccupancyTable.start_at, new Date(filter.dateTo)));
  }
  if (filter.search?.trim()) {
    const search = filter.search.trim();
    const term = `%${search}%`;
    conditions.push(
      or(
        eq(tableOccupancyTable.id, search),
        eq(tableOccupancyTable.user_id, search),
        eq(tableOccupancyTable.temp_id, search),
        like(tablesTable.name, term),
        like(tablesTable.code, term),
        like(users.name, term),
        like(users.email, term),
        like(userInfoTable.uid, term),
        like(userInfoTable.nickname, term),
        like(userInfoTable.phone, term),
      ) as SQL,
    );
  }

  const whereClause = conditions.length
    ? (and(...conditions) as SQL)
    : undefined;
  const countQuery = tdb
    .select({ count: drizzle.count() })
    .from(tableOccupancyTable)
    .leftJoin(tablesTable, eq(tableOccupancyTable.table_id, tablesTable.id))
    .leftJoin(users, eq(tableOccupancyTable.user_id, users.id))
    .leftJoin(userInfoTable, eq(tableOccupancyTable.user_id, userInfoTable.id))
    .$dynamic();
  const totalRows = whereClause
    ? await countQuery.where(whereClause)
    : await countQuery;
  const total = (totalRows[0]?.count as number) ?? 0;

  const orderFn = filter.sortOrder === "ASC" ? asc : desc;
  const sortColumn = (() => {
    switch (filter.sortBy) {
      case "end_at":
      case "ended_at":
      case "END_AT":
        return orderFn(tableOccupancyTable.end_at);
      case "created_at":
      case "create_at":
        return orderFn(tableOccupancyTable.id);
      case "start_at":
      case "started_at":
      case "START_AT":
      default:
        return orderFn(tableOccupancyTable.start_at);
    }
  })();

  const idQuery = tdb
    .select({ id: tableOccupancyTable.id })
    .from(tableOccupancyTable)
    .leftJoin(tablesTable, eq(tableOccupancyTable.table_id, tablesTable.id))
    .leftJoin(users, eq(tableOccupancyTable.user_id, users.id))
    .leftJoin(userInfoTable, eq(tableOccupancyTable.user_id, userInfoTable.id))
    .$dynamic();
  const filteredIdQuery = whereClause ? idQuery.where(whereClause) : idQuery;
  const idRows = await filteredIdQuery
    .orderBy(sortColumn)
    .limit(pagination.limit)
    .offset(pagination.offset);
  const ids = idRows.map((row) => row.id);

  if (ids.length === 0) {
    return {
      items: [],
      pageInfo: {
        offset: pagination.offset,
        limit: pagination.limit,
        total,
        nextCursor: null,
        hasMore: false,
      },
    };
  }

  const rows = (await tdb.query.tableOccupancyTable.findMany({
    where: (o, { inArray: pgInArray }) => pgInArray(o.id, ids),
    with: { table: true, pauseLogs: true },
  })) as OccupancyRow[];
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const orderedRows = ids
    .map((id) => rowMap.get(id))
    .filter((row): row is OccupancyRow => Boolean(row));
  const groupedRows = applyOrderGrouping(orderedRows, filter.groupBy);

  return {
    items: groupedRows.map(toGqlOrder),
    pageInfo: {
      offset: pagination.offset,
      limit: pagination.limit,
      total,
      nextCursor: null,
      hasMore: pagination.offset + pagination.limit < total,
    },
  };
}

const startOrderSchema = z.object({
  input: z.object({
    tableId: z.string().min(1),
    userId: z.string().nullable().optional(),
    tempId: z.string().nullable().optional(),
    planId: z.string().nullable().optional(),
    seats: z.number().int().min(1).max(99).default(1),
    storeId: z.string().nullable().optional(),
  }),
});

const idSchema = z.object({ id: z.string().min(1) });
const previewSchema = z.object({
  id: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
});
const batchPreviewSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).optional(),
  orderIds: z.array(z.string().min(1)).min(1).optional(),
});
const settleOrderSchema = z.object({
  input: z.object({
    id: z.string().min(1),
    deductFromStoredValue: z.boolean().default(false),
    paymentMethod: z.string().nullable().optional(),
  }),
});
const batchSettleSchema = z.object({
  input: z.object({
    ids: z.array(z.string().min(1)).min(1),
    deductFromStoredValue: z.boolean().default(false),
    paymentMethod: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  }),
});
const cleanupSchema = z.object({ dryRun: z.boolean().default(true) });

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

function normalizeStatus(
  order: typeof tableOccupancyTable.$inferSelect,
): NormalizedStatus {
  if (order.status === "active") return "ACTIVE";
  if (order.status === "paused") return "PAUSED";
  if (order.final_price != null || order.settlement_snapshot) return "SETTLED";
  return "ENDED";
}

function toGqlTable(table: TableRow | null | undefined) {
  if (!table) return null;
  return {
    id: table.id,
    name: table.name,
    type: table.type.toUpperCase(),
    scope: table.scope.toUpperCase(),
    status: table.status.toUpperCase(),
    capacity: table.capacity,
    code: table.code,
    description: table.description ?? null,
    storeId: table.store_id ?? null,
    occupancies: [],
    createdAt: toIso(table.create_at),
    updatedAt: toIso(table.update_at),
  };
}

function jsonString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function toGqlOrder(order: OccupancyRow) {
  return {
    id: order.id,
    tableId: order.table_id,
    userId: order.user_id ?? null,
    tempId: order.temp_id ?? null,
    nickname: null,
    uid: null,
    phone: null,
    seats: order.seats,
    status: normalizeStatus(order),
    startAt: toIso(order.start_at),
    endAt: toIso(order.end_at),
    finalPrice: order.final_price ?? null,
    pricingSnapshotId: order.pricing_snapshot_id ?? null,
    priceBreakdown: jsonString(order.price_breakdown),
    settlementSnapshot: jsonString(order.settlement_snapshot),
    table: toGqlTable(order.table),
    user: null,
    duration: calculateActiveMinutes(order, order.pauseLogs ?? []),
    amount: order.final_price ?? order.price_breakdown?.finalPrice ?? null,
  };
}

function pauseLogsToPricing(
  logs: PauseLogRow[],
  endAt: number,
): Array<{ pausedAt: number; resumedAt: number | null }> {
  return logs.map((log) => ({
    pausedAt: asMs(log.paused_at) ?? endAt,
    resumedAt: log.resumed_at ? asMs(log.resumed_at) : null,
  }));
}

function calculateActiveMinutes(
  order: typeof tableOccupancyTable.$inferSelect,
  logs: PauseLogRow[],
  fallbackEndAt = Date.now(),
): number {
  const startAt = asMs(order.start_at) ?? fallbackEndAt;
  const endAt = asMs(order.end_at) ?? fallbackEndAt;
  const totalMs = Math.max(0, endAt - startAt);
  let pausedMs = 0;
  for (const log of logs) {
    const pausedAt = asMs(log.paused_at) ?? startAt;
    const resumedAt = asMs(log.resumed_at) ?? endAt;
    const pauseStart = Math.max(pausedAt, startAt);
    const pauseEnd = Math.min(resumedAt, endAt);
    if (pauseEnd > pauseStart) pausedMs += pauseEnd - pauseStart;
  }
  return Math.floor(Math.max(0, totalMs - pausedMs) / 60000);
}

async function publishOrderEvent(
  ctx: GQLContext,
  orderId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const env = ctx.env as GQLContext["env"] & {
      PUBSUB?: DurableObjectNamespace;
    };
    if (!env.PUBSUB) return;
    const pubsubId = env.PUBSUB.idFromName(`order:${orderId}`);
    const stub = env.PUBSUB.get(pubsubId);
    await stub.fetch("https://internal/publish", {
      method: "POST",
      body: JSON.stringify({ type, payload, timestamp: Date.now() }),
    });
  } catch (e) { console.error("[orders] publishOrderEvent error", e); }
}

async function fetchOrder(
  tdb: Database,
  orderId: string,
): Promise<OccupancyRow | null> {
  const order = await tdb.query.tableOccupancyTable.findFirst({
    where: (o, { eq }) => eq(o.id, orderId),
    with: { table: true, pauseLogs: true },
  });
  return (order as OccupancyRow | null) ?? null;
}

async function fetchOrderOrThrow(
  tdb: Database,
  orderId: string,
): Promise<OccupancyRow> {
  const order = await fetchOrder(tdb, orderId);
  if (!order) throw notFound("Order not found");
  return order;
}

function assertStoreAccess(order: OccupancyRow, storeId?: string | null): void {
  if (storeId && order.table?.store_id !== storeId) {
    throw notFound("Order not found");
  }
}

async function getPublishedSnapshot(
  tdb: Database,
  storeId?: string | null,
): Promise<typeof pricingSnapshotsTable.$inferSelect | null> {
  if (storeId) {
    const scoped = await tdb.query.pricingSnapshotsTable.findFirst({
      where: (s, { and, eq }) =>
        and(eq(s.status, "published"), eq(s.store_id, storeId)),
      orderBy: (s, { desc }) => desc(s.created_at),
    });
    if (scoped) return scoped;
  }

  return (
    (await tdb.query.pricingSnapshotsTable.findFirst({
      where: (s, { eq }) => eq(s.status, "published"),
      orderBy: (s, { desc }) => desc(s.created_at),
    })) ?? null
  );
}

async function buildSettlementData(
  tdb: Database,
  orderId: string,
  options: { closeOpenPause?: boolean; endAt?: Date } = {},
): Promise<{
  order: OccupancyRow;
  totalMinutes: number;
  pausedMinutes: number;
  billableMinutes: number;
  finalPrice: number;
  priceBreakdown: PriceBreakdown | null;
  snapshotId: string | null;
  pauseLogs: Array<{ pausedAt: number; resumedAt: number | null }>;
  pricingPlans: Array<{
    name: string;
    planType: string;
    billingType: string;
    price: number;
    matched: boolean;
  }>;
  membership: SettlementSnapshot["membership"];
}> {
  const order = await fetchOrderOrThrow(tdb, orderId);
  const endDate = options.endAt ?? order.end_at ?? new Date();
  const endAt = asMs(endDate) ?? Date.now();
  const startAt = asMs(order.start_at) ?? endAt;
  const logs = order.pauseLogs ?? [];
  const mappedLogs = pauseLogsToPricing(logs, endAt).map((log) => ({
    ...log,
    resumedAt: log.resumedAt ?? (options.closeOpenPause ? endAt : null),
  }));
  const publishedSnapshot = await getPublishedSnapshot(
    tdb,
    order.table?.store_id,
  );
  const snapshotData = publishedSnapshot?.data as SnapshotData | null;
  const priceBreakdown = calculatePrice(
    startAt,
    endAt,
    order.table?.scope ?? "boardgame",
    snapshotData,
    mappedLogs,
  );
  const totalMinutes = Math.floor(Math.max(0, endAt - startAt) / 60000);
  const pausedMinutes =
    totalMinutes - calculateActiveMinutes(order, logs, endAt);
  const membership = await buildMembershipInfo(tdb, order.user_id);

  return {
    order,
    totalMinutes,
    pausedMinutes: Math.max(0, pausedMinutes),
    billableMinutes: Math.max(0, totalMinutes - Math.max(0, pausedMinutes)),
    finalPrice: priceBreakdown?.finalPrice ?? 0,
    priceBreakdown,
    snapshotId: publishedSnapshot?.id ?? null,
    pauseLogs: mappedLogs,
    pricingPlans: (snapshotData?.plans ?? []).map((plan) => ({
      name: plan.name,
      planType: plan.plan_type,
      billingType: plan.billing_type,
      price: plan.price,
      matched: priceBreakdown?.planName === plan.name,
    })),
    membership,
  };
}

async function buildMembershipInfo(
  tdb: Database,
  userId: string | null,
): Promise<SettlementSnapshot["membership"]> {
  if (!userId) {
    return {
      hasTimePlan: false,
      timePlanActive: false,
      timePlanType: null,
      timePlanEndDate: null,
      storedValueBalance: 0,
    };
  }

  const plans = await tdb.query.userMembershipPlansTable.findMany({
    where: (p, { eq }) => eq(p.user_id, userId),
  });
  const now = Date.now();
  const timePlans = plans.filter((p) =>
    ["monthly", "monthly_cc", "yearly"].includes(p.plan_type),
  );
  const activeTimePlan = timePlans.find((p) => {
    const start = asMs(p.start_date) ?? 0;
    const end = asMs(p.end_date);
    return start <= now && (end == null || end >= now);
  });
  const storedValueBalance = plans
    .filter((p) => p.plan_type === "stored_value")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    hasTimePlan: timePlans.length > 0,
    timePlanActive: Boolean(activeTimePlan),
    timePlanType: activeTimePlan?.plan_type ?? null,
    timePlanEndDate: asMs(activeTimePlan?.end_date),
    storedValueBalance,
  };
}

function toGqlSettlementPreview(
  data: Awaited<ReturnType<typeof buildSettlementData>>,
) {
  return {
    order: toGqlOrder({
      ...data.order,
      price_breakdown: data.priceBreakdown,
      final_price: data.finalPrice,
      pauseLogs: data.order.pauseLogs ?? [],
    }),
    totalMinutes: data.totalMinutes,
    pausedMinutes: data.pausedMinutes,
    billableMinutes: data.billableMinutes,
    finalPrice: data.finalPrice,
    priceBreakdown: data.priceBreakdown,
    membership: {
      hasTimePlan: data.membership.hasTimePlan,
      timePlanActive: data.membership.timePlanActive,
      timePlanType: data.membership.timePlanType,
      timePlanEndDate: toIso(data.membership.timePlanEndDate),
      storedValueBalance: data.membership.storedValueBalance,
    },
    pauseLogs: data.pauseLogs.map((log) => ({
      pausedAt: toIso(log.pausedAt),
      resumedAt: toIso(log.resumedAt),
    })),
    pricingPlans: data.pricingPlans,
    recentOrders: [],
  };
}

async function applyStoredValueDeduction(
  tdb: Database,
  userId: string | null,
  amount: number,
  note: string,
): Promise<SettlementSnapshot["storedValueDeduction"]> {
  if (!userId || amount <= 0) return null;
  const plans = await tdb.query.userMembershipPlansTable.findMany({
    where: (p, { eq }) => eq(p.user_id, userId),
  });
  const balanceBefore = plans
    .filter((p) => p.plan_type === "stored_value")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  if (balanceBefore <= 0) return null;

  const deductAmount = Math.min(balanceBefore, amount);
  let remaining = deductAmount;
  const creditPlans = plans
    .filter((p): p is MembershipPlanRow =>
      Boolean(p.plan_type === "stored_value" && (p.amount ?? 0) > 0),
    )
    .sort((a, b) => (asMs(a.create_at) ?? 0) - (asMs(b.create_at) ?? 0));

  for (const plan of creditPlans) {
    if (remaining <= 0) break;
    const available = plan.amount ?? 0;
    const amountToDeduct = Math.min(available, remaining);
    await tdb
      .update(userMembershipPlansTable)
      .set({ amount: available - amountToDeduct, update_at: new Date() })
      .where(drizzle.eq(userMembershipPlansTable.id, plan.id));
    remaining -= amountToDeduct;
  }

  await tdb.insert(userMembershipPlansTable).values({
    user_id: userId,
    plan_type: "stored_value",
    amount: -deductAmount,
    note,
    start_date: new Date(),
  });

  return {
    deducted: true,
    amount: deductAmount,
    note,
    balanceBefore,
    balanceAfter: balanceBefore - deductAmount,
  };
}

async function settleOrderById(
  tdb: Database,
  ctx: GQLContext,
  input: {
    id: string;
    deductFromStoredValue?: boolean;
    paymentMethod?: string | null;
    note?: string | null;
  },
) {
  const existing = await fetchOrderOrThrow(tdb, input.id);
  if (normalizeStatus(existing) === "SETTLED") {
    throw validationError("id", "Order is already settled");
  }
  if (existing.status === "paused") {
    throw validationError(
      "id",
      "Paused orders must be resumed or ended before settlement",
    );
  }

  const now = new Date();
  const settlementEnd = existing.end_at ?? now;
  const data = await buildSettlementData(tdb, input.id, {
    closeOpenPause: true,
    endAt: settlementEnd,
  });
  const note = `${input.paymentMethod ?? "settlement"} · ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  const storedValueDeduction = input.deductFromStoredValue
    ? await applyStoredValueDeduction(
        tdb,
        existing.user_id,
        data.finalPrice,
        note,
      )
    : null;
  const settlementSnapshot: SettlementSnapshot = {
    orderId: existing.id,
    tableName: existing.table?.name ?? "未知",
    tableType: existing.table?.scope ?? "boardgame",
    nickname: "Anonymous",
    uid: null,
    seats: existing.seats,
    startAt: asMs(existing.start_at) ?? Date.now(),
    endAt: asMs(settlementEnd) ?? Date.now(),
    totalMinutes: data.totalMinutes,
    pausedMinutes: data.pausedMinutes,
    billableMinutes: data.billableMinutes,
    finalPrice: data.finalPrice,
    priceBreakdown: data.priceBreakdown,
    membership: {
      ...data.membership,
      storedValueBalance:
        storedValueDeduction?.balanceAfter ??
        data.membership.storedValueBalance,
    },
    storedValueDeduction,
    pauseLogs: data.pauseLogs,
    pricingPlans: data.pricingPlans.map((plan) => ({
      name: plan.name,
      planType: plan.planType as "fallback" | "conditional",
      billingType: plan.billingType as "hourly" | "fixed",
      price: plan.price,
      matched: plan.matched,
    })),
    recentOrders: [],
    createdAt: Date.now(),
    note: input.note ?? null,
  };

  await tdb
    .update(tableOccupancyTable)
    .set({
      status: "ended",
      end_at: settlementEnd,
      final_price: data.finalPrice,
      pricing_snapshot_id: data.snapshotId,
      price_breakdown: data.priceBreakdown,
      settlement_snapshot: settlementSnapshot,
    })
    .where(drizzle.eq(tableOccupancyTable.id, input.id));

  const updated = await fetchOrderOrThrow(tdb, input.id);
  await publishOrderEvent(ctx, input.id, "ORDER_STATUS_CHANGED", {
    orderId: input.id,
    previousStatus: normalizeStatus(existing),
    status: "SETTLED",
    amount: data.finalPrice,
  });

  return {
    order: toGqlOrder(updated),
    price: data.finalPrice,
    snapshot: JSON.stringify(settlementSnapshot),
    storedValueDeduction,
  };
}

async function closeOpenPauseLog(tdb: Database, orderId: string, now: Date) {
  const openLog = await tdb.query.orderPauseLogsTable.findFirst({
    where: (log, { and, eq, isNull }) =>
      and(eq(log.occupancy_id, orderId), isNull(log.resumed_at)),
    orderBy: (log, { desc }) => desc(log.paused_at),
  });
  if (!openLog) return;
  await tdb
    .update(orderPauseLogsTable)
    .set({ resumed_at: now })
    .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
}

export const ordersTypeDefs = `
  extend enum OrderStatus {
    ENDED
  }

  extend type TableOccupancy {
    duration: Int!
    amount: Int
  }

  input StartOrderInput {
    tableId: ID!
    userId: ID
    tempId: ID
    planId: ID
    seats: Int = 1
    storeId: ID
  }

  input OrderFilterInput {
    search: String
    status: [String!]
    tableCode: String
    store: String
    dateFrom: String
    dateTo: String
    sortBy: String
    sortOrder: SortOrder
    groupBy: String
    pagination: PaginationInput
  }

  extend type Query {
    orders(filter: OrderFilterInput, pagination: PaginationInput, input: OrderListInput): OrderListResult!
    order(id: ID!): TableOccupancy!
    settlementPreview(orderId: ID, id: ID): SettlementPreview!
    batchSettlementPreview(orderIds: [ID!], ids: [ID!]): [SettlementPreview!]!
  }

  extend type Mutation {
    startOrder(input: StartOrderInput!): TableOccupancy!
    endOrder(id: ID!): TableOccupancy!
    pauseOrder(id: ID!): TableOccupancy!
    resumeOrder(id: ID!): TableOccupancy!
    settleOrder(input: SettleOrderInput!): SettlementResult!
    batchSettle(input: BatchSettleInput!): [BatchOrderResult!]!
    batchPauseOrders(ids: [ID!]!): [BatchOrderResult!]!
    batchResumeOrders(ids: [ID!]!): [BatchOrderResult!]!
    batchSettleOrders(input: BatchSettleInput!): BatchSettlementResult!
    cancelSettlement(id: ID!): BatchOrderResult!
    cancelBatchSettlement(ids: [ID!]!): [BatchOrderResult!]!
    cleanupOrphanedData(dryRun: Boolean = true): CleanupOrphanedDataResult!
    cleanupOrphanedOrders(dryRun: Boolean = true): CleanupOrphanedDataResult!
  }
`;

export const ordersResolvers = {
  TableOccupancy: {
    duration(
      source: { id?: string; duration?: number },
      _args: unknown,
      ctx: GQLContext,
    ) {
      if (typeof source.duration === "number") return source.duration;
      if (!source.id) return 0;
      return fetchOrder(ctx.db, source.id).then((order) =>
        order ? calculateActiveMinutes(order, order.pauseLogs ?? []) : 0,
      );
    },
    amount(
      source: {
        id?: string;
        amount?: number | null;
        finalPrice?: number | null;
      },
      _args: unknown,
      ctx: GQLContext,
    ) {
      if (source.amount != null) return source.amount;
      if (source.finalPrice != null) return source.finalPrice;
      if (!source.id) return null;
      return buildSettlementData(ctx.db, source.id).then(
        (data) => data.finalPrice,
      );
    },
  },
  Query: {
    async orders(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const parsed = zodToGraphQLError(ordersSchema, args);
      const tdb = dbFactory(ctx.env.DB);

      if (parsed.filter != null) {
        return fetchFilteredOrders(tdb, parsed.filter);
      }

      const input = parsed.input ?? { status: "ALL" as const };
      const filter = buildLegacyFilter(input);
      const pagination = input.pagination ??
        parsed.pagination ?? {
          offset: 0,
          limit: 50,
        };
      const rows = (await tdb.query.tableOccupancyTable.findMany({
        with: { table: true, pauseLogs: true },
        orderBy: (o, { desc }) => desc(o.start_at),
      })) as OccupancyRow[];

      const startDate = asMs(filter.startDate);
      const endDate = asMs(filter.endDate);
      const search = filter.search?.trim().toLowerCase();
      const filtered = rows.filter((row) => {
        const status = normalizeStatus(row);
        const startAt = asMs(row.start_at) ?? 0;
        if (
          filter.status &&
          filter.status !== "ALL" &&
          filter.status !== status
        )
          return false;
        if (filter.tableId && row.table_id !== filter.tableId) return false;
        if (filter.storeId && row.table?.store_id !== filter.storeId)
          return false;
        if (startDate != null && startAt < startDate) return false;
        if (endDate != null && startAt > endDate) return false;
        if (search) {
          const haystack = [
            row.id,
            row.table?.name,
            row.table?.code,
            row.user_id,
            row.temp_id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });
      const items = filtered.slice(
        pagination.offset,
        pagination.offset + pagination.limit,
      );
      return {
        items: items.map(toGqlOrder),
        pageInfo: {
          offset: pagination.offset,
          limit: pagination.limit,
          total: filtered.length,
          nextCursor: null,
          hasMore: pagination.offset + pagination.limit < filtered.length,
        },
      };
    },
    async order(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      return toGqlOrder(
        await fetchOrderOrThrow(dbFactory(ctx.env.DB), input.id),
      );
    },
    async settlementPreview(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(previewSchema, args);
      const orderId = input.orderId ?? input.id;
      if (!orderId) throw validationError("orderId", "orderId is required");
      const tdb = dbFactory(ctx.env.DB);
      const order = await fetchOrderOrThrow(tdb, orderId);
      if (normalizeStatus(order) === "SETTLED") {
        throw validationError("orderId", "Order is already settled");
      }
      return toGqlSettlementPreview(await buildSettlementData(tdb, orderId));
    },
  },
  Mutation: {
    async batchSettlementPreview(
      _source: unknown,
      args: unknown,
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(batchPreviewSchema, args);
      const orderIds = input.orderIds ?? input.ids;
      if (!orderIds) throw validationError("orderIds", "orderIds is required");
      const tdb = dbFactory(ctx.env.DB);
      const previews = await Promise.all(
        orderIds.map((id) =>
          buildSettlementData(tdb, id).then(toGqlSettlementPreview),
        ),
      );
      return previews;
    },
    async startOrder(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const { input } = zodToGraphQLError(startOrderSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const table = await tdb.query.tablesTable.findFirst({
        where: (t, { eq }) => eq(t.id, input.tableId),
      });
      if (!table) throw notFound("Table not found");
      if (input.storeId && table.store_id !== input.storeId)
        throw notFound("Table not found");
      if (table.status !== "active")
        throw validationError("tableId", "Table is inactive");
      const existing = await tdb.query.tableOccupancyTable.findFirst({
        where: (o, { and, eq, ne }) =>
          and(eq(o.table_id, input.tableId), ne(o.status, "ended")),
      });
      if (existing)
        throw validationError("tableId", "Table already has an active order");

      const [inserted] = await tdb
        .insert(tableOccupancyTable)
        .values({
          table_id: input.tableId,
          user_id: input.userId ?? null,
          temp_id: input.tempId ?? null,
          seats: input.seats,
          status: "active",
          start_at: new Date(),
        })
        .returning();
      const order = await fetchOrderOrThrow(tdb, inserted.id);
      await publishOrderEvent(ctx, inserted.id, "ORDER_STATUS_CHANGED", {
        orderId: inserted.id,
        status: "ACTIVE",
      });
      return toGqlOrder(order);
    },
    async endOrder(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const order = await fetchOrderOrThrow(tdb, input.id);
      const previousStatus = normalizeStatus(order);
      if (previousStatus === "SETTLED")
        throw validationError("id", "Order is already settled");
      const now = new Date();
      await closeOpenPauseLog(tdb, input.id, now);
      await tdb
        .update(tableOccupancyTable)
        .set({
          status: "ended",
          end_at: now,
          final_price: null,
          pricing_snapshot_id: null,
          price_breakdown: null,
          settlement_snapshot: null,
        })
        .where(drizzle.eq(tableOccupancyTable.id, input.id));
      const updated = await fetchOrderOrThrow(tdb, input.id);
      await publishOrderEvent(ctx, input.id, "ORDER_STATUS_CHANGED", {
        orderId: input.id,
        previousStatus,
        status: "ENDED",
      });
      return toGqlOrder(updated);
    },
    async pauseOrder(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const order = await fetchOrderOrThrow(tdb, input.id);
      if (order.status !== "active")
        throw validationError("id", "Only active orders can be paused");
      await tdb
        .insert(orderPauseLogsTable)
        .values({ occupancy_id: input.id, pause_reason: "manual" });
      await tdb
        .update(tableOccupancyTable)
        .set({ status: "paused" })
        .where(drizzle.eq(tableOccupancyTable.id, input.id));
      const updated = await fetchOrderOrThrow(tdb, input.id);
      await publishOrderEvent(ctx, input.id, "ORDER_STATUS_CHANGED", {
        orderId: input.id,
        previousStatus: "ACTIVE",
        status: "PAUSED",
      });
      return toGqlOrder(updated);
    },
    async resumeOrder(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const order = await fetchOrderOrThrow(tdb, input.id);
      if (order.status !== "paused")
        throw validationError("id", "Only paused orders can be resumed");
      await closeOpenPauseLog(tdb, input.id, new Date());
      await tdb
        .update(tableOccupancyTable)
        .set({ status: "active" })
        .where(drizzle.eq(tableOccupancyTable.id, input.id));
      const updated = await fetchOrderOrThrow(tdb, input.id);
      await publishOrderEvent(ctx, input.id, "ORDER_STATUS_CHANGED", {
        orderId: input.id,
        previousStatus: "PAUSED",
        status: "ACTIVE",
      });
      return toGqlOrder(updated);
    },
    async settleOrder(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const { input } = zodToGraphQLError(settleOrderSchema, args);
      return settleOrderById(dbFactory(ctx.env.DB), ctx, input);
    },
    async batchSettle(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const { input } = zodToGraphQLError(batchSettleSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const results = [];
      for (const id of input.ids) {
        try {
          const settled = await settleOrderById(tdb, ctx, { ...input, id });
          results.push({
            id,
            success: true,
            price: settled.price,
            order: settled.order,
          });
        } catch (error) {
          results.push({
            id,
            success: false,
            error: error instanceof Error ? error.message : "Settlement failed",
          });
        }
      }
      return results;
    },
    async batchSettleOrders(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const results = await ordersResolvers.Mutation.batchSettle(
        _source,
        args,
        ctx,
      );
      return { batchId: crypto.randomUUID(), results };
    },
    async batchPauseOrders(
      _source: unknown,
      args: { ids: string[] },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(
        z.object({ ids: z.array(z.string().min(1)).min(1) }),
        args,
      );
      const tdb = dbFactory(ctx.env.DB);
      const results: Array<{ id: string; success: boolean; error?: string }> =
        [];
      for (const id of input.ids) {
        try {
          await ordersResolvers.Mutation.pauseOrder(_source, { id }, ctx);
          results.push({ id, success: true });
        } catch (error) {
          results.push({
            id,
            success: false,
            error: error instanceof Error ? error.message : "Pause failed",
          });
        }
      }
      return results;
    },
    async batchResumeOrders(
      _source: unknown,
      args: { ids: string[] },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(
        z.object({ ids: z.array(z.string().min(1)).min(1) }),
        args,
      );
      const tdb = dbFactory(ctx.env.DB);
      const results: Array<{ id: string; success: boolean; error?: string }> =
        [];
      for (const id of input.ids) {
        try {
          await ordersResolvers.Mutation.resumeOrder(_source, { id }, ctx);
          results.push({ id, success: true });
        } catch (error) {
          results.push({
            id,
            success: false,
            error: error instanceof Error ? error.message : "Resume failed",
          });
        }
      }
      return results;
    },
    async cancelSettlement(_source: unknown, args: unknown, ctx: GQLContext) {
      requireStaff(ctx);
      const input = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const order = await fetchOrderOrThrow(tdb, input.id);
      if (normalizeStatus(order) !== "SETTLED") {
        throw validationError("id", "Only settled orders can be cancelled");
      }
      const snapshotTime =
        order.settlement_snapshot?.createdAt ?? asMs(order.end_at) ?? 0;
      if (Date.now() - snapshotTime > RECENT_SETTLEMENT_WINDOW_MS) {
        throw validationError("id", "Settlement is too old to cancel");
      }
      await tdb
        .update(tableOccupancyTable)
        .set({
          status: "ended",
          final_price: null,
          pricing_snapshot_id: null,
          price_breakdown: null,
          settlement_snapshot: null,
        })
        .where(drizzle.eq(tableOccupancyTable.id, input.id));
      const updated = await fetchOrderOrThrow(tdb, input.id);
      await publishOrderEvent(ctx, input.id, "ORDER_STATUS_CHANGED", {
        orderId: input.id,
        previousStatus: "SETTLED",
        status: "ENDED",
      });
      return {
        id: input.id,
        success: true,
        restored: true,
        order: toGqlOrder(updated),
      };
    },
    async cancelBatchSettlement(
      _source: unknown,
      args: { ids: string[] },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(
        z.object({ ids: z.array(z.string().min(1)).min(1) }),
        args,
      );
      const results = [];
      for (const id of input.ids) {
        try {
          results.push(
            await ordersResolvers.Mutation.cancelSettlement(
              _source,
              { id },
              ctx,
            ),
          );
        } catch (error) {
          results.push({
            id,
            success: false,
            restored: false,
            error: error instanceof Error ? error.message : "Cancel failed",
          });
        }
      }
      return results;
    },
    async cleanupOrphanedData(
      _source: unknown,
      args: unknown,
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = zodToGraphQLError(cleanupSchema, args ?? {});
      const tdb = dbFactory(ctx.env.DB);
      const allOrders = (await tdb.query.tableOccupancyTable.findMany({
        with: { table: true },
      })) as OccupancyRow[];
      const allLogs = await tdb.query.orderPauseLogsTable.findMany();
      const orderIds = new Set(allOrders.map((order) => order.id));
      const orphans = allOrders.filter((order) => !order.table);
      const activeOrphans = orphans.filter((order) => order.status !== "ended");
      const endedOrphans = orphans.filter((order) => order.status === "ended");
      const orphanedPauseLogs = allLogs.filter(
        (log) => !orderIds.has(log.occupancy_id),
      );
      const endedOrderIds = new Set(
        allOrders
          .filter((order) => order.status === "ended")
          .map((order) => order.id),
      );
      const danglingPauseLogs = allLogs.filter(
        (log) => !log.resumed_at && endedOrderIds.has(log.occupancy_id),
      );
      const actions: string[] = [];

      if (!input.dryRun) {
        const now = new Date();
        for (const order of activeOrphans) {
          await tdb
            .update(tableOccupancyTable)
            .set({ status: "ended", end_at: now })
            .where(drizzle.eq(tableOccupancyTable.id, order.id));
          actions.push(`Ended orphaned order ${order.id}`);
          await publishOrderEvent(ctx, order.id, "ORDER_STATUS_CHANGED", {
            orderId: order.id,
            status: "ENDED",
          });
        }
        for (const log of orphanedPauseLogs) {
          await tdb
            .delete(orderPauseLogsTable)
            .where(drizzle.eq(orderPauseLogsTable.id, log.id));
          actions.push(`Deleted orphaned pause log ${log.id}`);
        }
        for (const log of danglingPauseLogs) {
          await tdb
            .update(orderPauseLogsTable)
            .set({ resumed_at: now })
            .where(drizzle.eq(orderPauseLogsTable.id, log.id));
          actions.push(`Closed dangling pause log ${log.id}`);
        }
      }

      return {
        dryRun: input.dryRun,
        totalOccupancies: allOrders.length,
        orphanedOccupancies: orphans.length,
        activeOrphans: activeOrphans.map((order) => ({
          id: order.id,
          tableId: order.table_id,
          status: normalizeStatus(order),
          userId: order.user_id ?? null,
          tempId: order.temp_id ?? null,
        })),
        endedOrphans: endedOrphans.length,
        orphanedPauseLogs: orphanedPauseLogs.length,
        danglingPauseLogs: danglingPauseLogs.length,
        actions,
      };
    },
    async cleanupOrphanedOrders(
      _source: unknown,
      args: unknown,
      ctx: GQLContext,
    ) {
      return ordersResolvers.Mutation.cleanupOrphanedData(_source, args, ctx);
    },
  },
};
