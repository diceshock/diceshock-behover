import type { Context } from "hono";
import type { HonoCtxEnv, InjectCrossData } from "@/shared/types";

export const injectCrossDataToCtx = (
  ctx: Context<HonoCtxEnv>,
  crossData: Partial<InjectCrossData>,
) => {
  const prevInject = ctx.get("InjectCrossData");

  ctx.set("InjectCrossData", {
    ...prevInject,
    ...crossData,
  } as InjectCrossData);
};
