import { Hono } from "hono";
import fireRouter from "@/server/apis/fileRouter";
import wrapper from "@/server/fetchWrapper";
import type { HonoCtxEnv } from "@/shared/types";
import graphql from "./server/middlewares/graphql";
import serverMetaInj from "./server/middlewares/serverMetaInj";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use(serverMetaInj);
app.use("/graphql", graphql);

app.get("/*", fireRouter);

export default wrapper(app.fetch);

export { WsConnectionPool } from "@/server/middlewares/graphql";
