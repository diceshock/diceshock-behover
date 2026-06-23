import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import { createCustomerAgentFromEnv, customerPersonas, type CustomerPersona, type VibeCustomerAgent } from "../scenarios/personas";

export interface GraphQLClient {
  query<TData = unknown>(query: string, variables?: Record<string, unknown>): Promise<TData>;
}

export interface WeChatClient {
  buildTextXml(input: WeChatTextInput): string;
  sendText(input: WeChatTextInput): Promise<string>;
}

export interface WeChatTextInput {
  fromUser?: string;
  toUser?: string;
  content: string;
  msgId?: string;
}

interface VibeFixtures {
  customerAgent: VibeCustomerAgent;
  personas: CustomerPersona[];
  gql: GraphQLClient;
  wechat: WeChatClient;
}

export const test = base.extend<VibeFixtures>({
  customerAgent: async ({}, use) => {
    await use(createCustomerAgentFromEnv());
  },
  personas: async ({}, use) => {
    await use(customerPersonas);
  },
  gql: async ({ request }, use) => {
    await use(createGraphQLClient(request));
  },
  wechat: async ({ request }, use) => {
    await use(createWeChatClient(request));
  },
});

export { expect };

export function createGraphQLClient(request: APIRequestContext): GraphQLClient {
  return {
    async query<TData = unknown>(query: string, variables?: Record<string, unknown>): Promise<TData> {
      const response = await request.post("/graphql", {
        data: { query, variables },
        headers: { "Content-Type": "application/json" },
      });
      expect(response.status(), await response.text()).toBeLessThan(500);
      const payload = await response.json();
      if (hasGraphQLErrors(payload)) {
        throw new Error(JSON.stringify(payload.errors));
      }
      return readGraphQLData<TData>(payload);
    },
  };
}

export function createWeChatClient(request: APIRequestContext): WeChatClient {
  return {
    buildTextXml(input: WeChatTextInput): string {
      return buildWeChatTextXml(input);
    },
    async sendText(input: WeChatTextInput): Promise<string> {
      const response = await request.post("/wechat", {
        data: buildWeChatTextXml(input),
        headers: { "Content-Type": "application/xml" },
      });
      expect(response.status(), await response.text()).toBeLessThan(500);
      return response.text();
    },
  };
}

export async function expectPageHealthy(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
}

function buildWeChatTextXml(input: WeChatTextInput): string {
  const toUser = input.toUser ?? "gh_diceshock_test";
  const fromUser = input.fromUser ?? "oVibeCustomer001";
  const msgId = input.msgId ?? `${Date.now()}001`;
  const createTime = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${input.content}]]></Content>
<MsgId>${msgId}</MsgId>
</xml>`;
}

function hasGraphQLErrors(payload: unknown): payload is { errors: unknown } {
  return isRecord(payload) && "errors" in payload && payload.errors !== undefined;
}

function readGraphQLData<TData>(payload: unknown): TData {
  if (!isRecord(payload) || !("data" in payload)) {
    throw new Error(`GraphQL payload has no data field: ${JSON.stringify(payload)}`);
  }
  return payload.data as TData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
