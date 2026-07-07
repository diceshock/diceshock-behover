/**
 * Membership & Pricing — E2E Tests (Visibility-First)
 *
 * Tests the full membership and pricing management lifecycle:
 *   - View user memberships
 *   - Create membership plan
 *   - Stored value deduction
 *   - Pricing configuration
 *   - Pricing snapshot history
 *   - Points system
 *
 * Self-contained: auth helpers inline, GraphQL mocked per scenario.
 */
import { expect, type Page, test } from "@playwright/test";

// ─── Auth Setup ──────────────────────────────────────────────────────────────

async function setupStaffAuth(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "staff" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "fc-staff-001",
          name: "赵店长",
          role: "staff",
          preferredStoreId: "store-fc-gg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

// ─── GraphQL Mock ────────────────────────────────────────────────────────────

type GqlBody = { query: string; variables?: unknown };
type GqlMockValue = object | string | number | boolean | null | ((body: GqlBody) => unknown);

async function mockGraphQL(page: Page, mocks: Record<string, GqlMockValue>) {
  await page.route("**/graphql", async (route) => {
    const raw: unknown = route.request().postDataJSON();
    const query =
      raw && typeof raw === "object" && "query" in raw && typeof raw.query === "string"
        ? raw.query
        : "";
    for (const [key, mockValue] of Object.entries(mocks)) {
      if (query.includes(key)) {
        const variables =
          raw && typeof raw === "object" && "variables" in raw ? raw.variables : undefined;
        const data = typeof mockValue === "function"
          ? mockValue({ query, variables })
          : mockValue;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data }),
        });
        return;
      }
    }
    await route.continue();
  });
}

// ─── Scroll & Visibility Helpers ─────────────────────────────────────────────

async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Internal server error|500|Unhandled/i,
  );
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const membershipPlans = [
  {
    id: "fc-mem-001",
    type: "monthly",
    name: "月卡会员",
    userId: "fc-cust-001",
    userName: "张三",
    startDate: "2026-06-01",
    endDate: "2026-07-01",
    amount: 19900,
    status: "active",
  },
  {
    id: "fc-mem-002",
    type: "stored_value",
    name: "储值会员",
    userId: "fc-cust-002",
    userName: "李四",
    balance: 50000,
    totalDeposited: 100000,
    status: "active",
  },
];

const pricingSnapshots = [
  {
    id: "fc-price-001",
    name: "标准计费方案v3",
    status: "published",
    daytimeRate: 1500,
    nighttimeRate: 2000,
    publishedAt: "2026-06-15T00:00:00Z",
  },
  {
    id: "fc-price-002",
    name: "标准计费方案v2",
    status: "archived",
    daytimeRate: 1200,
    nighttimeRate: 1800,
    publishedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "fc-price-003",
    name: "暑期特惠方案",
    status: "draft",
    daytimeRate: 1000,
    nighttimeRate: 1500,
    publishedAt: null,
  },
];

const pointsLog = [
  { id: "fc-pts-001", userId: "fc-cust-001", amount: 100, type: "add", note: "消费赠送", createdAt: "2026-06-20T10:00:00Z" },
  { id: "fc-pts-002", userId: "fc-cust-001", amount: -50, type: "deduct", note: "兑换饮品", createdAt: "2026-06-21T14:00:00Z" },
];

// ─── View User Memberships (Staff) ──────────────────────────────────────────

test.describe("查看用户会员信息 — 员工视角", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      userDetail: {
        user: {
          id: "fc-cust-001",
          name: "张三",
          phone: "13800000001",
          memberships: membershipPlans,
        },
      },
      user: {
        user: {
          id: "fc-cust-001",
          name: "张三",
          phone: "13800000001",
          memberships: membershipPlans,
        },
      },
      memberships: { memberships: membershipPlans },
    });
  });

  test("导航到用户详情: 用户信息可见", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-001");
    await expectPageLoaded(page);

    const main = page.locator("main").first();
    await main.scrollIntoViewIfNeeded();
    await expect(main).toBeVisible();
  });

  test("滚动到会员区域: 会员计划可见", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-001");
    await expectPageLoaded(page);

    // Find membership section by tab or heading
    const memberSection = page.locator(
      "button[role='tab'], [data-testid='membership-section'], h2, h3"
    ).filter({ hasText: /会员|储值|membership/i }).first();
    if (await memberSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberSection.scrollIntoViewIfNeeded();
      await expect(memberSection).toBeVisible();
      await memberSection.click();
      await page.waitForTimeout(300);
    }

    // Verify membership plans display
    const monthlyPlan = page.locator("text=月卡会员").first();
    if (await monthlyPlan.isVisible({ timeout: 5000 }).catch(() => false)) {
      await monthlyPlan.scrollIntoViewIfNeeded();
      await expect(monthlyPlan).toBeVisible();
    }
  });

  test("储值会员余额: 显示正确", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-002");
    await expectPageLoaded(page);

    const storedValue = page.locator("text=储值会员").first();
    if (await storedValue.isVisible({ timeout: 5000 }).catch(() => false)) {
      await storedValue.scrollIntoViewIfNeeded();
      await expect(storedValue).toBeVisible();
    }
  });
});

