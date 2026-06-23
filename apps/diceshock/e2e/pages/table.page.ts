import { expect, type Page } from "@playwright/test";
import { expectPageHealthy } from "../fixtures/vibe.fixture";

export class TablePage {
  constructor(private readonly page: Page) {}

  async gotoTable(code: string, locale = "zh-CN"): Promise<void> {
    await this.page.goto(`/${locale}/t/${code}`);
    await expectPageHealthy(this.page);
  }

  async gotoReady(code: string, locale = "zh-CN"): Promise<void> {
    await this.page.goto(`/${locale}/ready/${code}`);
    await expectPageHealthy(this.page);
  }

  async expectTableLikePage(): Promise<void> {
    await expect(this.page.locator("body")).toContainText(/桌|table|ready|准备|扫码|座/i);
  }
}
