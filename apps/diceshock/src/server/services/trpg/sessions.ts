import type { Database } from "@lib/db";
import { trpgSessions as sessions } from "@lib/db";
import { and, eq, sql } from "drizzle-orm";
import type { SessionInput } from "@/shared/trpg/validation";
import { forbidden, validationError } from "../../graphql/errors";
import {
  canReview,
  type Operator,
  operator,
  requireHost,
  requireReviewer,
} from "./access";
import { findSession, present } from "./queries";

const conflict = (message: string) => validationError("session", message);
function suitableTable(
  storeId: string,
  tableId: string | null,
  capacity: number,
) {
  return sql`EXISTS(SELECT 1 FROM tables WHERE id=${tableId} AND store_id=${storeId}
    AND status='active' AND scope IN ('trpg','boardgame') AND capacity>=${capacity})`;
}
function noOverlap(
  id: string,
  hostId: string,
  tableId: string | null,
  start: number | null,
  duration: number,
) {
  return sql`NOT EXISTS(SELECT 1 FROM trpg_sessions other WHERE other.id<>${id} AND other.status='published'
    AND (other.host_id=${hostId} OR other.table_id=${tableId}) AND other.starts_at<${(start ?? 0) + duration * 60000}
    AND other.starts_at + other.duration_minutes*60000>${start})`;
}
function times(input: Pick<SessionInput, "startsAt" | "deadline">) {
  const startsAt = input.startsAt === null ? null : Date.parse(input.startsAt);
  const deadline = input.deadline === null ? null : Date.parse(input.deadline);
  if (deadline !== null && deadline <= Date.now())
    throw conflict("报名截止时间须在未来");
  return { startsAt, deadline };
}
export async function createSession(
  db: Database,
  actor: Operator,
  input: SessionInput,
) {
  requireHost(actor, input.storeId);
  const host =
    input.hostId && input.hostId !== actor.id
      ? await operator(db, input.hostId)
      : actor;
  requireHost(host, input.storeId);
  if (host.id !== actor.id) requireReviewer(actor, input.storeId);
  const { startsAt, deadline } = times(input);
  const now = Date.now();
  const status = canReview(actor, input.storeId) ? "published" : "pending";
  // The availability predicate and insert execute as one D1 statement.
  const result = await db.run(sql`INSERT INTO trpg_sessions
    (id,store_id,host_id,table_id,title,description,module_name,game_system,status,starts_at,deadline,
     duration_minutes,fee_cents,capacity,minimum,time_hint,tags,created_at,updated_at)
    SELECT ${input.requestId},${input.storeId},${host.id},${input.tableId},${input.title},${input.description},
      ${input.moduleName},${input.gameSystem},${status},${startsAt},${deadline},${input.durationMinutes},
      ${input.feeCents},${input.capacity},${input.minimum},${input.timeHint},${JSON.stringify(input.tags)},${now},${now}
    WHERE EXISTS(SELECT 1 FROM stores WHERE id=${input.storeId} AND is_active=1)
      AND (${startsAt} IS NULL OR ${suitableTable(input.storeId, input.tableId, input.capacity)})
      AND (${status}='pending' OR ${startsAt} IS NULL OR ${noOverlap(input.requestId, host.id, input.tableId, startsAt, input.durationMinutes)})
    ON CONFLICT(id) DO NOTHING`);
  if (!result.meta.changes) {
    const previous = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, input.requestId))
      .get();
    if (
      !previous ||
      previous.hostId !== host.id ||
      previous.storeId !== input.storeId ||
      previous.title !== input.title ||
      previous.description !== input.description ||
      previous.startsAt !== startsAt ||
      previous.deadline !== deadline ||
      previous.tableId !== input.tableId ||
      previous.capacity !== input.capacity ||
      previous.minimum !== input.minimum ||
      previous.feeCents !== input.feeCents ||
      previous.durationMinutes !== input.durationMinutes ||
      previous.moduleName !== input.moduleName ||
      previous.gameSystem !== input.gameSystem ||
      previous.timeHint !== input.timeHint ||
      JSON.stringify(previous.tags) !== JSON.stringify(input.tags)
    ) {
      throw conflict("请求已变更、门店或桌位不可用，或主持人排期冲突");
    }
  }
  return present(await findSession(db, input.requestId), actor);
}
export async function resubmitSession(
  db: Database,
  actor: Operator,
  id: string,
  revision: number,
  input: SessionInput,
) {
  const row = await findSession(db, id);
  requireHost(actor, row.storeId);
  if (row.hostId !== actor.id && !canReview(actor, row.storeId))
    throw forbidden("只能修改自己主持的场次");
  if (
    row.storeId !== input.storeId ||
    (input.hostId && input.hostId !== row.hostId)
  )
    throw conflict("已提交场次不能更换门店或主持人");
  const { startsAt, deadline } = times(input);
  const result = await db
    .update(sessions)
    .set({
      title: input.title,
      description: input.description,
      moduleName: input.moduleName,
      gameSystem: input.gameSystem,
      startsAt,
      deadline,
      tableId: input.tableId,
      capacity: input.capacity,
      minimum: input.minimum,
      feeCents: input.feeCents,
      durationMinutes: input.durationMinutes,
      timeHint: input.timeHint,
      tags: input.tags,
      status: "pending",
      reason: null,
      changedBy: actor.id,
      revision: sql`${sessions.revision}+1`,
      updatedAt: Date.now(),
    })
    .where(
      and(
        eq(sessions.id, id),
        eq(sessions.revision, revision),
        eq(sessions.status, "returned"),
        sql`(${startsAt} IS NULL OR ${suitableTable(row.storeId, input.tableId, input.capacity)})`,
      ),
    )
    .run();
  if (!result.meta.changes) throw conflict("场次已变更或桌位不可用，请刷新");
}
export async function transition(
  db: Database,
  actor: Operator,
  id: string,
  revision: number,
  action: "approve" | "return" | "cancel" | "complete",
  reason: string,
) {
  const row = await findSession(db, id);
  requireReviewer(actor, row.storeId);
  if ((action === "return" || action === "cancel") && !reason)
    throw conflict("请填写原因");
  const now = Date.now();
  if (action === "complete" && (row.startsAt === null || row.startsAt > now))
    throw conflict("场次开始后才能结团");
  if (action === "approve" && row.deadline !== null && row.deadline <= now)
    throw conflict("报名已截止");
  const before =
    action === "approve" || action === "return" ? "pending" : "published";
  const after = {
    approve: "published",
    return: "returned",
    cancel: "cancelled",
    complete: "completed",
  } as const;
  const result = await db
    .update(sessions)
    .set({
      status: after[action],
      reason: reason || null,
      changedBy: actor.id,
      revision: sql`${sessions.revision}+1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(sessions.id, id),
        eq(sessions.revision, revision),
        eq(sessions.status, before),
        action === "approve"
          ? sql`EXISTS(SELECT 1 FROM stores WHERE id=${row.storeId} AND is_active=1)
      AND (${sessions.startsAt} IS NULL OR (${suitableTable(row.storeId, row.tableId, row.capacity)}
      AND ${noOverlap(id, row.hostId, row.tableId, row.startsAt, row.durationMinutes)}))`
          : undefined,
      ),
    )
    .run();
  if (!result.meta.changes) throw conflict("场次已变更或发生排期冲突，请刷新");
}
export async function scheduleSession(
  db: Database,
  actor: Operator,
  id: string,
  revision: number,
  tableId: string,
  start: string,
  cutoff: string,
) {
  const row = await findSession(db, id);
  requireReviewer(actor, row.storeId);
  const { startsAt, deadline } = times({ startsAt: start, deadline: cutoff });
  if (startsAt === null || deadline === null || deadline > startsAt)
    throw conflict("请核对开团与截止时间");
  const now = Date.now();
  const priority = Math.min(now + 86400000, deadline - 3600000);
  const interested = sql`EXISTS(SELECT 1 FROM trpg_registrations WHERE session_id=${id} AND status='interested')`;
  const result = await db
    .update(sessions)
    .set({
      startsAt,
      deadline,
      tableId,
      changedBy: actor.id,
      priorityUntil: sql`CASE WHEN ${interested} THEN ${priority} ELSE NULL END`,
      revision: sql`${sessions.revision}+1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(sessions.id, id),
        eq(sessions.revision, revision),
        eq(sessions.status, "published"),
        sql`${sessions.startsAt} IS NULL`,
        sql`(${priority}>${now} OR NOT ${interested})`,
        suitableTable(row.storeId, tableId, row.capacity),
        noOverlap(id, row.hostId, tableId, startsAt, row.durationMinutes),
      ),
    )
    .run();
  if (!result.meta.changes)
    throw conflict("场次已变更、桌位冲突或没有足够的优先确认时间");
}
