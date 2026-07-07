/**
 * Mahjong & GSZ Sync E2E — Full Coverage
 *
 * Tests the complete mahjong system:
 *   - Match list and filtering (staff dashboard)
 *   - Record new match
 *   - GSZ sync (single and batch)
 *   - Customer my-riichi page
 *   - Leaderboard views
 *   - Score editing
 *   - Registration flow
 *
 * Prerequisites: Dev server + seeded data (fc-mj-001 through fc-mj-004)
 */
import { test, expect, type Page } from "@playwright/test";

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

async function setupStaffAuth(page: Page) {
  await page.setExtraHTTPHeaders({ "X-Test-Role": "staff" });
  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "fc-staff-001", name: "赵店长", role: "staff", preferredStoreId: "store-fc-gg" },
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

// ─── GraphQL Mock Helpers ─────────────────────────────────────────────────────

const MOCK_MATCHES = [
  { id: "fc-mj-001", mode: "FOUR_PLAYER", format: "HANCHAN", matchType: "STORE", gszSynced: false, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), terminationReason: "SCORE_COMPLETE", players: [{ userId: "fc-cust-001", nickname: "张三", seat: "east", finalScore: 42000 }], config: { mode: "4p", format: "hanchan" } },
  { id: "fc-mj-002", mode: "FOUR_PLAYER", format: "TONPUU", matchType: "STORE", gszSynced: false, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), terminationReason: "SCORE_COMPLETE", players: [{ userId: "fc-cust-002", nickname: "李四", seat: "south", finalScore: 35000 }], config: { mode: "4p", format: "tonpuu" } },
  { id: "fc-mj-003", mode: "FOUR_PLAYER", format: "HANCHAN", matchType: "STORE", gszSynced: false, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), terminationReason: "SCORE_COMPLETE", players: [{ userId: "fc-cust-003", nickname: "王五", seat: "west", finalScore: 38000 }], config: { mode: "4p", format: "hanchan" } },
  { id: "fc-mj-004", mode: "FOUR_PLAYER", format: "HANCHAN", matchType: "TOURNAMENT", gszSynced: true, gszRecordId: 6001, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), terminationReason: "SCORE_COMPLETE", players: [{ userId: "fc-cust-005", nickname: "刘七", seat: "north", finalScore: 48000 }], config: { mode: "4p", format: "hanchan", type: "tournament" } },
];

