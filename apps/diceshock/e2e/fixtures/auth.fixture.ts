import { test as base, expect, type Page } from "@playwright/test";

/**
 * Auth fixture that mocks /api/auth/session to return a staff role,
 * allowing dash page tests to bypass the real auth.guard.
 *
 * Usage:
 *   import { test, expect } from "../fixtures/auth.fixture";
 *
 *   test("dash page renders", async ({ page, mockStaffSession }) => {
 *     await page.goto("/dash/orders");
 *   });
 */

export interface AuthFixtures {
  mockStaffSession: void;
  mockAdminSession: void;
  mockAnonymousSession: void;
}

async function mockSession(page: Page, role: "admin" | "staff" | null) {
  await page.route("/api/auth/session", async (route) => {
    if (role) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: `test-${role}-001`,
            name: `Test ${role}`,
            email: `${role}@diceshock.test`,
            role,
            preferredStoreId: "demo",
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }
  });
}

export const test = base.extend<AuthFixtures>({
  mockStaffSession: [
    async ({ page }, use) => {
      await mockSession(page, "staff");
      await use();
    },
    { auto: false },
  ],

  mockAdminSession: [
    async ({ page }, use) => {
      await mockSession(page, "admin");
      await use();
    },
    { auto: false },
  ],

  mockAnonymousSession: [
    async ({ page }, use) => {
      await mockSession(page, null);
      await use();
    },
    { auto: false },
  ],
});

export { expect };
