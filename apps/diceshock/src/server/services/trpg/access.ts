import type { Database } from "@lib/db";
import {
  storesTable,
  trpgAccess,
  userMembershipPlansTable,
  users,
} from "@lib/db";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { forbidden, unauthorized } from "../../graphql/errors";

export async function operator(db: Database, id: string) {
  const user = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, id), eq(users.disabled, false)))
    .get();
  if (!user) throw unauthorized("请重新登录");
  const access = await db
    .select()
    .from(trpgAccess)
    .where(eq(trpgAccess.userId, id));
  return { ...user, access };
}
export type Operator = Awaited<ReturnType<typeof operator>>;
export const canEnterDashboard = (actor: Operator) =>
  actor.role === "admin" ||
  (actor.role === "staff" && actor.access.some((a) => a.staff));
export const canReviewAny = (actor: Operator) =>
  actor.role === "admin" ||
  (actor.role === "staff" && actor.access.some((a) => a.staff));
export const canReview = (actor: Operator, storeId: string | null) =>
  storeId === null
    ? canReviewAny(actor)
    : actor.role === "admin" ||
      (actor.role === "staff" &&
        actor.access.some((a) => a.storeId === storeId && a.staff));
export const canHostAny = (actor: Operator) =>
  canReviewAny(actor) || actor.access.some((a) => a.host);
export const canHost = (actor: Operator, storeId: string | null) =>
  storeId === null
    ? canHostAny(actor)
    : canReview(actor, storeId) || actor.access.some((a) => a.host);
export function requireDirectoryReviewer(actor: Operator) {
  if (
    actor.role !== "admin" &&
    !(actor.role === "staff" && actor.access.some((a) => a.staff))
  )
    throw forbidden("没有会员管理权限");
}

async function fallbackRole(db: Database, id: string) {
  const now = new Date();
  const active = await db
    .select({ id: userMembershipPlansTable.id })
    .from(userMembershipPlansTable)
    .where(
      and(
        eq(userMembershipPlansTable.user_id, id),
        sql`${userMembershipPlansTable.plan_type} <> 'stored_value'`,
        lte(userMembershipPlansTable.start_date, now),
        or(
          isNull(userMembershipPlansTable.end_date),
          gt(userMembershipPlansTable.end_date, now),
        ),
      ),
    )
    .get();
  return active ? ("member" as const) : ("customer" as const);
}

/** Promote an existing account to the member identity, or demote it again. */
export async function setMember(
  db: Database,
  actor: Operator,
  id: string,
  member: boolean,
) {
  requireDirectoryReviewer(actor);
  const target = await operator(db, id);
  if (target.access.some((a) => a.host)) return;
  if (member) {
    if (target.role === "customer")
      await db.update(users).set({ role: "member" }).where(eq(users.id, id));
    return;
  }
  if (target.role === "member")
    await db.update(users).set({ role: "customer" }).where(eq(users.id, id));
}

async function syncHostIdentity(
  db: Database,
  id: string,
  role: Operator["role"],
  granted: boolean,
) {
  if (granted) {
    if (role === "customer" || role === "member")
      await db.update(users).set({ role: "host" }).where(eq(users.id, id));
    return;
  }
  if (role !== "host") return;
  const remaining = await db
    .select({ id: trpgAccess.userId })
    .from(trpgAccess)
    .where(and(eq(trpgAccess.userId, id), eq(trpgAccess.host, true)))
    .get();
  if (!remaining)
    await db
      .update(users)
      .set({ role: await fallbackRole(db, id) })
      .where(eq(users.id, id));
}

export async function setHost(
  db: Database,
  actor: Operator,
  id: string,
  host: boolean,
) {
  if (actor.role !== "admin") throw forbidden("仅管理员可修改主持权限");
  const target = await operator(db, id);
  if (!host) {
    await db
      .update(trpgAccess)
      .set({ host: false })
      .where(eq(trpgAccess.userId, id));
    await syncHostIdentity(db, id, target.role, false);
    return;
  }
  // One atomic statement; store-specific staff grants are preserved on conflict.
  await db.run(sql`INSERT INTO trpg_access(user_id,store_id,staff,host)
    SELECT ${id},id,0,1 FROM stores WHERE 1
    ON CONFLICT(user_id,store_id) DO UPDATE SET host=1`);
  await syncHostIdentity(db, id, target.role, true);
}
export function requireHost(actor: Operator, storeId: string | null) {
  if (!canHost(actor, storeId)) throw forbidden("没有该门店的主持权限");
}
export function requireAnyHost(actor: Operator) {
  if (!canHostAny(actor)) throw forbidden("没有主持权限");
}
export function requireAnyReviewer(actor: Operator) {
  if (!canReviewAny(actor)) throw forbidden("没有审核权限");
}
export function requireReviewer(actor: Operator, storeId: string | null) {
  if (!canReview(actor, storeId)) throw forbidden("没有该门店的审核权限");
}
export async function setAccess(
  db: Database,
  actor: Operator,
  input: { id: string; storeId: string; staff: boolean; host: boolean },
) {
  if (actor.role !== "admin") throw forbidden("仅管理员可修改权限");
  const target = await operator(db, input.id);
  if (input.staff && target.role !== "staff")
    throw forbidden("请先在用户管理中将该账号设为店长");
  const store = await db
    .select()
    .from(storesTable)
    .where(and(eq(storesTable.id, input.storeId), eq(storesTable.is_active, 1)))
    .get();
  if (!store) throw forbidden("门店不可用");
  await db
    .insert(trpgAccess)
    .values({
      userId: input.id,
      storeId: input.storeId,
      staff: input.staff,
      host: input.host,
    })
    .onConflictDoUpdate({
      target: [trpgAccess.userId, trpgAccess.storeId],
      set: { staff: input.staff, host: input.host },
    });
  await syncHostIdentity(db, input.id, target.role, input.host);
}
