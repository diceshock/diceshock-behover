import { expect, type Page } from "@playwright/test";
import { expectPageHealthy } from "../fixtures/vibe.fixture";

export class DashPage {
  constructor(private readonly page: Page) {}

  async gotoDashboard(): Promise<void> {
    await this.page.goto("/dash");
    await expectPageHealthy(this.page);
  }

  async gotoUsers(): Promise<void> {
    await this.page.goto("/dash/users");
    await expectPageHealthy(this.page);
  }

  async gotoTables(): Promise<void> {
    await this.page.goto("/dash/tables");
    await expectPageHealthy(this.page);
  }

  async gotoOrders(): Promise<void> {
    await this.page.goto("/dash/orders");
    await expectPageHealthy(this.page);
  }

  async expectAnonymousAccessBlocked(): Promise<void> {
    const body = this.page.locator("body");
    await expect(body).toBeVisible();
    await expect(body).not.toContainText(/批量结算|用户管理|桌台管理|订单管理/i);

    const currentUrl = new URL(this.page.url());
    const redirectedAwayFromDashboard = !currentUrl.pathname.startsWith("/dash");
    if (redirectedAwayFromDashboard) return;

    await expect(body).toContainText(/403|Forbidden|未授权|登录|login|sign in/i);
  }
}
