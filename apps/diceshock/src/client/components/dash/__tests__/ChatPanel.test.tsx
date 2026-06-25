import type { Message, ToolInvocation } from "ai";
import { getDefaultStore } from "jotai";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ChatInput from "../ChatInput";
import ChatMessages from "../ChatMessages";
import {
  chatContextAtom,
  chatMessagesAtom,
  pendingSearchAtom,
} from "../chatAtoms";
import ToolResultRenderer from "../ToolResultRenderer";

const jotaiStore = getDefaultStore();

describe("chatAtoms", () => {
  it("pendingSearchAtom starts as null", () => {
    expect(jotaiStore.get(pendingSearchAtom)).toBe(null);
  });

  it("pendingSearchAtom can be set to a string", () => {
    jotaiStore.set(pendingSearchAtom, "status:active");
    expect(jotaiStore.get(pendingSearchAtom)).toBe("status:active");
    jotaiStore.set(pendingSearchAtom, null);
  });

  it("pendingSearchAtom can be cleared back to null", () => {
    jotaiStore.set(pendingSearchAtom, "test");
    jotaiStore.set(pendingSearchAtom, null);
    expect(jotaiStore.get(pendingSearchAtom)).toBe(null);
  });

  it("chatMessagesAtom starts as empty array", () => {
    expect(jotaiStore.get(chatMessagesAtom)).toEqual([]);
  });

  it("chatMessagesAtom stores and retrieves messages", () => {
    const messages: Message[] = [
      { id: "1", role: "user", content: "hello" },
      { id: "2", role: "assistant", content: "hi there" },
    ];
    jotaiStore.set(chatMessagesAtom, messages);
    expect(jotaiStore.get(chatMessagesAtom)).toEqual(messages);
    jotaiStore.set(chatMessagesAtom, []);
  });

  it("chatMessagesAtom caps at 100 (oldest trimmed)", () => {
    const messages: Message[] = Array.from({ length: 150 }, (_, i) => ({
      id: String(i),
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `message ${i}`,
    }));
    const capped = messages.slice(-100);
    jotaiStore.set(chatMessagesAtom, capped);
    const stored = jotaiStore.get(chatMessagesAtom);
    expect(stored).toHaveLength(100);
    expect(stored[0].id).toBe("50");
    expect(stored[99].id).toBe("149");
    jotaiStore.set(chatMessagesAtom, []);
  });

  it("chatContextAtom starts with empty page", () => {
    expect(jotaiStore.get(chatContextAtom).page).toBe("");
  });

  it("chatContextAtom updates page and filters", () => {
    const ctx = { page: "/dash/orders", filters: { status: "active" } };
    jotaiStore.set(chatContextAtom, ctx);
    expect(jotaiStore.get(chatContextAtom)).toEqual(ctx);
    jotaiStore.set(chatContextAtom, { page: "" });
  });

  it("pendSearch set, message store, context update work independently", () => {
    jotaiStore.set(pendingSearchAtom, "status:active");
    jotaiStore.set(chatMessagesAtom, [
      { id: "1", role: "user", content: "hi" },
    ]);
    jotaiStore.set(chatContextAtom, { page: "/dash/orders" });

    expect(jotaiStore.get(pendingSearchAtom)).toBe("status:active");
    expect(jotaiStore.get(chatMessagesAtom)).toHaveLength(1);
    expect(jotaiStore.get(chatContextAtom).page).toBe("/dash/orders");

    jotaiStore.set(pendingSearchAtom, null);
    jotaiStore.set(chatMessagesAtom, []);
    jotaiStore.set(chatContextAtom, { page: "" });
  });
});

