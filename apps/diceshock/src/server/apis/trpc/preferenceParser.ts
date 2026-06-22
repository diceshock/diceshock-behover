import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { PREFERENCE_CATEGORIES } from "@/shared/preferences/constants";
import type {
  PreferenceCategory,
  PreferenceParseResult,
} from "@/shared/preferences/types";
import { protectedProcedure } from "./baseTRPC";

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

type DeepSeekParseEnv = Cloudflare.Env & {
  DEEPSEEK_API_KEY?: string;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
};

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
}

async function callDeepSeek(
  env: DeepSeekParseEnv,
  userMessage: string,
): Promise<{ content: string; tokensUsed: number }> {
  const apiKey = env.DEEPSEEK_API_KEY;
  const accountId = env.CF_ACCOUNT_ID || "3244c8f91cd34317ce18652158e5853a";
  const gatewayId = env.CF_AI_GATEWAY_ID;

  if (!apiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI service not configured",
    });
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
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI service error",
    });
  }

  const data = (await response.json()) as DeepSeekChatResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  const tokensUsed = data.usage?.total_tokens ?? 0;

  return { content, tokensUsed };
}

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

export const parsePreference = protectedProcedure
  .input(z.object({ rawText: z.string().min(2).max(200) }))
  .mutation(async ({ input, ctx }): Promise<PreferenceParseResult> => {
    try {
      const { content } = await callDeepSeek(
        ctx.env as DeepSeekParseEnv,
        input.rawText,
      );
      const parsed = JSON.parse(content) as Record<string, unknown>;

      if (!parsed.rrule || typeof parsed.rrule !== "string") {
        return { success: false, error: "解析失败：无法识别时间规律" };
      }

      if (!validateRrule(parsed.rrule)) {
        return { success: false, error: "解析失败：时间格式不合法" };
      }

      const categories = parsed.categories ?? [];
      if (!validateCategories(categories)) {
        return { success: false, error: "解析失败：游戏类别不合法" };
      }

      const confidence =
        typeof parsed.confidence === "number" ? parsed.confidence : 0;
      if (confidence < 0.5) {
        return {
          success: false,
          error: "描述不够明确，请更具体地说明时间和想玩的类型",
        };
      }

      const playerCount =
        typeof parsed.playerCount === "number" ? parsed.playerCount : null;

      return {
        success: true,
        rrule: parsed.rrule,
        categories,
        playerCount,
        confidence,
      };
    } catch (e) {
      if (e instanceof TRPCError) throw e;

      return { success: false, error: "解析服务暂时不可用，请稍后再试" };
    }
  });

export default { parsePreference };