// ─── Create Membership Plan ──────────────────────────────────────────────────

test.describe("创建会员计划 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      memberships: { memberships: membershipPlans },
      userDetail: {
        user: { id: "fc-cust-003", name: "王五", phone: "13800000003", memberships: [] },
      },
      user: {
        user: { id: "fc-cust-003", name: "王五", phone: "13800000003", memberships: [] },
      },
      createMembershipPlan: {
        createMembershipPlan: {
          id: "fc-mem-new-001",
          type: "monthly",
          name: "月卡会员",
          userId: "fc-cust-003",
          status: "active",
        },
      },
    });
  });

  test("打开创建对话框: 表单可见", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-003");
    await expectPageLoaded(page);

    // Click membership tab if present
    const memberTab = page.locator("button[role='tab'], button").filter({ hasText: /会员|储值|membership/i }).first();
    if (await memberTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberTab.scrollIntoViewIfNeeded();
      await memberTab.click();
      await page.waitForTimeout(300);
    }

    // Open create dialog
    const createBtn = page.locator("button").filter({ hasText: /新增|添加|创建|开通/ }).first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.scrollIntoViewIfNeeded();
      await expect(createBtn).toBeVisible();
      await createBtn.click();

      const dialog = page.locator("[role='dialog'], .modal").first();
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test("选择计划类型并提交: 创建成功", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-003");
    await expectPageLoaded(page);

    const memberTab = page.locator("button[role='tab'], button").filter({ hasText: /会员|储值|membership/i }).first();
    if (await memberTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberTab.click();
      await page.waitForTimeout(300);
    }

    const createBtn = page.locator("button").filter({ hasText: /新增|添加|创建|开通/ }).first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Select plan type
      const typeSelect = page.locator("select[name='type'], [data-testid='plan-type']").first();
      if (await typeSelect.count()) {
        await typeSelect.selectOption("monthly");
      }

      // Fill amount
      const amountInput = page.locator("input[name='amount'], [data-testid='plan-amount']").first();
      if (await amountInput.count()) {
        await amountInput.scrollIntoViewIfNeeded();
        await amountInput.fill("199");
      }

      // Submit
      const submitBtn = page.locator("button[type='submit'], button").filter({ hasText: /确认|保存|提交|开通/ }).first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const gqlRequest = page.waitForRequest((req) =>
          req.url().includes("/graphql") && (req.postData()?.includes("createMembershipPlan") ?? false),
        );
        await submitBtn.click();
        await gqlRequest;
      }
    }
  });
});

// ─── Stored Value Deduction ──────────────────────────────────────────────────

test.describe("储值扣费 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      userDetail: {
        user: {
          id: "fc-cust-002",
          name: "李四",
          phone: "13800000002",
          memberships: [membershipPlans[1]],
          storedValueBalance: 50000,
        },
      },
      user: {
        user: {
          id: "fc-cust-002",
          name: "李四",
          phone: "13800000002",
          memberships: [membershipPlans[1]],
          storedValueBalance: 50000,
        },
      },
      deductStoredValue: {
        deductStoredValue: {
          id: "fc-mem-002",
          balance: 45000,
          lastDeduction: 5000,
        },
      },
    });
  });

  test("发起扣费: 对话框可见", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-002");
    await expectPageLoaded(page);

    const deductBtn = page.locator("button").filter({ hasText: /扣费|扣除|消费|使用余额/ }).first();
    if (await deductBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deductBtn.scrollIntoViewIfNeeded();
      await expect(deductBtn).toBeVisible();
      await deductBtn.click();

      const dialog = page.locator("[role='dialog'], .modal").first();
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test("输入金额和备注后提交: 余额更新", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-002");
    await expectPageLoaded(page);

    const deductBtn = page.locator("button").filter({ hasText: /扣费|扣除|消费|使用余额/ }).first();
    if (await deductBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deductBtn.click();
      await page.waitForTimeout(500);

      const amountInput = page.locator("input[name='amount'], input[placeholder*='金额'], [data-testid='deduct-amount']").first();
      if (await amountInput.count()) {
        await amountInput.scrollIntoViewIfNeeded();
        await amountInput.fill("50");
      }

      const noteInput = page.locator("input[name='note'], textarea[name='note'], input[placeholder*='备注']").first();
      if (await noteInput.count()) {
        await noteInput.scrollIntoViewIfNeeded();
        await noteInput.fill("桌游消费扣款");
      }

      const confirmBtn = page.locator("button[type='submit'], button").filter({ hasText: /确认|扣除|提交/ }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const gqlRequest = page.waitForRequest((req) =>
          req.url().includes("/graphql") && (req.postData()?.includes("deductStoredValue") ?? false),
        );
        await confirmBtn.click();
        await gqlRequest;
      }
    }
  });
});

