import active from "./active";

import { HonoCtxEnv } from "@/shared/types";
import { initTRPC } from "@trpc/server";

const t = initTRPC.context<{ env: HonoCtxEnv["Bindings"] }>().create();

export const routerDash = t.router;
export const publicProcedureDash = t.procedure;

export const appRouterDash = routerDash({
  active,
});
