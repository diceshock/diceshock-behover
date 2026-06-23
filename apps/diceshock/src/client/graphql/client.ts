import {
  ApolloClient,
  ApolloLink,
  type FetchResult,
  from,
  HttpLink,
  InMemoryCache,
  Observable,
  type Operation,
  split,
} from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { print } from "graphql";
import { getDefaultStore } from "jotai";
import { phoneBindingPromptAtom } from "@/client/atoms/phoneBindingPrompt";

class SSELink extends ApolloLink {
  request(operation: Operation): Observable<FetchResult> | null {
    return new Observable<FetchResult>((observer) => {
      const query = print(operation.query);
      const variables = JSON.stringify(operation.variables ?? {});
      const url = `/graphql/stream?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(variables)}`;

      const es = new EventSource(url);

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          observer.next({
            data: { [operation.operationName || "subscription"]: parsed },
          });
        } catch {
          observer.error(new Error("SSE: failed to parse event data"));
        }
      };

      es.onerror = () => {
        observer.error(new Error("SSE connection failed"));
        es.close();
      };

      return () => es.close();
    });
  }
}

const errorLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((response) => {
    if (response.errors) {
      for (const err of response.errors) {
        const networkErr = err.extensions?.code === "UNAUTHENTICATED";
        if (
          networkErr ||
          (err.extensions as Record<string, unknown> | undefined)
            ?.statusCode === 401
        ) {
          if (typeof window !== "undefined") {
            window.location.href = "/api/auth/signin";
          }
        }

        if (err.extensions?.code === "PHONE_REQUIRED") {
          const store = getDefaultStore();
          store.set(phoneBindingPromptAtom, { open: true });
        }
      }
    }
    return response;
  });
});

const httpLink = new HttpLink({
  uri: "/graphql",
  credentials: "same-origin",
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  new SSELink(),
  httpLink,
);

const cache = new InMemoryCache({
  typePolicies: {
    boardGamesTable: { keyFields: ["id"] },
    activesTable: { keyFields: ["id"] },
    userInfoTable: { keyFields: ["id"] },
  },
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, splitLink]),
  cache,
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
    query: { fetchPolicy: "cache-first" },
  },
});

export { SSELink };
