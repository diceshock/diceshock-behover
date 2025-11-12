import { createFactory } from "hono/factory";
import type { HonoCtxEnv } from "@/shared/types";

export const FACTORY = createFactory<HonoCtxEnv>({});
