import { test, expect } from "../fixtures/vibe.fixture";
import { DashPage } from "../pages/dash.page";
import { PublicPage } from "../pages/public.page";

test.describe("Playwright public and dashboard page flows", () => {
  test("public discovery pages load without server errors", async ({ page }) => {
    const publicPage = new PublicPage(page);

    await publicPage.gotoHome();
    await publicPage.expectNoServerError();

    await publicPage.gotoInventory();
    await publicPage.expectNoServerError();

    await publicPage.gotoActives();
    await publicPage.expectNoServerError();

    await publicPage.gotoRiichi();
    await publicPage.expectNoServerError();
  });

  test("dashboard guard blocks anonymous access", async ({ page }) => {
    const dashPage = new DashPage(page);
    await dashPage.gotoDashboard();
    await dashPage.expectAnonymousAccessBlocked();
  });

  test("store and locale preferences page is browser-executable", async ({ page }) => {
    const publicPage = new PublicPage(page);
    await publicPage.gotoPreferences();
    await publicPage.expectNoServerError();
    await expect(page.locator("body")).toBeVisible();
  });
});
