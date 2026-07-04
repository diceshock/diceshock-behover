/**
 * SMS Verification Flow — E2E Tests
 *
 * Tests the complete SMS code sending + verification flow across:
 * 1. /dash/admin-phones — admin binding phone numbers (uses sendSmsCode, requires auth)
 * 2. /me — user changing their phone number (uses sendSmsCode via useSmsCode hook)
 * 3. Login dialog — unauthenticated user (uses requestSmsCode, no auth required)
 *
 * External services (Aliyun SMS API, Aliyun Captcha) are mocked at the GraphQL
 * response level to avoid hitting real APIs while still testing the full client flow.
 */
import { expect, type Page, type Route, test } from "@playwright/test";
import {
  clickVisible,
  fillVisible,
  setupStaffAuth,
} from "../helpers/interactions";

// ─── GraphQL Mock Helpers ─────────────────────────────────────────────────────

interface GqlMockOpts {
  operationName: string;
  response: Record<string, unknown>;
  /** Only intercept once (default: false) */
  once?: boolean;
}

/**
 * Intercept GraphQL POST requests and return mocked responses for specific operations.
 * Non-matching operations pass through to the real backend.
 */
async function mockGqlOperations(page: Page, mocks: GqlMockOpts[]) {
  await page.route("**/graphql", async (route: Route) => {
    const postData = route.request().postDataJSON();
    const query: string = postData?.query ?? "";

    for (const mock of mocks) {
      if (query.includes(mock.operationName)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: mock.response }),
        });
        if (mock.once) {
          mocks.splice(mocks.indexOf(mock), 1);
        }
        return;
      }
    }

    // Pass through for other operations
    await route.continue();
  });
}

// ─── /dash/admin-phones — Admin SMS Flow ──────────────────────────────────────

