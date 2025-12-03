import { initTRPC } from "@trpc/server";
import type { HonoCtxEnv } from "@/shared/types";

const t = initTRPC.context<{ env: HonoCtxEnv["Bindings"] }>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
