import type { Page, Route } from "@playwright/test";

export type MockToolCall = {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result: unknown;
};

export type MockChatStreamResponse = {
  text?: string;
  toolCalls?: MockToolCall[];
  status?: number;
  error?: string;
};

export async function mockChatStream(
  page: Page,
  response:
    | MockChatStreamResponse
    | ((request: { body: Record<string, unknown> }) => MockChatStreamResponse | Promise<MockChatStreamResponse>),
) {
  await page.route("**/api/chat/stream", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown> | null;
    const resolved =
      typeof response === "function" ? await response({ body: body ?? {} }) : response;

    if (resolved.status && resolved.status >= 400) {
      await route.fulfill({
        status: resolved.status,
        contentType: "application/json",
        body: JSON.stringify({ error: resolved.error ?? "Mock chat error" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
      body: buildAiDataStream(resolved),
    });
  });
}

export async function mockChatConfirm(
  page: Page,
  response: { status?: number; body?: unknown } = { body: { success: true } },
) {
  await page.route("**/api/chat/confirm", async (route: Route) => {
    await route.fulfill({
      status: response.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(response.body ?? { success: true }),
    });
  });
}

export function buildAiDataStream(response: MockChatStreamResponse) {
  const chunks: string[] = [];
  if (response.text) chunks.push(`0:${JSON.stringify(response.text)}\n`);

  for (const tool of response.toolCalls ?? []) {
    chunks.push(
      `9:${JSON.stringify({ toolCallId: tool.id, toolName: tool.name, args: tool.args ?? {} })}\n`,
    );
    chunks.push(
      `a:${JSON.stringify({ toolCallId: tool.id, result: tool.result })}\n`,
    );
  }

  chunks.push(`d:{"finishReason":"stop"}\n`);
  return chunks.join("");
}
