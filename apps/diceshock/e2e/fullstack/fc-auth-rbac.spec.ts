import { test, expect, type Page } from "@playwright/test";

/**
 * Auth & RBAC E2E Test Suite
 * Tests SMS login flow, role-based access control, session management, and multi-user isolation
 */

// ============================================================================
// Auth Mock Helpers
// ============================================================================

async function setupStaffAuth(page: Page, staffId = "fc-staff-001", name = "赵店长", storeId = "store-fc-gg") {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "staff" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: staffId, name, role: "staff", preferredStoreId: storeId },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

async function setupAdminAuth(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "fc-staff-003", name: "孙管理员", role: "admin", preferredStoreId: "store-fc-gg" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

async function setupCustomerAuth(page: Page, id = "fc-cust-001", name = "张三") {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "customer" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id, name, role: "customer", preferredStoreId: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}

async function setupExpiredAuth(page: Page) {
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Session expired" }),
    });
  });
}

async function mockGraphQL(page: Page, mocks: Record<string, unknown>) {
  await page.route("**/graphql", async (route) => {
    const body = route.request().postDataJSON();
    const query = (body?.query as string) ?? "";
    for (const [key, value] of Object.entries(mocks)) {
      if (query.includes(key)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: typeof value === "function" ? (value as Function)(body) : value }),
        });
        return;
      }
    }
    await route.continue();
  });
}

async function mockUnauthenticatedGraphQL(page: Page) {
  await page.route("**/graphql", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ errors: [{ message: "Unauthorized" }] }),
    });
  });
}

// ============================================================================
// Scroll and Visibility Helpers
// ============================================================================

async function scrollAndClick(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await expect(el).toBeVisible();
  await el.click();
}

async function scrollAndVerifyVisible(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await expect(el).toBeVisible();
}

async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Internal server error|500|Unhandled/i);
}

// ============================================================================
// Test Suite: SMS Login Flow
// ============================================================================

test.describe("SMS Login Flow", () => {
  test("should display login form after navigation and scroll", async ({ page }) => {
    await page.goto("/");
    await expectPageLoaded(page);

    // Navigate to login page
    const loginLink = page.locator('a[href*="/login"], button:has-text("登录"), a:has-text("登录")').first();
    if (await loginLink.isVisible()) {
      await scrollAndClick(page, 'a[href*="/login"], button:has-text("登录"), a:has-text("登录")');
    } else {
      await page.goto("/login");
    }

    await expectPageLoaded(page);

    // Verify login form elements are visible after scroll
    await scrollAndVerifyVisible(page, 'input[type="tel"], input[placeholder*="手机"], input[name*="phone"]');
    await scrollAndVerifyVisible(page, 'button:has-text("发送"), button:has-text("获取验证码"), button[type="button"]');
  });

  test("should complete SMS login flow with GraphQL mocks", async ({ page }) => {
    // Mock SMS code request
    await mockGraphQL(page, {
      sendSmsCode: {
        sendSmsCode: {
          success: true,
          message: "验证码已发送",
        },
      },
      verifySmsCode: {
        verifySmsCode: {
          success: true,
          token: "mock-jwt-token-staff-001",
          user: {
            id: "fc-staff-001",
            name: "赵店长",
            role: "staff",
            preferredStoreId: "store-fc-gg",
          },
        },
      },
    });

    await page.goto("/login");
    await expectPageLoaded(page);

    // Fill phone number
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"], input[name*="phone"]').first();
    await phoneInput.scrollIntoViewIfNeeded();
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill("13800138000");

    // Request SMS code
    const sendButton = page.locator('button:has-text("发送"), button:has-text("获取验证码")').first();
    await sendButton.scrollIntoViewIfNeeded();
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // Wait for SMS sent confirmation
    await page.waitForTimeout(500);

    // Fill SMS code
    const codeInput = page.locator('input[type="text"][maxlength="6"], input[placeholder*="验证码"], input[name*="code"]').first();
    await codeInput.scrollIntoViewIfNeeded();
    await expect(codeInput).toBeVisible();
    await codeInput.fill("123456");

    // Submit login
    const submitButton = page.locator('button[type="submit"]:has-text("登录"), button:has-text("确认"), button:has-text("提交")').first();
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeVisible();

    // Mock successful auth session after login
    await setupStaffAuth(page);

    await submitButton.click();

    // Verify redirect to dashboard
    await page.waitForURL("**/dash**", { timeout: 5000 });
    await expectPageLoaded(page);
    expect(page.url()).toContain("/dash");
  });

  test("should persist session after page reload", async ({ page }) => {
    // Setup authenticated session
    await setupStaffAuth(page);
    await page.goto("/dash");
    await expectPageLoaded(page);

    // Verify dashboard is accessible
    await expect(page.locator("body")).toContainText(/仪表板|Dashboard|工作台|订单|桌台/);

    // Reload page
    await page.reload();
    await expectPageLoaded(page);

    // Verify still on dashboard (session persisted)
    expect(page.url()).toContain("/dash");
    await expect(page.locator("body")).toContainText(/仪表板|Dashboard|工作台|订单|桌台/);
  });
});

