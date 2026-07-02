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
      '读数据库。graphql 参数格式: { 表名(where: {字段: {操作符: 值}}, limit: N) { 返回字段 } }。操作符: eq/ne/gte/lte/ilike/inArray/isNull。ilike用%通配: ilike "%词%"=包含。不要用 _eq/_contains/filter/variables 语法。',
    parameters: {
      type: "object",
      properties: {
        graphql: {
          type: "string",
          description:
            'GraphQL查询。示例: { boardGamesTable(where: {sch_name: {ilike: "%卡坦%"}}, limit: 10) { id sch_name gstone_rating } }',
        },
        message: {
          type: "string",
          description: "给用户看的进度说明，如：正在帮你查卡坦岛的信息...",
        },
      },
      required: ["graphql"],
    },
  },
};