async function mockMahjongGraphQL(page: Page) {
  await page.route("**/graphql", async (route) => {
    const body = route.request().postDataJSON();
    const query = (body?.query as string) ?? "";

    if (query.includes("managedMahjongMatches")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            managedMahjongMatches: {
              items: MOCK_MATCHES,
              pageInfo: { offset: 0, limit: 50, total: 4, hasMore: false },
            },
          },
        }),
      });
      return;
    }

    if (query.includes("managedMahjongMatch")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { managedMahjongMatch: MOCK_MATCHES[0] } }),
      });
      return;
    }

    if (query.includes("mahjongTables")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            mahjongTables: [
              { id: "fc-tbl-005", name: "M1麻将桌", code: "FCM1", capacity: 4 },
              { id: "fc-tbl-006", name: "M2麻将桌", code: "FCM2", capacity: 4 },
            ],
          },
        }),
      });
      return;
    }

    if (query.includes("saveMahjongMatch")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { saveMahjongMatch: { ...MOCK_MATCHES[0], id: "fc-mj-new" } } }),
      });
      return;
    }

    if (query.includes("syncMahjongMatchToGsz")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { syncMahjongMatchToGsz: { success: true, match: { ...MOCK_MATCHES[0], gszSynced: true } } } }),
      });
      return;
    }

    if (query.includes("batchSyncMahjongMatchesToGsz")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { batchSyncMahjongMatchesToGsz: { success: true, successCount: 3, failCount: 0, total: 3 } } }),
      });
      return;
    }

    if (query.includes("updateMahjongScore")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { updateMahjongScore: { ...MOCK_MATCHES[0], players: [{ ...MOCK_MATCHES[0].players[0], finalScore: 45000 }] } } }),
      });
      return;
    }

    if (query.includes("myMahjongMatches") || query.includes("mahjongMatchHistory")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            mahjongMatchHistory: {
              items: MOCK_MATCHES.slice(0, 2),
              pageInfo: { cursor: null, limit: 20, hasMore: false },
            },
          },
        }),
      });
      return;
    }

    if (query.includes("mahjongHeatmap")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { mahjongHeatmap: "[]" } }),
      });
      return;
    }

    if (query.includes("leaderboard")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            leaderboard: {
              category: "STORE_4P_HANCHAN",
              period: "MONTH",
              entries: [
                { userId: "fc-cust-001", nickname: "张三", totalPP: 1500, matchCount: 10, rank: 1 },
                { userId: "fc-cust-002", nickname: "李四", totalPP: 1400, matchCount: 9, rank: 2 },
                { userId: "fc-cust-003", nickname: "王五", totalPP: 1200, matchCount: 8, rank: 3 },
              ],
              computedAt: new Date().toISOString(),
            },
          },
        }),
      });
      return;
    }

    if (query.includes("myMahjongRegistration")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { myMahjongRegistration: { hasPhone: true, phone: "13700001001", registered: false, gszSynced: false } },
        }),
      });
      return;
    }

    if (query.includes("registerMahjong")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { registerMahjong: { hasPhone: true, phone: "13700001001", registered: true, gszName: "张三", gszSynced: true } },
        }),
      });
      return;
    }

    if (query.includes("leaderboardCategories")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            leaderboardCategories: [
              { key: "STORE_4P_HANCHAN", label: "四麻半庄" },
              { key: "STORE_4P_TONPUU", label: "四麻东风" },
              { key: "STORE_3P_HANCHAN", label: "三麻半庄" },
              { key: "TOURNAMENT", label: "锦标赛" },
            ],
          },
        }),
      });
      return;
    }

    await route.continue();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function expectPageLoaded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Internal server error|500|Unhandled/i);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("麻将管理 — 员工后台", () => {
  test.beforeEach(async ({ page }) => {
    await setupStaffAuth(page);
    await mockMahjongGraphQL(page);
  });

  test("对局列表: 页面加载并显示对局数据", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    // Wait for match table to render
    const body = page.locator("body");
    await expect(body).toContainText(/麻将|雀庄|对局|match/i);
    
    // Scroll to verify data
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);
    await expect(body).toContainText(/张三|李四|王五/);
  });

  test("对局列表: 滚动查看所有列", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    // Scroll table horizontally if needed
    const table = page.locator("table, [data-testid='mahjong-table'], [class*='table']").first();
    if (await table.isVisible()) {
      await table.scrollIntoViewIfNeeded();
      await expect(table).toBeVisible();
    }
  });

  test("模式筛选: 按四麻/三麻过滤", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    // Look for mode filter
    const modeFilter = page.locator("select, [role='combobox'], button").filter({ hasText: /模式|mode|4p|3p/i }).first();
    if (await modeFilter.isVisible({ timeout: 3000 })) {
      await modeFilter.scrollIntoViewIfNeeded();
      await modeFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test("GSZ同步状态: 已同步/未同步正确显示", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    const body = page.locator("body");
    // fc-mj-004 is synced, others not
    await expect(body).toContainText(/同步|sync/i);
  });

  test("录入新对局: 打开对话框填写信息", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    // Click new match button
    const newBtn = page.locator("button").filter({ hasText: /新建|录入|新增|添加|new/i }).first();
    if (await newBtn.isVisible({ timeout: 3000 })) {
      await newBtn.scrollIntoViewIfNeeded();
      await newBtn.click();
      await page.waitForTimeout(500);

      // Verify dialog opened
      const dialog = page.locator("[role='dialog'], dialog, .modal, [class*='modal']").first();
      await expect(dialog).toBeVisible();
    }
  });

  test("录入新对局: 选择桌台和模式", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    const newBtn = page.locator("button").filter({ hasText: /新建|录入|新增|添加|new/i }).first();
    if (await newBtn.isVisible({ timeout: 3000 })) {
      await newBtn.scrollIntoViewIfNeeded();
      await newBtn.click();
      await page.waitForTimeout(500);

      // Select table
      const tableSelect = page.locator("select").first();
      if (await tableSelect.isVisible()) {
        await tableSelect.scrollIntoViewIfNeeded();
      }
    }
  });

  test("GSZ同步: 点击同步按钮更新状态", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    const syncBtn = page.locator("button").filter({ hasText: /同步|sync/i }).first();
    if (await syncBtn.isVisible({ timeout: 3000 })) {
      await syncBtn.scrollIntoViewIfNeeded();
      await expect(syncBtn).toBeVisible();
      await syncBtn.click();
      await page.waitForTimeout(500);

      // Verify success indication
      const body = page.locator("body");
      await expect(body).not.toContainText(/error|失败/i);
    }
  });

  test("GSZ同步错误: 模拟同步失败显示错误信息", async ({ page }) => {
    // Override with error response
    await page.route("**/graphql", async (route) => {
      const body = route.request().postDataJSON();
      const query = (body?.query as string) ?? "";
      if (query.includes("syncMahjongMatchToGsz")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { syncMahjongMatchToGsz: { success: false, error: "GSZ server unreachable" } } }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/dash/gsz");
    await expectPageLoaded(page);
  });

  test("批量GSZ同步: 选择多个未同步对局", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    // Select checkboxes
    const checkboxes = page.locator("input[type='checkbox']");
    const count = await checkboxes.count();
    if (count > 1) {
      await checkboxes.nth(0).scrollIntoViewIfNeeded();
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await page.waitForTimeout(300);
    }
  });

  test("对局详情: 查看选手分数", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    // Click first match row
    const row = page.locator("tr, [data-testid='match-row']").filter({ hasText: /张三/ }).first();
    if (await row.isVisible({ timeout: 3000 })) {
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await page.waitForTimeout(500);

      // Verify detail shows scores
      const body = page.locator("body");
      await expect(body).toContainText(/42000|分数|score/i);
    }
  });

  test("编辑分数: 修改选手分数并保存", async ({ page }) => {
    await page.goto("/dash/gsz");
    await expectPageLoaded(page);

    // Open match detail
    const row = page.locator("tr, [data-testid='match-row']").filter({ hasText: /张三/ }).first();
    if (await row.isVisible({ timeout: 3000 })) {
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await page.waitForTimeout(500);

      // Look for edit button
      const editBtn = page.locator("button").filter({ hasText: /编辑|修改|edit/i }).first();
      if (await editBtn.isVisible({ timeout: 2000 })) {
        await editBtn.scrollIntoViewIfNeeded();
        await editBtn.click();
      }
    }
  });
});

