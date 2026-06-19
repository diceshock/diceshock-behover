import { type DocumentNode, parse } from "graphql";

export function validateQueryString(source: string): {
  valid: boolean;
  error?: string;
} {
  let document: DocumentNode;
  try {
    document = parse(source);
  } catch (parseError: unknown) {
    const message =
      parseError instanceof Error ? parseError.message : String(parseError);
    return { valid: false, error: `GraphQL 语法错误: ${message}` };
  }

  for (const definition of document.definitions) {
    if (definition.kind !== "OperationDefinition") continue;

    if (definition.operation === "mutation") {
      return { valid: false, error: "请使用 mutate 工具执行修改操作" };
    }

    if (definition.operation === "subscription") {
      return { valid: false, error: "不支持 subscription 操作" };
    }
  }

  return { valid: true };
}

export const QUERY_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "query",
    description:
      "执行 GraphQL 查询。支持 introspection (__schema, __type) 进行 schema 发现。使用 variables 传递动态值。",
    parameters: {
      type: "object",
      properties: {
        graphql: { type: "string", description: "GraphQL 查询字符串" },
        variables: { type: "object", description: "查询变量（可选）" },
      },
      required: ["graphql"],
    },
  },
};
