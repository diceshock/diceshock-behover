import dbFactory, { drizzle, userPreferencesTable } from "@lib/db";
import { z } from "zod/v4";
import { PREFERENCE_CATEGORIES } from "@/shared/preferences/constants";
import { rruleToHumanReadable } from "@/shared/preferences/rruleDisplay";
import type { PreferenceCategory } from "@/shared/preferences/types";
import type { GQLContext } from "../context";
import { notFound, validationError } from "../errors";
import { requireAuth } from "../guards";
import { zodToGraphQLError } from "../validate";

// ─── TypeDefs ───────────────────────────────────────────────────────

export const preferencesTypeDefs = `
  type UserPreference {
    id: ID!
    userId: ID!
    rawText: String!
    rrule: String!
    categories: [String!]!
    playerCount: Int
    enabled: Boolean!
    createdAt: String
    updatedAt: String
  }

  union PreferenceParseResult = PreferenceParseSuccess | PreferenceParseError

  type PreferenceParseSuccess {
    success: Boolean!
    rrule: String!
    categories: [String!]!
    playerCount: Int
    confidence: Float!
  }

  type PreferenceParseError {
    success: Boolean!
    error: String!
  }

  type DeletePreferenceResult {
    success: Boolean!
  }

  input CreatePreferenceInput {
    rawText: String!
    rrule: String!
    categories: [String!]!
    playerCount: Int
  }

  extend type Query {
    myPreferences: [UserPreference!]!
    myPreferencesCount: Int!
  }

  extend type Mutation {
    parsePreference(rawText: String!): PreferenceParseResult!
    createPreference(input: CreatePreferenceInput!): UserPreference!
    deletePreference(id: ID!): DeletePreferenceResult!
    togglePreference(id: ID!): UserPreference!
  }
`;

// ─── Helpers ────────────────────────────────────────────────────────

