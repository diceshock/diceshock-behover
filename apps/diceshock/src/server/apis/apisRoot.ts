import { HonoCtxEnv } from "@/shared/types";
import { Context } from "hono";

export default async function apisRoot(c: Context<HonoCtxEnv>) {
    return c.text("apisRoot");
}
