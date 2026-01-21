import { authHandler } from "@hono/auth-js";
import { Hono } from "hono";
import apisRoot from "@/server/apis/apisRoot";
import diceshockRouter from "@/server/apis/diceshock";
import type { HonoCtxEnv } from "@/shared/types";
import aliyunInj from "./server/middlewares/aliyunInj";
import { authInit, userInjMiddleware } from "./server/middlewares/auth";
import trpcServerDash from "./server/middlewares/trpcServerDash";
import trpcServerPublic from "./server/middlewares/trpcServerPublic";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use(aliyunInj);
app.use(authInit);
app.use(userInjMiddleware);

app.use("/edge/*", trpcServerDash);
app.use("/apis/*", trpcServerPublic);

app.use("/auth/*", authHandler());

app.get("/*", diceshockRouter);

app.get("/apis/*", apisRoot);
app.post("/apis/*", apisRoot);
app.put("/apis/*", apisRoot);
app.delete("/apis/*", apisRoot);

export default app;
