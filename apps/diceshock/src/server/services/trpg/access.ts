import type { Database } from "@lib/db";
import { storesTable, trpgAccess, users } from "@lib/db";
import { and, eq } from "drizzle-orm";
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
export const canReview = (actor: Operator, storeId: string) =>
  actor.role === "admin" ||
  (actor.role === "staff" &&
    actor.access.some((a) => a.storeId === storeId && a.staff));
export const canHost = (actor: Operator, storeId: string) =>
  canReview(actor, storeId) ||
  actor.access.some((a) => a.storeId === storeId && a.host);
export function requireHost(actor: Operator, storeId: string) {
  if (!canHost(actor, storeId)) throw forbidden("没有该门店的主持权限");
}
export function requireReviewer(actor: Operator, storeId: string) {
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
    throw forbidden("请先在用户管理中将该账号设为店员");
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
}
