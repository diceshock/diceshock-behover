import owned from "./owned";

import { HonoCtxEnv } from "@/shared/types";
import { initTRPC } from "@trpc/server";

const t = initTRPC.context<{ env: HonoCtxEnv["Bindings"] }>().create();

export const routerPublic = t.router;
export const publicProcedurePublic = t.procedure;

export const appRouterPublic = routerPublic({
  owned,
});