// ============================================================================
// Test Suite: RBAC Access Control
// ============================================================================

test.describe("RBAC Access Control", () => {
  test("should deny customer access to /dash and redirect", async ({ page }) => {
    await setupCustomerAuth(page);

    // Mock GraphQL to return customer data
    await mockGraphQL(page, {
      currentUser: {
        currentUser: {
          id: "fc-cust-001",
          name: "张三",
          role: "customer",
        },
      },
    });

    await page.goto("/dash");
    await page.waitForLoadState("domcontentloaded");

    // Should redirect or show 403
    await page.waitForTimeout(1000);
    const url = page.url();
    const bodyText = await page.locator("body").textContent();

    const isRedirected = !url.includes("/dash") || url.includes("/login");
    const hasForbidden = bodyText?.includes("403") || bodyText?.includes("权限") || bodyText?.includes("无权访问") || bodyText?.includes("Forbidden");

    expect(isRedirected || hasForbidden).toBeTruthy();
  });

  test("should hide admin navigation from customer", async ({ page }) => {
    await setupCustomerAuth(page);
    await page.goto("/");
    await expectPageLoaded(page);

    // Scroll through page to check for admin links
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // Verify no admin navigation items
    const adminLinks = page.locator('a[href*="/dash"], a:has-text("管理"), a:has-text("后台"), a:has-text("仪表板")');
    const count = await adminLinks.count();

    // If any exist, verify they're not visible
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const link = adminLinks.nth(i);
        const isVisible = await link.isVisible().catch(() => false);
        expect(isVisible).toBeFalsy();
      }
    }
  });

  test("should allow staff to access /dash/users", async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      users: {
        users: [
          { id: "fc-cust-001", name: "张三", phone: "13800138001", role: "customer" },
          { id: "fc-cust-002", name: "李四", phone: "13800138002", role: "customer" },
        ],
      },
    });

    await page.goto("/dash/users");
    await expectPageLoaded(page);

    // Verify users page loaded
    expect(page.url()).toContain("/dash/users");

    // Verify user list is visible
    await scrollAndVerifyVisible(page, 'body:has-text("张三"), body:has-text("用户"), body:has-text("客户"), table, [role="table"]');
  });

  test("should allow staff to access /dash/orders", async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      orders: {
        orders: [
          { id: "fc-ord-001", customerId: "fc-cust-001", total: 15000, status: "COMPLETED" },
          { id: "fc-ord-002", customerId: "fc-cust-002", total: 8000, status: "PENDING" },
        ],
      },
    });

    await page.goto("/dash/orders");
    await expectPageLoaded(page);

    expect(page.url()).toContain("/dash/orders");
    await scrollAndVerifyVisible(page, 'body:has-text("订单"), table, [role="table"]');
  });

  test("should allow staff to access /dash/tables", async ({ page }) => {
    await setupStaffAuth(page);
    await mockGraphQL(page, {
      tables: {
        tables: [
          { id: "fc-table-001", code: "FCA1", status: "OCCUPIED", storeId: "store-fc-gg" },
          { id: "fc-table-002", code: "FCA2", status: "AVAILABLE", storeId: "store-fc-gg" },
        ],
      },
    });

    await page.goto("/dash/tables");
    await expectPageLoaded(page);

    expect(page.url()).toContain("/dash/tables");
    await scrollAndVerifyVisible(page, 'body:has-text("桌台"), body:has-text("FCA"), body:has-text("座位")');
  });

  test("should allow admin to access user role management", async ({ page }) => {
    await setupAdminAuth(page);
    await mockGraphQL(page, {
      users: {
        users: [
          { id: "fc-staff-001", name: "赵店长", role: "staff", phone: "13800138101" },
          { id: "fc-staff-002", name: "钱店员", role: "staff", phone: "13800138102" },
        ],
      },
      updateUserRole: (body: { variables?: { userId?: string; role?: string } }) => ({
        updateUserRole: {
          id: body.variables?.userId,
          role: body.variables?.role,
        },
      }),
    });

    await page.goto("/dash/users");
    await expectPageLoaded(page);

    // Look for role edit controls (buttons, selects, etc.)
    const roleControls = page.locator('button:has-text("编辑"), button:has-text("修改"), select[name*="role"], [data-testid*="role"]');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const count = await roleControls.count();
    if (count > 0) {
      // Admin should see role management controls
      await roleControls.first().scrollIntoViewIfNeeded();
      await expect(roleControls.first()).toBeVisible();
    } else {
      // At minimum, verify admin can access user management page
      expect(page.url()).toContain("/dash/users");
    }
  });

  test("should enforce store isolation for staff from different stores", async ({ page }) => {
    // Staff from store-jdk
    await setupStaffAuth(page, "fc-staff-002", "钱店员", "store-fc-jdk");

    await mockGraphQL(page, {
      tables: {
        tables: [
          { id: "fc-table-006", code: "FCB1", status: "AVAILABLE", storeId: "store-fc-jdk" },
        ],
      },
      orders: {
        orders: [
          { id: "fc-ord-003", storeId: "store-fc-jdk", total: 12000 },
        ],
      },
    });

    await page.goto("/dash/tables");
    await expectPageLoaded(page);

    // Should see store-jdk data
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await expect(page.locator("body")).toContainText(/FCB1|街道口/);

    // Should NOT see store-gg exclusive data (FCA tables)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("FCA1");
    expect(bodyText).not.toContain("FCA2");
  });
});

