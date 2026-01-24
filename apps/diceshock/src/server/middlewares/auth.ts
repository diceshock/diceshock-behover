import Credentials from "@auth/core/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type AuthConfig, getAuthUser, initAuthConfig } from "@hono/auth-js";
import db, { drizzle, userInfoTable, users } from "@lib/db";
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
        if (!user) return token;

        token.sub = user.id;
        token.name = user.name;

        if ("phone" in user && user.phone) token.phone = user.phone;

        return token;
      },
      async session({ session, token }) {
        if (!session.user || !token.sub) return session;

        session.user.id = token.sub;
        session.user.name = token.name as string;

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

        const smsCode = await KV.get(getSmsTmpCodeKey(phone));

        if (smsCode !== code) return null;

        return { id: crypto.randomUUID(), name: genNickname(), phone };
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
    where: (user, { eq }) => eq(user.id, id),
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
    where: (userInfo, { eq }) => eq(userInfo.id, id),
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
      .where(drizzle.eq(userInfoTable.id, id));
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
