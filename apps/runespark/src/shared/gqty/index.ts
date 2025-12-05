/**
 * GQty: You can safely modify this file based on your needs.
 */

import { createReactClient } from "@gqty/react";
import {
  Cache,
  createClient,
  defaultResponseHandler,
  type QueryFetcher,
} from "gqty";
import { createClient as createSubscriptionsClient } from "graphql-ws";
import {
  type GeneratedSchema,
  generatedSchema,
  scalarsEnumsHash,
} from "./schema.generated";

const queryFetcher: QueryFetcher = async (
  { query, variables, operationName },
  fetchOptions,
) => {
  const response = await fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
      operationName,
    }),
    mode: "cors",
    ...fetchOptions,
  });

  return await defaultResponseHandler(response);
};

const subscriptionsClient =
  typeof window !== "undefined"
    ? createSubscriptionsClient({
        lazy: true,
        url: () => {
          // Modify if needed
          const url = new URL("/graphql", window.location.href);
          url.protocol = url.protocol.replace("http", "ws");
          return url.href;
        },
      })
    : undefined;

const cache = new Cache(
  undefined,
  /**
   * Cache is valid for 30 minutes, but starts revalidating after 5 seconds,
   * allowing soft refetches in background.
   */
  {
    maxAge: 5000,
    staleWhileRevalidate: 30 * 60 * 1000,
    normalization: true,
  },
);

export const client = createClient<GeneratedSchema>({
  schema: generatedSchema,
  scalars: scalarsEnumsHash,
  cache,
  fetchOptions: {
    // @ts-expect-error - gqty types are not compatible with cloudflare workers
    fetcher: queryFetcher,
    subscriber: subscriptionsClient,
  },
});

// Core functions
// 使用类型断言来解决 TypeScript 推断问题
const {
  resolve: resolveFn,
  subscribe: subscribeFn,
  schema: schemaObj,
} = client;
export const resolve: typeof client.resolve = resolveFn;
export const subscribe: typeof client.subscribe = subscribeFn;
export const schema = schemaObj;

export const {
  graphql,
  useQuery,
  usePaginatedQuery,
  useTransactionQuery,
  useLazyQuery,
  useRefetch,
  useMutation,
  useMetaState,
  prepareReactRender,
  useHydrateCache,
  prepareQuery,
  useSubscription,
} = createReactClient<GeneratedSchema>(client, {
  defaults: {
    // Enable Suspense, you can override this option for each hook.
    suspense: true,
  },
});

export * from "./schema.generated";
