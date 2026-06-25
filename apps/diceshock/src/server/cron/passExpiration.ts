import db, { userMembershipPlansTable } from "@lib/db";
import {
  queueNotification,
  resolveUsersOpenIds,
} from "@/server/apis/wechat/templateMessage";

const TIME_PLAN_TYPES = ["monthly", "monthly_cc", "yearly"] as const;

const PLAN_NAMES: Record<string, string> = {
  monthly: "月卡",
  monthly_cc: "月卡(CC)",
  yearly: "年卡",
};

export async function checkPassExpiration(env: {
  DB: D1Database;
  KV: KVNamespace;
  NOTIFICATION_QUEUE: Queue;
  WECHAT_MP_APP_ID: string;
  WECHAT_MP_APP_SECRET: string;
}) {
  const tdb = db(env.DB);
  const now = Date.now();
  const fiveDaysLater = now + 5 * 24 * 60 * 60 * 1000;

  const expiringPlans = await tdb.query.userMembershipPlansTable.findMany({
    where: (p, { and, inArray, lte, gte }) =>
      and(
        inArray(p.plan_type, [...TIME_PLAN_TYPES]),
        gte(p.end_date, new Date(now)),
        lte(p.end_date, new Date(fiveDaysLater)),
      ),
  });

  const expiredPlans = await tdb.query.userMembershipPlansTable.findMany({
    where: (p, { and, inArray, lte, gte }) =>
      and(
        inArray(p.plan_type, [...TIME_PLAN_TYPES]),
        lte(p.end_date, new Date(now)),
        gte(p.end_date, new Date(now - 24 * 60 * 60 * 1000)),
      ),
  });

  const allPlans = [
    ...expiringPlans.map((p) => ({ ...p, _status: "expiring_5d" as const })),
    ...expiredPlans.map((p) => ({ ...p, _status: "expired" as const })),
  ];

  if (allPlans.length === 0) return;

  const deduped = new Map<string, (typeof allPlans)[number]>();
  for (const plan of allPlans) {
    const key = `${plan.user_id}:${plan._status}`;
    const existing = deduped.get(key);
    if (
      !existing ||
      (plan.end_date && existing.end_date && plan.end_date > existing.end_date)
    ) {
      deduped.set(key, plan);
    }
  }

  const userIds = [...new Set([...deduped.values()].map((p) => p.user_id))];
  const openIdMap = await resolveUsersOpenIds(env, userIds);

  for (const plan of deduped.values()) {
    const openId = openIdMap.get(plan.user_id);
    if (!openId) continue;

    const notifiedKey = `wechat:pass_notify:${plan.id}:${plan._status}`;
    const alreadyNotified = await env.KV.get(notifiedKey);
    if (alreadyNotified) continue;

    const planName = PLAN_NAMES[plan.plan_type] ?? plan.plan_type;
    const endDate = plan.end_date
      ? new Date(plan.end_date).toLocaleDateString("zh-CN", {
          timeZone: "Asia/Shanghai",
        })
      : "未知";

    await queueNotification(env, {
      type: "pass_expiring",
      userId: plan.user_id,
      openId,
      data: { planName, endDate, status: plan._status },
    });

    await env.KV.put(notifiedKey, "1", { expirationTtl: 7 * 24 * 60 * 60 });
  }
}
