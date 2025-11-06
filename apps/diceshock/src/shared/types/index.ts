/*global NodeJS */

import { userAgentMetaZ } from "@/server/middlewares/serverMetaInj";
import type * as trpcServer from "@/server/apis/trpc";
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

export type ApiRouterPublic = typeof trpcServer.appRouterPublic;
export type ApiRouterDash = typeof trpcServer.appRouterDash;
