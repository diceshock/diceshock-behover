import db, {
  activeRegistrationsTable,
  activesTable,
  drizzle,
  userBusinessCardTable,
  userInfoTable,
} from "@lib/db";
import { jsonSchema, type ToolSet } from "ai";
import { parse } from "graphql";
import {
  ACTIVE_SEARCH_GRAMMAR,
  EVENT_SEARCH_GRAMMAR,
  GSZ_SEARCH_GRAMMAR,
  ORDER_SEARCH_GRAMMAR,
  parseSearch,
  type SearchGrammar,
  serialize,
  TABLE_SEARCH_GRAMMAR,
  USER_SEARCH_GRAMMAR,
} from "@/client/lib/searchParser";
import { generateTOTP, getRemainingSeconds } from "@/shared/utils/totp";
import { executeGraphQL, type GraphQLContext } from "../wechat/graphql";
import { normalizeQuery } from "../wechat/graphql/normalize";
import { resolveSourceUrl } from "@/server/utils/rulesSourceUrl";
import type { Role } from "../wechat/graphql/permissions";
import { validateQueryString } from "../wechat/graphql/queryValidation";

const MUTATION_TTL_MS = 5 * 60 * 1000;
const MINIMUM_REMAINING_SECONDS = 10;
const TOTP_PERIOD = 30;

export type ChatToolIdentity = {
  userId: string;
  role: Extract<Role, "admin" | "staff">;
  preferredStoreId: string | null;
};

export type ChatToolContext = {
  env: {
    DB: D1Database;
    KV: KVNamespace;
    AI_SEARCH?: {
      search: (args: {
        query: string;
        max_num_results: number;
      }) => Promise<unknown>;
    };
  };
  identity: ChatToolIdentity;
};

export type PendingMutation = {
  mutationId: string;
  userId: string;
  role: Extract<Role, "admin" | "staff">;
  preferredStoreId: string | null;
  query: string;
  variables?: Record<string, unknown>;
  description: string;
  createdAt: number;
  expiresAt: number;
};

type ToolFactory = (context: ChatToolContext) => ToolSet;

const pendingMutations = new Map<string, PendingMutation>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function variablesOrUndefined(
  value: unknown,
): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function createGraphQLContext(context: ChatToolContext): GraphQLContext {
  const role = context.identity.role;
  return {
    db: db(context.env.DB),
    userId: context.identity.userId,
    openId: "",
    auth: { role, userId: context.identity.userId },
    env: context.env as GraphQLContext["env"],
    role,
    preferredStoreId: context.identity.preferredStoreId,
  };
}

function assertOperation(
  source: string,
  expected: "query" | "mutation",
): { ok: true } | { ok: false; error: string } {
  try {
    const document = parse(source);
    for (const definition of document.definitions) {
      if (definition.kind !== "OperationDefinition") continue;
      if (definition.operation !== expected) {
        return {
          ok: false,
          error:
            expected === "query"
              ? "query_gql 只允许执行只读查询"
              : "mutate_gql 只接受 GraphQL mutation",
        };
      }
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `GraphQL 语法错误: ${message}` };
  }
}

