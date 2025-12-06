import { mergeSchemas } from "@graphql-tools/schema";
import { graphqlServer } from "@hono/graphql-server";
import db from "@lib/db";
import { buildSchema } from "drizzle-graphql";
import {
  createDefaultPublishableContext,
  createWsConnectionPoolClass,
} from "graphql-workers-subscriptions";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { schema } from "../apis/graphql";
import { FACTORY } from "../factory";
import { wrapSchemaWithContext } from "../utils";

export const graphqlSubSettings = {
  schema,
  wsConnectionPool: (env: Cloudflare.Env) => env.WS_CONNECTION_POOL,
  subscriptionsDb: (env: Cloudflare.Env) => env.SUBSCRIPTIONS,
};

const graphql = FACTORY.createMiddleware(async (c, next) => {
  const ctxInjectedSchema = wrapSchemaWithContext<Context<HonoCtxEnv>>(
    schema,
    async (ctx) => {
      return createDefaultPublishableContext({
        env: ctx.env,
        executionCtx: ctx.executionCtx,
        ...graphqlSubSettings,
        schema,
      });
    },
  );

  const drizzleSchema = buildSchema(db(c.env.DB));

  const server = graphqlServer<HonoCtxEnv>({
    schema: mergeSchemas({
      schemas: [ctxInjectedSchema, drizzleSchema.schema],
    }),
    graphiql: false,
  });

  return server(c, next);
});

export default graphql;

export const WsConnectionPool =
  createWsConnectionPoolClass<Cloudflare.Env>(graphqlSubSettings);
