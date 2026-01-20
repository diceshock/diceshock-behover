import type Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import { initTRPC } from "@trpc/server";
import type { HonoCtxEnv } from "@/shared/types";

const t = initTRPC
  .context<{ env: HonoCtxEnv["Bindings"]; aliyunClient: Dysmsapi20170525 }>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;
