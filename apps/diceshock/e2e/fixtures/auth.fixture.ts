import { test as base, expect, type Page } from "@playwright/test";

export interface AuthFixtures {
  mockStaffSession: void;
  mockAdminSession: void;
  mockAnonymousSession: void;
}

function setupAuthBypass(page: Page, role: "admin" | "staff" | null) {
  if (role) {
    page.setExtraHTTPHeaders({ "X-Test-Role": role });
  }
  page.route("/api/auth/session", async (route) => {
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
      setupAuthBypass(page, "staff");
      await use();
    },
    { auto: false },
  ],

  mockAdminSession: [
    async ({ page }, use) => {
      setupAuthBypass(page, "admin");
      await use();
    },
    { auto: false },
  ],

  mockAnonymousSession: [
    async ({ page }, use) => {
      setupAuthBypass(page, null);
      await use();
    },
    { auto: false },
  ],
});

export { expect };
