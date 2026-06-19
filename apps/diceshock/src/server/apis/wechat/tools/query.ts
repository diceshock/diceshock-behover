import db, { activeRegistrationsTable, drizzle } from "@lib/db";
import { executeGraphQL, type GraphQLContext } from "../graphql/index";
import { normalizeQuery } from "../graphql/normalize";
import { validateQueryString } from "../graphql/queryValidation";

export interface ToolContext {
  env: {
    DB: D1Database;
    KV: KVNamespace;
  };
  openId: string;
  userId: string | null;
}

export async function executeQueryTool(
  args: { graphql: string; variables?: Record<string, unknown> },
  context: ToolContext,
): Promise<string> {
  const norm = normalizeQuery(args.graphql, args.variables);

  if (norm.errors.length > 0) {
    const errMsg = norm.errors.join("\n");
    const corrections =
      norm.corrections.length > 0
        ? `\n已尝试修正: ${norm.corrections.join(", ")}`
        : "";
    return `查询错误:\n${errMsg}${corrections}`;
  }

  if (norm.corrections.length > 0) {
    console.log("[query] normalized", { corrections: norm.corrections });
  }

  const validation = validateQueryString(norm.source);
  if (!validation.valid) {
    return validation.error!;
  }

  const gqlContext: GraphQLContext = {
    db: db(context.env.DB),
    userId: context.userId,
    openId: context.openId,
  };

  const result = await executeGraphQL(norm.source, args.variables, gqlContext);

  if (result.errors && result.errors.length > 0) {
    return `查询错误: ${result.errors.join("; ")}`;
  }

  if (result.data === undefined || result.data === null) {
    return "查询无返回数据";
  }

  let data = result.data as Record<string, unknown>;

  if (data.activesTable && Array.isArray(data.activesTable)) {
    data = {
      ...data,
      activesTable: await filterOrphanedActives(
        context.env.DB,
        data.activesTable as Array<Record<string, unknown>>,
      ),
    };
  }

  const firstKey = Object.keys(data)[0];
  const value = data[firstKey];

  let meta = "";
  if (Array.isArray(value)) {
    meta = `\n[_meta: 本次返回${value.length}条]`;
  }

  const json = JSON.stringify(data);
  if (json.length > 4000) {
    const count = Array.isArray(value) ? value.length : "?";
    return `${json.slice(0, 4000)}\n[结果已截断, 共${count}条记录]`;
  }

  return json + meta;
}

async function filterOrphanedActives(
  d1: D1Database,
  actives: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  if (actives.length === 0) return actives;

  const ids = actives.map((a) => a.id as string).filter(Boolean);

  if (ids.length === 0) return actives;

  const d = db(d1);
  const regs = await d
    .select({
      active_id: activeRegistrationsTable.active_id,
      user_id: activeRegistrationsTable.user_id,
    })
    .from(activeRegistrationsTable)
    .where(drizzle.inArray(activeRegistrationsTable.active_id, ids));

  const creatorRegSet = new Set(regs.map((r) => `${r.active_id}:${r.user_id}`));

  return actives.filter((a) => {
    const creatorId = a.creator_id as string;
    const activeId = a.id as string;
    if (!creatorId || !activeId) return true;
    return creatorRegSet.has(`${activeId}:${creatorId}`);
  });
}
