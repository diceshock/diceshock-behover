import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

const spikeRoute = new Hono<HonoCtxEnv>();

spikeRoute.post("/", async (c) => {
  const env = c.env;
  const apiKey = env.DEEPSEEK_API_KEY as string | undefined;
  if (!apiKey) {
    return c.json({ error: "DEEPSEEK_API_KEY not configured" }, 500);
  }
  const accountId =
    (env.CF_ACCOUNT_ID as string) || "3244c8f91cd34317ce18652158e5853a";
  const gatewayId = env.CF_AI_GATEWAY_ID as string | undefined;

  const baseURL = gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek`
    : "https://api.deepseek.com/v1";

  const deepseek = createOpenAI({
    apiKey,
    baseURL,
    compatibility: "compatible",
  });

  const body = await c.req.json<{
    messages: { role: "user" | "assistant" | "system"; content: string }[];
  }>();
  const { messages = [] } = body;

  const result = streamText({
    model: deepseek("deepseek-v4-pro"),
    messages,
    tools: {
      echo: {
        description: "Echo back the input message. A simple test tool.",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to echo back",
            },
          },
          required: ["message"],
        },
        execute: async ({ message }: { message: string }) => {
          return `Echo: ${message}`;
        },
      },
    },
    maxSteps: 5,
    onError: ({ error }) => {
      console.error("[chat/spike] streamText error:", error);
    },
  });

  return result.toDataStreamResponse();
});

export default spikeRoute;
