import {
  type Database,
  trpgRegistrations as registrations,
  trpgSessions as sessions,
  storesTable,
  tablesTable,
  userInfoTable,
  users,
} from "@lib/db";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { notFound } from "../../graphql/errors";
import { canHost, canReview, type Operator, requireHost } from "./access";

export const PAGE_SIZE = 30;
const count = (states: string[]) =>
  sql<number>`(SELECT count(*) FROM trpg_registrations r
  WHERE r.session_id = ${sessions.id} AND r.status IN (${sql.join(
    states.map((s) => sql`${s}`),
    sql`, `,
  )}))`.mapWith(Number);
export function sessionQuery(db: Database) {
  return db
    .select({
      ...getTableColumns(sessions),
      storeName: storesTable.name,
      address: storesTable.address,
      tableName: tablesTable.name,
      hostName: sql<string>`coalesce(${userInfoTable.nickname}, ${users.name}, '')`,
      confirmedCount: count(["confirmed"]),
      heldCount: count(["pending", "confirmed"]),
      interestedCount: count(["interested"]),
    })
    .from(sessions)
    .innerJoin(storesTable, eq(storesTable.id, sessions.storeId))
    .innerJoin(users, eq(users.id, sessions.hostId))
    .leftJoin(userInfoTable, eq(userInfoTable.id, sessions.hostId))
    .leftJoin(tablesTable, eq(tablesTable.id, sessions.tableId));
}
type Row = Awaited<ReturnType<ReturnType<typeof sessionQuery>["all"]>>[number];
export function present(row: Row, actor?: Operator) {
  const { hostId, changedBy: _changedBy, heldCount, ...rest } = row;
  const manage =
    actor &&
    canHost(actor, row.storeId) &&
    (hostId === actor.id || canReview(actor, row.storeId));
  return {
    ...rest,
    revision: manage ? row.revision : null,
    reason: manage ? row.reason : null,
    remaining: Math.max(0, row.capacity - heldCount),
    pendingCount: heldCount - row.confirmedCount,
    canReview: !!actor && canReview(actor, row.storeId),
    canEdit: !!manage && row.status === "returned",
    registrationOpen:
      row.status === "published" &&
      (row.deadline === null || row.deadline > Date.now()),
    startsAt:
      row.startsAt === null ? null : new Date(row.startsAt).toISOString(),
    deadline:
      row.deadline === null ? null : new Date(row.deadline).toISOString(),
    priorityUntil:
      row.priorityUntil === null
        ? null
        : new Date(row.priorityUntil).toISOString(),
  };
}
export async function findSession(db: Database, id: string) {
  const row = await sessionQuery(db).where(eq(sessions.id, id)).get();
  if (!row) throw notFound("场次不存在");
  return row;
}
export async function publicSession(db: Database, id: string) {
  const row = await findSession(db, id);
  if (row.status === "pending" || row.status === "returned")
    throw notFound("场次未发布");
  return present(row);
}
export async function listSessions(
  db: Database,
  input: {
    storeId?: string;
    offset: number;
    date?: string;
    rule?: string;
    tag?: string;
    available?: boolean;
  },
  actor?: Operator,
) {
  const now = Date.now();
  const scope = actor
    ? actor.role === "admin"
      ? undefined
      : or(
          inArray(
            sessions.storeId,
            actor.access
              .filter((a) => a.staff && actor.role === "staff")
              .map((a) => a.storeId),
          ),
          and(
            eq(sessions.hostId, actor.id),
            inArray(
              sessions.storeId,
              actor.access.filter((a) => a.host).map((a) => a.storeId),
            ),
          ),
        )
    : and(
        eq(sessions.status, "published"),
        eq(storesTable.is_active, 1),
        or(isNull(sessions.startsAt), sql`${sessions.startsAt} > ${now}`),
      );
  const rows = await sessionQuery(db)
    .where(
      and(
        scope,
        input.storeId ? eq(sessions.storeId, input.storeId) : undefined,
        input.date
          ? sql`date(${sessions.startsAt}/1000, 'unixepoch', '+8 hours') = ${input.date}`
          : undefined,
        input.rule
          ? sql`instr(lower(${sessions.gameSystem}), lower(${input.rule})) > 0`
          : undefined,
        input.tag
          ? sql`EXISTS(SELECT 1 FROM json_each(${sessions.tags}) WHERE lower(value)=lower(${input.tag}))`
          : undefined,
        input.available
          ? and(
              sql`${sessions.deadline}>${now}`,
              sql`${sessions.capacity}>${count(["pending", "confirmed"])}`,
            )
          : undefined,
      ),
    )
    .orderBy(
      sql`${sessions.startsAt} IS NULL`,
      asc(sessions.startsAt),
      asc(sessions.id),
    )
    .limit(PAGE_SIZE + 1)
    .offset(input.offset);
  return {
    items: rows.slice(0, PAGE_SIZE).map((r) => present(r, actor)),
    hasMore: rows.length > PAGE_SIZE,
  };
}
export async function listStores(db: Database, actor?: Operator) {
  const rows = await db
    .select()
    .from(storesTable)
    .where(eq(storesTable.is_active, 1))
    .orderBy(asc(storesTable.name));
  return rows
    .filter((s) => !actor || canHost(actor, s.id))
    .map((s) => ({ ...s, canReview: !!actor && canReview(actor, s.id) }));
}
export async function listTables(
  db: Database,
  actor: Operator,
  storeId: string,
) {
  requireHost(actor, storeId);
  return db
    .select({
      id: tablesTable.id,
      name: tablesTable.name,
      capacity: tablesTable.capacity,
    })
    .from(tablesTable)
    .where(
      and(
        eq(tablesTable.store_id, storeId),
        eq(tablesTable.status, "active"),
        inArray(tablesTable.scope, ["trpg", "boardgame"]),
      ),
    )
    .orderBy(asc(tablesTable.name));
}
export async function playerRecords(
  db: Database,
  userId: string,
  archive: boolean,
  offset: number,
  storeId?: string,
) {
  const rows = await sessionQuery(db)
    .where(
      and(
        storeId ? eq(sessions.storeId, storeId) : undefined,
        archive ? eq(sessions.status, "completed") : undefined,
        sql`EXISTS(SELECT 1 FROM trpg_registrations r WHERE r.session_id=${sessions.id} AND r.user_id=${userId}
      ${archive ? sql`AND r.status='confirmed'` : sql``})`,
      ),
    )
    .orderBy(desc(sessions.createdAt), asc(sessions.id))
    .limit(PAGE_SIZE + 1)
    .offset(offset);
  const items = await Promise.all(
    rows.slice(0, PAGE_SIZE).map(async (row) => ({
      ...present(row),
      booking: await personalBooking(db, row.id, userId),
    })),
  );
  return { items, hasMore: rows.length > PAGE_SIZE };
}
export async function personalBooking(
  db: Database,
  id: string,
  userId: string,
) {
  return (
    (await db
      .select({
        id: registrations.id,
        status: registrations.status,
        reason: registrations.reason,
      })
      .from(registrations)
      .where(
        and(eq(registrations.sessionId, id), eq(registrations.userId, userId)),
      )
      .orderBy(
        sql`${registrations.status} IN ('interested','pending','confirmed') DESC`,
        desc(registrations.createdAt),
        desc(registrations.id),
      )
      .get()) ?? null
  );
}
export async function roster(
  db: Database,
  id: string,
  actor: Operator,
  offset = 0,
) {
  const row = await findSession(db, id);
  requireHost(actor, row.storeId);
  if (row.hostId !== actor.id && !canReview(actor, row.storeId))
    throw notFound("场次不存在");
  const entries = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      reason: registrations.reason,
      nickname: userInfoTable.nickname,
      phone: userInfoTable.phone,
    })
    .from(registrations)
    .innerJoin(userInfoTable, eq(userInfoTable.id, registrations.userId))
    .where(eq(registrations.sessionId, id))
    .orderBy(
      sql`${registrations.status} IN ('pending','confirmed','interested') DESC`,
      desc(registrations.createdAt),
      asc(registrations.id),
    )
    .limit(PAGE_SIZE + 1)
    .offset(offset);
  return {
    hasMore: entries.length > PAGE_SIZE,
    items: entries.slice(0, PAGE_SIZE).map((e) => ({
      ...e,
      phone: canReview(actor, row.storeId) ? e.phone : null,
    })),
  };
}
