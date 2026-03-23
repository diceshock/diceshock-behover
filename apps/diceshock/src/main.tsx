import { authHandler } from "@hono/auth-js";
import { Hono } from "hono";
import apisRoot from "@/server/apis/apisRoot";
import fileRoute from "@/server/apis/fileRoute";
import sitemap from "@/server/apis/sitemap";
import type { HonoCtxEnv } from "@/shared/types";
import "@/shared/utils/dayjs-config";
import aliyunInj from "./server/middlewares/aliyunInj";
import {
  authGuard,
  authInit,
  userInjMiddleware,
} from "./server/middlewares/auth";
import requestEndpoint from "./server/middlewares/requestEndpoint";
import serverMetaInj from "./server/middlewares/serverMetaInj";
import trpcServerDash from "./server/middlewares/trpcServerDash";
import trpcServerPublic from "./server/middlewares/trpcServerPublic";

export { SeatTimerDO } from "./server/durableObjects/SeatTimerDO";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use(requestEndpoint);

app.use(aliyunInj);
app.use(authInit);

app.use(serverMetaInj);

app.use("/edge/*", trpcServerDash);
app.use("/apis/*", trpcServerPublic);

app.use("/api/auth/*", authHandler());

app.get("/sitemap.xml", sitemap);

app.get("/ws/seat/:code", async (c) => {
  const code = c.req.param("code");
  const id = c.env.SEAT_TIMER.idFromName(code);
  const stub = c.env.SEAT_TIMER.get(id);
  const url = new URL(c.req.url);
  return stub.fetch(
    new Request(`${url.origin}/ws?${url.searchParams.toString()}`, {
      headers: c.req.raw.headers,
    }),
  );
});

app.use("*", userInjMiddleware);
app.use("*", authGuard);

app.get("/*", fileRoute);

app.get("/apis/*", apisRoot);
app.post("/apis/*", apisRoot);
app.put("/apis/*", apisRoot);
app.delete("/apis/*", apisRoot);

export default app;
