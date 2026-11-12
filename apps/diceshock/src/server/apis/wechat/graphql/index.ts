import type dbFactory from "@lib/db";
import { buildSchema } from "drizzle-graphql";
import {
  type ASTVisitor,
  astFromValue,
  type DocumentNode,
  execute,
  getNamedType,
  getOperationAST,
  getVariableValues,
  type GraphQLError,
  GraphQLError as GraphQLExecutionError,
  type GraphQLSchema,
  isInputObjectType,
  Kind,
  parse,
  specifiedRules,
  type ValidationContext,
  TypeInfo,
  validate,
  valueFromASTUntyped,
  visit,
  visitWithTypeInfo,
} from "graphql";
import type { HonoCtxEnv } from "@/shared/types";
import { ALL_RESOLVERS, ALL_TYPEDEFS } from "../../../graphql/resolvers/_all";
import { mergeSchemas } from "../../../graphql/schema";
import {
  type AuthContext,
  hasRole,
  isRowVisible,
  maskRow,
  type Role,
  TABLE_PERMISSIONS,
} from "./permissions";

export interface GraphQLContext {
  db: ReturnType<typeof dbFactory>;
  userId: string | null;
  openId: string;
  auth: AuthContext;
  env: HonoCtxEnv["Bindings"];
  /** For custom resolver compatibility */
  role: Role;
  preferredStoreId: string | null;
}

type BuiltSchema = ReturnType<typeof buildSchema>;
const buildDrizzleSchema = buildSchema as (db: unknown) => BuiltSchema;

const MAX_FIND_MANY_LIMIT = 50;

const schemaCache = new WeakMap<
  HonoCtxEnv["Bindings"]["DB"],
  { schema: GraphQLSchema }
>();

function getSchema(
  db: GraphQLContext["db"],
  d1: HonoCtxEnv["Bindings"]["DB"],
): { schema: GraphQLSchema } {
  const cached = schemaCache.get(d1);
  if (cached) return cached;

  try {
    console.log("[gql:schema] Building drizzle schema...");
    const built = buildDrizzleSchema(db);
    console.log("[gql:schema] Drizzle schema OK, merging SDL...");
    console.log("[gql:schema] SDL length:", ALL_TYPEDEFS.length);
    const merged = mergeSchemas(built.schema, ALL_TYPEDEFS, ALL_RESOLVERS);
    console.log("[gql:schema] Schema ready");
    const result = { schema: merged };
    schemaCache.set(d1, result);
    return result;
  } catch (err) {
    console.error("[gql:schema] Build failed:", err);
    console.error("[gql:schema] SDL preview:", ALL_TYPEDEFS.slice(-300));
    throw err;
  }
}

function rootFieldBaseName(fieldName: string): string {
  return fieldName.endsWith("Single") ? fieldName.slice(0, -6) : fieldName;
}

function permissionRule(
  auth: AuthContext,
): (context: ValidationContext) => ASTVisitor {
  return (context: ValidationContext) => ({
    Field(node) {
      if (node.name.value.startsWith("trpg_")) {
        context.reportError(new GraphQLExecutionError("跑团字段请使用跑团接口", { nodes: node }));
        return;
      }
      const parentType = context.getParentType();
      if (parentType?.name !== "Query" && parentType?.name !== "Mutation")
        return;

      const tableName = rootFieldBaseName(node.name.value);
      const perm = TABLE_PERMISSIONS[tableName];

      if (!perm) return;

      const isMutation = parentType?.name === "Mutation";
      const requiredRole = isMutation ? perm.write : perm.read;

      if (!hasRole(auth.role, requiredRole)) {
        context.reportError(
          new GraphQLExecutionError(
            `权限不足: ${tableName} 需要 ${requiredRole} 角色`,
            { nodes: node },
          ),
        );
      }
    },
    ObjectField(node) {
      if (node.name.value.startsWith("trpg_")) {
        context.reportError(new GraphQLExecutionError("跑团字段请使用跑团接口", { nodes: node }));
      }
    },
  });
}

function containsTrpgInput(value: unknown): boolean {
  return !!value && typeof value === "object" &&
    Object.entries(value).some(([key, child]) => key.startsWith("trpg_") || containsTrpgInput(child));
}

function legacyWhere(where: Record<string, unknown>, column: string): Record<string, unknown> {
  if (Array.isArray(where.OR) && where.OR.length) {
    return { ...where, OR: where.OR.map((condition) => legacyWhere(condition ?? {}, column)) };
  }
  return { ...where, [column]: { isNull: true } };
}

function scopeLegacyActivities(schema: GraphQLSchema, document: DocumentNode, variables?: Record<string, unknown>) {
  const typeInfo = new TypeInfo(schema);
  return visit(document, visitWithTypeInfo(typeInfo, {
    Field(node) {
      const whereArg = typeInfo.getFieldDef()?.args.find((arg) => arg.name === "where");
      if (!whereArg) return;
      const type = getNamedType(whereArg.type);
      if (!isInputObjectType(type)) return;
      const fields = type.getFields();
      const column = fields.trpg_state ? "trpg_state" : fields.trpg_status ? "trpg_status" : null;
      if (!column) return;
      const original = node.arguments?.find((arg) => arg.name.value === "where");
      const where = original ? valueFromASTUntyped(original.value, variables) : {};
      const value = astFromValue(legacyWhere((where ?? {}) as Record<string, unknown>, column), whereArg.type);
      if (!value) throw new GraphQLExecutionError("活动筛选条件不正确");
      const argument = { kind: Kind.ARGUMENT, name: { kind: Kind.NAME, value: "where" }, value } as const;
      return { ...node, arguments: [...(node.arguments ?? []).filter((arg) => arg.name.value !== "where"), argument] };
    },
  }));
}

