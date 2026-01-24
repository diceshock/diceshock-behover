import Credentials from "@auth/core/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type AuthConfig, getAuthUser, initAuthConfig } from "@hono/auth-js";
import db, { accounts, drizzle, userInfoTable, users } from "@lib/db";
import { createSelectSchema } from "drizzle-zod";
import type { Context } from "hono";
import { nanoid } from "nanoid/non-secure";
import type z from "zod/v4";
import type { HonoCtxEnv } from "@/shared/types";
import { FACTORY } from "../factory";
import { injectCrossDataToCtx } from "../utils";
import { genNickname, getSmsTmpCodeKey } from "../utils/auth";

export const userInfoZ = createSelectSchema(userInfoTable).omit({
  id: true,
  create_at: true,
});

export type UserInfo = z.infer<typeof userInfoZ>;

export const authInit = initAuthConfig(async (c: Context<HonoCtxEnv>) => {
  const aliyunClient = c.get("AliyunClient");

  const config: AuthConfig = {
    adapter: DrizzleAdapter(db(c.env.DB)),
    secret: c.env.AUTH_SECRET,
    providers: [],
    session: { strategy: "jwt" },
    trustHost: true,
    basePath: "/api/auth",
    callbacks: {
      async jwt({ token, user }) {
        if (!user) {
          console.log("[登录流程] JWT回调: 无用户信息，返回现有token");
          return token;
        }

        console.log("[登录流程] JWT回调: 处理用户信息", {
          userId: user.id,
          userName: user.name,
          phone: "phone" in user ? user.phone : undefined,
        });

        token.sub = user.id;
        token.name = user.name;

        if ("phone" in user && user.phone) token.phone = user.phone;

        console.log("[登录流程] JWT回调: Token已更新", {
          sub: token.sub,
          name: token.name,
          phone: token.phone,
        });
        return token;
      },
      async session({ session, token }) {
        if (!session.user || !token.sub) {
          console.log(
            "[登录流程] Session回调: 无用户或token.sub，返回现有session",
          );
          return session;
        }

        console.log("[登录流程] Session回调: 更新session", {
          userId: token.sub,
          userName: token.name,
        });

        session.user.id = token.sub;
        session.user.name = token.name as string;

        console.log("[登录流程] Session回调: Session已更新", {
          userId: session.user.id,
          userName: session.user.name,
        });
        return session;
      },
    },
  };

  if (!aliyunClient) return config;

  const { KV } = c.env;

  config.providers.push(
    Credentials({
      name: "SMS",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      authorize: async (credentials) => {
        const { phone, code } = credentials as { phone: string; code: string };

        console.log("[登录流程] 开始验证登录", {
          phone,
          codeLength: code?.length,
        });

        const smsCode = await KV.get(getSmsTmpCodeKey(phone));

        console.log("[登录流程] 验证码验证", {
          phone,
          codeMatch: smsCode === code,
          storedCode: smsCode ? "***" : null,
        });

        if (smsCode !== code) {
          console.log("[登录流程] 验证码错误，登录失败", { phone });
          return null;
        }

        const tdb = db(c.env.DB);

        // 查找该手机号是否已经存在账号
        console.log("[登录流程] 查找现有账号", { phone });
        const existingAccount = await tdb.query.accounts.findFirst({
          where: (acc: any, { eq, and }: any) =>
            and(eq(acc.provider, "SMS"), eq(acc.providerAccountId, phone)),
        });

        // 如果账号已存在，查找对应的用户
        if (existingAccount) {
          console.log("[登录流程] 找到现有账号", {
            userId: existingAccount.userId,
          });

          const existingUser = await tdb.query.users.findFirst({
            where: (user: any, { eq }: any) =>
              eq(user.id, existingAccount.userId),
          });

          if (existingUser) {
            const userData = {
              id: existingAccount.userId,
              name: existingUser.name || genNickname(),
              phone,
            };
            console.log("[登录流程] 返回现有用户", {
              userId: userData.id,
              userName: userData.name,
              phone: userData.phone,
            });
            return userData;
          } else {
            console.log("[登录流程] 账号存在但用户不存在", {
              userId: existingAccount.userId,
            });
          }
        }

        // 如果账号不存在，检查 userInfoTable 中是否有相同手机号的用户
        console.log("[登录流程] 未找到现有账号，检查 userInfoTable", { phone });
        const existingUserInfo = await tdb.query.userInfoTable.findFirst({
          where: (userInfo: any, { eq }: any) => eq(userInfo.phone, phone),
        });

        if (existingUserInfo) {
          console.log("[登录流程] 在 userInfoTable 中找到现有用户", {
            userId: existingUserInfo.id,
            uid: existingUserInfo.uid,
          });

          // 确保 users 表中存在该用户
          let existingUser = await tdb.query.users.findFirst({
            where: (user: any, { eq }: any) => eq(user.id, existingUserInfo.id),
          });

          if (!existingUser) {
            console.log("[登录流程] users 表中不存在，创建用户记录", {
              userId: existingUserInfo.id,
            });
            await tdb
              .insert(users)
              .values({
                id: existingUserInfo.id,
                name: existingUserInfo.nickname || genNickname(),
              })
              .onConflictDoNothing();
            existingUser = await tdb.query.users.findFirst({
              where: (user: any, { eq }: any) =>
                eq(user.id, existingUserInfo.id),
            });
          }

          // 确保 account 表中存在记录
          const accountExists = await tdb.query.accounts.findFirst({
            where: (acc: any, { eq, and }: any) =>
              and(eq(acc.provider, "SMS"), eq(acc.providerAccountId, phone)),
          });

          if (!accountExists) {
            console.log("[登录流程] account 表中不存在，创建 account 记录", {
              userId: existingUserInfo.id,
              phone,
            });
            try {
              await tdb.insert(accounts).values({
                userId: existingUserInfo.id,
                type: "credentials" as any,
                provider: "SMS",
                providerAccountId: phone,
              });
              console.log("[登录流程] account 记录创建成功", {
                userId: existingUserInfo.id,
                phone,
              });
            } catch (error: any) {
              // 如果因为主键冲突失败，说明记录已存在（可能是并发情况）
              if (
                error?.message?.includes("UNIQUE constraint") ||
                error?.code === "SQLITE_CONSTRAINT_UNIQUE"
              ) {
                console.log("[登录流程] account 记录已存在（并发情况）", {
                  userId: existingUserInfo.id,
                  phone,
                });
              } else {
                console.error("[登录流程] 创建 account 记录失败", {
                  error,
                  userId: existingUserInfo.id,
                  phone,
                });
                throw error;
              }
            }
          }

          const userData = {
            id: existingUserInfo.id,
            name:
              existingUser?.name || existingUserInfo.nickname || genNickname(),
            phone,
          };
          console.log("[登录流程] 返回现有用户（从 userInfoTable）", {
            userId: userData.id,
            userName: userData.name,
            phone: userData.phone,
          });
          return userData;
        }

        // 如果都不存在，创建新用户（DrizzleAdapter 会自动创建 user 和 account）
        console.log("[登录流程] 未找到任何现有记录，创建新用户", { phone });
        const newUser = { id: crypto.randomUUID(), name: genNickname(), phone };
        console.log("[登录流程] 创建新用户", {
          userId: newUser.id,
          userName: newUser.name,
          phone: newUser.phone,
        });
        return newUser;
      },
    }),
  );

  return config;
});

