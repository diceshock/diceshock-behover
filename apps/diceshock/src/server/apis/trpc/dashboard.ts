import db, { activesTable, drizzle, users } from "@lib/db";
import { publicProcedure } from "./baseTRPC";
import dayjs from "dayjs";

// 获取仪表盘统计数据
const getStats = publicProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const now = new Date();
  const thirtyDaysAgo = dayjs(now).subtract(30, "day").toDate();
  const sevenDaysAgo = dayjs(now).subtract(7, "day").toDate();

  // 用户统计
  const [totalUsers] = await tdb
    .select({ count: drizzle.count(users.id) })
    .from(users);

  const allUsers = await tdb.query.userInfoTable.findMany({
    where: (userInfo, { gte }) => gte(userInfo.create_at, thirtyDaysAgo),
    columns: {
      create_at: true,
    },
  });

  const newUsersLast30Days = allUsers.length;
  const newUsersLast7Days = allUsers.filter(
    (user) => user.create_at && user.create_at >= sevenDaysAgo,
  ).length;

  // 活动统计
  const [totalActives] = await tdb
    .select({ count: drizzle.count(activesTable.id) })
    .from(activesTable)
    .where(drizzle.eq(activesTable.is_deleted, false));

  const [publishedActives] = await tdb
    .select({ count: drizzle.count(activesTable.id) })
    .from(activesTable)
    .where(
      drizzle.and(
        drizzle.eq(activesTable.is_deleted, false),
        drizzle.eq(activesTable.is_published, true),
      ),
    );

  const allActives = await tdb.query.activesTable.findMany({
    where: (active, { and, eq, gte }) =>
      and(
        eq(active.is_deleted, false),
        gte(active.publish_at, thirtyDaysAgo),
      ),
    columns: {
      publish_at: true,
    },
  });

  const newActivesLast30Days = allActives.length;
  const newActivesLast7Days = allActives.filter(
    (active) => active.publish_at && active.publish_at >= sevenDaysAgo,
  ).length;

  // 处理每日数据（在JavaScript中分组）
  const dailyUserMap = new Map<string, number>();
  allUsers.forEach((user) => {
    if (user.create_at) {
      const dateKey = dayjs(user.create_at).format("YYYY-MM-DD");
      dailyUserMap.set(dateKey, (dailyUserMap.get(dateKey) || 0) + 1);
    }
  });

  const dailyActiveMap = new Map<string, number>();
  allActives.forEach((active) => {
    if (active.publish_at) {
      const dateKey = dayjs(active.publish_at).format("YYYY-MM-DD");
      dailyActiveMap.set(dateKey, (dailyActiveMap.get(dateKey) || 0) + 1);
    }
  });

  // 生成最近30天的完整日期列表
  const dateList: string[] = [];
  for (let i = 29; i >= 0; i--) {
    dateList.push(dayjs(now).subtract(i, "day").format("YYYY-MM-DD"));
  }

  const dailyUserData = dateList.map((date) => ({
    date,
    count: dailyUserMap.get(date) || 0,
  }));

  const dailyActiveData = dateList.map((date) => ({
    date,
    count: dailyActiveMap.get(date) || 0,
  }));

  return {
    users: {
      total: totalUsers.count,
      newLast30Days: newUsersLast30Days,
      newLast7Days: newUsersLast7Days,
      dailyData: dailyUserData,
    },
    actives: {
      total: totalActives.count,
      published: publishedActives.count,
      newLast30Days: newActivesLast30Days,
      newLast7Days: newActivesLast7Days,
      dailyData: dailyActiveData,
    },
  };
});

export default { getStats };