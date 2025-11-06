import { HonoCtxEnv } from "@/shared/types";
import { Context } from "hono";

export default async function edgeRoot(c: Context<HonoCtxEnv>) {
    return c.text("edgeRoot");
}
