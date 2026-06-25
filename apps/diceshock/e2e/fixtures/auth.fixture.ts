import { test as base, expect } from "@playwright/test";

export interface AuthFixtures {
  mockStaffSession: void;
  mockAdminSession: void;
  mockAnonymousSession: void;
}

export const test = base.extend<AuthFixtures>({
  mockStaffSession: [
    async ({ page }, use) => {
      await page.setExtraHTTPHeaders({ "X-Test-Role": "staff" });
      await page.route("/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "e2e-test-staff-001",
              name: "测试店员",
              role: "staff",
              preferredStoreId: "store-e2e-gg",
            },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });
      await use();
    },
    { auto: false },
  ],
  mockAdminSession: [
    async ({ page }, use) => {
      await page.setExtraHTTPHeaders({ "X-Test-Role": "admin" });
      await page.route("/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "e2e-test-staff-001",
              name: "测试店员",
              role: "admin",
              preferredStoreId: "store-e2e-gg",
            },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
      });
      await use();
    },
    { auto: false },
  ],
  mockAnonymousSession: [
    async ({ page }, use) => {
      await use();
    },
    { auto: false },
  ],
});

export { expect };