// ============================================================================
// Test Suite: Session Expiry
// ============================================================================

test.describe("Session Expiry", () => {
  test("should redirect to login when session expires", async ({ page }) => {
    // Start with valid session
    await setupStaffAuth(page);
    await page.goto("/dash");
    await expectPageLoaded(page);
    expect(page.url()).toContain("/dash");

    // Now mock expired session
    await setupExpiredAuth(page);

    // Navigate to another page or reload
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Should redirect to login
    const url = page.url();
    expect(url.includes("/login") || url.includes("/auth") || !url.includes("/dash")).toBeTruthy();
  });

  test("should return 401 for GraphQL when unauthenticated", async ({ page }) => {
    await setupExpiredAuth(page);
    await mockUnauthenticatedGraphQL(page);

    let graphqlResponse: { status: number } | null = null;

    page.on("response", (response) => {
      if (response.url().includes("/graphql")) {
        graphqlResponse = { status: response.status() };
      }
    });

    await page.goto("/dash/orders");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    // Verify 401 was returned (nullable access to account for timing)
    expect((graphqlResponse as { status: number } | null)?.status).toBe(401);
  });
});

// ============================================================================
// Test Suite: Multi-user Isolation
// ============================================================================

test.describe("Multi-user Isolation", () => {
  test("should show different preferredStoreId for different staff", async ({ page }) => {
    // First staff: store-gg
    await setupStaffAuth(page, "fc-staff-001", "赵店长", "store-fc-gg");
    await mockGraphQL(page, {
      currentUser: {
        currentUser: {
          id: "fc-staff-001",
          name: "赵店长",
          role: "staff",
          preferredStoreId: "store-fc-gg",
        },
      },
    });

    await page.goto("/dash");
    await expectPageLoaded(page);

    // Check for store indicator
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const bodyText1 = await page.locator("body").textContent();

    // Should see gg store indicator
    expect(bodyText1).toMatch(/光谷|store-fc-gg/);

    // Now switch to second staff: store-jdk
    await page.context().clearCookies();
    await setupStaffAuth(page, "fc-staff-002", "钱店员", "store-fc-jdk");
    await mockGraphQL(page, {
      currentUser: {
        currentUser: {
          id: "fc-staff-002",
          name: "钱店员",
          role: "staff",
          preferredStoreId: "store-fc-jdk",
        },
      },
    });

    await page.goto("/dash");
    await expectPageLoaded(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const bodyText2 = await page.locator("body").textContent();

    // Should see jdk store indicator
    expect(bodyText2).toMatch(/街道口|store-fc-jdk/);
  });

  test("should deny customer token for staff API access", async ({ page }) => {
    await setupCustomerAuth(page);

    // Mock GraphQL to reject customer attempting staff query
    await page.route("**/graphql", async (route) => {
      const body = route.request().postDataJSON();
      const query = (body?.query as string) ?? "";

      if (query.includes("updateUserRole") || query.includes("deleteUser") || query.includes("staffOnly")) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "Forbidden: insufficient permissions" }],
          }),
        });
        return;
      }

      await route.continue();
    });

    let graphqlError: { status: number; body: string } | null = null;

    page.on("response", async (response) => {
      if (response.url().includes("/graphql")) {
        if (response.status() === 403) {
          graphqlError = {
            status: response.status(),
            body: await response.text(),
          };
        }
      }
    });

    // Attempt to access staff API via GraphQL
    await page.goto("/dash/users");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Either redirected or got 403 on GraphQL
    const url = page.url();
    const isBlocked = !url.includes("/dash") || (graphqlError as { status: number } | null)?.status === 403;
    expect(isBlocked).toBeTruthy();
  });

  test("should isolate customer data across different customer logins", async ({ page }) => {
    // First customer
    await setupCustomerAuth(page, "fc-cust-001", "张三");
    await mockGraphQL(page, {
      myOrders: {
        myOrders: [
          { id: "fc-ord-001", customerId: "fc-cust-001", total: 15000 },
        ],
      },
    });

    await page.goto("/my/orders");
    await expectPageLoaded(page);

    if (page.url().includes("/my/orders")) {
      const bodyText1 = await page.locator("body").textContent();
      expect(bodyText1).toContain("fc-ord-001");

      // Switch to second customer
      await page.context().clearCookies();
      await setupCustomerAuth(page, "fc-cust-005", "周七");
      await mockGraphQL(page, {
        myOrders: {
          myOrders: [
            { id: "fc-ord-005", customerId: "fc-cust-005", total: 9000 },
          ],
        },
      });

      await page.goto("/my/orders");
      await expectPageLoaded(page);

      const bodyText2 = await page.locator("body").textContent();

      // Should see only second customer's order
      expect(bodyText2).toContain("fc-ord-005");
      expect(bodyText2).not.toContain("fc-ord-001");
    }
  });
});
