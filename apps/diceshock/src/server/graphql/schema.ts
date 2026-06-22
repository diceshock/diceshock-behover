import {
  extendSchema,
  type GraphQLField,
  type GraphQLFieldResolver,
  GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  parse,
} from "graphql";
import type { GQLContext } from "./context";
import { internalError } from "./errors";

export type ResolverFn<
  TResult = unknown,
  TSource = unknown,
  TArgs extends Record<string, unknown> = Record<string, unknown>,
> = (
  source: TSource,
  args: TArgs,
  context: GQLContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export type ResolverConfig =
  | ResolverFn
  | {
      resolve?: ResolverFn;
      subscribe?: ResolverFn;
    };

export type ResolverMap = Record<string, Record<string, ResolverConfig>>;

export function mergeSchemas(
  autoSchema: GraphQLSchema,
  typeDefs: string,
  resolvers: ResolverMap,
): GraphQLSchema {
  const schema = typeDefs.trim()
    ? extendSchema(autoSchema, parse(typeDefs))
    : autoSchema;

  attachResolvers(schema, resolvers);
  return schema;
}

function attachResolvers(schema: GraphQLSchema, resolvers: ResolverMap): void {
  const typeMap = schema.getTypeMap();

  for (const [typeName, fieldResolvers] of Object.entries(resolvers)) {
    const type = typeMap[typeName];
    if (!(type instanceof GraphQLObjectType)) {
      console.warn(
        `[gql:schema] Skipping resolvers for unknown type: ${typeName}`,
      );
      continue;
    }

    const fields = type.getFields();
    for (const [fieldName, resolver] of Object.entries(fieldResolvers)) {
      const field = fields[fieldName];
      if (!field) {
        console.warn(
          `[gql:schema] Skipping resolver for unknown field: ${typeName}.${fieldName}`,
        );
        continue;
      }
      attachResolver(field, resolver);
    }
  }
}

function attachResolver(
  field: GraphQLField<unknown, GQLContext>,
  resolver: ResolverConfig,
): void {
  if (typeof resolver === "function") {
    field.resolve = toGraphQLResolver(resolver);
    return;
  }

  if (resolver.resolve) {
    field.resolve = toGraphQLResolver(resolver.resolve);
  }

  if (resolver.subscribe) {
    field.subscribe = toGraphQLResolver(resolver.subscribe);
  }
}

function toGraphQLResolver(
  resolver: ResolverFn,
): GraphQLFieldResolver<unknown, GQLContext, Record<string, unknown>> {
  return (source, args, context, info) => resolver(source, args, context, info);
}
