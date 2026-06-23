import { expect, type Page } from "@playwright/test";
import { expectPageHealthy } from "../fixtures/vibe.fixture";

export class PublicPage {
  constructor(private readonly page: Page) {}

  async gotoHome(locale = "zh-CN"): Promise<void> {
    await this.page.goto(`/${locale}`);
    await expectPageHealthy(this.page);
  }

  async gotoInventory(locale = "zh-CN"): Promise<void> {
    await this.page.goto(`/${locale}/inventory`);
    await expectPageHealthy(this.page);
  }

  async gotoActives(locale = "zh-CN"): Promise<void> {
    await this.page.goto(`/${locale}/actives`);
    await expectPageHealthy(this.page);
  }

  async gotoRiichi(locale = "zh-CN"): Promise<void> {
    await this.page.goto(`/${locale}/riichi`);
    await expectPageHealthy(this.page);
  }

  async gotoPreferences(locale = "zh-CN"): Promise<void> {
    await this.page.goto(`/${locale}/preferences`);
    await expectPageHealthy(this.page);
  }

  async expectNoServerError(): Promise<void> {
    await expect(this.page.locator("body")).not.toContainText(/Internal server error|500|Unhandled/i);
  }
}
