import { ApolloProvider } from "@apollo/client";
import type { ReactNode } from "react";
import { apolloClient } from "./client";

interface GraphQLProviderProps {
  children: ReactNode;
}

export function GraphQLProvider({ children }: GraphQLProviderProps) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
