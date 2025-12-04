/*global NodeJS */

import type { Env } from "hono";
import z from "zod";
import { userAgentMetaZ } from "@/server/middlewares/serverMetaInj";

export const injectCrossDataZ = z.object({
  UserAgentMeta: userAgentMetaZ.optional(),
});
export type InjectCrossData = z.infer<typeof injectCrossDataZ>;

export interface HonoCtxEnv extends Env {
  Bindings: Cloudflare.Env;
  Variables: { InjectCrossData?: InjectCrossData };
}
