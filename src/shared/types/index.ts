/*global NodeJS */

import { userAgentMetaZ } from "@/server/middlewares/serverMetaInj";
import type * as trpcServerPublic from "@/server/apis/trpc/router-public";
import type * as trpcServerDash from "@/server/apis/trpc/router-dash";
import { Env } from "hono";
import z from "zod";

export const injectCrossDataZ = z.object({
  UserAgentMeta: userAgentMetaZ.optional(),
});
export type InjectCrossData = z.infer<typeof injectCrossDataZ>;

export interface HonoCtxEnv extends Env {
  Bindings: Cloudflare.Env;
  Variables: { InjectCrossData?: InjectCrossData };
}

export type ApiRouterPublic = typeof trpcServerPublic.appRouterPublic;
export type ApiRouterDash = typeof trpcServerDash.appRouterDash;
