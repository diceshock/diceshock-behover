import type { Database } from "@lib/db";
import {
  sessions as authSessions,
  trpgRegistrations as registrations,
  trpgAccess,
  trpgSessions,
} from "@lib/db";
import { and, eq, like, sql } from "drizzle-orm";

// D1 batch is transactional: preserve the strongest registration before moving
// identity references, and revoke source tokens as part of the same transaction.
export async function mergeTrpgAccount(
  db: Database,
  source: string,
  target: string,
) {
  await db.batch([
    db
      .update(registrations)
      .set({ status: "withdrawn", reason: "账号合并去重" })
      .where(sql`
   ${registrations.userId} IN (${source},${target}) AND ${registrations.status} IN ('interested','pending','confirmed')
   AND EXISTS(SELECT 1 FROM trpg_registrations other WHERE other.session_id=${registrations.sessionId}
    AND other.user_id=CASE WHEN ${registrations.userId}=${source} THEN ${target} ELSE ${source} END
    AND other.status IN ('interested','pending','confirmed')
    AND (CASE other.status WHEN 'confirmed' THEN 3 WHEN 'pending' THEN 2 ELSE 1 END)*2+(other.user_id=${target})
     >(CASE ${registrations.status} WHEN 'confirmed' THEN 3 WHEN 'pending' THEN 2 ELSE 1 END)*2+(${registrations.userId}=${target}))`),
    db
      .update(registrations)
      .set({ userId: target })
      .where(eq(registrations.userId, source)),
    db
      .update(trpgSessions)
      .set({ hostId: target })
      .where(eq(trpgSessions.hostId, source)),
    db
      .insert(trpgAccess)
      .select(
        db
          .select({
            userId: sql<string>`${target}`.as("user_id"),
            storeId: trpgAccess.storeId,
            staff: trpgAccess.staff,
            host: trpgAccess.host,
          })
          .from(trpgAccess)
          .where(eq(trpgAccess.userId, source)),
      )
      .onConflictDoUpdate({
        target: [trpgAccess.userId, trpgAccess.storeId],
        set: {
          staff: sql`max(staff,excluded.staff)`,
          host: sql`max(host,excluded.host)`,
        },
      }),
    db.delete(trpgAccess).where(eq(trpgAccess.userId, source)),
    db
      .delete(authSessions)
      .where(
        and(
          eq(authSessions.userId, source),
          like(authSessions.sessionToken, "ds-miniapp:%"),
        ),
      ),
  ]);
}