describe("ToolResultRenderer", () => {
  it("renders a loading state for pending tool invocations", () => {
    const invocation = {
      state: "call",
      toolCallId: "call-1",
      toolName: "query_gql",
      args: { query: "{ users { id } }" },
    } as ToolInvocation;

    const html = renderToString(
      createElement(ToolResultRenderer, { toolInvocation: invocation }),
    );

    expect(html).toContain("query_gql");
    expect(html).toContain("loading");
  });

  it("renders GQL query result card", () => {
    const invocation = {
      state: "result",
      toolCallId: "call-2",
      toolName: "query_gql",
      args: { query: "{ users { id } }" },
      result: { data: { users: [{ id: "1" }] } },
    } as unknown as ToolInvocation;

    const html = renderToString(
      createElement(ToolResultRenderer, { toolInvocation: invocation }),
    );

    expect(html).toContain("查询结果");
    expect(html).toContain("展开");
  });

  it("renders mutation confirm card with buttons", () => {
    const invocation = {
      state: "result",
      toolCallId: "call-3",
      toolName: "mutate_gql",
      args: { query: "mutation { ... }" },
      result: {
        mutationId: "m-1",
        query: "mutation { createUser { id } }",
        variables: {},
        description: "创建用户",
      },
    } as unknown as ToolInvocation;

    const html = renderToString(
      createElement(ToolResultRenderer, { toolInvocation: invocation }),
    );

    expect(html).toContain("创建用户");
    expect(html).toContain("确认执行");
    expect(html).toContain("取消");
  });

  it("renders search query chip as a button with onClick support", () => {
    const invocation = {
      state: "result",
      toolCallId: "call-4",
      toolName: "format_search_query",
      args: { entityType: "orders", description: "today" },
      result: "status:active date:2024-01-01",
    } as unknown as ToolInvocation;

    const html = renderToString(
      createElement(ToolResultRenderer, { toolInvocation: invocation }),
    );

    expect(html).toContain("status:active date:2024-01-01");
    expect(html).toContain("badge-primary");
    expect(html).toContain("<button");
  });

  it("renders TOTP code display", () => {
    const invocation = {
      state: "result",
      toolCallId: "call-5",
      toolName: "generate_totp",
      args: {},
      result: { code: "123456", remaining_seconds: 25 },
    } as unknown as ToolInvocation;

    const html = renderToString(
      createElement(ToolResultRenderer, { toolInvocation: invocation }),
    );

    expect(html).toContain("123456");
    expect(html).toContain("25");
    expect(html).toContain("text-base-content/50");
  });

  it("renders TOTP error", () => {
    const invocation = {
      state: "result",
      toolCallId: "call-6",
      toolName: "generate_totp",
      args: {},
      result: { error: "TOTP 验证码生成失败" },
    } as unknown as ToolInvocation;

    const html = renderToString(
      createElement(ToolResultRenderer, { toolInvocation: invocation }),
    );

    expect(html).toContain("TOTP 验证码生成失败");
  });
});

describe("ChatInput", () => {
  it("renders a textarea and send button", () => {
    const html = renderToString(
      createElement(ChatInput, {
        input: "hello",
        onInputChange: () => {},
        onSubmit: () => {},
        isLoading: false,
      }),
    );

    expect(html).toContain("textarea");
    expect(html).toContain("hello");
    expect(html).toContain("button");
  });

  it("disables textarea and button when loading", () => {
    const html = renderToString(
      createElement(ChatInput, {
        input: "",
        onInputChange: () => {},
        onSubmit: () => {},
        isLoading: true,
      }),
    );

    expect(html).toContain("disabled");
  });
});

describe("ChatMessages", () => {
  it("renders empty state when no messages", () => {
    const html = renderToString(
      createElement(ChatMessages, {
        messages: [] as Message[],
        isLoading: false,
      }),
    );

    expect(html).toContain("有什么可以帮你的");
  });

  it("renders user messages as chat-end bubbles", () => {
    const messages: Message[] = [{ id: "1", role: "user", content: "你好" }];

    const html = renderToString(
      createElement(ChatMessages, { messages, isLoading: false }),
    );

    expect(html).toContain("chat-end");
    expect(html).toContain("你好");
  });

  it("renders assistant messages as chat-start bubbles", () => {
    const messages: Message[] = [
      { id: "2", role: "assistant", content: "我是AI助手" },
    ];

    const html = renderToString(
      createElement(ChatMessages, { messages, isLoading: false }),
    );

    expect(html).toContain("chat-start");
    expect(html).toContain("我是AI助手");
  });

  it("shows loading indicator when streaming after user message", () => {
    const messages: Message[] = [{ id: "1", role: "user", content: "test" }];

    const html = renderToString(
      createElement(ChatMessages, { messages, isLoading: true }),
    );

    expect(html).toContain("loading-dots");
  });

  it("renders assistant messages with tool invocations", () => {
    const toolInvocation = {
      state: "result",
      toolCallId: "call-search",
      toolName: "format_search_query",
      args: {},
      result: "status:active",
    } as unknown as ToolInvocation;

    const messages: Message[] = [
      { id: "1", role: "user", content: "find active orders" },
      {
        id: "2",
        role: "assistant",
        content: "Here is the search:",
        toolInvocations: [toolInvocation],
      },
    ];

    const html = renderToString(
      createElement(ChatMessages, { messages, isLoading: false }),
    );

    expect(html).toContain("Here is the search:");
    expect(html).toContain("status:active");
  });
});
