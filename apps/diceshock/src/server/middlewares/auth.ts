import Credentials from "@auth/core/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type AuthConfig, initAuthConfig } from "@hono/auth-js";
import db, { userInfoTable } from "@lib/db";
import { createSelectSchema } from "drizzle-zod";
import type { Context } from "hono";
import { nanoid } from "nanoid/non-secure";
import type z from "zod/v4";
import type { HonoCtxEnv } from "@/shared/types";
import { FACTORY } from "../factory";
import { injectCrossDataToCtx } from "../utils";
import { genNickname, getSmsTmpCodeKey } from "../utils/auth";

export const userInfoZ = createSelectSchema(userInfoTable).omit({ id: true });

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

        return { id: crypto.randomUUID(), name: genNickname() };
      },
    }),
  );

  return config;
});

export const userInjMiddleware = FACTORY.createMiddleware(async (c, next) => {
  // 排除认证路由，这些路由由 authHandler 处理
  if (c.req.path.startsWith("/api/auth/")) return next();

  const authUser = c.get("authUser");

  const id = authUser?.user?.id ?? "";

  if (!authUser || !id) return next();

  const userInfoRaw = await db(c.env.DB).query.userInfoTable.findFirst({
    where: (userInfo, { eq }) => eq(userInfo.id, id),
  });

  if (!userInfoRaw) {
    const nickname = authUser.user?.name ?? genNickname();

    const uid = nanoid();

    const [userInfo] = await db(c.env.DB)
      .insert(userInfoTable)
      .values({ id, uid, nickname })
      .returning();

    if (userInfo)
      injectCrossDataToCtx(c, {
        UserInfo: {
          uid: userInfo.uid,
          create_at: userInfo.create_at,
          nickname: userInfo.nickname,
        },
      });

    return next();
  }

  injectCrossDataToCtx(c, {
    UserInfo: {
      uid: userInfoRaw.uid,
      create_at: userInfoRaw.create_at,
      nickname: userInfoRaw.nickname,
    },
  });

  return next();
});
