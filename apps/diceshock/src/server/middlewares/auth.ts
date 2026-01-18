import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { initAuthConfig } from "@hono/auth-js";
import db, { userInfoTable } from "@lib/db";
import { createSelectSchema } from "drizzle-zod";
import type { Context } from "hono";
import { customAlphabet, nanoid } from "nanoid/non-secure";
import type z from "zod/v4";
import type { HonoCtxEnv } from "@/shared/types";
import { FACTORY } from "../factory";
import { injectCrossDataToCtx } from "../utils";

export const userInfoZ = createSelectSchema(userInfoTable).omit({ id: true });

export type UserInfo = z.infer<typeof userInfoZ>;

export const authInit = initAuthConfig((c: Context<HonoCtxEnv>) => ({
  adapter: DrizzleAdapter(db(c.env.DB)),
  secret: c.env.AUTH_SECRET,
  providers: [],
  session: { strategy: "jwt" },
}));

export const userInjMiddleware = FACTORY.createMiddleware(async (c, next) => {
  const auth = c.get("authUser");
  const id = auth?.user?.id ?? "";

  if (!auth || !id) return next();

  const userInfoRaw = await db(c.env.DB).query.userInfoTable.findFirst({
    where: (userInfo, { eq }) => eq(userInfo.id, id),
  });

  if (!userInfoRaw) {
    let nickname = auth.user?.name;
    nickname ??= `The Shock ${customAlphabet("1234567890abcdef", 5)}`;

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
