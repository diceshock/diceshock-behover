import db from "@lib/db";
import { executeGraphQL, type GraphQLContext } from "../graphql/index";
import { validateQueryString } from "../graphql/queryValidation";

// ─── Shared Types ──────────────────────────────────────────────────

export interface ToolContext {
  env: {
    DB: D1Database;
    KV: KVNamespace;
  };
  openId: string;
  userId: string | null;
}

// ─── Executor ──────────────────────────────────────────────────────

export async function executeQueryTool(
  args: { graphql: string; variables?: Record<string, unknown> },
  context: ToolContext,
): Promise<string> {
  // 1. Validate the query string
  const validation = validateQueryString(args.graphql);
  if (!validation.valid) {
    return validation.error!;
  }

  // 2. Build GraphQL context from ToolContext
  const gqlContext: GraphQLContext = {
    db: db(context.env.DB),
    userId: context.userId,
    openId: context.openId,
  };

  // 3. Execute the query
  const result = await executeGraphQL(args.graphql, args.variables, gqlContext);

  // 4. Handle errors
  if (result.errors && result.errors.length > 0) {
    return `查询错误: ${result.errors.join("; ")}`;
  }

  // 5. Handle empty result
  if (result.data === undefined || result.data === null) {
    return "查询无返回数据";
  }

  // 6. Stringify and truncate
  const json = JSON.stringify(result.data);
  if (json.length > 4000) {
    const data = result.data as Record<string, unknown>;
    const firstKey = Object.keys(data)[0];
    const value = data[firstKey];
    const count = Array.isArray(value) ? value.length : "?";
    return `${json.slice(0, 4000)}\n[结果已截断, 共${count}条记录]`;
  }

  return json;
}
