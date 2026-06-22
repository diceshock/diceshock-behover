import {
  extendSchema,
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
      resolve: ResolverFn;
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
      throw internalError(
        `Cannot attach resolvers to unknown object type: ${typeName}`,
      );
    }

    const fields = type.getFields();
    for (const [fieldName, resolver] of Object.entries(fieldResolvers)) {
      const field = fields[fieldName];
      if (!field) {
        throw internalError(
          `Cannot attach resolver to unknown field: ${typeName}.${fieldName}`,
        );
      }
      field.resolve = toGraphQLResolver(resolver);
    }
  }
}

function toGraphQLResolver(
  resolver: ResolverConfig,
): GraphQLFieldResolver<unknown, GQLContext, Record<string, unknown>> {
  const resolve = typeof resolver === "function" ? resolver : resolver.resolve;
  return (source, args, context, info) => resolve(source, args, context, info);
}
