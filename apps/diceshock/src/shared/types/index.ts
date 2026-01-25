/*global NodeJS */

import type Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import type { Env } from "hono";
import z from "zod/v4";
import type * as trpcServer from "@/server/apis/trpc";
import { userInfoZ } from "@/server/middlewares/auth";
import { userAgentMetaZ } from "@/server/middlewares/serverMetaInj";

export const injectCrossDataZ = z.object({
  UserAgentMeta: userAgentMetaZ.optional(),
  UserInfo: userInfoZ.optional(),
  RequestId: z.string(),
});
export type InjectCrossData = z.infer<typeof injectCrossDataZ>;

export interface HonoCtxEnv extends Env {
  Bindings: Cloudflare.Env;
  Variables: {
    InjectCrossData?: InjectCrossData;
    AliyunClient?: Dysmsapi20170525;
  };
}

export type ApiRouterPublic = typeof trpcServer.appRouterPublic;
export type ApiRouterDash = typeof trpcServer.appRouterDash;
