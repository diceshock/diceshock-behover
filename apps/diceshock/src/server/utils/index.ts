import type { Context } from "hono";
import type { HonoCtxEnv, InjectCrossData } from "@/shared/types";

export const injectCrossDataToCtx = (
  ctx: Context<HonoCtxEnv>,
  crossData: Partial<InjectCrossData>,
) => {
  const prevInject = ctx.get("InjectCrossData");
  console.log("prevInject", prevInject);
  console.log("crossData", crossData);
  ctx.set("InjectCrossData", {
    ...prevInject,
    ...crossData,
  } as InjectCrossData);
};
