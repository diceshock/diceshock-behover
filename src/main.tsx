import { Hono } from "hono";
import type { ExportedHandler } from "@cloudflare/workers-types";
import { authHandler, verifyAuth } from "@hono/auth-js";

import type { HonoCtxEnv } from "@/shared/types";

import edgeRoot from "@/server/apis/edgeRoot";
import apisRoot from "@/server/apis/apisRoot";
import diceshockRouter from "@/server/apis/diceshock";
import runesparkRouter from "@/server/apis/runespark";
import fetchMapper from "@/server/fetchMapper";
import trpcServer from "./server/middlewares/trpcServer";
import initAuth from "./server/middlewares/initAuth";
import authInj from "./server/middlewares/authInj";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use(initAuth);

app.use(authInj);

app.use("/api/auth/*", authHandler());
app.use("/api/*", verifyAuth());

app.use("/api/*", trpcServer);

app.get("/diceshock/*", diceshockRouter);
app.get("/runespark/*", runesparkRouter);
app.get("/*", diceshockRouter);

app.get("/edge/*", edgeRoot);
app.post("/edge/*", edgeRoot);
app.put("/edge/*", edgeRoot);
app.delete("/edge/*", edgeRoot);

app.get("/api/*", apisRoot);
app.post("/api/*", apisRoot);
app.put("/api/*", apisRoot);
app.delete("/api/*", apisRoot);

export default {
    fetch: fetchMapper(app),
} satisfies ExportedHandler<Cloudflare.Env>;
