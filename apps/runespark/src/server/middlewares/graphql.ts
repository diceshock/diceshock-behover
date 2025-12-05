import { graphqlServer } from "@hono/graphql-server";
import {
  createDefaultPublishableContext,
  createWsConnectionPoolClass,
} from "graphql-workers-subscriptions";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { schema } from "../apis/graphql";
import { wrapSchemaWithContext } from "../utils";

export const graphqlSubSettings = {
  schema,
  wsConnectionPool: (env: Cloudflare.Env) => env.WS_CONNECTION_POOL,
  subscriptionsDb: (env: Cloudflare.Env) => env.SUBSCRIPTIONS,
};

const graphql = graphqlServer<HonoCtxEnv>({
  schema: wrapSchemaWithContext<Context<HonoCtxEnv>>(schema, async (ctx) =>
    createDefaultPublishableContext({
      env: ctx.env,
      executionCtx: ctx.executionCtx,
      ...graphqlSubSettings,
    }),
  ),
  graphiql: false,
});

export default graphql;

export const WsConnectionPool =
  createWsConnectionPoolClass<Cloudflare.Env>(graphqlSubSettings);