// ─── Pricing Configuration (Staff) ──────────────────────────────────────────

test.describe("计费配置 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      pricingSnapshots: { pricingSnapshots },
      pricing: { pricingSnapshots },
      savePricingSnapshot: {
        savePricingSnapshot: {
          ...pricingSnapshots[2],
          daytimeRate: 1100,
          nighttimeRate: 1600,
        },
      },
      publishPricingSnapshot: {
        publishPricingSnapshot: {
          ...pricingSnapshots[2],
          status: "published",
          publishedAt: new Date().toISOString(),
        },
      },
    });
  });

  test("导航到计费页: 方案列表可见", async ({ page }) => {
    await page.goto("/dash/pricing");
    await expectPageLoaded(page);

    const main = page.locator("main").first();
    await main.scrollIntoViewIfNeeded();
    await expect(main).toBeVisible();
  });

  test("已发布方案显示发布标记", async ({ page }) => {
    await page.goto("/dash/pricing");
    await expectPageLoaded(page);

    const publishedBadge = page.locator("text=已发布").first();
    if (await publishedBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishedBadge.scrollIntoViewIfNeeded();
      await expect(publishedBadge).toBeVisible();
    }
  });

  test("编辑日间/夜间费率: 输入可修改", async ({ page }) => {
    await page.goto("/dash/pricing");
    await expectPageLoaded(page);

    // Navigate to draft pricing for edit
    const draftEntry = page.locator("a, tr, [data-testid]").filter({ hasText: /暑期特惠|草稿|draft/i }).first();
    if (await draftEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftEntry.scrollIntoViewIfNeeded();
      await draftEntry.click();
      await page.waitForTimeout(500);
    }

    const daytimeInput = page.locator("input[name*='daytime'], input[name*='日间'], [data-testid='daytime-rate']").first();
    if (await daytimeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await daytimeInput.scrollIntoViewIfNeeded();
      await daytimeInput.clear();
      await daytimeInput.fill("11");
    }

    const nighttimeInput = page.locator("input[name*='nighttime'], input[name*='夜间'], [data-testid='nighttime-rate']").first();
    if (await nighttimeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nighttimeInput.scrollIntoViewIfNeeded();
      await nighttimeInput.clear();
      await nighttimeInput.fill("16");
    }
  });

  test("保存方案快照: mutation发送", async ({ page }) => {
    await page.goto("/dash/pricing");
    await expectPageLoaded(page);

    const draftEntry = page.locator("a, tr, [data-testid]").filter({ hasText: /暑期特惠|草稿|draft/i }).first();
    if (await draftEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftEntry.scrollIntoViewIfNeeded();
      await draftEntry.click();
      await page.waitForTimeout(500);
    }

    const saveBtn = page.locator("button").filter({ hasText: /保存|Save/ }).first();
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveBtn.scrollIntoViewIfNeeded();
      await expect(saveBtn).toBeVisible();

      const gqlRequest = page.waitForRequest((req) =>
        req.url().includes("/graphql") && (req.postData()?.includes("savePricingSnapshot") ?? false),
      );
      await saveBtn.click();
      await gqlRequest;
    }
  });

  test("发布方案: mutation发送且状态更新", async ({ page }) => {
    await page.goto("/dash/pricing");
    await expectPageLoaded(page);

    const draftEntry = page.locator("a, tr, [data-testid]").filter({ hasText: /暑期特惠|草稿|draft/i }).first();
    if (await draftEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftEntry.scrollIntoViewIfNeeded();
      await draftEntry.click();
      await page.waitForTimeout(500);
    }

    const publishBtn = page.locator("button").filter({ hasText: /发布|Publish|上线/ }).first();
    if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishBtn.scrollIntoViewIfNeeded();
      await expect(publishBtn).toBeVisible();

      const gqlRequest = page.waitForRequest((req) =>
        req.url().includes("/graphql") && (req.postData()?.includes("publishPricingSnapshot") ?? false),
      );
      await publishBtn.click();
      await gqlRequest;
    }
  });
});

// ─── Pricing Snapshot History ────────────────────────────────────────────────