export const userInjMiddleware = FACTORY.createMiddleware(async (c, next) => {
  // 排除认证路由，这些路由由 authHandler 处理
  if (c.req.path.startsWith("/api/auth/")) return next();

  const authUser = await getAuthUser(c);

  console.log("authUser", authUser);

  // 在 JWT 策略下，用户 ID 存储在 token.sub 中
  const id = authUser?.token?.sub || authUser?.user?.id;

  console.log("user id:", id);

  if (!authUser || !id) return next();

  // 确保用户存在于 user 表中（JWT 策略可能不会自动保存）
  const userExists = await db(c.env.DB).query.users.findFirst({
    where: (user: any, { eq }: any) => eq(user.id, id),
  });

  if (!userExists) {
    console.log("用户不存在，创建用户:", id);
    await db(c.env.DB)
      .insert(users)
      .values({
        id,
        name: authUser.user?.name || authUser.token?.name || genNickname(),
      })
      .onConflictDoNothing();
  }

  const phone = (authUser.token?.phone ?? null) as string | null;

  const userInfoRaw = await db(c.env.DB).query.userInfoTable.findFirst({
    where: (userInfo: any, { eq }: any) => eq(userInfo.id, id),
  });

  if (!userInfoRaw) {
    const nickname = authUser.user?.name ?? genNickname();

    const uid = nanoid();

    const [userInfo] = await db(c.env.DB)
      .insert(userInfoTable)
      .values({ id, uid, nickname, phone })
      .returning();

    if (userInfo)
      injectCrossDataToCtx(c, {
        UserInfo: {
          phone,
          uid: userInfo.uid,
          nickname: userInfo.nickname,
        },
      });

    return next();
  }

  // 如果 token 中有 phone，且与数据库中的不同，则更新
  if (phone && userInfoRaw.phone !== phone) {
    const tdb = db(c.env.DB);
    await tdb
      .update(userInfoTable)
      .set({ phone })
      .where((drizzle as any).eq(userInfoTable.id, id));
    // 更新本地变量以反映最新值
    userInfoRaw.phone = phone;
  }

  injectCrossDataToCtx(c, {
    UserInfo: {
      phone: userInfoRaw.phone || phone,
      uid: userInfoRaw.uid,
      nickname: userInfoRaw.nickname,
    },
  });

  return next();
});

const WHITE_LIST = [/^\/me/] satisfies RegExp[];

export const authGuard = FACTORY.createMiddleware(async (c, next) => {
  if (!WHITE_LIST.some((i) => i.test(c.req.path))) return next();

  const { UserInfo } = c.get("InjectCrossData") ?? {};

  if (UserInfo) return next();

  c.redirect("/");
});
