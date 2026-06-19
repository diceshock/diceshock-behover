import db, {
  activeRegistrationsTable,
  activesTable,
  drizzle,
  userBusinessCardTable,
  userInfoTable,
} from "@lib/db";
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

  const creators = await d
    .select({
      id: activesTable.id,
      creator_id: activesTable.creator_id,
    })
    .from(activesTable)
    .where(drizzle.inArray(activesTable.id, ids));

  const creatorMap = new Map(creators.map((c) => [c.id, c.creator_id]));

  const regs = await d
    .select({
      active_id: activeRegistrationsTable.active_id,
      user_id: activeRegistrationsTable.user_id,
    })
    .from(activeRegistrationsTable)
    .where(drizzle.inArray(activeRegistrationsTable.active_id, ids));

  const creatorRegSet = new Set(regs.map((r) => `${r.active_id}:${r.user_id}`));

  return actives.filter((a) => {
    const activeId = a.id as string;
    if (!activeId) return true;
    const creatorId = creatorMap.get(activeId);
    if (!creatorId) return false;
    return creatorRegSet.has(`${activeId}:${creatorId}`);
  });
}

export const QUERY_PARTICIPANTS_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "query_active_participants",
    description:
      "查询约局参与者名片。仅约局发起者可调用。返回所有参加/观望人员的昵称和名片信息。",
    parameters: {
      type: "object",
      properties: {
        active_id: {
          type: "string",
          description: "约局ID",
        },
      },
      required: ["active_id"],
    },
  },
};

export async function executeQueryActiveParticipants(
  args: { active_id: string },
  context: ToolContext,
): Promise<string> {
  if (!context.userId) {
    return "查询失败: 未登录用户无法查看参与者名片";
  }

  const d = db(context.env.DB);
  const { eq, and } = drizzle;

  const active = await d
    .select({
      id: activesTable.id,
      creator_id: activesTable.creator_id,
      title: activesTable.title,
    })
    .from(activesTable)
    .where(eq(activesTable.id, args.active_id))
    .limit(1);

  if (active.length === 0) {
    return "查询失败: 约局不存在";
  }

  if (active[0].creator_id !== context.userId) {
    return "查询失败: 只有约局发起者可以查看参与者名片";
  }

  const regs = await d
    .select({
      user_id: activeRegistrationsTable.user_id,
      is_watching: activeRegistrationsTable.is_watching,
    })
    .from(activeRegistrationsTable)
    .where(eq(activeRegistrationsTable.active_id, args.active_id));

  if (regs.length === 0) {
    return JSON.stringify({ title: active[0].title, participants: [] });
  }

  const userIds = regs.map((r) => r.user_id);

  const userInfos = await d
    .select({
      id: userInfoTable.id,
      nickname: userInfoTable.nickname,
      phone: userInfoTable.phone,
    })
    .from(userInfoTable)
    .where(drizzle.inArray(userInfoTable.id, userIds));

  const cards = await d
    .select({
      id: userBusinessCardTable.id,
      share_phone: userBusinessCardTable.share_phone,
      wechat: userBusinessCardTable.wechat,
      qq: userBusinessCardTable.qq,
      custom_content: userBusinessCardTable.custom_content,
    })
    .from(userBusinessCardTable)
    .where(drizzle.inArray(userBusinessCardTable.id, userIds));

  const userInfoMap = new Map(userInfos.map((u) => [u.id, u]));
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  const participants = regs.map((reg) => {
    const info = userInfoMap.get(reg.user_id);
    const card = cardMap.get(reg.user_id);

    const result: Record<string, unknown> = {
      user_id: reg.user_id,
      nickname: info?.nickname ?? null,
      status: reg.is_watching ? "观望" : "参加",
    };

    if (card) {
      if (card.share_phone && info?.phone) {
        result.phone = info.phone;
      }
      if (card.wechat) result.wechat = card.wechat;
      if (card.qq) result.qq = card.qq;
      if (card.custom_content) result.custom_content = card.custom_content;
    }

    return result;
  });

  return JSON.stringify({ title: active[0].title, participants });
}
