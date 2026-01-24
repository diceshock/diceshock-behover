import db, { drizzle, pagedZ, sessions, userInfoTable, users } from "@lib/db";
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
    let whereCondition: any;

    if (searchWords) {
      // 先查找匹配的 userInfo (uid, nickname, phone)
      const matchingUserInfos = await tdb.query.userInfoTable.findMany({
        where: (userInfo, { or, like }) =>
          or(
            like(userInfo.uid, `%${searchWords}%`),
            like(userInfo.nickname, `%${searchWords}%`),
            like(userInfo.phone, `%${searchWords}%`),
          ),
      });

      const matchingUserIds = matchingUserInfos.map((ui) => ui.id);

      // 查找匹配的 users (id, name, email)
      const allMatchingIds = new Set([
        ...matchingUserIds,
        ...(searchWords.includes("@") ? [] : []), // 如果包含 @，可能是邮箱
      ]);

      // 如果搜索词可能是用户 ID，直接添加
      if (searchWords.length >= 8) {
        allMatchingIds.add(searchWords);
      }

      if (allMatchingIds.size > 0) {
        whereCondition = (user: any, { or, inArray, like }: any) =>
          or(
            inArray(user.id, Array.from(allMatchingIds)),
            like(user.name, `%${searchWords}%`),
            like(user.email, `%${searchWords}%`),
          );
      } else {
        whereCondition = (user: any, { or, like }: any) =>
          or(
            like(user.name, `%${searchWords}%`),
            like(user.email, `%${searchWords}%`),
          );
      }
    }

    const queryOptions: any = {
      with: {
        userInfo: true,
      },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: (users: any, { desc }: any) => desc(users.id),
    };

    if (whereCondition) {
      queryOptions.where = whereCondition;
    }

    const userList = await tdb.query.users.findMany(queryOptions);

    // 组合数据：直接使用 userInfo.phone，并保留 userInfo 对象
    return userList.map((user) => {
      const userWithInfo = user as typeof user & {
        userInfo: {
          phone: string | null;
          nickname: string;
          uid: string;
          create_at: Date | null;
        } | null;
      };
      return {
        ...user,
        phone: userWithInfo.userInfo?.phone || null,
        userInfo: userWithInfo.userInfo || null,
      } as typeof user & {
        phone: string | null;
        userInfo: {
          phone: string | null;
          nickname: string;
          uid: string;
          create_at: Date | null;
        } | null;
      };
    });
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

    const userWithInfo = user as typeof user & {
      userInfo: {
        phone: string | null;
        nickname: string;
        uid: string;
        create_at: Date | null;
      } | null;
    };

    return {
      ...user,
      phone: userWithInfo.userInfo?.phone || null,
      userInfo: userWithInfo.userInfo,
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
    await tdb.update(users).set(updateData).where(drizzle.eq(users.id, id));
  }

  // 更新用户信息（nickname 和 phone）
  const userInfoUpdateData: {
    nickname?: string;
    phone?: string | null;
  } = {};

  if (nickname !== undefined) {
    const trimmedNickname = nickname.trim();
    if (trimmedNickname) {
      userInfoUpdateData.nickname = trimmedNickname;
    }
  }

  if (phone !== undefined) {
    const trimmedPhone = phone.trim();
    userInfoUpdateData.phone = trimmedPhone || null;
  }

  // 更新 userInfo 表
  if (Object.keys(userInfoUpdateData).length > 0) {
    await tdb
      .update(userInfoTable)
      .set(userInfoUpdateData)
      .where(drizzle.eq(userInfoTable.id, id));
  }

  // 返回更新后的用户信息
  const updatedUser = await tdb.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, id),
    with: {
      userInfo: true,
    },
  });

  if (!updatedUser) return null;

  const updatedUserWithInfo = updatedUser as typeof updatedUser & {
    userInfo: {
      phone: string | null;
      nickname: string;
      uid: string;
      create_at: Date | null;
    } | null;
  };

  return {
    ...updatedUser,
    phone: updatedUserWithInfo.userInfo?.phone || null,
    userInfo: updatedUserWithInfo.userInfo,
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
    await tdb.delete(sessions).where(drizzle.eq(sessions.userId, id));

    return { success: true };
  });

export default { get, getById, mutation, disable };
