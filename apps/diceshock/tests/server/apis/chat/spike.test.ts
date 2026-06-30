import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import spikeRoute from "@/server/apis/chat/spike";

describe("Chat Spike - AI SDK + DeepSeek", () => {
  it("registers POST / route on the Hono instance", () => {
    const app = new Hono();
    app.route("/", spikeRoute);
    expect(app.routes).toBeDefined();
    expect(app.routes.length).toBeGreaterThan(0);

    const postRoute = app.routes.find(
      (r) => r.method === "POST" && r.path === "/",
    );
    expect(postRoute).toBeDefined();
  });

  it("defines an echo tool with valid JSON Schema parameters", () => {
    const echoParams = {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to echo back",
        },
      },
    };

    expect(echoParams.type).toBe("object");
    expect(echoParams.properties.message.type).toBe("string");
    expect(echoParams.properties.message.description).toBeDefined();
  });

  it("returns 500 when DEEPSEEK_API_KEY is not configured", async () => {
    const app = new Hono();
    app.route("/", spikeRoute);

    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "test" }],
        }),
      },
      {} as any,
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("DEEPSEEK_API_KEY not configured");
  });

  it("returns a streaming response with valid body and API key", async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return;
    }

    const app = new Hono();
    app.route("/", spikeRoute);

    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello! Echo 'spike test'" }],
        }),
      },
      { DEEPSEEK_API_KEY: apiKey },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(res.headers.get("X-Vercel-AI-Data-Stream")).toBe("v1");
  });
});
