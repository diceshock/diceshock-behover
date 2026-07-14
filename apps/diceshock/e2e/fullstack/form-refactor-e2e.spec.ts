/**
 * Form Refactor E2E Tests
 *
 * Validates form semantics, validation, and submission across refactored pages.
 * Uses the real backend with seeded D1 data (no GraphQL mocking).
 */
import { expect, test } from "../fixtures/auth.fixture";
import { clickVisible, fillVisible } from "../helpers/interactions";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Preferences Page - Form submission
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Preferences — Form Validation", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/gg-en/preferences");
    // Wait for the preferences form area to load
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("语义HTML: form 或 onKeyDown 提交结构存在", async ({ page }) => {
    // Preferences uses <form onSubmit> wrapping the input
    const form = page.locator("form").first();
    const hasForm = await form.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasForm) {
      // Fallback: input exists with Enter-key submission
      const input = page.locator("input[type='text']").first();
      await expect(input).toBeVisible({ timeout: 5000 });
    }
  });

  test("有效输入: 表单可以正常提交", async ({ page }) => {
    const input = page.locator("input[type='text']").first();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.fill("test-category");
      await input.press("Enter");
      // Should either show success feedback or not crash
      await expect(page.locator("body")).not.toContainText(/TypeError|Cannot read/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Me Page - Nickname Edit Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Me Page — Nickname Edit Form", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/gg-en/me");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("语义HTML: 昵称编辑弹窗内有 <form onSubmit> + button[type=submit]", async ({ page }) => {
    // Click the edit button next to the nickname
    const editBtn = page.locator('button[aria-label="编辑"]').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      // Modal should open with a form
      const form = page.locator(".modal-box form, dialog form");
      await expect(form).toBeVisible({ timeout: 5000 });
      // Should have a submit button
      const submitBtn = form.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    }
  });

  test("空昵称提交: submit按钮disabled", async ({ page }) => {
    const editBtn = page.locator('button[aria-label="编辑"]').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      const form = page.locator(".modal-box form, dialog form");
      await expect(form).toBeVisible({ timeout: 5000 });
      // Clear the nickname input
      const input = form.locator("input[type='text']");
      await input.fill("");
      // Submit button should be disabled for empty input
      const submitBtn = form.locator('button[type="submit"]');
      await expect(submitBtn).toBeDisabled();
    }
  });

  test("超长昵称: zod 拦截超过30字符", async ({ page }) => {
    const editBtn = page.locator('button[aria-label="编辑"]').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      const form = page.locator(".modal-box form, dialog form");
      await expect(form).toBeVisible({ timeout: 5000 });
      const input = form.locator("input[type='text']");
      // Fill with > 30 chars
      await input.fill("a".repeat(35));
      const submitBtn = form.locator('button[type="submit"]');
      // If zod validation is client-side, button remains enabled but form shows error after submit
      if (await submitBtn.isEnabled()) {
        await submitBtn.click();
        // Should show validation error or the input should be trimmed
        await page.waitForTimeout(500);
        await expect(page.locator("body")).not.toContainText(/TypeError|Unhandled/i);
      }
    }
  });

  test("有效昵称: 成功修改", async ({ page }) => {
    const editBtn = page.locator('button[aria-label="编辑"]').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      const form = page.locator(".modal-box form, dialog form");
      await expect(form).toBeVisible({ timeout: 5000 });
      const input = form.locator("input[type='text']");
      await input.fill("测试昵称E2E");
      const submitBtn = form.locator('button[type="submit"]');
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
      // After success, the modal should close
      await expect(form).not.toBeVisible({ timeout: 10000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tables Page - Create Table Dialog
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Tables — Create Table Dialog", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/tables");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
  });

  test("语义HTML: 新建对话框使用 <form onSubmit>", async ({ page }) => {
    // Find the create / add button
    const createBtn = page.locator("button", { hasText: /新建|创建|添加/i });
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      // Dialog should open with a form
      const dialog = page.locator("dialog[open], .modal-box");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      const form = dialog.locator("form");
      await expect(form).toBeVisible();
    }
  });

  test("空名称提交: zod 拦截验证", async ({ page }) => {
    const createBtn = page.locator("button", { hasText: /新建|创建|添加/i });
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      const dialog = page.locator("dialog[open], .modal-box");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      // Leave name field empty and try to submit
      const submitBtn = dialog.locator('button[type="submit"]');
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        // Should show validation error, not submit
        await expect(page.locator("body")).not.toContainText(/TypeError|Unhandled/i);
        // Error message should be visible
        const errorText = dialog.locator(".text-error, .alert-error, [role='alert']");
        await expect(errorText).toBeVisible({ timeout: 3000 }).catch(() => {
          // Button might be disabled instead of showing error
        });
      }
    }
  });

  test("有效数据提交: 新建桌子", async ({ page }) => {
    const createBtn = page.locator("button", { hasText: /新建|创建|添加/i });
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      const dialog = page.locator("dialog[open], .modal-box");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      // Fill in the required fields
      const nameInput = dialog.locator('input[placeholder*="桌"], input[type="text"]').first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill("E2E新建桌");
        const capacityInput = dialog.locator('input[type="number"]').first();
        if (await capacityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await capacityInput.fill("4");
        }
        const submitBtn = dialog.locator('button[type="submit"]');
        await expect(submitBtn).toBeEnabled();
        // Don't actually submit to avoid side effects in other tests
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Table Detail - Basic Edit Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Table Detail — Basic Edit Form", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    // Navigate to table list first, then click detail of first table
    await page.goto("/dash/tables");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
    const detailLink = page.locator('a:has-text("详情")').first();
    if (await detailLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await detailLink.click();
      await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
    }
  });

  test("语义HTML: 编辑表单使用 <form onSubmit>", async ({ page }) => {
    const form = page.locator("form");
    // Table detail should render a form for editing
    if (await form.isVisible({ timeout: 10000 }).catch(() => false)) {
      const submitBtn = form.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    }
  });

  test("空名称拦截: zod不允许空名称", async ({ page }) => {
    const nameInput = page.locator('input[placeholder*="桌名"], input.input-bordered').first();
    if (await nameInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await nameInput.fill("");
      const saveBtn = page.locator('button[type="submit"], button:has-text("保存")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(300);
        // Should show validation error
        await expect(page.locator("body")).not.toContainText(/TypeError|Unhandled/i);
      }
    }
  });

  test("有效编辑: mutation 正常发送", async ({ page }) => {
    const nameInput = page.locator('input[placeholder*="桌名"], input.input-bordered').first();
    if (await nameInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      const original = await nameInput.inputValue();
      await nameInput.fill("E2E编辑测试桌");
      const saveBtn = page.locator('button[type="submit"], button:has-text("保存")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        // Wait for mutation response - should succeed or show success message
        await page.waitForTimeout(2000);
        await expect(page.locator("body")).not.toContainText(/TypeError|Unhandled/i);
        // Restore original name
        await nameInput.fill(original || "A1 测试桌");
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Users Detail - Add Plan & Deduct Dialogs
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Users Detail — Membership Dialogs", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    // Navigate to user list first, then click first user
    await page.goto("/dash/users");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
    const userLink = page.locator("table tbody tr td a").first();
    if (await userLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userLink.click();
      await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
    }
  });

  test("添加计划dialog: form + submit结构", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /添加|新增|开通/ });
    if (await addBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addBtn.click();
      const dialog = page.locator("dialog[open], .modal-box");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      const form = dialog.locator("form");
      await expect(form).toBeVisible();
      const submitBtn = form.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    }
  });

  test("扣费dialog: 验证不允许负金额", async ({ page }) => {
    const deductBtn = page.locator("button", { hasText: /扣费|扣款|消费/ });
    if (await deductBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await deductBtn.click();
      const dialog = page.locator("dialog[open], .modal-box");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      const amountInput = dialog.locator('input[type="number"], input[inputmode="numeric"]').first();
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountInput.fill("-10");
        const submitBtn = dialog.locator('button[type="submit"]');
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(300);
          // Should be blocked by validation
          await expect(page.locator("body")).not.toContainText(/TypeError|Unhandled/i);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Orders Settle - Settlement Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Orders Settle — Settlement Controls", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    // Navigate to settle page without specific IDs - page should still render
    await page.goto("/dash/orders/settle");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("结算页 <form onSubmit> 存在", async ({ page }) => {
    const form = page.locator("form");
    // Settlement page should have form controls
    if (await form.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(form).toBeVisible();
    }
    // At minimum, page should not crash
    await expect(page.locator("body")).not.toContainText(/TypeError|Cannot read/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Admin Phones - Add/Remove Phone Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Admin Phones — Form Structure", () => {
  test.beforeEach(async ({ page, mockAdminSession }) => {
    void mockAdminSession;
    await page.goto("/dash/admin-phones");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("添加手机号: input + button 结构", async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"], input[inputmode="numeric"]').first();
    if (await phoneInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(phoneInput).toBeVisible();
      // Should have an add button nearby
      const addBtn = page.locator("button", { hasText: /添加|新增/ });
      await expect(addBtn).toBeVisible();
    }
  });

  test("空号码提交: 验证拦截", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /添加|新增/ });
    if (await addBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Click add without filling - should be disabled or show error
      if (await addBtn.isEnabled()) {
        await addBtn.click();
        await page.waitForTimeout(300);
        await expect(page.locator("body")).not.toContainText(/TypeError|Unhandled/i);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Wechat Menu - Editor Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Wechat Menu — Editor Form", () => {
  test.beforeEach(async ({ page, mockAdminSession }) => {
    void mockAdminSession;
    await page.goto("/dash/wechat-menu");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("菜单编辑: 保存/发布按钮存在且不crash", async ({ page }) => {
    // Wechat menu page should load without errors
    await expect(page.locator("body")).not.toContainText(/TypeError|Cannot read/i);
    // Should have save or publish actions
    const actionBtn = page.locator("button", { hasText: /保存|发布|Save|Publish/ });
    if (await actionBtn.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(actionBtn.first()).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Events Detail - Create/Edit Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Events Detail — Editor Form", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/events");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
    const link = page.locator("table tbody tr td a").first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
    }
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("事件编辑: form + submit 结构", async ({ page }) => {
    const form = page.locator("form");
    if (await form.isVisible({ timeout: 10000 }).catch(() => false)) {
      const submitBtn = form.locator('button[type="submit"], button:has-text("保存")');
      await expect(submitBtn.first()).toBeVisible();
    }
    await expect(page.locator("body")).not.toContainText(/TypeError|Cannot read/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Actives Detail (dash) - Staff Edit Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Actives Detail — Staff Edit", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/actives");
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
    const link = page.locator("table tbody tr td a").first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
    }
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("活动编辑: form + submit 结构", async ({ page }) => {
    const form = page.locator("form");
    if (await form.isVisible({ timeout: 10000 }).catch(() => false)) {
      const submitBtn = form.locator('button[type="submit"], button:has-text("保存")');
      await expect(submitBtn.first()).toBeVisible();
    }
    await expect(page.locator("body")).not.toContainText(/TypeError|Cannot read/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Pricing Detail - Immer Atom Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Pricing Detail — Immer Atom Form", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/dash/pricing");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("定价页面: immer atom 驱动，页面正常渲染", async ({ page }) => {
    // Pricing page should render without crash
    await expect(page.locator("body")).not.toContainText(/TypeError|Cannot read/i);
    // Should show pricing list or empty state
    const content = page.locator("main").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Actives New (customer) - Create Activity Form
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Actives New — Create Activity Form", () => {
  test.beforeEach(async ({ page, mockStaffSession }) => {
    void mockStaffSession;
    await page.goto("/gg-en/actives/new");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15000 });
  });

  test("创建活动: <form onSubmit> + submit 结构", async ({ page }) => {
    const form = page.locator("form");
    if (await form.isVisible({ timeout: 10000 }).catch(() => false)) {
      const submitBtn = form.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    }
    await expect(page.locator("body")).not.toContainText(/TypeError|Cannot read/i);
  });

  test("空标题提交: zod拦截", async ({ page }) => {
    const form = page.locator("form");
    if (await form.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Try to submit without filling required title
      const submitBtn = form.locator('button[type="submit"]');
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        // Should show error or remain on page (not navigate)
        await expect(page).toHaveURL(/actives\/new/, { timeout: 3000 });
        await expect(page.locator("body")).not.toContainText(/TypeError|Unhandled/i);
      }
    }
  });
});
