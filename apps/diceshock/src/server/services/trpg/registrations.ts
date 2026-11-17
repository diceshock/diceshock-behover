import { type Database, userInfoTable } from "@lib/db";
import { eq, sql } from "drizzle-orm";
import { forbidden, validationError } from "../../graphql/errors";
import { type Operator, requireReviewer } from "./access";
import { findSession, personalBooking } from "./queries";

export async function joinSession(db: Database, id: string, userId: string) {
  const profile = await db
    .select({ phone: userInfoTable.phone })
    .from(userInfoTable)
    .where(eq(userInfoTable.id, userId))
    .get();
  if (!profile?.phone) throw forbidden("请先验证手机号");
  const now = Date.now();
  // INSERT … SELECT makes the capacity check and reservation indivisible in D1.
  const result =
    await db.run(sql`INSERT INTO trpg_registrations (id,session_id,user_id,status,created_at)
    SELECT ${crypto.randomUUID()},s.id,${userId},CASE WHEN s.starts_at IS NULL THEN 'interested' ELSE 'pending' END,${now}
    FROM trpg_sessions s JOIN stores st ON st.id=s.store_id
    WHERE s.id=${id} AND st.is_active=1 AND s.status='published' AND s.host_id<>${userId}
      AND (s.deadline IS NULL OR s.deadline>${now})
      AND (s.priority_until IS NULL OR s.priority_until<=${now} OR EXISTS
        (SELECT 1 FROM trpg_registrations r WHERE r.session_id=s.id AND r.user_id=${userId} AND r.status='interested'))
      AND (s.starts_at IS NULL OR s.capacity>(SELECT count(*) FROM trpg_registrations r
        WHERE r.session_id=s.id AND r.status IN ('pending','confirmed')))
    ON CONFLICT(session_id,user_id) WHERE status IN ('interested','pending','confirmed') DO UPDATE SET
      status='pending',created_at=excluded.created_at
      WHERE trpg_registrations.status='interested' AND excluded.status='pending'`);
  if (!result.meta.changes) {
    const booking = await personalBooking(db, id, userId);
    const session = await findSession(db, id);
    if (
      booking &&
      session.status === "published" &&
      (["pending", "confirmed"].includes(booking.status) ||
        (booking.status === "interested" && session.startsAt === null))
    )
      return;
    throw validationError(
      "registration",
      "报名已截止、席位已满、正在优先确认，或你是本场主持人",
    );
  }
}
export async function withdraw(db: Database, id: string, userId: string) {
  const result =
    await db.run(sql`UPDATE trpg_registrations SET status='withdrawn'
    WHERE session_id=${id} AND user_id=${userId} AND status IN ('interested','pending','confirmed')
      AND EXISTS(SELECT 1 FROM trpg_sessions WHERE id=${id} AND status='published'
        AND (deadline IS NULL OR deadline>${Date.now()}))`);
  if (!result.meta.changes)
    throw validationError("registration", "已取消或报名截止，请联系店员");
}
export async function reviewBooking(
  db: Database,
  actor: Operator,
  id: string,
  registrationId: string,
  decision: "approve" | "reject" | "withdraw",
  depositConfirmed: boolean,
  reason: string,
) {
  const row = await findSession(db, id);
  requireReviewer(actor, row.storeId);
  if (decision !== "approve" && !reason)
    throw validationError("reason", "请填写原因");
  if (decision === "approve" && row.feeCents > 0 && !depositConfirmed)
    throw validationError("depositConfirmed", "请先确认定金");
  const status = {
    approve: "confirmed",
    reject: "rejected",
    withdraw: "withdrawn",
  }[decision];
  const now = Date.now();
  const result =
    await db.run(sql`UPDATE trpg_registrations SET status=${status},reason=${reason || null},
    reviewed_by=${actor.id},reviewed_at=${now} WHERE id=${registrationId} AND session_id=${id}
    AND ((${decision}='withdraw' AND status IN ('interested','pending','confirmed')) OR status='pending')
    AND EXISTS(SELECT 1 FROM trpg_sessions WHERE id=${id} AND status='published'
      AND (starts_at>${now} OR (${decision}='withdraw' AND starts_at IS NULL)))`);
  if (!result.meta.changes)
    throw validationError("registration", "报名已变更或场次已开始");
}
