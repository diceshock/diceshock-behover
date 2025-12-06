import type { GraphQLSchemaWithContext } from "@graphql-tools/schema";
import { MapperKind, mapSchema } from "@graphql-tools/utils";
import { wrapSchema } from "@graphql-tools/wrap";
import {
  type DefaultPublishableContext,
  subscribe,
} from "graphql-workers-subscriptions";
import type { Context } from "hono";
import type { HonoCtxEnv, InjectCrossData } from "@/shared/types";

export const injectCrossDataToCtx = (
  ctx: Context<HonoCtxEnv>,
  crossData: Partial<InjectCrossData>,
) => {
  const prevInject = ctx.get("InjectCrossData");
  ctx.set("InjectCrossData", { ...prevInject, ...crossData });
};

export const builderSubscription = subscribe as <
  TArgs = Record<string, any>,
  TPayload extends Record<string, any> = Record<string, any>,
  TContext = any,
  TSource = any,
  TEvent extends {
    topic: string;
    payload: TPayload;
  } = {
    payload: TPayload;
    topic: string;
  },
>(
  ...params: Parameters<
    typeof subscribe<TArgs, TPayload, TContext, TSource, TEvent>
  >
) => (
  ...args: Parameters<
    ReturnType<typeof subscribe<TArgs, TPayload, TContext, TSource, TEvent>>
  >
) => AsyncIterable<TPayload>;

export function wrapSchemaWithContext<C>(
  schema: GraphQLSchemaWithContext<C>,
  getContext: (
    ctx: C,
  ) => Promise<
    DefaultPublishableContext<Cloudflare.Env, ExecutionContext<unknown>>
  >,
) {
  return wrapSchema({
    schema,
    transforms: [
      {
        transformSchema: (schema) =>
          mapSchema(schema, {
            [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
              const originalResolve = fieldConfig.resolve!;

              fieldConfig.resolve = async (root, args, context, info) => {
                const honoCtx = context;
                const publishCtx = await getContext(honoCtx);

                return originalResolve(root, args, publishCtx, info);
              };

              return fieldConfig;
            },
          }),
      },
    ],
  });
}
