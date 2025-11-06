import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

export default async function apisRoot(c: Context<HonoCtxEnv>) {
  return c.text("apisRoot");
}
