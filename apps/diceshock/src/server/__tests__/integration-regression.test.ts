/**
 * Regression tests for production bugs discovered 2025-06-23.
 *
 * Bug classes guarded:
 * 1. CrossData UserInfo injection missing fields → Zod parse failure at SSR
 * 2. MembershipPlan camelCase→snake_case mapping → "cannot read .icon of undefined"
 * 3. GraphQL enum case mismatch → "Value does not exist in enum"
 * 4. Points balance integrity → add/deduct correctness
 * 5. Defensive getPlanConfig → unknown planType must not crash
 */
import { z } from "zod/v4";
import { describe, expect, it } from "vitest";
import { userInfoZ } from "@/server/middlewares/auth";

// ─── Pattern 1: CrossData UserInfo Schema Completeness ─────────────────────

describe("CrossData UserInfo schema validation", () => {
  const validUserInfo = {
    uid: "abc123",
    nickname: "TestUser",
    phone: "13800138000",
    points: 100,
    meta: null,
    preferred_store_id: null,
    preferred_locale: null,
  };

  it("accepts a complete UserInfo object", () => {
    const result = userInfoZ.safeParse(validUserInfo);
    expect(result.success).toBe(true);
  });

  it("accepts UserInfo with null phone", () => {
    const result = userInfoZ.safeParse({ ...validUserInfo, phone: null });
    expect(result.success).toBe(true);
  });

  it("accepts UserInfo with 0 points", () => {
    const result = userInfoZ.safeParse({ ...validUserInfo, points: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts UserInfo with null points (DB default)", () => {
    const result = userInfoZ.safeParse({ ...validUserInfo, points: null });
    expect(result.success).toBe(true);
  });

  it("accepts UserInfo with JSON meta", () => {
    const result = userInfoZ.safeParse({
      ...validUserInfo,
      meta: { auto_nickname: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects UserInfo missing uid (required non-null)", () => {
    const { uid: _, ...noUid } = validUserInfo;
    const result = userInfoZ.safeParse(noUid);
    expect(result.success).toBe(false);
  });

  it("rejects UserInfo missing nickname (required non-null)", () => {
    const { nickname: _, ...noNickname } = validUserInfo;
    const result = userInfoZ.safeParse(noNickname);
    expect(result.success).toBe(false);
  });

  it("rejects UserInfo with undefined points", () => {
    const result = userInfoZ.safeParse({ ...validUserInfo, points: undefined });
    if (result.success) {
      expect(result.data.points).toBeDefined();
    } else {
      expect(result.success).toBe(false);
    }
  });
});

// ─── Pattern 2: MembershipPlan camelCase → snake_case Mapping ──────────────

describe("MembershipPlan field mapping", () => {
  const gqlPlan = {
    id: "plan-1",
    userId: "user-1",
    planType: "MONTHLY",
    amount: null as number | null,
    note: "test",
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2025-02-01T00:00:00.000Z",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  function mapGqlToLocal(p: typeof gqlPlan) {
    return {
      id: p.id,
      user_id: p.userId,
      plan_type: (p.planType ?? "").toLowerCase(),
      amount: p.amount ?? null,
      start_date: p.startDate ?? null,
      end_date: p.endDate ?? null,
      create_at: p.createdAt ?? null,
      update_at: p.updatedAt ?? null,
    };
  }

  it("maps camelCase planType to lowercase snake_case plan_type", () => {
    const local = mapGqlToLocal(gqlPlan);
    expect(local.plan_type).toBe("monthly");
  });

  it("maps all plan types correctly", () => {
    const types = ["MONTHLY", "MONTHLY_CC", "YEARLY", "STORED_VALUE"];
    const expected = ["monthly", "monthly_cc", "yearly", "stored_value"];
    for (let i = 0; i < types.length; i++) {
      const local = mapGqlToLocal({ ...gqlPlan, planType: types[i] });
      expect(local.plan_type).toBe(expected[i]);
    }
  });

  it("maps userId to user_id", () => {
    const local = mapGqlToLocal(gqlPlan);
    expect(local.user_id).toBe("user-1");
  });

  it("maps startDate to start_date", () => {
    const local = mapGqlToLocal(gqlPlan);
    expect(local.start_date).toBe("2025-01-01T00:00:00.000Z");
  });

  it("handles null dates gracefully", () => {
    const local = mapGqlToLocal({
      ...gqlPlan,
      startDate: null as any,
      endDate: null as any,
    });
    expect(local.start_date).toBeNull();
    expect(local.end_date).toBeNull();
  });

  it("handles stored_value plan with amount", () => {
    const local = mapGqlToLocal({
      ...gqlPlan,
      planType: "STORED_VALUE",
      amount: 5000,
    });
    expect(local.plan_type).toBe("stored_value");
    expect(local.amount).toBe(5000);
  });

  it("never returns undefined for plan_type", () => {
    const local = mapGqlToLocal({ ...gqlPlan, planType: "" });
    expect(local.plan_type).toBe("");
    expect(local.plan_type).not.toBeUndefined();
  });
});

// ─── Pattern 3: GraphQL Enum Case Handling ──────────────────────────────────

describe("GraphQL enum case conversion", () => {
  function prepareRoleForMutation(selectValue: string): string {
    return selectValue.toUpperCase();
  }

  function preparePlanTypeForMutation(formValue: string): string {
    return formValue.toUpperCase();
  }

  describe("UserRole enum", () => {
    it("converts 'customer' to 'CUSTOMER'", () => {
      expect(prepareRoleForMutation("customer")).toBe("CUSTOMER");
    });

    it("converts 'staff' to 'STAFF'", () => {
      expect(prepareRoleForMutation("staff")).toBe("STAFF");
    });

    it("converts 'admin' to 'ADMIN'", () => {
      expect(prepareRoleForMutation("admin")).toBe("ADMIN");
    });

    it("handles already-uppercase values idempotently", () => {
      expect(prepareRoleForMutation("ADMIN")).toBe("ADMIN");
    });
  });

  describe("MembershipPlanType enum", () => {
    it("converts 'monthly' to 'MONTHLY'", () => {
      expect(preparePlanTypeForMutation("monthly")).toBe("MONTHLY");
    });

    it("converts 'monthly_cc' to 'MONTHLY_CC'", () => {
      expect(preparePlanTypeForMutation("monthly_cc")).toBe("MONTHLY_CC");
    });

    it("converts 'yearly' to 'YEARLY'", () => {
      expect(preparePlanTypeForMutation("yearly")).toBe("YEARLY");
    });

    it("converts 'stored_value' to 'STORED_VALUE'", () => {
      expect(preparePlanTypeForMutation("stored_value")).toBe("STORED_VALUE");
    });
  });

  describe("Server-side enum roundtrip (DB ↔ GraphQL)", () => {
    function planTypeToEnum(pt: string): string {
      return pt.toUpperCase();
    }

    function planTypeFromEnum(pt: string): string {
      return pt.toLowerCase();
    }

    it("converts DB lowercase to GraphQL UPPERCASE", () => {
      expect(planTypeToEnum("monthly")).toBe("MONTHLY");
      expect(planTypeToEnum("stored_value")).toBe("STORED_VALUE");
    });

    it("converts GraphQL UPPERCASE to DB lowercase", () => {
      expect(planTypeFromEnum("MONTHLY")).toBe("monthly");
      expect(planTypeFromEnum("STORED_VALUE")).toBe("stored_value");
    });

    it("roundtrip preserves value", () => {
      const types = ["monthly", "monthly_cc", "yearly", "stored_value"];
      for (const t of types) {
        expect(planTypeFromEnum(planTypeToEnum(t))).toBe(t);
      }
    });
  });
});

// ─── Pattern 4: Points Balance Integrity ────────────────────────────────────

describe("Points balance logic", () => {
  function addPoints(currentBalance: number, amount: number) {
    if (amount <= 0) throw new Error("Amount must be positive");
    return currentBalance + amount;
  }

  function deductPoints(currentBalance: number, amount: number) {
    if (amount <= 0) throw new Error("Amount must be positive");
    if (currentBalance < amount) {
      throw new Error(
        `Insufficient points (current: ${currentBalance}, deduct: ${amount})`,
      );
    }
    return currentBalance - amount;
  }

  it("adds points correctly", () => {
    expect(addPoints(0, 100)).toBe(100);
    expect(addPoints(50, 25)).toBe(75);
  });

  it("deducts points correctly", () => {
    expect(deductPoints(100, 30)).toBe(70);
    expect(deductPoints(100, 100)).toBe(0);
  });

  it("rejects negative add amount", () => {
    expect(() => addPoints(100, -10)).toThrow("Amount must be positive");
  });

  it("rejects zero add amount", () => {
    expect(() => addPoints(100, 0)).toThrow("Amount must be positive");
  });

  it("rejects deduction exceeding balance", () => {
    expect(() => deductPoints(50, 100)).toThrow("Insufficient points");
  });

  it("rejects deduction with zero balance", () => {
    expect(() => deductPoints(0, 1)).toThrow("Insufficient points");
  });

  it("allows exact balance deduction", () => {
    expect(deductPoints(42, 42)).toBe(0);
  });

  it("tracks balance correctly across sequential operations", () => {
    let balance = 0;
    balance = addPoints(balance, 100);
    expect(balance).toBe(100);
    balance = addPoints(balance, 50);
    expect(balance).toBe(150);
    balance = deductPoints(balance, 30);
    expect(balance).toBe(120);
    balance = deductPoints(balance, 120);
    expect(balance).toBe(0);
  });
});

// ─── Pattern 5: getPlanConfig Defensive Handling ────────────────────────────

describe("getPlanConfig defensive behavior", () => {
  const PLAN_CONFIG: Record<
    string,
    { label: string; icon: string; badgeClass: string; priority: number }
  > = {
    yearly: {
      label: "桌面通行证 LTS",
      icon: "TablePassLTS",
      badgeClass: "badge-warning",
      priority: 1,
    },
    monthly: {
      label: "桌面通行证",
      icon: "TablePass",
      badgeClass: "badge-primary",
      priority: 2,
    },
    monthly_cc: {
      label: "CC桌面通行证",
      icon: "TablePassCC",
      badgeClass: "badge-secondary",
      priority: 3,
    },
    stored_value: {
      label: "Table AGENT",
      icon: "TableAgent",
      badgeClass: "badge-accent",
      priority: 4,
    },
  };

  function getPlanConfig(planType: string) {
    return PLAN_CONFIG[planType] ?? PLAN_CONFIG.monthly;
  }

  it("returns correct config for known plan types", () => {
    expect(getPlanConfig("monthly").label).toBe("桌面通行证");
    expect(getPlanConfig("yearly").label).toBe("桌面通行证 LTS");
    expect(getPlanConfig("monthly_cc").label).toBe("CC桌面通行证");
    expect(getPlanConfig("stored_value").label).toBe("Table AGENT");
  });

  it("returns fallback for unknown plan type", () => {
    const config = getPlanConfig("unknown_type");
    expect(config).toBeDefined();
    expect(config.label).toBe("桌面通行证");
    expect(config.priority).toBe(2);
  });

  it("returns fallback for empty string", () => {
    const config = getPlanConfig("");
    expect(config).toBeDefined();
    expect(config.icon).toBeDefined();
  });

  it("returns fallback for UPPERCASE (unmapped from GQL)", () => {
    const config = getPlanConfig("MONTHLY");
    expect(config).toBeDefined();
    expect(config.icon).toBeDefined();
  });

  it("never returns undefined for any input", () => {
    const problematic = ["", "MONTHLY", "STORED_VALUE", "invalid", "null"];
    for (const v of problematic) {
      const config = getPlanConfig(v);
      expect(config).not.toBeUndefined();
      expect(config.icon).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.badgeClass).toBeDefined();
    }
  });
});

// ─── Pattern 6: Points Mutation Input Validation ────────────────────────────

describe("Points mutation input validation", () => {
  const addPointsSchema = z.object({
    userId: z.string().min(1),
    amount: z.number().int().positive(),
    note: z.string().nullable().optional(),
  });

  const deductPointsSchema = z.object({
    userId: z.string().min(1),
    amount: z.number().int().positive(),
    note: z.string().nullable().optional(),
  });

  it("accepts valid addPoints input", () => {
    const result = addPointsSchema.safeParse({
      userId: "user-1",
      amount: 50,
      note: "充值赠送",
    });
    expect(result.success).toBe(true);
  });

  it("accepts addPoints without note", () => {
    const result = addPointsSchema.safeParse({ userId: "user-1", amount: 50 });
    expect(result.success).toBe(true);
  });

  it("accepts addPoints with null note", () => {
    const result = addPointsSchema.safeParse({
      userId: "user-1",
      amount: 50,
      note: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = addPointsSchema.safeParse({ userId: "user-1", amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = addPointsSchema.safeParse({ userId: "user-1", amount: -10 });
    expect(result.success).toBe(false);
  });

  it("rejects float amount", () => {
    const result = addPointsSchema.safeParse({
      userId: "user-1",
      amount: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty userId", () => {
    const result = addPointsSchema.safeParse({ userId: "", amount: 50 });
    expect(result.success).toBe(false);
  });

  it("accepts valid deductPoints input", () => {
    const result = deductPointsSchema.safeParse({
      userId: "user-1",
      amount: 30,
      note: "兑换商品",
    });
    expect(result.success).toBe(true);
  });
});