function toIso(value: Date | number | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function toGqlPref(row: typeof userPreferencesTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.user_id,
    rawText: row.raw_text,
    rrule: row.rrule,
    categories: row.categories ?? [],
    playerCount: row.player_count,
    enabled: row.enabled,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

// ─── DeepSeek Parsing ───────────────────────────────────────────────

const PARSE_SYSTEM_PROMPT = `你是一个偏好解析助手。用户会描述他们的约局偏好（什么时间想玩什么）。
你的任务是将自然语言描述解析为结构化 JSON。

输出格式:
{
  "rrule": "FREQ=WEEKLY;BYDAY=XX;DTSTART=THH:mm;DTEND=THH:mm",
  "categories": ["mahjong" | "boardgame" | "trpg"],
  "playerCount": number | null,
  "confidence": 0.0-1.0
}

规则:
- FREQ 只支持 WEEKLY
- BYDAY: MO,TU,WE,TH,FR,SA,SU (可多个逗号分隔)
- DTSTART/DTEND 表示时间窗口 (营业时间 13:00-22:00 范围内)
- categories: "mahjong"(日麻/麻将), "boardgame"(桌游/卡牌/聚会游戏), "trpg"(跑团/DND/COC/龙与地下城)
- 如果用户没明确说时间,默认晚上 19:00-22:00
- 如果用户说"工作日",BYDAY=MO,TU,WE,TH,FR
- 如果用户说"周末",BYDAY=SA,SU
- playerCount 只在用户明确提到人数时填写
- confidence: 你对解析正确性的置信度

只输出 JSON,不要其他文字。`;

function validateRrule(rrule: string): boolean {
  if (!rrule.includes("FREQ=WEEKLY")) return false;
  const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
  if (!byDayMatch) return false;
  const days = byDayMatch[1].split(",");
  const validDays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  return days.every((day) => validDays.includes(day));
}

function validateCategories(cats: unknown): cats is PreferenceCategory[] {
  if (!Array.isArray(cats)) return false;
  return cats.every((cat) =>
    PREFERENCE_CATEGORIES.includes(cat as PreferenceCategory),
  );
}

async function callDeepSeek(
  env: GQLContext["env"],
  userMessage: string,
): Promise<{ content: string }> {
  const apiKey = env.DEEPSEEK_API_KEY as string | undefined;
  const accountId = env.CF_ACCOUNT_ID || "3244c8f91cd34317ce18652158e5853a";
  const gatewayId = env.CF_AI_GATEWAY_ID as string | undefined;

  if (!apiKey) {
    return {
      content: JSON.stringify({
        rrule: "FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00",
        categories: [],
        playerCount: null,
        confidence: 0.3,
      }),
    };
  }

  const baseUrl = gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek`
    : "https://api.deepseek.com/v1";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw validationError("rawText", "AI service unavailable");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return { content: data.choices?.[0]?.message?.content ?? "" };
}

// ─── Zod Schemas ────────────────────────────────────────────────────

const createPrefSchema = z.object({
  rawText: z.string().min(1).max(500),
  rrule: z.string().min(1),
  categories: z.array(z.enum(PREFERENCE_CATEGORIES)),
  playerCount: z.number().int().min(1).max(20).nullable(),
});

const idSchema = z.object({ id: z.string().min(1) });
const parseSchema = z.object({ rawText: z.string().min(2).max(200) });

// ─── Resolvers ──────────────────────────────────────────────────────

export const preferencesResolvers = {
  Query: {
    async myPreferences(_source: unknown, _args: unknown, ctx: GQLContext) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);
      const { desc, eq } = drizzle;

      const prefs = await tdb
        .select()
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.user_id, ctx.userId))
        .orderBy(desc(userPreferencesTable.created_at));

      return prefs.map(toGqlPref);
    },

    async myPreferencesCount(
      _source: unknown,
      _args: unknown,
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const tdb = dbFactory(ctx.env.DB);
      const { count, eq } = drizzle;

      const [result] = await tdb
        .select({ count: count() })
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.user_id, ctx.userId));

      return result?.count ?? 0;
    },
  },

  Mutation: {
    async parsePreference(
      _source: unknown,
      args: { rawText: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const { rawText } = zodToGraphQLError(parseSchema, args);

      try {
        const { content } = await callDeepSeek(ctx.env, rawText);
        const parsed = JSON.parse(content) as Record<string, unknown>;

        if (!parsed.rrule || typeof parsed.rrule !== "string") {
          return {
            __typename: "PreferenceParseError",
            success: false,
            error: "解析失败：无法识别时间规律",
          };
        }

        if (!validateRrule(parsed.rrule)) {
          return {
            __typename: "PreferenceParseError",
            success: false,
            error: "解析失败：时间格式不合法",
          };
        }

        const categories = parsed.categories ?? [];
        if (!validateCategories(categories)) {
          return {
            __typename: "PreferenceParseError",
            success: false,
            error: "解析失败：游戏类别不合法",
          };
        }

        const confidence =
          typeof parsed.confidence === "number" ? parsed.confidence : 0;
        if (confidence < 0.5) {
          return {
            __typename: "PreferenceParseError",
            success: false,
            error: "描述不够明确，请更具体地说明时间和想玩的类型",
          };
        }

        const playerCount =
          typeof parsed.playerCount === "number" ? parsed.playerCount : null;

        return {
          __typename: "PreferenceParseSuccess",
          success: true,
          rrule: parsed.rrule as string,
          categories,
          playerCount,
          confidence,
        };
      } catch (e) {
        return {
          __typename: "PreferenceParseError",
          success: false,
          error: "解析服务暂时不可用，请稍后再试",
        };
      }
    },

    async createPreference(
      _source: unknown,
      args: { input: Record<string, unknown> },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(createPrefSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);

      const [pref] = await tdb
        .insert(userPreferencesTable)
        .values({
          user_id: ctx.userId,
          raw_text: input.rawText,
          rrule: input.rrule,
          categories: input.categories,
          player_count: input.playerCount,
        })
        .returning();

      return toGqlPref(pref);
    },

    async deletePreference(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const { id } = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const { eq, and } = drizzle;

      const [existing] = await tdb
        .select()
        .from(userPreferencesTable)
        .where(
          and(
            eq(userPreferencesTable.id, id),
            eq(userPreferencesTable.user_id, ctx.userId),
          ),
        );

      if (!existing) {
        throw notFound("偏好不存在或无权删除");
      }

      await tdb
        .delete(userPreferencesTable)
        .where(eq(userPreferencesTable.id, id));

      return { success: true };
    },

    async togglePreference(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const { id } = zodToGraphQLError(idSchema, args);
      const tdb = dbFactory(ctx.env.DB);
      const { eq, and } = drizzle;

      const [existing] = await tdb
        .select()
        .from(userPreferencesTable)
        .where(
          and(
            eq(userPreferencesTable.id, id),
            eq(userPreferencesTable.user_id, ctx.userId),
          ),
        );

      if (!existing) {
        throw notFound("偏好不存在");
      }

      const [updated] = await tdb
        .update(userPreferencesTable)
        .set({
          enabled: !existing.enabled,
          updated_at: new Date(Date.now()),
        })
        .where(eq(userPreferencesTable.id, id))
        .returning();

      return toGqlPref(updated);
    },
  },
};
