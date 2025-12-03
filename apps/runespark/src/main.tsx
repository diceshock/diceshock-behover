import { Hono } from "hono";
import apisRoot from "@/server/apis/apisRoot";
import fireRouter from "@/server/apis/fileRouter";
import type { HonoCtxEnv } from "@/shared/types";
import trpcServerDash from "./server/middlewares/trpcServerDash";
import trpcServerPublic from "./server/middlewares/trpcServerPublic";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use("/edge/*", trpcServerDash);
app.use("/apis/*", trpcServerPublic);

app.get("/*", fireRouter);

app.get("/apis/*", apisRoot);
app.post("/apis/*", apisRoot);
app.put("/apis/*", apisRoot);
app.delete("/apis/*", apisRoot);

export default app;