function getFindManyFields(schema: GraphQLSchema): Set<string> {
  const queryFields = schema.getQueryType()?.getFields() ?? {};
  return new Set(
    Object.entries(queryFields)
      .filter(([, field]) => field.args.some((arg) => arg.name === "limit"))
      .map(([name]) => name),
  );
}

function capLimitArgument(
  document: DocumentNode,
  findManyFields: Set<string>,
): DocumentNode {
  return visit(document, {
    Field(node) {
      if (!findManyFields.has(node.name.value)) return;

      const args = node.arguments ?? [];
      const limitArg = args.find((arg) => arg.name.value === "limit");
      const cappedLimit = {
        kind: "Argument" as const,
        name: { kind: "Name" as const, value: "limit" },
        value: {
          kind: "IntValue" as const,
          value: String(MAX_FIND_MANY_LIMIT),
        },
      };

      if (!limitArg) {
        return { ...node, arguments: [...args, cappedLimit] };
      }

      if (
        limitArg.value.kind === "IntValue" &&
        Number(limitArg.value.value) > MAX_FIND_MANY_LIMIT
      ) {
        return {
          ...node,
          arguments: args.map((arg) =>
            arg.name.value === "limit" ? cappedLimit : arg,
          ),
        };
      }
    },
  });
}

function capLimitVariables(
  document: DocumentNode,
  variables: Record<string, unknown> | undefined,
  findManyFields: Set<string>,
): Record<string, unknown> | undefined {
  if (!variables) return variables;

  const cappedVariables = { ...variables };
  visit(document, {
    Field(node) {
      if (!findManyFields.has(node.name.value)) return;

      const limitArg = node.arguments?.find(
        (arg) => arg.name.value === "limit",
      );
      if (limitArg?.value.kind !== "Variable") return;

      const variableName = limitArg.value.name.value;
      const value = cappedVariables[variableName];
      if (typeof value !== "number" || value > MAX_FIND_MANY_LIMIT) {
        cappedVariables[variableName] = MAX_FIND_MANY_LIMIT;
      }
    },
  });

  return cappedVariables;
}

function capResultArrays(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, MAX_FIND_MANY_LIMIT).map(capResultArrays);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        capResultArrays(nested),
      ]),
    );
  }

  return value;
}

function applyPermissions(data: unknown, auth: AuthContext): unknown {
  if (!data || typeof data !== "object") return data;

  const result: Record<string, unknown> = {};
  for (const [tableField, value] of Object.entries(
    data as Record<string, unknown>,
  )) {
    const tableName = rootFieldBaseName(tableField);

    if (Array.isArray(value)) {
      result[tableField] = value
        .filter((row) =>
          isRowVisible(tableName, row as Record<string, unknown>, auth),
        )
        .map((row) => maskRow(tableName, row as Record<string, unknown>, auth));
    } else if (value && typeof value === "object") {
      if (isRowVisible(tableName, value as Record<string, unknown>, auth)) {
        result[tableField] = maskRow(
          tableName,
          value as Record<string, unknown>,
          auth,
        );
      } else {
        result[tableField] = null;
      }
    } else {
      result[tableField] = value;
    }
  }
  return result;
}

function formatErrors(errors: readonly GraphQLError[]): string[] {
  return errors.map((error) => `GraphQL 执行错误: ${error.message}`);
}

export async function executeGraphQL(
  source: string,
  variables: Record<string, unknown> | undefined,
  context: GraphQLContext,
): Promise<{ data?: unknown; errors?: string[] }> {
  const { schema } = getSchema(context.db, context.env.DB);

  let document: DocumentNode;
  try {
    document = parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { errors: [`GraphQL 语法错误: ${message}`] };
  }

  const validationErrors = validate(schema, document, [
    ...specifiedRules,
    permissionRule(context.auth),
  ]);
  if (validationErrors.length > 0) {
    return { errors: formatErrors(validationErrors) };
  }
  if (containsTrpgInput(variables)) return { errors: ["跑团字段请使用跑团接口"] };

  const findManyFields = getFindManyFields(schema);
  const cappedDocument = capLimitArgument(document, findManyFields);
  const cappedVariables = capLimitVariables(
    document,
    variables,
    findManyFields,
  );
  const operation = getOperationAST(cappedDocument);
  const resolved = operation
    ? getVariableValues(schema, operation.variableDefinitions ?? [], cappedVariables ?? {})
    : null;
  if (resolved?.errors) return { errors: formatErrors(resolved.errors) };
  let scopedDocument: DocumentNode;
  try {
    scopedDocument = scopeLegacyActivities(schema, cappedDocument, resolved?.coerced ?? cappedVariables);
  } catch (error) {
    if (error instanceof GraphQLExecutionError) return { errors: formatErrors([error]) };
    throw error;
  }
  const result = await execute({
    schema,
    document: scopedDocument,
    contextValue: context,
    variableValues: cappedVariables,
  });

  if (result.errors?.length) {
    return {
      data: applyPermissions(capResultArrays(result.data), context.auth),
      errors: formatErrors(result.errors),
    };
  }

  return { data: applyPermissions(capResultArrays(result.data), context.auth) };
}
