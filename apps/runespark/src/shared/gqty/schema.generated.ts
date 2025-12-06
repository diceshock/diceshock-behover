/**
 * GQty AUTO-GENERATED CODE: PLEASE DO NOT MODIFY MANUALLY
 */

import { type ScalarsEnumsHash } from "gqty";

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
}

export const scalarsEnumsHash: ScalarsEnumsHash = {
  Boolean: true,
  Int: true,
  String: true,
};
export const generatedSchema = {
  mutation: {
    __typename: { __type: "String!" },
    intToJson: { __type: "String!", __args: { data: "Int!" } },
    sendMessage: { __type: "Boolean!", __args: { text: "String!" } },
  },
  query: {
    __typename: { __type: "String!" },
    hello: { __type: "String!" },
    methods: { __type: "[String!]!" },
  },
  subscription: {
    __typename: { __type: "String!" },
    message: { __type: "String!", __args: { text: "String" } },
  },
} as const;

export interface Mutation {
  __typename?: "Mutation";
  intToJson: (args: {
    data: Scalars["Int"]["input"];
  }) => Scalars["String"]["output"];
  sendMessage: (args: {
    text: Scalars["String"]["input"];
  }) => Scalars["Boolean"]["output"];
}

export interface Query {
  __typename?: "Query";
  hello?: Scalars["String"]["output"];
  methods?: Array<Scalars["String"]["output"]>;
}

export interface Subscription {
  __typename?: "Subscription";
  message: (args?: {
    text?: Maybe<Scalars["String"]["input"]>;
  }) => Scalars["String"]["output"];
}

export interface GeneratedSchema {
  query: Query;
  mutation: Mutation;
  subscription: Subscription;
}
