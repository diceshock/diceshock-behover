import { describe, expect, it, vi } from "vitest";
import type { MutateArgs } from "@/server/apis/wechat/graphql/mutateActions";
import { executeMutateTool } from "@/server/apis/wechat/tools/mutate";
import type { ToolContext } from "@/server/apis/wechat/tools/totp";

function createMockD1(): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ success: true, results: [] }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        raw: vi.fn().mockResolvedValue([]),
      })),
    })),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

function createMockKV(): KVNamespace {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
    getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
  } as unknown as KVNamespace;
}

function createContext(
  overrides?: Partial<ToolContext["env"] & { openId?: string }>,
): ToolContext {
  return {
    env: {
      DB: createMockD1(),
      KV: createMockKV(),
      ...overrides,
    } as ToolContext["env"],
    openId: overrides?.openId ?? "test_open_id",
  };
}

const DEFAULT_DESCRIPTION = "test description";
const VALID_ACTIONS = [
  "create_active",
  "update_active",
  "join_active",
  "leave_active",
  "watch_active",
  "send_sms_code",
  "verify_phone",
  "bind_gsz",
  "upsert_business_card",
] as const;

function invalidMutateArgs(value: Record<string, unknown>): MutateArgs {
  return value as MutateArgs;
}

describe("executeMutateTool - action validation", () => {
  it("rejects invalid action 'delete_user' and lists all 9 valid actions", async () => {
    const result = await executeMutateTool(
      invalidMutateArgs({
        action: "delete_user",
        params: {},
        description: DEFAULT_DESCRIPTION,
      }),
      createContext(),
    );

    expect(result).toContain("无效操作");
    expect(result).toContain("delete_user");
    for (const action of VALID_ACTIONS) {
      expect(result).toContain(action);
    }
  });

  it("rejects empty action ''", async () => {
    const result = await executeMutateTool(
      invalidMutateArgs({
        action: "",
        params: {},
        description: DEFAULT_DESCRIPTION,
      }),
      createContext(),
    );

    expect(result).toContain("无效操作");
    expect(result).toContain("。有效操作:");
  });

  it("rejects non-existent action 'foobar'", async () => {
    const result = await executeMutateTool(
      invalidMutateArgs({
        action: "foobar",
        params: {},
        description: DEFAULT_DESCRIPTION,
      }),
      createContext(),
    );

    expect(result).toContain("无效操作");
    expect(result).toContain("foobar");
  });
});

describe("executeMutateTool - param validation", () => {
  // For all tests below, invalid params cause early return BEFORE resolveUserId,
  // so no DB interaction actually occurs. The mock DB is provided for type safety only.

  describe("create_active", () => {
    it("rejects missing title", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "create_active",
          params: { date: "2026-06-20", max_players: 4 },
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 title");
    });

    it("rejects missing date", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "create_active",
          params: { title: "Test", max_players: 4 },
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 date");
    });

    it("rejects missing max_players", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "create_active",
          params: { title: "Test", date: "2026-06-20" },
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 max_players");
    });

    it("rejects empty string title", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "create_active",
          params: { title: "", date: "2026-06-20", max_players: 4 },
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 title");
    });

    it("rejects null title", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "create_active",
          params: { title: null, date: "2026-06-20", max_players: 4 },
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 title");
    });
  });

  describe("join_active", () => {
    it("rejects missing active_id", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "join_active",
          params: {},
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 active_id");
    });
  });

  describe("watch_active", () => {
    it("rejects missing active_id", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "watch_active",
          params: {},
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 active_id");
    });
  });

  describe("update_active", () => {
    it("rejects missing id", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "update_active",
          params: {},
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 id");
    });
  });

  describe("leave_active", () => {
    it("rejects missing active_id", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "leave_active",
          params: {},
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 active_id");
    });
  });

  describe("send_sms_code", () => {
    it("rejects missing phone", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "send_sms_code",
          params: {},
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 phone");
    });

    it("rejects empty string phone", async () => {
      const result = await executeMutateTool(
        {
          action: "send_sms_code",
          params: { phone: "" },
          description: DEFAULT_DESCRIPTION,
        },
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 phone");
    });
  });

  describe("verify_phone", () => {
    it("rejects missing code when phone is provided", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "verify_phone",
          params: { phone: "13800138000" },
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 code");
    });

    it("rejects missing phone when code is provided", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "verify_phone",
          params: { code: "123456" },
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 phone");
    });

    it("rejects when both phone and code are missing", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "verify_phone",
          params: {},
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).toBe("操作失败: 缺少参数 phone");
    });
  });

  describe("actions with no required params", () => {
    it("bind_gsz: accepts empty params, fails at user resolution instead of param validation", async () => {
      const result = await executeMutateTool(
        invalidMutateArgs({
          action: "bind_gsz",
          params: {},
          description: DEFAULT_DESCRIPTION,
        }),
        createContext(),
      );
      expect(result).not.toContain("缺少参数");
      expect(result).toContain("未找到账号");
    });

    it("upsert_business_card: accepts empty params, fails at user resolution instead of param validation", async () => {
      const result = await executeMutateTool(
        {
          action: "upsert_business_card",
          params: {},
          description: DEFAULT_DESCRIPTION,
        },
        createContext(),
      );
      expect(result).not.toContain("缺少参数");
      expect(result).toContain("未找到账号");
    });
  });
});

describe("executeMutateTool - execution (TODO)", () => {
  it.todo("create_active: returns success with valid params and mocked DB");
  it.todo("join_active: returns success with valid params and mocked DB");
  it.todo("leave_active: returns success when participant leaves");
  it.todo("send_sms_code: returns success with DEV_SMS_CODE shortcut");
});
