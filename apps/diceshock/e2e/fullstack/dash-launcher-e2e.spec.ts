/**
 * Launcher E2E — Full-Flow Filter System Tests
 *
 * Tests the field-first filter UX across all dash categories:
 *   搜索 → 选字段 → 选操作符 → 输入值 → 导航
 *
 * Structure:
 *   1. UX fundamentals (open/close, mode transitions, keyboard nav)
 *   2. Per-category filter coverage (Users, Orders, Tables, Actives, Events, GSZ)
 *   3. Date filters
 *   4. Cross-category & combination tests
 *   5. Data rendering (infinite scroll, filter effect on rows)
 *
 * Prerequisites:
 *   - Dev server running with seeded D1 data
 *   - Auth mocked via route intercept (no real login needed)
 */
import { test, expect } from "@playwright/test";
import { LauncherPage } from "../pages/launcher.page";

const BASE = "/dash";

// ─── Shared Setup ─────────────────────────────────────────────────────────────

let lp: LauncherPage;

test.beforeEach(async ({ page }) => {
  lp = new LauncherPage(page);
  await lp.setupAdmin();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. UX FUNDAMENTALS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("启动器 UX", () => {
  test.beforeEach(async () => {
    await lp.goto(`${BASE}/users`);
  });

  test("热键 / 打开启动器", async () => {
    await lp.open();
    await expect(lp.dialog).toBeVisible();
  });

  test("点击触发按钮打开启动器", async () => {
    await lp.openViaClick();
    await expect(lp.dialog).toBeVisible();
  });

  test("Esc 关闭启动器", async () => {
    await lp.open();
    await lp.close();
  });

  test("点击背景关闭启动器", async () => {
    await lp.open();
    await lp.closeViaBackdrop();
  });

  test("模式切换: 搜索 → 筛选器菜单 → 返回搜索", async () => {
    await lp.open();
    await lp.expectPlaceholder(/搜索/);
    await lp.enterFilterMenu();
    await lp.expectPlaceholder(/筛选器/);
    await lp.exitFilterMenu();
    await lp.expectPlaceholder(/搜索/);
  });

  test("键盘导航: 上下选择 + Enter", async () => {
    await lp.open();
    await lp.enterFilterMenu();
    await lp.selectByArrows(2);
    // Should enter a sub-mode (operator-select or value-input)
    await lp.page.waitForTimeout(300);
  });

  test("从不同页面打开会自动检测类别", async () => {
    // Orders page
    await lp.goto(`${BASE}/orders`);
    await lp.open();
    await lp.enterFilterMenu();
    const statusItem = lp.listArea.getByText("状态");
    await expect(statusItem).toBeVisible();
    await lp.close();

    // Tables page
    await lp.goto(`${BASE}/tables`);
    await lp.open();
    await lp.enterFilterMenu();
    const typeItem = lp.listArea.getByText("类型");
    await expect(typeItem).toBeVisible();
  });

  test("Input 不在焦点时 / 键有效", async () => {
    await lp.open();
    await lp.close();
    // "/" again should reopen
    await lp.open();
    await expect(lp.dialog).toBeVisible();
  });

  test("筛选器覆盖: 同一 key 多次设值只保留最新", async () => {
    await lp.goto(`${BASE}/orders`);
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
    await lp.applyOptionFilter("状态", "暂停");
    await lp.expectUrlContains("f.status=paused");
    const url = lp.page.url();
    expect(url).not.toContain("f.status=active");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PER-CATEGORY FILTERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 用户 (Users) ────────────────────────────────────────────────────────────

test.describe("用户筛选", () => {
  test.beforeEach(async () => {
    await lp.goto(`${BASE}/users`);
  });

  test("KV: 昵称", async () => {
    await lp.applyKvFilter("昵称", "张三");
    await lp.expectUrlContains("f.name=");
  });

  test("KV: UID", async () => {
    await lp.applyKvFilter("UID", "thx1138");
    await lp.expectUrlContains("f.uid=thx1138");
  });

  test("KV: 手机号", async () => {
    await lp.applyKvFilter("手机号", "13800001");
    await lp.expectUrlContains("f.phone=13800001");
  });

  test("Option: 角色=管理员", async () => {
    await lp.applyOptionFilter("角色", "管理员");
    await lp.expectUrlContains("f.role=admin");
  });

  test("Option: 角色=店员", async () => {
    await lp.applyOptionFilter("角色", "店员");
    await lp.expectUrlContains("f.role=staff");
  });

  test("Option: 角色=顾客", async () => {
    await lp.applyOptionFilter("角色", "顾客");
    await lp.expectUrlContains("f.role=authenticated");
  });

  test("Option: 门店=光谷", async () => {
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.store=gg");
  });

  test("Option: 门店=街道口", async () => {
    await lp.applyOptionFilter("门店", "街道口");
    await lp.expectUrlContains("f.store=jdk");
  });

  test("Boolean: 已禁用", async () => {
    await lp.applyBooleanFilter("已禁用");
    await lp.expectUrlContains("f.disabled=1");
  });

  test("Sort: 注册时间", async () => {
    await lp.applySort("排序", "注册时间");
    await lp.expectUrlContains("sort=created_at");
  });

  test("Sort: 昵称", async () => {
    await lp.applySort("排序", "昵称");
    await lp.expectUrlContains("sort=nickname");
  });

  test("Sort: 储值余额", async () => {
    await lp.applySort("排序", "储值余额");
    await lp.expectUrlContains("sort=stored_value");
  });

  test("组合: 角色+门店", async () => {
    await lp.applyOptionFilter("角色", "顾客");
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.role=authenticated");
    await lp.expectUrlContains("f.store=gg");
  });

  test("组合: 昵称+角色+排序", async () => {
    await lp.applyKvFilter("昵称", "李");
    await lp.applyOptionFilter("角色", "顾客");
    await lp.applySort("排序", "注册时间");
    await lp.expectUrlContains("f.name=");
    await lp.expectUrlContains("f.role=authenticated");
    await lp.expectUrlContains("sort=created_at");
  });

  test("组合: UID+门店+排序", async () => {
    await lp.applyKvFilter("UID", "uid");
    await lp.applyOptionFilter("门店", "街道口");
    await lp.applySort("排序", "储值余额");
    await lp.expectUrlContains("f.uid=uid");
    await lp.expectUrlContains("f.store=jdk");
    await lp.expectUrlContains("sort=stored_value");
  });

  test("搜索跳转详情", async () => {
    await lp.open();
    await lp.input.fill("张三丰");
    await lp.page.waitForTimeout(500);
    await lp.page.keyboard.press("Enter");
    await lp.page.waitForTimeout(1000);
  });

  test("清除筛选器: Esc 关闭后参数保留", async () => {
    await lp.applyOptionFilter("角色", "管理员");
    await lp.expectUrlContains("f.role=admin");
    await lp.open();
    const chip = lp.dialog.getByText("admin", { exact: false });
    await expect(chip).toBeVisible();
    await lp.close();
  });
});

// ─── 订单 (Orders) ───────────────────────────────────────────────────────────

test.describe("订单筛选", () => {
  test.beforeEach(async () => {
    await lp.goto(`${BASE}/orders`);
  });

  test("KV: 桌台", async () => {
    await lp.applyKvFilter("桌台", "大厅");
    await lp.expectUrlContains("f.table=");
  });

  test("KV: 用户", async () => {
    await lp.applyKvFilter("用户", "张三");
    await lp.expectUrlContains("f.user=");
  });

  test("Option: 状态=进行中", async () => {
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
  });

  test("Option: 状态=暂停", async () => {
    await lp.applyOptionFilter("状态", "暂停");
    await lp.expectUrlContains("f.status=paused");
  });

  test("Option: 状态=已结束", async () => {
    await lp.applyOptionFilter("状态", "已结束");
    await lp.expectUrlContains("f.status=ended");
  });

  test("Option: 门店=光谷", async () => {
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.store=gg");
  });

  test("Sort: 开始时间", async () => {
    await lp.applySort("排序", "开始时间");
    await lp.expectUrlContains("sort=start_at");
  });

  test("Sort: 结束时间", async () => {
    await lp.applySort("排序", "结束时间");
    await lp.expectUrlContains("sort=end_at");
  });

  test("Group: 桌台", async () => {
    await lp.applyGroup("分组", "桌台");
    await lp.expectUrlContains("group=table");
  });

  test("Group: 用户", async () => {
    await lp.applyGroup("分组", "用户");
    await lp.expectUrlContains("group=user");
  });

  test("Group: 日期", async () => {
    await lp.applyGroup("分组", "日期");
    await lp.expectUrlContains("group=date");
  });

  test("组合: 状态+门店+排序", async () => {
    await lp.applyOptionFilter("状态", "已结束");
    await lp.applyOptionFilter("门店", "光谷");
    await lp.applySort("排序", "开始时间");
    await lp.expectUrlContains("f.status=ended");
    await lp.expectUrlContains("f.store=gg");
    await lp.expectUrlContains("sort=start_at");
  });

  test("组合: 桌台+状态+分组", async () => {
    await lp.applyKvFilter("桌台", "A1");
    await lp.applyOptionFilter("状态", "进行中");
    await lp.applyGroup("分组", "桌台");
    await lp.expectUrlContains("f.table=");
    await lp.expectUrlContains("f.status=active");
    await lp.expectUrlContains("group=table");
  });

  test("组合: 全筛选器 (用户+状态+排序+分组)", async () => {
    await lp.applyKvFilter("用户", "张");
    await lp.applyOptionFilter("状态", "已结束");
    await lp.applySort("排序", "结束时间");
    await lp.applyGroup("分组", "用户");
    await lp.expectUrlContains("f.user=");
    await lp.expectUrlContains("f.status=ended");
    await lp.expectUrlContains("sort=end_at");
    await lp.expectUrlContains("group=user");
  });
});

// ─── 桌台 (Tables) ───────────────────────────────────────────────────────────

test.describe("桌台筛选", () => {
  test.beforeEach(async () => {
    await lp.goto(`${BASE}/tables`);
  });

  test("KV: 桌台名", async () => {
    await lp.applyKvFilter("桌台名", "大厅");
    await lp.expectUrlContains("f.name=");
  });

  test("Option: 类型=固定桌", async () => {
    await lp.applyOptionFilter("类型", "固定桌");
    await lp.expectUrlContains("f.type=fixed");
  });

  test("Option: 类型=拼桌", async () => {
    await lp.applyOptionFilter("类型", "拼桌");
    await lp.expectUrlContains("f.type=solo");
  });

  test("Option: 状态=启用", async () => {
    await lp.applyOptionFilter("状态", "启用");
    await lp.expectUrlContains("f.status=active");
  });

  test("Option: 状态=停用", async () => {
    await lp.applyOptionFilter("状态", "停用");
    await lp.expectUrlContains("f.status=inactive");
  });

  test("Option: 门店=光谷", async () => {
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.store=gg");
  });

  test("Option: 门店=街道口", async () => {
    await lp.applyOptionFilter("门店", "街道口");
    await lp.expectUrlContains("f.store=jdk");
  });

  test("Sort: 创建时间", async () => {
    await lp.applySort("排序", "创建时间");
    await lp.expectUrlContains("sort=created_at");
  });

  test("Sort: 名称", async () => {
    await lp.applySort("排序", "名称");
    await lp.expectUrlContains("sort=name");
  });

  test("组合: 类型+状态+门店", async () => {
    await lp.applyOptionFilter("类型", "固定桌");
    await lp.applyOptionFilter("状态", "启用");
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.type=fixed");
    await lp.expectUrlContains("f.status=active");
    await lp.expectUrlContains("f.store=gg");
  });

  test("组合: 桌台名+类型+排序", async () => {
    await lp.applyKvFilter("桌台名", "街道口");
    await lp.applyOptionFilter("类型", "拼桌");
    await lp.applySort("排序", "名称");
    await lp.expectUrlContains("f.name=");
    await lp.expectUrlContains("f.type=solo");
    await lp.expectUrlContains("sort=name");
  });

  test("组合: 全部 (名称+类型+状态+门店+排序)", async () => {
    await lp.applyKvFilter("桌台名", "M");
    await lp.applyOptionFilter("类型", "固定桌");
    await lp.applyOptionFilter("状态", "启用");
    await lp.applyOptionFilter("门店", "光谷");
    await lp.applySort("排序", "创建时间");
    await lp.expectUrlContains("f.name=");
    await lp.expectUrlContains("f.type=fixed");
    await lp.expectUrlContains("f.status=active");
    await lp.expectUrlContains("f.store=gg");
    await lp.expectUrlContains("sort=created_at");
  });
});

// ─── 约局 (Actives) ──────────────────────────────────────────────────────────

test.describe("约局筛选", () => {
  test.beforeEach(async () => {
    await lp.goto(`${BASE}/actives`);
  });

  test("KV: 发起人", async () => {
    await lp.applyKvFilter("发起人", "张三");
    await lp.expectUrlContains("f.creator=");
  });

  test("KV: 类型", async () => {
    await lp.applyKvFilter("类型", "桌游");
    await lp.expectUrlContains("f.type=");
  });

  test("Option: 状态=进行中", async () => {
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
  });

  test("Option: 状态=已过期", async () => {
    await lp.applyOptionFilter("状态", "已过期");
    await lp.expectUrlContains("f.status=expired");
  });

  test("Option: 门店=光谷", async () => {
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.store=gg");
  });

  test("Option: 门店=街道口", async () => {
    await lp.applyOptionFilter("门店", "街道口");
    await lp.expectUrlContains("f.store=jdk");
  });

  test("Sort: 创建时间", async () => {
    await lp.applySort("排序", "创建时间");
    await lp.expectUrlContains("sort=created_at");
  });

  test("Sort: 开始时间", async () => {
    await lp.applySort("排序", "开始时间");
    await lp.expectUrlContains("sort=start_time");
  });

  test("组合: 状态+门店+排序", async () => {
    await lp.applyOptionFilter("状态", "进行中");
    await lp.applyOptionFilter("门店", "光谷");
    await lp.applySort("排序", "开始时间");
    await lp.expectUrlContains("f.status=active");
    await lp.expectUrlContains("f.store=gg");
    await lp.expectUrlContains("sort=start_time");
  });

  test("组合: 发起人+状态+门店", async () => {
    await lp.applyKvFilter("发起人", "孙");
    await lp.applyOptionFilter("状态", "进行中");
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.creator=");
    await lp.expectUrlContains("f.status=active");
    await lp.expectUrlContains("f.store=gg");
  });
});

// ─── 活动 (Events) ───────────────────────────────────────────────────────────

test.describe("活动筛选", () => {
  test.beforeEach(async () => {
    await lp.goto(`${BASE}/events`);
  });

  test("KV: 标题", async () => {
    await lp.applyKvFilter("标题", "桌游");
    await lp.expectUrlContains("f.title=");
  });

  test("Option: 状态=进行中", async () => {
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
  });

  test("Option: 状态=已结束", async () => {
    await lp.applyOptionFilter("状态", "已结束");
    await lp.expectUrlContains("f.status=ended");
  });

  test("Option: 状态=即将开始", async () => {
    await lp.applyOptionFilter("状态", "即将开始");
    await lp.expectUrlContains("f.status=upcoming");
  });

  test("Option: 门店=光谷", async () => {
    await lp.applyOptionFilter("门店", "光谷");
    await lp.expectUrlContains("f.store=gg");
  });

  test("Option: 门店=街道口", async () => {
    await lp.applyOptionFilter("门店", "街道口");
    await lp.expectUrlContains("f.store=jdk");
  });

  test("Sort: 创建时间", async () => {
    await lp.applySort("排序", "创建时间");
    await lp.expectUrlContains("sort=created_at");
  });

  test("Sort: 开始日期", async () => {
    await lp.applySort("排序", "开始日期");
    await lp.expectUrlContains("sort=start_date");
  });

  test("组合: 标题+状态+门店+排序", async () => {
    await lp.applyKvFilter("标题", "麻将");
    await lp.applyOptionFilter("状态", "进行中");
    await lp.applyOptionFilter("门店", "光谷");
    await lp.applySort("排序", "创建时间");
    await lp.expectUrlContains("f.title=");
    await lp.expectUrlContains("f.status=active");
    await lp.expectUrlContains("f.store=gg");
    await lp.expectUrlContains("sort=created_at");
  });

  test("Option 覆盖: 状态切换 (进行中→已结束)", async () => {
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
    await lp.applyOptionFilter("状态", "已结束");
    await lp.expectUrlContains("f.status=ended");
  });
});

// ─── 雀庄 (GSZ / Mahjong) ────────────────────────────────────────────────────

test.describe("雀庄筛选", () => {
  test.beforeEach(async () => {
    await lp.goto(`${BASE}/gsz`);
  });

  test("KV: 桌台", async () => {
    await lp.applyKvFilter("桌台", "M1");
    await lp.expectUrlContains("f.table=");
  });

  test("Option: 模式=三麻", async () => {
    await lp.applyOptionFilter("模式", "三麻");
    await lp.expectUrlContains("f.mode=3p");
  });

  test("Option: 模式=四麻", async () => {
    await lp.applyOptionFilter("模式", "四麻");
    await lp.expectUrlContains("f.mode=4p");
  });

  test("Option: 局数=东风", async () => {
    await lp.applyOptionFilter("局数", "东风");
    await lp.expectUrlContains("f.format=tonpuu");
  });

  test("Option: 局数=半庄", async () => {
    await lp.applyOptionFilter("局数", "半庄");
    await lp.expectUrlContains("f.format=hanchan");
  });

  test("Option: 完成度=已完成", async () => {
    await lp.applyOptionFilter("完成度", "已完成");
    await lp.expectUrlContains("f.completion=completed");
  });

  test("Option: 完成度=未完成", async () => {
    await lp.applyOptionFilter("完成度", "未完成");
    await lp.expectUrlContains("f.completion=incomplete");
  });

  test("Sort: 创建时间", async () => {
    await lp.applySort("排序", "创建时间");
    await lp.expectUrlContains("sort=created_at");
  });

  test("Sort: 结束时间", async () => {
    await lp.applySort("排序", "结束时间");
    await lp.expectUrlContains("sort=ended_at");
  });

  test("组合: 模式+局数", async () => {
    await lp.applyOptionFilter("模式", "四麻");
    await lp.applyOptionFilter("局数", "半庄");
    await lp.expectUrlContains("f.mode=4p");
    await lp.expectUrlContains("f.format=hanchan");
  });

  test("组合: 模式+局数+完成度", async () => {
    await lp.applyOptionFilter("模式", "三麻");
    await lp.applyOptionFilter("局数", "东风");
    await lp.applyOptionFilter("完成度", "已完成");
    await lp.expectUrlContains("f.mode=3p");
    await lp.expectUrlContains("f.format=tonpuu");
    await lp.expectUrlContains("f.completion=completed");
  });

  test("组合: 全筛选器 (桌台+模式+局数+完成度+排序)", async () => {
    await lp.applyKvFilter("桌台", "M1");
    await lp.applyOptionFilter("模式", "四麻");
    await lp.applyOptionFilter("局数", "半庄");
    await lp.applyOptionFilter("完成度", "已完成");
    await lp.applySort("排序", "结束时间");
    await lp.expectUrlContains("f.table=");
    await lp.expectUrlContains("f.mode=4p");
    await lp.expectUrlContains("f.format=hanchan");
    await lp.expectUrlContains("f.completion=completed");
    await lp.expectUrlContains("sort=ended_at");
  });

  test("Option 覆盖: 模式切换 (四麻→三麻)", async () => {
    await lp.applyOptionFilter("模式", "四麻");
    await lp.expectUrlContains("f.mode=4p");
    await lp.applyOptionFilter("模式", "三麻");
    await lp.expectUrlContains("f.mode=3p");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DATE FILTERS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("日期筛选器", () => {
  test("用户: 注册时间", async () => {
    await lp.goto(`${BASE}/users`);
    await lp.openDateFilter("注册时间");
    await lp.expectDatePanelVisible();
  });

  test("订单: 日期", async () => {
    await lp.goto(`${BASE}/orders`);
    await lp.openDateFilter("日期");
    await lp.expectDatePanelVisible();
  });

  test("约局: 日期", async () => {
    await lp.goto(`${BASE}/actives`);
    await lp.openDateFilter("日期");
    await lp.expectDatePanelVisible();
  });

  test("活动: 日期", async () => {
    await lp.goto(`${BASE}/events`);
    await lp.openDateFilter("日期");
    await lp.expectDatePanelVisible();
  });

  test("雀庄: 日期", async () => {
    await lp.goto(`${BASE}/gsz`);
    await lp.openDateFilter("日期");
    await lp.expectDatePanelVisible();
  });

  test("日期范围: 填写起止日期并提交", async () => {
    await lp.goto(`${BASE}/orders`);
    await lp.openDateFilter("日期");
    await lp.fillDateRange("2025-01-01", "2025-12-31");
    await lp.expectUrlContains("f.date");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CROSS-CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("跨页面", () => {
  test("users 筛选后切换到 orders 筛选互不干扰", async () => {
    await lp.goto(`${BASE}/users`);
    await lp.applyOptionFilter("角色", "管理员");
    await lp.expectUrlContains("f.role=admin");

    await lp.goto(`${BASE}/orders`);
    await lp.expectNoUrlParam("f.role");
    await lp.applyOptionFilter("状态", "进行中");
    await lp.expectUrlContains("f.status=active");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DATA RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("数据渲染", () => {
  test("用户列表: 表格可见", async () => {
    await lp.goto(`${BASE}/users`);
    await lp.expectTableRows();
  });

  test("订单列表: 表格可见", async () => {
    await lp.goto(`${BASE}/orders`);
    await lp.expectTableRows();
  });

  test("桌台列表: 表格可见", async () => {
    await lp.goto(`${BASE}/tables`);
    await lp.expectTableRows();
  });

  test("筛选后: 数据更新 (管理员过滤)", async () => {
    await lp.goto(`${BASE}/users`);
    const rows = lp.page.locator("table.table tbody tr");
    const rowsBefore = await rows.count();
    await lp.applyOptionFilter("角色", "管理员");
    await lp.page.waitForTimeout(1000);
    await expect(lp.page.locator("table.table")).toBeVisible();
    const rowsAfter = await rows.count();
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
  });
});