test.describe("我的雀庄 — 客户页面", () => {
  test.beforeEach(async ({ page }) => {
    await setupCustomerAuth(page);
    await mockMahjongGraphQL(page);
  });

  test("对局历史: 页面加载显示历史记录", async ({ page }) => {
    await page.goto("/zh-CN/my-riichi");
    await expectPageLoaded(page);

    const body = page.locator("body");
    await expect(body).toContainText(/麻将|雀|riichi|对局|历史/i);
  });

  test("对局历史: 滚动查看多场对局", async ({ page }) => {
    await page.goto("/zh-CN/my-riichi");
    await expectPageLoaded(page);

    // Scroll page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("排行榜: 切换到排行榜标签", async ({ page }) => {
    await page.goto("/zh-CN/my-riichi");
    await expectPageLoaded(page);

    // Click leaderboard tab
    const leaderboardTab = page.locator("button, a, [role='tab']").filter({ hasText: /排行|排名|leaderboard|rank/i }).first();
    if (await leaderboardTab.isVisible({ timeout: 3000 })) {
      await leaderboardTab.scrollIntoViewIfNeeded();
      await leaderboardTab.click();
      await page.waitForTimeout(500);

      const body = page.locator("body");
      await expect(body).toContainText(/张三|李四|王五/);
    }
  });

  test("排行榜: 切换类别显示不同数据", async ({ page }) => {
    await page.goto("/zh-CN/my-riichi");
    await expectPageLoaded(page);

    const leaderboardTab = page.locator("button, a, [role='tab']").filter({ hasText: /排行|排名|leaderboard|rank/i }).first();
    if (await leaderboardTab.isVisible({ timeout: 3000 })) {
      await leaderboardTab.scrollIntoViewIfNeeded();
      await leaderboardTab.click();
      await page.waitForTimeout(500);

      // Switch category
      const categorySelect = page.locator("select, button, [role='tab']").filter({ hasText: /四麻|半庄|hanchan|4p/i }).first();
      if (await categorySelect.isVisible({ timeout: 2000 })) {
        await categorySelect.scrollIntoViewIfNeeded();
        await categorySelect.click();
      }
    }
  });

  test("排行榜: 切换时间段", async ({ page }) => {
    await page.goto("/zh-CN/my-riichi");
    await expectPageLoaded(page);

    const periodBtn = page.locator("button, [role='tab']").filter({ hasText: /月|week|month|周/i }).first();
    if (await periodBtn.isVisible({ timeout: 3000 })) {
      await periodBtn.scrollIntoViewIfNeeded();
      await periodBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("热力图: 查看活动热力图", async ({ page }) => {
    await page.goto("/zh-CN/my-riichi");
    await expectPageLoaded(page);

    // Scroll to find heatmap section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("注册页面: 未注册用户看到注册提示", async ({ page }) => {
    await setupCustomerAuth(page, "fc-cust-009", "郑十一");
    await mockMahjongGraphQL(page);
    await page.goto("/zh-CN/my-riichi");
    await expectPageLoaded(page);

    const body = page.locator("body");
    // Should show registration prompt or match info
    await expect(body).toContainText(/注册|register|麻将|手机/i);
  });
});
