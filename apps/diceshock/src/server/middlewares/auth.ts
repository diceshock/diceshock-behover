import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { initAuthConfig } from "@hono/auth-js";
import db from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { FACTORY } from "../factory";
import { injectCrossDataToCtx } from "../utils";

export const authInit = initAuthConfig((c: Context<HonoCtxEnv>) => ({
  adapter: DrizzleAdapter(db(c.env.DB)),
  secret: c.env.AUTH_SECRET,
  providers: [],
  session: { strategy: "jwt" },
}));

export const userInjMiddleware = FACTORY.createMiddleware(async (c, next) => {
  const auth = c.get("authUser");

  if (!auth || !auth.user) return next();

  injectCrossDataToCtx(c, { UserInfo: { ...auth.user } });
});
