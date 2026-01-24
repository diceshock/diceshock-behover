import db, {
  accounts,
  drizzle,
  pagedZ,
  sessions,
  userInfoTable,
  users,
} from "@lib/db";
import z4, { z } from "zod/v4";
import { publicProcedure } from "./baseTRPC";

export const getFilterZ = z4.object({
  searchWords: z4.string().nonempty().optional(),
});

const get = publicProcedure
  .input(pagedZ(getFilterZ))
  .query(async ({ input, ctx }) => {
    const {
      page,
      pageSize,
      params: { searchWords },
    } = input;

    const tdb = db(ctx.env.DB);

    // 构建查询条件
    let whereCondition: Parameters<
      typeof tdb.query.users.findMany
    >[0]["where"] = undefined;

    if (searchWords) {
      // 先查找匹配的 userInfo (uid, nickname)
      const matchingUserInfos = await tdb.query.userInfoTable.findMany({
        where: (userInfo, { or, like }) =>
          or(
            like(userInfo.uid, `%${searchWords}%`),
            like(userInfo.nickname, `%${searchWords}%`),
          ),
      });

      const matchingUserIds = matchingUserInfos.map((ui) => ui.id);

      // 查找匹配的 accounts (providerAccountId 可能是手机号)
      const matchingAccounts = await tdb.query.accounts.findMany({
        where: (account, { like }) =>
          like(account.providerAccountId, `%${searchWords}%`),
      });

      const matchingAccountUserIds = matchingAccounts.map((a) => a.userId);

      // 查找匹配的 users (id, name, email)
      const allMatchingIds = new Set([
        ...matchingUserIds,
        ...matchingAccountUserIds,
        ...(searchWords.includes("@") ? [] : []), // 如果包含 @，可能是邮箱
      ]);

      // 如果搜索词可能是用户 ID，直接添加
      if (searchWords.length >= 8) {
        allMatchingIds.add(searchWords);
      }

      if (allMatchingIds.size > 0) {
        whereCondition = (user, { or, inArray, like }) =>
          or(
            inArray(user.id, Array.from(allMatchingIds)),
            like(user.name, `%${searchWords}%`),
            like(user.email, `%${searchWords}%`),
          );
      } else {
        whereCondition = (user, { or, like }) =>
          or(
            like(user.name, `%${searchWords}%`),
            like(user.email, `%${searchWords}%`),
          );
      }
    }

    const userList = await tdb.query.users.findMany({
      where: whereCondition,
      with: {
        userInfo: true,
      },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: (users, { desc }) => desc(users.id),
    });

    // 获取每个用户的账户信息（用于获取手机号）
    const userIds = userList.map((u) => u.id);
    const userAccounts = await tdb.query.accounts.findMany({
      where: (account, { inArray, eq }) =>
        inArray(account.userId, userIds) && eq(account.provider, "SMS"),
    });

    const accountsByUserId = new Map(
      userAccounts.map((acc) => [acc.userId, acc.providerAccountId]),
    );

    // 组合数据
    return userList.map((user) => ({
      ...user,
      phone: accountsByUserId.get(user.id) || null,
    }));
  });

const getByIdZ = z.object({
  id: z.string(),
});

const getById = publicProcedure
  .input(getByIdZ)
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const user = await tdb.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, input.id),
      with: {
        userInfo: true,
      },
    });

    if (!user) return null;

    // 获取手机号
    const account = await tdb.query.accounts.findFirst({
      where: (acc, { eq, and }) =>
        and(eq(acc.userId, input.id), eq(acc.provider, "SMS")),
    });

    return {
      ...user,
      phone: account?.providerAccountId || null,
    };
  });

const updateZ = z.object({
  id: z.string(),
  name: z.string().optional(),
  nickname: z.string().optional(),
  phone: z.string().optional(),
});

const update = async (env: Cloudflare.Env, input: z.infer<typeof updateZ>) => {
  const tdb = db(env.DB);
  const { id, name, nickname, phone } = input;

  const updateData: {
    name?: string;
  } = {};

  if (name !== undefined) {
    updateData.name = name.trim() || undefined;
  }

  // 更新用户基本信息
  if (Object.keys(updateData).length > 0) {
    await tdb
      .update(users)
      .set(updateData)
      .where(drizzle.eq(users.id, id));
  }

  // 更新用户信息（nickname）
  if (nickname !== undefined) {
    const trimmedNickname = nickname.trim();
    if (trimmedNickname) {
      await tdb
        .update(userInfoTable)
        .set({ nickname: trimmedNickname })
        .where(drizzle.eq(userInfoTable.id, id));
    }
  }

  // 更新手机号（通过更新 account）
  if (phone !== undefined) {
    const trimmedPhone = phone.trim();
    const existingAccount = await tdb.query.accounts.findFirst({
      where: (acc, { eq, and }) =>
        and(eq(acc.userId, id), eq(acc.provider, "SMS")),
    });

    if (trimmedPhone) {
      if (existingAccount) {
        // 更新现有账户
        await tdb
          .update(accounts)
          .set({ providerAccountId: trimmedPhone })
          .where(
            drizzle.and(
              drizzle.eq(accounts.userId, id),
              drizzle.eq(accounts.provider, "SMS"),
            ),
          );
      } else {
        // 创建新账户
        await tdb.insert(accounts).values({
          userId: id,
          type: "credentials",
          provider: "SMS",
          providerAccountId: trimmedPhone,
        });
      }
    } else if (existingAccount) {
      // 如果手机号为空且存在账户，删除账户
      await tdb
        .delete(accounts)
        .where(
          drizzle.and(
            drizzle.eq(accounts.userId, id),
            drizzle.eq(accounts.provider, "SMS"),
          ),
        );
    }
  }

  // 返回更新后的用户信息
  const updatedUser = await tdb.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, id),
    with: {
      userInfo: true,
    },
  });

  if (!updatedUser) return null;

  const account = await tdb.query.accounts.findFirst({
    where: (acc, { eq, and }) =>
      and(eq(acc.userId, id), eq(acc.provider, "SMS")),
  });

  return {
    ...updatedUser,
    phone: account?.providerAccountId || null,
  };
};

const mutation = publicProcedure
  .input(updateZ)
  .mutation(async ({ input, ctx }) => {
    return update(ctx.env, input);
  });

// 关停用户：删除所有 session，使其无法登录
const disableZ = z.object({
  id: z.string(),
});

const disable = publicProcedure
  .input(disableZ)
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { id } = input;

    // 删除用户的所有 session
    await tdb
      .delete(sessions)
      .where(drizzle.eq(sessions.userId, id));

    return { success: true };
  });

export default { get, getById, mutation, disable };
