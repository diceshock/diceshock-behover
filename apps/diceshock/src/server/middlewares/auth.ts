import Credentials from "@auth/core/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type AuthConfig, getAuthUser, initAuthConfig } from "@hono/auth-js";
import db, {
  accounts,
  drizzle,
  storesTable,
  type UserRole,
  userInfoTable,
  users,
} from "@lib/db";
import { createSelectSchema } from "drizzle-zod";
import type { Context } from "hono";
import { nanoid } from "nanoid/non-secure";
import type z from "zod/v4";
import type { HonoCtxEnv } from "@/shared/types";
import { FACTORY } from "../factory";
import { WechatMP, WechatMPSilent, WechatOpen } from "../providers/wechat";
import { injectCrossDataToCtx } from "../utils";
import { genNickname, getSmsTmpCodeKey } from "../utils/auth";

export const userInfoZ = createSelectSchema(userInfoTable).omit({
  id: true,
  create_at: true,
});

export type UserInfo = z.infer<typeof userInfoZ>;

export const authInit = initAuthConfig(async (c: Context<HonoCtxEnv>) => {
  const aliyunClient = c.get("AliyunClient");

  const WECHAT_PROVIDERS = ["wechat-open", "wechat-mp", "wechat-mp-silent"];
  const baseAdapter = DrizzleAdapter(db(c.env.DB));
  const adapter = {
    ...baseAdapter,
    async getUserByAccount(
      providerAccount: Record<string, string>,
    ): Promise<any> {
      const result = await baseAdapter.getUserByAccount!(providerAccount);
      if (result) return result;

      if (WECHAT_PROVIDERS.includes(providerAccount.provider)) {
        for (const altProvider of WECHAT_PROVIDERS) {
          if (altProvider === providerAccount.provider) continue;
          const altResult = await baseAdapter.getUserByAccount!({
            ...providerAccount,
            provider: altProvider,
          });
          if (altResult) return altResult;
        }
      }
      return null;
    },
  };

  const config: AuthConfig = {
    adapter,
    secret:
      c.env.AUTH_SECRET ||
      (import.meta.env.DEV
        ? "diceshock-dev-secret-do-not-use-in-production"
        : ""),
    providers: [],
    session: { strategy: "jwt" },
    trustHost: true,
    basePath: "/api/auth",
    logger: {
      error(code: any, ...message: any[]) {
        console.error("[Auth.js]", code, ...message);
      },
      warn(code: any) {
        console.warn("[Auth.js]", code);
      },
      debug() {},
    },
    callbacks: {
      async jwt({ token, user, account, profile }) {
        if (user) {
          token.sub = user.id;
          token.name = user.name;
          if ("phone" in user && user.phone) token.phone = user.phone;
        }

        if (account && profile && token.sub) {
          const unionid = (profile as any).unionid;
          if (unionid) {
            const existingUserId = await c.env.KV.get(`unionid:${unionid}`);
            if (existingUserId && existingUserId !== token.sub) {
              console.log("[auth:merge] unionid match, merging", {
                newUserId: (token.sub as string).slice(-8),
                existingUserId: existingUserId.slice(-8),
                provider: account.provider,
              });
              const tdb = db(c.env.DB);
              await tdb
                .update(accounts)
                .set({ userId: existingUserId })
                .where(
                  drizzle.and(
                    drizzle.eq(accounts.provider, account.provider),
                    drizzle.eq(
                      accounts.providerAccountId,
                      account.providerAccountId!,
                    ),
                  ),
                );
              const orphanedId = token.sub as string;
              const orphanHasOtherAccounts = await tdb
                .select({ userId: accounts.userId })
                .from(accounts)
                .where(drizzle.eq(accounts.userId, orphanedId))
                .limit(1);
              if (orphanHasOtherAccounts.length === 0) {
                await tdb.delete(users).where(drizzle.eq(users.id, orphanedId));
              }
              token.sub = existingUserId;
            } else if (!existingUserId) {
              await c.env.KV.put(`unionid:${unionid}`, token.sub as string, {
                expirationTtl: 86400 * 365,
              });
            }
          }
        }

        if (token.sub) {
          const tdb = db(c.env.DB);
          const dbUser = await tdb.query.users.findFirst({
            where: (u: any, { eq }: any) => eq(u.id, token.sub),
            columns: { role: true },
          });
          token.role = (dbUser?.role ?? "customer") as UserRole;
        }

        if (
          account?.provider === "wechat-mp" &&
          profile &&
          "nickname" in profile &&
          (profile as any).nickname
        ) {
          token.name = (profile as any).nickname;
        }

        return token;
      },
      async session({ session, token }) {
        if (!session.user || !token.sub) return session;

        session.user.id = token.sub;
        session.user.name = token.name as string;
        (session.user as any).role = (token.role as UserRole) ?? "customer";

        return session;
      },
    },
  };

  if (c.env.WECHAT_OPEN_APP_ID && c.env.WECHAT_OPEN_APP_SECRET) {
    config.providers.push(
      WechatOpen({
        clientId: c.env.WECHAT_OPEN_APP_ID,
        clientSecret: c.env.WECHAT_OPEN_APP_SECRET,
      }),
    );
  }

  if (c.env.WECHAT_MP_APP_ID && c.env.WECHAT_MP_APP_SECRET) {
    config.providers.push(
      WechatMP({
        clientId: c.env.WECHAT_MP_APP_ID,
        clientSecret: c.env.WECHAT_MP_APP_SECRET,
      }),
    );
    config.providers.push(
      WechatMPSilent({
        clientId: c.env.WECHAT_MP_APP_ID,
        clientSecret: c.env.WECHAT_MP_APP_SECRET,
      }),
    );
  }

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
    const nickname =
      authUser.user?.name || authUser.token?.name || genNickname();
    const isAutoNickname = /^The Shock [0-9a-f]{5}$/.test(nickname);

    const uid = nanoid();

    // Set preferred store/locale from the current page context.
    // These are set by the storeLocale middleware on store-prefixed paths
    // (e.g. /jdk-ja/...). During OAuth callbacks (/api/auth/*) the middleware
    // skips, so these will be undefined — preferences stay null until the
    // user visits a store page.
    const storeCode = c.get("StoreCode");
    const localeCode = c.get("LocaleCode");
    let preferredStoreId: string | null = null;

    if (storeCode) {
      const tdb = db(c.env.DB);
      const store = await tdb.query.storesTable.findFirst({
        where: (s: any, { eq }: any) => eq(s.code, storeCode),
      });
      preferredStoreId = store?.id ?? null;
    }

    const [userInfo] = await db(c.env.DB)
      .insert(userInfoTable)
      .values({
        id,
        uid,
        nickname,
        phone,
        meta: isAutoNickname ? { auto_nickname: true } : null,
        preferred_store_id: preferredStoreId,
        preferred_locale: localeCode ?? null,
      })
      .returning();

    if (userInfo)
      injectCrossDataToCtx(c, {
        UserInfo: {
          phone,
          uid: userInfo.uid,
          nickname: userInfo.nickname,
          meta: userInfo.meta ?? null,
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
    userInfoRaw.phone = phone;
  }

  // 如果用户昵称是自动生成的，且 OAuth 登录带来了真实昵称，则更新
  const oauthName = authUser.user?.name || authUser.token?.name;
  if (
    userInfoRaw.meta?.auto_nickname &&
    oauthName &&
    oauthName !== userInfoRaw.nickname &&
    !/^The Shock [0-9a-f]{5}$/.test(oauthName)
  ) {
    const tdb = db(c.env.DB);
    await tdb
      .update(userInfoTable)
      .set({ nickname: oauthName, meta: null })
      .where((drizzle as any).eq(userInfoTable.id, id));
    userInfoRaw.nickname = oauthName;
    userInfoRaw.meta = null;
  }

  injectCrossDataToCtx(c, {
    UserInfo: {
      phone: userInfoRaw.phone || phone,
      uid: userInfoRaw.uid,
      nickname: userInfoRaw.nickname,
      meta: userInfoRaw.meta ?? null,
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

export const dashGuard = FACTORY.createMiddleware(async (c, next) => {
  const authUser = await getAuthUser(c);
  const role = (authUser?.token?.role as UserRole) ?? "customer";

  if (role !== "admin" && role !== "staff") {
    return c.redirect("/");
  }

  return next();
});
