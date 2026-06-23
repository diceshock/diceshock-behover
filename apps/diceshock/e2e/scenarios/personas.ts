import type { VibeJourney } from "./feature-catalog";

export interface CustomerStep {
  message: string;
  intent: string;
  expectedSurface: "wechat" | "page" | "graphql" | "queue" | "cron" | "subscription";
}

export interface CustomerPersona {
  id: string;
  displayName: string;
  traits: string[];
  locale: "zh-CN" | "en" | "ja";
  storeCode: string;
}

export interface VibeCustomerAgent {
  generateStep(persona: CustomerPersona, journey: VibeJourney): Promise<CustomerStep>;
}

const surfaceByCoverage: Record<string, CustomerStep["expectedSurface"]> = {
  agent: "wechat",
  page: "page",
  api: "graphql",
  queue: "queue",
  cron: "cron",
  subscription: "subscription",
};

export const customerPersonas: CustomerPersona[] = [
  {
    id: "new-casual-customer",
    displayName: "第一次到店的休闲顾客",
    traits: ["不熟悉店内流程", "会用自然语言提问", "需要清楚引导"],
    locale: "zh-CN",
    storeCode: "guanggu",
  },
  {
    id: "regular-mahjong-player",
    displayName: "经常参赛的日麻玩家",
    traits: ["关注 GSZ 同步", "关注排行榜", "会追问战绩细节"],
    locale: "zh-CN",
    storeCode: "guanggu",
  },
  {
    id: "staff-operator",
    displayName: "值班店员",
    traits: ["需要后台效率", "会批量处理", "关注结算准确性"],
    locale: "zh-CN",
    storeCode: "guanggu",
  },
];

export class DeterministicCustomerAgent implements VibeCustomerAgent {
  async generateStep(persona: CustomerPersona, journey: VibeJourney): Promise<CustomerStep> {
    const firstCoverage = journey.coverage[0] ?? "page";
    return {
      message: `${persona.displayName}: ${journey.realisticPrompt}`,
      intent: journey.goal,
      expectedSurface: surfaceByCoverage[firstCoverage] ?? "page",
    };
  }
}

export class OpenAiCompatibleCustomerAgent implements VibeCustomerAgent {
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateStep(persona: CustomerPersona, journey: VibeJourney): Promise<CustomerStep> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You simulate a realistic board-game store customer. Return compact JSON with message, intent, and expectedSurface.",
          },
          {
            role: "user",
            content: JSON.stringify({ persona, journey }),
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      return new DeterministicCustomerAgent().generateStep(persona, journey);
    }

    const payload = await response.json();
    const content = extractAssistantContent(payload);
    if (!content) return new DeterministicCustomerAgent().generateStep(persona, journey);

    try {
      const parsed = JSON.parse(content) as Partial<CustomerStep>;
      return {
        message: typeof parsed.message === "string" ? parsed.message : journey.realisticPrompt,
        intent: typeof parsed.intent === "string" ? parsed.intent : journey.goal,
        expectedSurface: isExpectedSurface(parsed.expectedSurface) ? parsed.expectedSurface : "page",
      };
    } catch {
      return {
        message: content,
        intent: journey.goal,
        expectedSurface: "page",
      };
    }
  }
}

export function createCustomerAgentFromEnv(): VibeCustomerAgent {
  const endpoint = process.env.VIBE_TEST_LLM_ENDPOINT;
  const apiKey = process.env.VIBE_TEST_LLM_API_KEY;
  const model = process.env.VIBE_TEST_LLM_MODEL ?? "test-customer-simulator";
  if (endpoint && apiKey) return new OpenAiCompatibleCustomerAgent(endpoint, apiKey, model);
  return new DeterministicCustomerAgent();
}

function extractAssistantContent(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const choices = payload.choices;
  if (!Array.isArray(choices)) return undefined;
  const first = choices[0];
  if (!isRecord(first)) return undefined;
  const message = first.message;
  if (!isRecord(message)) return undefined;
  return typeof message.content === "string" ? message.content : undefined;
}

function isExpectedSurface(value: unknown): value is CustomerStep["expectedSurface"] {
  return (
    value === "wechat" ||
    value === "page" ||
    value === "graphql" ||
    value === "queue" ||
    value === "cron" ||
    value === "subscription"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
