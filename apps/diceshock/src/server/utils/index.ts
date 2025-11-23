import type { Context } from "hono";
import type { HonoCtxEnv, InjectCrossData } from "@/shared/types";

export const injectCrossDataToCtx = (
  ctx: Context<HonoCtxEnv>,
  crossData: Partial<InjectCrossData>,
) => {
  const prevInject = ctx.get("InjectCrossData");
  ctx.set("InjectCrossData", { ...prevInject, ...crossData });
};

export const pickBy =
  <const O extends Record<PropertyKey, unknown>>(o: O) =>
  <const F extends <const K extends keyof O>(k: K, v: O[K]) => boolean>(f: F) =>
    Object.fromEntries(Object.entries(o).filter(([k, v]) => f(k, v))) as {
      [K in keyof O as ReturnType<F> extends true ? never : K]: O[K];
    };