export function isBlockedIdentityMutation(source: string): boolean {
  try {
    const document = parse(source);
    for (const definition of document.definitions) {
      if (
        definition.kind !== "OperationDefinition" ||
        definition.operation !== "mutation"
      ) {
        continue;
      }

      for (const selection of definition.selectionSet.selections) {
        if (selection.kind !== "Field") continue;
        const fieldName = selection.name.value;
        if (
          /updateUserRole|userRole|\busers?\b|accounts|sessions|verificationTokens|authenticators/i.test(
            fieldName,
          )
        ) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function resetPendingMutations() {
  pendingMutations.clear();
}

export function prunePendingMutations(now = Date.now()) {
  for (const [mutationId, pending] of pendingMutations.entries()) {
    if (pending.expiresAt <= now) pendingMutations.delete(mutationId);
  }
}

export function getPendingMutation(
  mutationId: string,
  now = Date.now(),
): PendingMutation | null {
  prunePendingMutations(now);
  return pendingMutations.get(mutationId) ?? null;
}

export async function executeConfirmedMutation(params: {
  mutationId: string;
  context: ChatToolContext;
  now?: number;
}): Promise<{ status: number; body: unknown }> {
  const pending = getPendingMutation(
    params.mutationId,
    params.now ?? Date.now(),
  );
  if (!pending) {
    return {
      status: 404,
      body: { error: "Mutation preview not found or expired" },
    };
  }

  if (pending.userId !== params.context.identity.userId) {
    return {
      status: 403,
      body: { error: "Mutation preview belongs to another user" },
    };
  }

  const gqlContext = createGraphQLContext(params.context);
  const result = await executeGraphQL(
    pending.query,
    pending.variables,
    gqlContext,
  );
  pendingMutations.delete(params.mutationId);
  if (result.errors?.length) {
    return { status: 400, body: result };
  }
  return { status: 200, body: result };
}

export async function executeQueryGql(
  args: { query: string; variables?: Record<string, unknown> },
  context: ChatToolContext,
): Promise<unknown> {
  const operation = assertOperation(args.query, "query");
  if (!operation.ok) return { errors: [operation.error] };

  const norm = normalizeQuery(args.query, args.variables);
  if (norm.errors.length > 0) return { errors: norm.errors };

  const validation = validateQueryString(norm.source);
  if (!validation.valid) return { errors: [validation.error] };

  return await executeGraphQL(
    norm.source,
    variablesOrUndefined(args.variables),
    createGraphQLContext(context),
  );
}

export async function executeMutateGqlPreview(
  args: {
    query: string;
    variables?: Record<string, unknown>;
    description?: string;
  },
  context: ChatToolContext,
  now = Date.now(),
): Promise<{
  mutationId: string;
  query: string;
  variables: object;
  description: string;
}> {
  const operation = assertOperation(args.query, "mutation");
  if (!operation.ok) throw new Error(operation.error);
  if (isBlockedIdentityMutation(args.query)) {
    throw new Error(
      "Identity management mutations are not allowed from chat tools",
    );
  }

  prunePendingMutations(now);
  const mutationId = crypto.randomUUID();
  const variables = variablesOrUndefined(args.variables) ?? {};
  const description = args.description?.trim() || "待确认的后台数据修改";

  pendingMutations.set(mutationId, {
    mutationId,
    userId: context.identity.userId,
    role: context.identity.role,
    preferredStoreId: context.identity.preferredStoreId,
    query: args.query,
    variables,
    description,
    createdAt: now,
    expiresAt: now + MUTATION_TTL_MS,
  });

  return { mutationId, query: args.query, variables, description };
}

function buildOtpAuthUri(secret: string, label: string): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedIssuer = encodeURIComponent("Diceshock");
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=${TOTP_PERIOD}`;
}

function generateQrCodeUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

export async function executeGenerateTotp(
  _args: Record<string, never>,
  context: ChatToolContext,
): Promise<unknown> {
  const secret = await context.env.KV.get(
    `totp_secret:${context.identity.userId}`,
  );
  if (!secret) {
    return { error: "TOTP 验证码生成失败，请先在个人中心绑定验证器" };
  }

  const remaining = getRemainingSeconds(TOTP_PERIOD);
  const useNextWindow = remaining < MINIMUM_REMAINING_SECONDS;
  const code = useNextWindow
    ? await generateTOTP(
        secret,
        TOTP_PERIOD,
        6,
        Date.now() + (remaining + 1) * 1000,
      )
    : await generateTOTP(secret);
  const remaining_seconds = useNextWindow ? remaining + TOTP_PERIOD : remaining;
  const otpauthUri = buildOtpAuthUri(secret, `UID:${context.identity.userId}`);

  return {
    type: "totp",
    qrcode_url: generateQrCodeUrl(otpauthUri),
    code,
    remaining_seconds,
  };
}

export async function executeSearchRules(
  args: { query: string },
  context: ChatToolContext,
): Promise<unknown> {
  const aiSearch = context.env.AI_SEARCH;
  if (!aiSearch) return { error: "规则搜索服务未配置" };

  const results = (await aiSearch.search({
    query: args.query,
    max_num_results: 5,
  })) as {
    chunks?: Array<{ text?: string; item?: { key?: string }; score?: number }>;
    data?: Array<{
      text?: string;
      content?: string;
      filename?: string;
      item?: { key?: string };
      score?: number;
    }>;
  };

  const chunks: Array<{
    text: string;
    source: string;
    originalUrl: string | null;
    score: number;
  }> = [];
  for (const chunk of results?.chunks ?? []) {
    const source = chunk.item?.key ?? "";
    chunks.push({
      text: (chunk.text ?? "").slice(0, 800),
      source,
      originalUrl: resolveSourceUrl(source),
      score: chunk.score ?? 0,
    });
  }
  for (const item of results?.data ?? []) {
    const source = item.filename ?? item.item?.key ?? "";
    chunks.push({
      text: (item.text ?? item.content ?? "").slice(0, 800),
      source,
      originalUrl: resolveSourceUrl(source),
      score: item.score ?? 0,
    });
  }

  return chunks.length > 0
    ? { results: chunks }
    : { results: [], message: "未找到相关规则" };
}

export async function executeQueryActiveParticipants(
  args: { active_id: string },
  context: ChatToolContext,
): Promise<unknown> {
  const database = db(context.env.DB);
  const { eq } = drizzle;

  const active = await database
    .select({
      id: activesTable.id,
      creator_id: activesTable.creator_id,
      title: activesTable.title,
    })
    .from(activesTable)
    .where(eq(activesTable.id, args.active_id))
    .limit(1);

  if (active.length === 0) return { error: "查询失败: 约局不存在" };
  if (active[0].creator_id !== context.identity.userId) {
    return { error: "查询失败: 只有约局发起者可以查看参与者名片" };
  }

  const regs = await database
    .select({
      user_id: activeRegistrationsTable.user_id,
      is_watching: activeRegistrationsTable.is_watching,
    })
    .from(activeRegistrationsTable)
    .where(eq(activeRegistrationsTable.active_id, args.active_id));

  if (regs.length === 0) {
    return { title: active[0].title, participants: [] };
  }

  const userIds = regs.map((registration) => registration.user_id);
  const userInfos = await database
    .select({
      id: userInfoTable.id,
      nickname: userInfoTable.nickname,
      phone: userInfoTable.phone,
    })
    .from(userInfoTable)
    .where(drizzle.inArray(userInfoTable.id, userIds));
  const cards = await database
    .select({
      id: userBusinessCardTable.id,
      share_phone: userBusinessCardTable.share_phone,
      wechat: userBusinessCardTable.wechat,
      qq: userBusinessCardTable.qq,
      custom_content: userBusinessCardTable.custom_content,
    })
    .from(userBusinessCardTable)
    .where(drizzle.inArray(userBusinessCardTable.id, userIds));

  const userInfoMap = new Map(
    userInfos.map((userInfo) => [userInfo.id, userInfo]),
  );
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const participants = regs.map((registration) => {
    const info = userInfoMap.get(registration.user_id);
    const card = cardMap.get(registration.user_id);
    const participant: Record<string, unknown> = {
      user_id: registration.user_id,
      nickname: info?.nickname ?? null,
      status: registration.is_watching ? "观望" : "参加",
    };
    if (card?.share_phone && info?.phone) participant.phone = info.phone;
    if (card?.wechat) participant.wechat = card.wechat;
    if (card?.qq) participant.qq = card.qq;
    if (card?.custom_content) participant.custom_content = card.custom_content;
    return participant;
  });

  return { title: active[0].title, participants };
}

const SEARCH_GRAMMARS: Record<string, SearchGrammar> = {
  order: ORDER_SEARCH_GRAMMAR,
  orders: ORDER_SEARCH_GRAMMAR,
  user: USER_SEARCH_GRAMMAR,
  users: USER_SEARCH_GRAMMAR,
  table: TABLE_SEARCH_GRAMMAR,
  tables: TABLE_SEARCH_GRAMMAR,
  active: ACTIVE_SEARCH_GRAMMAR,
  actives: ACTIVE_SEARCH_GRAMMAR,
  event: EVENT_SEARCH_GRAMMAR,
  events: EVENT_SEARCH_GRAMMAR,
  gsz: GSZ_SEARCH_GRAMMAR,
  mahjong: GSZ_SEARCH_GRAMMAR,
};

function pickGrammar(entityType: string): SearchGrammar {
  return SEARCH_GRAMMARS[entityType.toLowerCase()] ?? ORDER_SEARCH_GRAMMAR;
}

function inferSearchSyntax(
  description: string,
  grammar: SearchGrammar,
): string {
  const parts: string[] = [];
  const text = description.toLowerCase();

  for (const [key, field] of Object.entries(grammar)) {
    if (field.values) {
      const matched = field.values.find(
        (value) =>
          text.includes(value.toLowerCase()) || description.includes(value),
      );
      if (matched) parts.push(`${key}:${matched}`);
    }
  }

  const dateRange = description.match(
    /(\d{4}-\d{2}-\d{2})\s*(?:到|至|\.\.|-)\s*(\d{4}-\d{2}-\d{2})/,
  );
  if (dateRange && grammar.date)
    parts.push(`date:${dateRange[1]}..${dateRange[2]}`);
  else {
    const date = description.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (date && grammar.date) parts.push(`date:${date}`);
  }

  const store = description.match(
    /(?:store|门店|店铺)[:：\s]+([\w\u4e00-\u9fa5-]+)/i,
  )?.[1];
  if (store && grammar.store) parts.push(`store:${store}`);

  return parts.length > 0 ? parts.join(" ") : description.trim();
}

export function executeFormatSearchQuery(args: {
  entityType: string;
  description: string;
}): string {
  const grammar = pickGrammar(args.entityType);
  const parsed = parseSearch(args.description, grammar);
  if (Object.keys(parsed.filters).length > 0 && parsed.errors.length === 0) {
    return serialize(parsed, grammar);
  }
  return inferSearchSyntax(args.description, grammar);
}

export const createChatTools: ToolFactory = (context) => ({
  generate_totp: {
    description:
      "Generate a TOTP check-in code for the authenticated dashboard user.",
    parameters: jsonSchema({ type: "object", properties: {}, required: [] }),
    execute: async () => executeGenerateTotp({}, context),
  },
  search_rules: {
    description:
      "Search TRPG/DND5E and Mahjong rules through Cloudflare AI Search.",
    parameters: jsonSchema({
      type: "object",
      properties: {
        query: { type: "string", description: "Rules search query." },
      },
      required: ["query"],
    }),
    execute: async ({ query }: { query: string }) =>
      executeSearchRules({ query: String(query) }, context),
  },
  query_active_participants: {
    description:
      "Query active participant business cards. Only the active creator can view them.",
    parameters: jsonSchema({
      type: "object",
      properties: {
        active_id: { type: "string", description: "Active ID." },
      },
      required: ["active_id"],
    }),
    execute: async ({ active_id }: { active_id: string }) =>
      executeQueryActiveParticipants({ active_id: String(active_id) }, context),
  },
  format_search_query: {
    description:
      "Convert a natural-language dashboard filter description into valid search syntax.",
    parameters: jsonSchema({
      type: "object",
      properties: {
        entityType: {
          type: "string",
          description:
            "Entity type: orders, users, tables, actives, events, mahjong.",
        },
        description: {
          type: "string",
          description:
            "Natural-language filter description or existing syntax.",
        },
      },
      required: ["entityType", "description"],
    }),
    execute: async ({
      entityType,
      description,
    }: {
      entityType: string;
      description: string;
    }) =>
      executeFormatSearchQuery({
        entityType: String(entityType),
        description: String(description),
      }),
  },
});

export const tools = createChatTools;
