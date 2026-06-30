import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MutateArgs } from "@/server/apis/wechat/graphql/mutateActions";
import type { ToolContext } from "@/server/apis/wechat/tools/totp";

// ─── Hoisted mocks ──────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  callIdx: 0,
  insertFn: vi.fn().mockReturnValue({ values: vi.fn() }),
  deleteFn: vi.fn().mockReturnValue({ where: vi.fn() }),
  updateFn: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
}));

vi.mock("@lib/db", () => {
  function createSelectChain() {
    function resolve() {
      const res = mocks.selectResults[mocks.callIdx] ?? [];
      mocks.callIdx++;
      return Promise.resolve(res);
    }
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(() => resolve());
    // Make chain thenable so `await chain` works without .limit()
    chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      resolve().then(onFulfilled, onRejected);
    return chain;
  }

  return {
    default: vi.fn(() => {
      const chain = createSelectChain();
      return {
        select: chain.select,
        insert: mocks.insertFn,
        delete: mocks.deleteFn,
        update: mocks.updateFn,
      };
    }),
    accounts: {
      userId: "accounts.userId",
      provider: "accounts.provider",
      providerAccountId: "accounts.providerAccountId",
    },
    activesTable: {
      id: "actives.id",
      creator_id: "actives.creator_id",
      title: "actives.title",
      max_players: "actives.max_players",
      is_system_recommended: "actives.is_system_recommended",
    },
    activeRegistrationsTable: {
      id: "active_registrations.id",
      active_id: "active_registrations.active_id",
      user_id: "active_registrations.user_id",
      is_watching: "active_registrations.is_watching",
    },
    mahjongRegistrationsTable: {},
    userBusinessCardTable: {},
    userInfoTable: {},
    userPreferencesTable: {},
    drizzle: {
      and: vi.fn((...args: unknown[]) => args),
      eq: vi.fn((field, value) => ({ field, value, op: "eq" })),
      count: vi.fn((field) => ({ field, fn: "count" })),
    },
  };
});

import { executeMutateTool } from "@/server/apis/wechat/tools/mutate";

// ─── Helpers ────────────────────────────────────────────────────────

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
      DB: {} as D1Database,
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

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  mocks.selectResults = [];
  mocks.callIdx = 0;
  mocks.insertFn.mockReturnValue({ values: vi.fn() });
  mocks.deleteFn.mockReturnValue({ where: vi.fn() });
  mocks.updateFn.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
});

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
      // selectResults empty → resolveUserId returns null
      mocks.selectResults = [[], []];
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
      mocks.selectResults = [[], []];
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

describe("executeMutateTool - execution", () => {
  it("create_active: returns success with valid params and mocked DB", async () => {
    // resolveUserId: first select returns user
    mocks.selectResults = [[{ userId: "user-123" }]];

    const result = await executeMutateTool(
      {
        action: "create_active",
        params: { title: "周末桌游", date: "2026-07-05", max_players: 4 },
        description: "test",
      },
      createContext(),
    );

    expect(result).toContain("约局创建成功");
    expect(result).toContain("周末桌游");
    expect(result).toContain("2026-07-05");
    expect(result).toContain("4人");
    expect(result).toContain("https://diceshock.com/actives/");
    expect(mocks.insertFn).toHaveBeenCalled();
  });

  it("join_active: returns success with valid params and mocked DB", async () => {
    const activeId = "active-abc";
    // 1. resolveUserId → user found
    // 2. select active → found (not creator)
    // 3. select existing registration → none
    // 4. count players → below max
    mocks.selectResults = [
      [{ userId: "user-456" }],
      [{ id: activeId, creator_id: "other-user", max_players: 4, title: "拼桌" }],
      [],
      [{ count: 1 }],
    ];

    const result = await executeMutateTool(
      {
        action: "join_active",
        params: { active_id: activeId },
        description: "test",
      },
      createContext(),
    );

    expect(result).toContain("已加入约局");
    expect(result).toContain("拼桌");
    expect(result).toContain(`https://diceshock.com/actives/${activeId}`);
  });

  it("leave_active: returns success when participant leaves", async () => {
    const activeId = "active-xyz";
    // 1. resolveUserId → user found (not the creator)
    // 2. select active → found with different creator
    mocks.selectResults = [
      [{ userId: "user-789" }],
      [{ creator_id: "creator-111", title: "日麻约局", is_system_recommended: false }],
    ];

    const result = await executeMutateTool(
      {
        action: "leave_active",
        params: { active_id: activeId },
        description: "test",
      },
      createContext(),
      true, // skipConfirmation (leave_active is destructive)
    );

    expect(result).toContain("已退出约局");
    expect(result).toContain("日麻约局");
    expect(result).toContain(`https://diceshock.com/actives/${activeId}`);
    expect(mocks.deleteFn).toHaveBeenCalled();
  });

  it("send_sms_code: returns success with DEV_SMS_CODE shortcut", async () => {
    // resolveUserId → user found
    mocks.selectResults = [[{ userId: "user-sms" }]];
    const mockKV = createMockKV();

    const result = await executeMutateTool(
      {
        action: "send_sms_code",
        params: { phone: "13800138000" },
        description: "test",
      },
      {
        env: {
          DB: {} as D1Database,
          KV: mockKV,
          DEV_SMS_CODE: "123456",
        } as unknown as ToolContext["env"],
        openId: "sms_open_id",
      },
    );

    expect(result).toContain("验证码已发送到");
    expect(result).toContain("138****8000");
    expect(mockKV.put).toHaveBeenCalledWith(
      "sms_code:13800138000",
      "123456",
      { expirationTtl: 300 },
    );
  });
});
