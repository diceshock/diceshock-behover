import { Hono } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

import edgeRoot from "@/server/apis/edgeRoot";
import apisRoot from "@/server/apis/apisRoot";
import diceshockRouter from "@/server/apis/diceshock";
import trpcServer from "./server/middlewares/trpcServer";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use("/apis/*", trpcServer);

app.get("/*", diceshockRouter);

app.get("/edge/*", edgeRoot);
app.post("/edge/*", edgeRoot);
app.put("/edge/*", edgeRoot);
app.delete("/edge/*", edgeRoot);

app.get("/apis/*", apisRoot);
app.post("/apis/*", apisRoot);
app.put("/apis/*", apisRoot);
app.delete("/apis/*", apisRoot);

export default app