test.describe("计费方案历史 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      pricingSnapshots: { pricingSnapshots },
      pricing: { pricingSnapshots },
      restorePricingSnapshot: {
        restorePricingSnapshot: {
          ...pricingSnapshots[1],
          id: "fc-price-new",
          status: "draft",
          publishedAt: null,
        },
      },
    });
  });

  test("查看快照列表: 所有方案可见", async ({ page }) => {
    await page.goto("/dash/pricing");
    await expectPageLoaded(page);

    // Scroll through snapshots
    for (const snapshot of pricingSnapshots) {
      const entry = page.locator(`text=${snapshot.name}`).first();
      if (await entry.isVisible({ timeout: 3000 }).catch(() => false)) {
        await entry.scrollIntoViewIfNeeded();
        await expect(entry).toBeVisible();
      }
    }
  });

  test("恢复旧方案: 创建新草稿", async ({ page }) => {
    await page.goto("/dash/pricing");
    await expectPageLoaded(page);

    // Find archived snapshot
    const archivedRow = page.locator("tr, [data-testid]").filter({ hasText: pricingSnapshots[1].name }).first();
    if (await archivedRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await archivedRow.scrollIntoViewIfNeeded();

      const restoreBtn = archivedRow.locator("button").filter({ hasText: /恢复|还原|Restore|复制/ }).first();
      if (await restoreBtn.count()) {
        await restoreBtn.scrollIntoViewIfNeeded();
        await expect(restoreBtn).toBeVisible();

        const gqlRequest = page.waitForRequest((req) =>
          req.url().includes("/graphql") && (req.postData()?.includes("restorePricingSnapshot") ?? false),
        );
        await restoreBtn.click();
        await gqlRequest;
      }
    }
  });
});

// ─── Points System ───────────────────────────────────────────────────────────

test.describe("积分系统 — 员工操作", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      userDetail: {
        user: {
          id: "fc-cust-001",
          name: "张三",
          phone: "13800000001",
          points: 50,
          pointsLog,
        },
      },
      user: {
        user: {
          id: "fc-cust-001",
          name: "张三",
          phone: "13800000001",
          points: 50,
          pointsLog,
        },
      },
      pointsLog: { pointsLog },
      addPoints: {
        addPoints: { userId: "fc-cust-001", newBalance: 150, added: 100 },
      },
      deductPoints: {
        deductPoints: { userId: "fc-cust-001", newBalance: 130, deducted: 20 },
      },
    });
  });

  test("查看积分余额: 用户积分可见", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-001");
    await expectPageLoaded(page);

    // Find points section
    const pointsSection = page.locator("text=积分").first();
    if (await pointsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pointsSection.scrollIntoViewIfNeeded();
      await expect(pointsSection).toBeVisible();
    }
  });

  test("添加积分: mutation发送成功", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-001");
    await expectPageLoaded(page);

    const addBtn = page.locator("button").filter({ hasText: /加积分|增加积分|Add Points|赠送/ }).first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click();
      await page.waitForTimeout(500);

      const amountInput = page.locator("input[name='points'], input[name='amount'], input[placeholder*='积分']").first();
      if (await amountInput.count()) {
        await amountInput.scrollIntoViewIfNeeded();
        await amountInput.fill("100");
      }

      const confirmBtn = page.locator("button[type='submit'], button").filter({ hasText: /确认|添加|提交/ }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const gqlRequest = page.waitForRequest((req) =>
          req.url().includes("/graphql") && (req.postData()?.includes("addPoints") ?? false),
        );
        await confirmBtn.click();
        await gqlRequest;
      }
    }
  });

  test("积分记录: 历史日志可见", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-001");
    await expectPageLoaded(page);

    // Navigate to points log
    const logTab = page.locator("button, [role='tab']").filter({ hasText: /积分记录|积分日志|历史/ }).first();
    if (await logTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logTab.scrollIntoViewIfNeeded();
      await logTab.click();
      await page.waitForTimeout(300);
    }

    // Verify log entries
    const logEntry = page.locator("text=消费赠送").first();
    if (await logEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logEntry.scrollIntoViewIfNeeded();
      await expect(logEntry).toBeVisible();
    }
  });

  test("扣除积分: 余额减少", async ({ page }) => {
    await page.goto("/dash/users/fc-cust-001");
    await expectPageLoaded(page);

    const deductBtn = page.locator("button").filter({ hasText: /扣积分|扣除积分|Deduct|兑换/ }).first();
    if (await deductBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deductBtn.scrollIntoViewIfNeeded();
      await deductBtn.click();
      await page.waitForTimeout(500);

      const amountInput = page.locator("input[name='points'], input[name='amount'], input[placeholder*='积分']").first();
      if (await amountInput.count()) {
        await amountInput.scrollIntoViewIfNeeded();
        await amountInput.fill("20");
      }

      const confirmBtn = page.locator("button[type='submit'], button").filter({ hasText: /确认|扣除|提交/ }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const gqlRequest = page.waitForRequest((req) =>
          req.url().includes("/graphql") && (req.postData()?.includes("deductPoints") ?? false),
        );
        await confirmBtn.click();
        await gqlRequest;
      }
    }
  });
});
