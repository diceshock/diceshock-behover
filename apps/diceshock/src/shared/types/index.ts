/*global NodeJS */

import type { AdapterUser } from "@auth/core/adapters";
import type { Env } from "hono";
import z from "zod/v4";
import type * as trpcServer from "@/server/apis/trpc";
import { userAgentMetaZ } from "@/server/middlewares/serverMetaInj";

export const userInfoZ = z.custom<AdapterUser>();

export type UserInfo = z.infer<typeof userInfoZ>;

export const injectCrossDataZ = z.object({
  UserAgentMeta: userAgentMetaZ.optional(),
  UserInfo: userInfoZ.optional(),
});
export type InjectCrossData = z.infer<typeof injectCrossDataZ>;

export interface HonoCtxEnv extends Env {
  Bindings: Cloudflare.Env;
  Variables: { InjectCrossData?: InjectCrossData };
}

export type ApiRouterPublic = typeof trpcServer.appRouterPublic;
export type ApiRouterDash = typeof trpcServer.appRouterDash;
