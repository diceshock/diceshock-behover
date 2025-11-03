import { Hono } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

import edgeRoot from "@/server/apis/edgeRoot";
import apisRoot from "@/server/apis/apisRoot";
import diceshockRouter from "@/server/apis/diceshock";
import trpcServerPublic from "./server/middlewares/trpcServerPublic";
import trpcServerDash from "./server/middlewares/trpcServerDash";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use("/apis/dash/*", trpcServerDash);
app.use("/apis/*", trpcServerPublic);

app.get("/*", diceshockRouter);

app.get("/edge/*", edgeRoot);
app.post("/edge/*", edgeRoot);
app.put("/edge/*", edgeRoot);
app.delete("/edge/*", edgeRoot);

app.get("/apis/*", apisRoot);
app.post("/apis/*", apisRoot);
app.put("/apis/*", apisRoot);
app.delete("/apis/*", apisRoot);

export default app;
