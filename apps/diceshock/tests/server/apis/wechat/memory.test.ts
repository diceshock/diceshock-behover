import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMem0Client = {
  search: vi.fn(),
  add: vi.fn(),
  getAll: vi.fn(),
};

vi.mock("mem0ai", () => ({
  default: class MockMemoryClient {
    search = mockMem0Client.search;
    add = mockMem0Client.add;
    getAll = mockMem0Client.getAll;
  },
}));

import { addMemory, getMemoryCount, searchMemory } from "@/server/apis/wechat/memory";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchMemory", () => {
  it("returns empty string when MEM0_API_KEY missing", async () => {
    const result = await searchMemory({}, "openid-123", "桌游查询");
    expect(result).toBe("");
    expect(mockMem0Client.search).not.toHaveBeenCalled();
  });

  it("returns empty string on search failure", async () => {
    mockMem0Client.search.mockRejectedValue(new Error("network error"));
    const result = await searchMemory(
      { MEM0_API_KEY: "test-key" },
      "openid-456",
      "查询",
    );
    expect(result).toBe("");
  });

  it("returns empty string when no results", async () => {
    mockMem0Client.search.mockResolvedValue({ results: [] });
    const result = await searchMemory(
      { MEM0_API_KEY: "test-key" },
      "openid-789",
      "query",
    );
    expect(result).toBe("");
    expect(mockMem0Client.search).toHaveBeenCalledWith("query", {
      filters: { user_id: "openid-789" },
      topK: 3,
    });
  });

  it("returns formatted memory string on success", async () => {
    mockMem0Client.search.mockResolvedValue({
      results: [
        { memory: "用户喜欢玩卡坦岛" },
        { memory: "用户上次查询了桌游库存" },
      ],
    });
    const result = await searchMemory(
      { MEM0_API_KEY: "test-key" },
      "openid-abc",
      "桌游",
    );
    expect(result).toContain("用户记忆：");
    expect(result).toContain("用户喜欢玩卡坦岛");
    expect(result).toContain("用户上次查询了桌游库存");
  });

  it("handles null results gracefully", async () => {
    mockMem0Client.search.mockResolvedValue({ results: null });
    const result = await searchMemory(
      { MEM0_API_KEY: "test-key" },
      "openid-null",
      "query",
    );
    expect(result).toBe("");
  });
});

describe("addMemory", () => {
  it("skips when MEM0_API_KEY missing", async () => {
    await addMemory({}, "openid-123", [{ role: "user", content: "hello" }]);
    expect(mockMem0Client.add).not.toHaveBeenCalled();
  });

  it("does not throw on Mem0 failure", async () => {
    mockMem0Client.getAll.mockResolvedValue({ count: 0 });
    mockMem0Client.add.mockRejectedValue(new Error("add failed"));
    await expect(
      addMemory({ MEM0_API_KEY: "test" }, "openid-err", [
        { role: "user", content: "test" },
      ]),
    ).resolves.toBeUndefined();
  });

  it("skips when user is at memory cap", async () => {
    mockMem0Client.getAll.mockResolvedValue({ count: 20 });
    await addMemory({ MEM0_API_KEY: "test" }, "openid-full", [
      { role: "user", content: "hello" },
    ]);
    expect(mockMem0Client.add).not.toHaveBeenCalled();
  });

  it("adds valid user/assistant messages", async () => {
    mockMem0Client.getAll.mockResolvedValue({ count: 5 });
    mockMem0Client.add.mockResolvedValue({});
    await addMemory({ MEM0_API_KEY: "test" }, "openid-ok", [
      { role: "user", content: "查询桌游" },
      { role: "assistant", content: "好的，我来查" },
    ]);
    expect(mockMem0Client.add).toHaveBeenCalledTimes(1);
    const [messagesArg] = mockMem0Client.add.mock.calls[0];
    expect(messagesArg).toHaveLength(2);
    expect(messagesArg[0].role).toBe("user");
    expect(messagesArg[1].role).toBe("assistant");
  });

  it("filters out invalid roles", async () => {
    mockMem0Client.getAll.mockResolvedValue({ count: 5 });
    mockMem0Client.add.mockResolvedValue({});
    await addMemory({ MEM0_API_KEY: "test" }, "openid-filter", [
      { role: "tool", content: "result" },
      { role: "user", content: "hello" },
      { role: "system", content: "prompt" },
    ]);
    expect(mockMem0Client.add).toHaveBeenCalledTimes(1);
    const [messagesArg] = mockMem0Client.add.mock.calls[0];
    expect(messagesArg).toHaveLength(1);
    expect(messagesArg[0].role).toBe("user");
  });

  it("skips when all messages are empty or invalid", async () => {
    mockMem0Client.getAll.mockResolvedValue({ count: 3 });
    await addMemory({ MEM0_API_KEY: "test" }, "openid-empty", [
      { role: "user", content: "" },
      { role: "tool", content: "data" },
    ]);
    expect(mockMem0Client.add).not.toHaveBeenCalled();
  });
});

describe("getMemoryCount", () => {
  it("returns MAX when MEM0_API_KEY missing", async () => {
    const count = await getMemoryCount({}, "openid-nokey");
    expect(count).toBe(20);
    expect(mockMem0Client.getAll).not.toHaveBeenCalled();
  });

  it("returns count from Mem0", async () => {
    mockMem0Client.getAll.mockResolvedValue({ count: 7 });
    const count = await getMemoryCount(
      { MEM0_API_KEY: "test" },
      "openid-count",
    );
    expect(count).toBe(7);
  });

  it("returns MAX on failure", async () => {
    mockMem0Client.getAll.mockRejectedValue(new Error("timeout"));
    const count = await getMemoryCount({ MEM0_API_KEY: "test" }, "openid-fail");
    expect(count).toBe(20);
  });

  it("returns 0 when count is missing", async () => {
    mockMem0Client.getAll.mockResolvedValue({ results: [] });
    const count = await getMemoryCount(
      { MEM0_API_KEY: "test" },
      "openid-missing",
    );
    expect(count).toBe(0);
  });
});