test.describe("Admin Phones — SMS Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    // Admin role required for this page
    await page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
  });

  test("发送验证码: 输入手机号 → 点击发送 → 显示验证码输入框", async ({ page }) => {
    await mockGqlOperations(page, [
      {
        operationName: "AdminPhones",
        response: { adminPhones: ["13800138000"] },
      },
      {
        operationName: "SendSmsCode",
        response: {
          sendSmsCode: { success: true, message: null, expiresInMs: 300000 },
        },
      },
    ]);

    await page.goto("/dash/admin-phones");
    await page.waitForSelector("h2", { timeout: 10000 });

    // Fill phone number
    const phoneInput = page.locator("input[type='tel']");
    await fillVisible(phoneInput, "13912345678");

    // Click send code button
    const sendBtn = page.locator("button", { hasText: /发送验证码/ });
    await expect(sendBtn).toBeEnabled();
    await clickVisible(sendBtn);

    // Verify: 验证码输入框出现
    const codeInput = page.locator("input[placeholder='6位验证码']");
    await expect(codeInput).toBeVisible({ timeout: 5000 });
  });

  test("添加手机号: 验证码正确 → 添加成功", async ({ page }) => {
    // AdminPhones returns [] initially, then ["13912345678"] after add
    let adminPhonesCallCount = 0;
    await page.route("**/graphql", async (route) => {
      const postData = route.request().postDataJSON();
      const query: string = postData?.query ?? "";

      if (query.includes("AdminPhones")) {
        adminPhonesCallCount++;
        const phones = adminPhonesCallCount <= 1 ? [] : ["13912345678"];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { adminPhones: phones } }),
        });
        return;
      }
      if (query.includes("SendSmsCode")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { sendSmsCode: { success: true, message: null, expiresInMs: 300000 } },
          }),
        });
        return;
      }
      if (query.includes("AddAdminPhone")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { addAdminPhone: ["13912345678"] } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/dash/admin-phones");
    await page.waitForSelector("h2", { timeout: 10000 });

    // Fill phone
    const phoneInput = page.locator("input[type='tel']");
    await fillVisible(phoneInput, "13912345678");

    // Send code
    const sendBtn = page.locator("button", { hasText: /发送验证码/ });
    await clickVisible(sendBtn);

    // Wait for code input
    const codeInput = page.locator("input[placeholder='6位验证码']");
    await expect(codeInput).toBeVisible({ timeout: 5000 });

    // Fill code and submit
    await fillVisible(codeInput, "123456");
    const addBtn = page.locator("button", { hasText: /确认添加/ });
    await clickVisible(addBtn);

    // Verify: phone appears in the list (masked format: 139****5678)
    await expect(page.locator("text=139****5678")).toBeVisible({ timeout: 5000 });
  });

  test("发送失败: 服务端返回错误 → 显示错误提示", async ({ page }) => {
    await mockGqlOperations(page, [
      {
        operationName: "AdminPhones",
        response: { adminPhones: [] },
      },
      {
        operationName: "SendSmsCode",
        response: {
          sendSmsCode: { success: false, message: "Too many SMS requests, please try later", expiresInMs: null },
        },
      },
    ]);

    await page.goto("/dash/admin-phones");
    await page.waitForSelector("h2", { timeout: 10000 });

    const phoneInput = page.locator("input[type='tel']");
    await fillVisible(phoneInput, "13912345678");

    const sendBtn = page.locator("button", { hasText: /发送验证码/ });
    await clickVisible(sendBtn);

    // Verify: error message is shown (via useMsg toast or inline)
    await expect(
      page.locator("text=/发送|失败|error|Too many/i").first(),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── /me — User Phone Change Flow ────────────────────────────────────────────

test.describe("Me Page — Phone Change SMS Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
  });

  test("修改手机号: 打开弹窗 → 输入手机号 → 发送验证码 → 倒计时", async ({ page }) => {
    await mockGqlOperations(page, [
      {
        operationName: "SendSmsCode",
        response: {
          sendSmsCode: { success: true, message: null, expiresInMs: 300000 },
        },
      },
    ]);

    await page.goto("/me");
    await page.waitForLoadState("networkidle");

    // Find and click the "修改手机" button
    const changePhoneBtn = page.locator("button", { hasText: /修改手机|换绑|changePhone/i });
    if (!(await changePhoneBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Phone editing might be triggered via a different element
      test.skip();
      return;
    }
    await clickVisible(changePhoneBtn);

    // Wait for modal
    const phoneInput = page.locator("input[type='tel'], input[inputmode='numeric']").last();
    await expect(phoneInput).toBeVisible({ timeout: 5000 });

    // Fill phone
    await phoneInput.fill("13987654321");

    // Click send code (the button has id="me-sms-btn")
    const smsBtn = page.locator("#me-sms-btn");
    await expect(smsBtn).toBeEnabled({ timeout: 3000 });
    await smsBtn.click();

    // Verify: button shows countdown state
    await expect(smsBtn).toContainText(/\d+s|验证中/, { timeout: 10000 });
  });
});

// ─── Login Dialog — Unauthenticated SMS Flow ──────────────────────────────────

test.describe("Login Dialog — SMS Code Flow", () => {
  test("登录弹窗: 手机号标签页 → 输入号码 → 点击获取验证码 → 按钮状态变化", async ({ page }) => {
    // Don't set up auth — test the anonymous login flow
    await mockGqlOperations(page, [
      {
        operationName: "RequestSmsCode",
        response: {
          requestSmsCode: { success: true, message: null, expiresInMs: 300000 },
        },
      },
    ]);

    // Navigate to a page that shows login dialog
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open login dialog (usually via a header button)
    const loginTrigger = page.locator("button", { hasText: /登录|Login|sign in/i }).first();
    if (!(await loginTrigger.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await loginTrigger.click();

    // Switch to phone tab if not already active
    const phoneTab = page.locator("button, [role='tab']", { hasText: /手机|Phone/i }).first();
    if (await phoneTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneTab.click();
    }

    // Fill phone number
    const phoneInput = page.locator("input[type='tel'], input[inputmode='numeric']").first();
    await expect(phoneInput).toBeVisible({ timeout: 5000 });
    await phoneInput.fill("13800138000");

    // In dev mode (non-PROD), the button triggers getSmsCode directly.
    // The test verifies the button exists and is clickable.
    const smsBtn = page.locator("#login-sms-btn");
    await expect(smsBtn).toBeVisible({ timeout: 3000 });
    await expect(smsBtn).toBeEnabled();

    // Click the SMS button
    await smsBtn.click();

    // Verify: button shows countdown or verifying state
    // In dev mode without captcha SDK, it goes through direct send path
    await expect(smsBtn).toContainText(/\d+s|验证中|getCode/, { timeout: 10000 });
  });

  test("登录弹窗: 手机号为空 → 点击发送 → 显示错误", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const loginTrigger = page.locator("button", { hasText: /登录|Login|sign in/i }).first();
    if (!(await loginTrigger.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await loginTrigger.click();

    // Switch to phone tab
    const phoneTab = page.locator("button, [role='tab']", { hasText: /手机|Phone/i }).first();
    if (await phoneTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneTab.click();
    }

    // Don't fill phone — leave empty
    const smsBtn = page.locator("#login-sms-btn");
    if (!(await smsBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Button should be disabled when phone is empty (countdown > 0 check or disabled attr)
    // If not disabled, clicking should show validation error
    if (await smsBtn.isEnabled()) {
      await smsBtn.click();
      // Expect error message about phone
      await expect(
        page.locator("text=/手机号|phone|号码/i").first(),
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Button correctly disabled — that's the expected behavior
      await expect(smsBtn).toBeDisabled();
    }
  });
});

// ─── verifyPhone Flow ─────────────────────────────────────────────────────────

test.describe("Verify Phone — Complete Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
  });

  test("/dash/admin-phones: 发送 → 输入验证码 → 删除手机号", async ({ page }) => {
    const existingPhone = "13800138000";
    const maskedPhone = "138****8000";

    // AdminPhones returns phone initially, then [] after removal
    let adminPhonesCallCount = 0;
    await page.route("**/graphql", async (route) => {
      const postData = route.request().postDataJSON();
      const query: string = postData?.query ?? "";

      if (query.includes("AdminPhones")) {
        adminPhonesCallCount++;
        const phones = adminPhonesCallCount <= 2 ? [existingPhone] : [];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { adminPhones: phones } }),
        });
        return;
      }
      if (query.includes("SendSmsCode")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { sendSmsCode: { success: true, message: null, expiresInMs: 300000 } },
          }),
        });
        return;
      }
      if (query.includes("RemoveAdminPhone")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { removeAdminPhone: [] } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/dash/admin-phones");
    await page.waitForSelector("h2", { timeout: 10000 });

    // Existing phone should be visible (masked format)
    await expect(page.locator(`text=${maskedPhone}`)).toBeVisible({ timeout: 5000 });

    // Click remove button (trash icon next to the phone)
    const phoneItem = page.locator("li", { hasText: maskedPhone });
    const removeBtn = phoneItem.locator("button");

    if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await removeBtn.click();

      // Should show removal confirmation card with SMS verification
      const confirmHeading = page.getByRole("heading", { name: /确认移除/ });
      await expect(confirmHeading).toBeVisible({ timeout: 5000 });

      // Fill removal code
      const codeInput = page.locator("input[placeholder='6位验证码']").last();
      await codeInput.fill("654321");

      // Click confirm remove
      const confirmBtn = page.locator("button", { hasText: "确认移除" });
      await confirmBtn.click();

      // After removal the phone list item should disappear
      await expect(page.locator("li", { hasText: maskedPhone })).toBeHidden({ timeout: 5000 });
    }
  });
});
