import { handleSubscriptions } from "graphql-workers-subscriptions";
import { Hono } from "hono";
import fireRouter from "@/server/apis/fileRouter";
import type { HonoCtxEnv } from "@/shared/types";
import graphql, { graphqlSubSettings } from "./server/middlewares/graphql";
import serverMetaInj from "./server/middlewares/serverMetaInj";

export const app = new Hono<{ Bindings: HonoCtxEnv }>();

app.use(serverMetaInj);
app.use("/graphql", graphql);

app.get("/*", fireRouter);

const wrapper = (fetch: ExportedHandlerFetchHandler<Cloudflare.Env>) =>
  ({
    fetch: handleSubscriptions({ fetch, ...graphqlSubSettings }),
  }) satisfies ExportedHandler<Cloudflare.Env>;

export default wrapper(app.fetch);

export { WsConnectionPool } from "@/server/middlewares/graphql";
