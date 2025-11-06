import { HonoCtxEnv } from "@/shared/types";
import { initTRPC } from "@trpc/server";

const t = initTRPC.context<{ env: HonoCtxEnv["Bindings"] }>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
