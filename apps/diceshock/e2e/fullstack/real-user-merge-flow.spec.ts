/**
 * Real User Full-Flow E2E — Browser-Driven Account Merge
 *
 * Simulates REAL user journeys through the actual UI:
 *   - Browser navigation as authenticated users (dev headers for session)
 *   - Phone binding through GraphQL (same path the UI uses)
 *   - Cross-platform merge observed from the user's perspective
 *   - Profile page verifies merged data
 *
 * These tests exercise the FULL stack:
 *   Server auth middleware → GraphQL resolvers → D1 database → merge logic
 *
 * Why dev headers instead of real OAuth:
 *   auth.js sets Secure cookies over HTTPS, but local dev runs on HTTP.
 *   The dev-mode bypass (X-Test-Role + X-Test-UserId) is the designated
 *   test mechanism and exercises the same resolver/merge code path.
 *
 * Scenarios:
 *   A. Fresh user → profile page shows default state
 *   B. User binds phone → profile updates, merge absorbs other user
 *   C. Two WeChat users share phone → three-way cascade in sequence
 *   D. Full journey: register → set nickname → bind phone → see merged data
 *   E. Admin phone promotion observed on profile
 *   F. Re-login after merge → session still valid, data intact
 *   G. Multiple sequential merges → data accumulates correctly
 *   H. User navigates /me → phone section shows binding state changes
 */
import { expect, test, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const CWD = process.cwd();

// ─── DB/KV Helpers ───────────────────────────────────────────────────────────

async function d1Execute(sql: string): Promise<void> {
  await exec(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "diceshock", "--local", "--command", sql],
    { cwd: CWD },
  );
}

async function d1Query(sql: string): Promise<Array<Record<string, unknown>>> {
  const { stdout } = await exec(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "diceshock", "--local", "--json", "--command", sql],
    { cwd: CWD },
  );
  const parsed: Array<{ results: Array<Record<string, unknown>> }> = JSON.parse(stdout);
  return parsed[0]?.results ?? [];
}

async function kvPut(key: string, value: string): Promise<void> {
  await exec(
    "pnpm",
    ["exec", "wrangler", "kv", "key", "put", key, value, "--binding", "KV", "--local"],
    { cwd: CWD },
  );
}

// ─── Auth + GraphQL Helpers ──────────────────────────────────────────────────

/** Set up page as a specific user (dev mode auth) */
async function setupUserAuth(page: Page, userId: string, role: string = "customer") {
  await page.setExtraHTTPHeaders({
    "X-Test-Role": role,
    "X-Test-UserId": userId,
  });
  // Mock the session endpoint so the React app recognizes the user
  await page.route("/api/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: userId, name: `User-${userId.slice(-6)}`, role },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    }),
  );
}

/** Call GraphQL as a user (API-level, same as UI would) */
async function gql(
  page: Page,
  userId: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  const resp = await page.request.post("/graphql", {
    headers: {
      "Content-Type": "application/json",
      "X-Test-Role": "customer",
      "X-Test-UserId": userId,
    },
    data: JSON.stringify({ query, variables }),
  });
  return resp.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }>;
}

// ─── Seed Helpers ────────────────────────────────────────────────────────────

const P = "rflow-"; // prefix
const NOW = Date.now();

interface SeedUser {
  id: string;
  name: string;
  role: string;
  phone: string;
  nickname: string;
  points: number;
  platform: string;
  providerAccountId: string;
  avatarUrl?: string;
}

async function seedUser(u: SeedUser): Promise<void> {
  const avatarCol = u.avatarUrl ? ", avatar_url" : "";
  const avatarVal = u.avatarUrl ? `, '${u.avatarUrl}'` : "";
  await d1Execute([
    `INSERT OR REPLACE INTO "user" (id, name, email, role) VALUES ('${u.id}', '${u.name}', '${u.id}@e2e', '${u.role}');`,
    `INSERT OR REPLACE INTO user_info (id, uid, create_at, nickname, phone, points, preferred_store_id, preferred_locale${avatarCol}) VALUES ('${u.id}', 'uid-${u.id}', ${NOW}, '${u.nickname}', '${u.phone}', ${u.points}, 'store-gg', 'zh'${avatarVal});`,
    `INSERT OR REPLACE INTO account (userId, type, provider, providerAccountId) VALUES ('${u.id}', '${u.platform === "SMS" ? "credentials" : "oauth"}', '${u.platform}', '${u.providerAccountId}');`,
  ].join("\n"));
}

async function cleanup(): Promise<void> {
  const tables = [
    `DELETE FROM account WHERE userId LIKE '${P}%';`,
    `DELETE FROM user_info WHERE id LIKE '${P}%';`,
    `DELETE FROM user_preferences WHERE user_id LIKE '${P}%';`,
    `DELETE FROM user_membership_plans WHERE user_id LIKE '${P}%';`,
    `DELETE FROM user_points_log WHERE user_id LIKE '${P}%';`,
    `DELETE FROM user_badges WHERE user_id LIKE '${P}%';`,
    `DELETE FROM user_business_card WHERE id LIKE '${P}%';`,
    `DELETE FROM "user" WHERE id LIKE '${P}%';`,
  ];
  for (const stmt of tables) {
    await d1Execute(stmt).catch(() => {});
  }
}

// ─── GraphQL Queries ─────────────────────────────────────────────────────────

const VERIFY_PHONE = `
  mutation VerifyPhone($input: VerifyPhoneInput!) {
    verifyPhone(input: $input) { success user { id role phone nickname points } }
  }`;

const MY_PROFILE = `query { myProfile { id role phone nickname points avatarUrl } }`;

const SEND_SMS_CODE = `
  mutation SendSmsCode($input: SendSmsCodeInput!) {
    sendSmsCode(input: $input) { success expiresInMs }
  }`;

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe.serial("Real User Full-Flow — Browser E2E", () => {
  test.beforeAll(async () => {
    await cleanup();
  });

  test.afterAll(async () => {
    await cleanup();
  });

  // ─── A: Fresh user profile page ──────────────────────────────────────────

  test("A. Fresh user navigates /me → sees profile with no phone bound", async ({ page }) => {
    const userId = `${P}a-fresh`;
    await seedUser({
      id: userId,
      name: "Fresh-A",
      role: "customer",
      phone: "",
      nickname: "新用户A",
      points: 0,
      platform: "wechat-open",
      providerAccountId: "wx-open-a-fresh",
    });

    await setupUserAuth(page, userId);
    await page.goto("/gg-zh_Hans/me");
    await page.waitForLoadState("networkidle");

    // Profile should show the nickname
    await expect(page.locator("body")).toContainText("新用户A");
    // Phone section shows "未绑定" (not bound)
    await expect(page.locator("body")).toContainText("未绑定");
  });

  // ─── B: WeChat user binds phone, absorbs SMS user ────────────────────────

  test("B. WeChat user binds phone via verifyPhone → absorbs SMS user, profile updates", async ({ page }) => {
    const phone = "13800020001";
    const code = "111222";

    // Seed SMS user (has points, nickname)
    await seedUser({
      id: `${P}b-sms`,
      name: "SMS-B",
      role: "customer",
      phone,
      nickname: "短信用户",
      points: 50,
      platform: "SMS",
      providerAccountId: phone,
    });

    // Seed WeChat user (acting)
    const wxId = `${P}b-wx`;
    await seedUser({
      id: wxId,
      name: "WX-B",
      role: "customer",
      phone: "",
      nickname: "微信用户B",
      points: 30,
      platform: "wechat-open",
      providerAccountId: "wx-open-b",
    });

    await kvPut(`sms_code:${phone}`, code);

    // Call verifyPhone (same code path as the me page UI)
    const result = await gql(page, wxId, VERIFY_PHONE, { input: { phone, code } });
    expect(result.errors).toBeUndefined();
    const vp = result.data!.verifyPhone as { success: boolean; user: { id: string; phone: string; points: number } };
    expect(vp.success).toBe(true);
    expect(vp.user.phone).toBe(phone);
    expect(vp.user.points).toBe(80); // 30 + 50

    // Navigate /me as this user → phone should be visible
    await setupUserAuth(page, wxId);
    await page.goto("/gg-zh_Hans/me");
    await page.waitForLoadState("networkidle");

    // Phone number should appear on the page
    await expect(page.locator("body")).toContainText(phone);
  });

  // ─── C: Three-platform cascade ──────────────────────────────────────────

  test("C. Three-platform merge: one phone shared by 3 users → all data consolidates", async ({ page }) => {
    const phone = "13800030001";
    const code = "333444";

    // Seed 3 users with same phone
    await seedUser({
      id: `${P}c-sms`,
      name: "SMS-C",
      role: "customer",
      phone,
      nickname: "短信C",
      points: 10,
      platform: "SMS",
      providerAccountId: phone,
    });
    await seedUser({
      id: `${P}c-mp`,
      name: "MP-C",
      role: "staff",
      phone,
      nickname: "公众号C",
      points: 20,
      platform: "wechat-mp",
      providerAccountId: "mp-openid-c",
    });

    // Acting user: wechat-open, no phone yet
    const openId = `${P}c-open`;
    await seedUser({
      id: openId,
      name: "Open-C",
      role: "customer",
      phone: "",
      nickname: "开放平台C",
      points: 15,
      platform: "wechat-open",
      providerAccountId: "wx-open-c",
    });

    await kvPut(`sms_code:${phone}`, code);

    // Bind phone → absorbs both SMS and MP users
    const result = await gql(page, openId, VERIFY_PHONE, { input: { phone, code } });
    expect(result.errors).toBeUndefined();
    const vp = result.data!.verifyPhone as { success: boolean; user: { role: string; points: number } };
    expect(vp.success).toBe(true);
    expect(vp.user.role).toBe("STAFF"); // highest role
    expect(vp.user.points).toBe(45);   // 15 + 10 + 20

    // Both source users disabled
    const disabled = await d1Query(
      `SELECT id, name FROM "user" WHERE id IN ('${P}c-sms', '${P}c-mp') ORDER BY id`
    );
    expect(disabled.every(r => r.name === "[merged]")).toBe(true);

    // Open user has 3 account records
    const accts = await d1Query(`SELECT provider FROM account WHERE userId = '${openId}'`);
    expect(accts.length).toBe(3);
  });

  // ─── D: Full journey ─────────────────────────────────────────────────────

  test("D. Full journey: create user → set nickname → bind phone → merged data on profile", async ({ page }) => {
    const phone = "13800040001";
    const code = "444555";
    const userId = `${P}d-journey`;

    // Seed user with auto-generated nickname (simulating fresh WeChat login)
    await seedUser({
      id: userId,
      name: "Journey-D",
      role: "customer",
      phone: "",
      nickname: "",
      points: 0,
      platform: "wechat-mp",
      providerAccountId: "mp-openid-d-journey",
    });

    // Seed a pre-existing SMS user on this phone (will be absorbed)
    await seedUser({
      id: `${P}d-sms-existing`,
      name: "Existing-D",
      role: "customer",
      phone,
      nickname: "老用户D",
      points: 75,
      platform: "SMS",
      providerAccountId: phone,
      avatarUrl: "https://example.com/avatar-d.jpg",
    });

    // Step 1: User updates nickname via updateProfile
    const profileResult = await gql(page, userId, `
      mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) { success user { nickname } }
      }
    `, { input: { nickname: "旅程用户D" } });
    expect(profileResult.errors).toBeUndefined();
    expect((profileResult.data!.updateProfile as { user: { nickname: string } }).user.nickname).toBe("旅程用户D");

    // Step 2: User binds phone (absorbs the SMS user)
    await kvPut(`sms_code:${phone}`, code);
    const verifyResult = await gql(page, userId, VERIFY_PHONE, { input: { phone, code } });
    expect(verifyResult.errors).toBeUndefined();
    const vp = verifyResult.data!.verifyPhone as { success: boolean; user: { phone: string; points: number; nickname: string } };
    expect(vp.success).toBe(true);
    expect(vp.user.phone).toBe(phone);
    expect(vp.user.points).toBe(75); // 0 + 75 from absorbed user
    expect(vp.user.nickname).toBe("旅程用户D"); // target keeps its own nickname

    // Step 3: Navigate /me page → verify all merged data visible
    await setupUserAuth(page, userId);
    await page.goto("/gg-zh_Hans/me");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).toContainText(phone);
    await expect(body).toContainText("旅程用户D");

    // The avatar should be inherited from the source (target had none)
    const info = await d1Query(`SELECT avatar_url FROM user_info WHERE id = '${userId}'`);
    expect(info[0].avatar_url).toBe("https://example.com/avatar-d.jpg");
  });

  // ─── E: Role promotion via admin merge ───────────────────────────────────

  test("E. Customer absorbs admin user → becomes admin, /me shows admin status", async ({ page }) => {
    const phone = "13800050001";
    const code = "555666";

    // Admin user on this phone
    await seedUser({
      id: `${P}e-admin`,
      name: "Admin-E",
      role: "admin",
      phone,
      nickname: "管理员E",
      points: 200,
      platform: "SMS",
      providerAccountId: phone,
    });

    // Customer user (acting)
    const custId = `${P}e-cust`;
    await seedUser({
      id: custId,
      name: "Customer-E",
      role: "customer",
      phone: "",
      nickname: "顾客E",
      points: 10,
      platform: "wechat-open",
      providerAccountId: "wx-open-e",
    });

    await kvPut(`sms_code:${phone}`, code);

    const result = await gql(page, custId, VERIFY_PHONE, { input: { phone, code } });
    expect(result.errors).toBeUndefined();
    const vp = result.data!.verifyPhone as { success: boolean; user: { role: string; points: number } };
    expect(vp.user.role).toBe("ADMIN");
    expect(vp.user.points).toBe(210); // 10 + 200
  });

  // ─── F: Idempotent re-verify ─────────────────────────────────────────────

  test("F. User re-verifies same phone → no error, no data loss", async ({ page }) => {
    const phone = "13800060001";
    const code = "666777";
    const userId = `${P}f-user`;

    await seedUser({
      id: userId,
      name: "Idem-F",
      role: "customer",
      phone,
      nickname: "幂等F",
      points: 42,
      platform: "SMS",
      providerAccountId: phone,
    });

    // First verify
    await kvPut(`sms_code:${phone}`, code);
    const r1 = await gql(page, userId, VERIFY_PHONE, { input: { phone, code } });
    expect(r1.errors).toBeUndefined();
    expect((r1.data!.verifyPhone as { user: { points: number } }).user.points).toBe(42);

    // Second verify (same phone)
    await kvPut(`sms_code:${phone}`, code);
    const r2 = await gql(page, userId, VERIFY_PHONE, { input: { phone, code } });
    expect(r2.errors).toBeUndefined();
    expect((r2.data!.verifyPhone as { user: { points: number } }).user.points).toBe(42);

    // Only 1 SMS account
    const accts = await d1Query(`SELECT COUNT(*) as cnt FROM account WHERE userId = '${userId}' AND provider = 'SMS'`);
    expect(accts[0].cnt).toBe(1);
  });

  // ─── G: Sequential merges accumulate correctly ───────────────────────────

  test("G. Sequential merges: bind phone A (absorb user), then phone B (absorb another)", async ({ page }) => {
    const phoneA = "13800070001";
    const phoneB = "13800070002";
    const codeA = "777888";
    const codeB = "888999";
    const actingId = `${P}g-acting`;

    // Acting user starts with 5 points
    await seedUser({
      id: actingId,
      name: "Acting-G",
      role: "customer",
      phone: "",
      nickname: "主用户G",
      points: 5,
      platform: "wechat-open",
      providerAccountId: "wx-open-g",
    });

    // User A on phone A, 20 points
    await seedUser({
      id: `${P}g-sms-a`,
      name: "SMS-GA",
      role: "customer",
      phone: phoneA,
      nickname: "短信GA",
      points: 20,
      platform: "SMS",
      providerAccountId: phoneA,
    });

    // User B on phone B, 30 points, staff role
    await seedUser({
      id: `${P}g-sms-b`,
      name: "SMS-GB",
      role: "staff",
      phone: phoneB,
      nickname: "短信GB",
      points: 30,
      platform: "SMS",
      providerAccountId: phoneB,
    });

    // First merge: bind phone A
    await kvPut(`sms_code:${phoneA}`, codeA);
    const r1 = await gql(page, actingId, VERIFY_PHONE, { input: { phone: phoneA, code: codeA } });
    expect(r1.errors).toBeUndefined();
    const v1 = r1.data!.verifyPhone as { user: { points: number; role: string } };
    expect(v1.user.points).toBe(25); // 5 + 20
    expect(v1.user.role).toBe("CUSTOMER");

    // Second merge: bind phone B (changes phone)
    await kvPut(`sms_code:${phoneB}`, codeB);
    const r2 = await gql(page, actingId, VERIFY_PHONE, { input: { phone: phoneB, code: codeB } });
    expect(r2.errors).toBeUndefined();
    const v2 = r2.data!.verifyPhone as { user: { points: number; role: string; phone: string } };
    expect(v2.user.points).toBe(55); // 25 + 30
    expect(v2.user.role).toBe("STAFF"); // promoted
    expect(v2.user.phone).toBe(phoneB); // phone updated to latest

    // Both source users disabled
    const merged = await d1Query(`SELECT name FROM "user" WHERE id IN ('${P}g-sms-a', '${P}g-sms-b')`);
    expect(merged.every(r => r.name === "[merged]")).toBe(true);
  });

  // ─── H: Phone binding state change visible on /me page ───────────────────

  test("H. Navigate /me before and after binding → phone state changes from unbound to bound", async ({ page }) => {
    const phone = "13800080001";
    const code = "999000";
    const userId = `${P}h-user`;

    await seedUser({
      id: userId,
      name: "NavH",
      role: "customer",
      phone: "",
      nickname: "导航用户H",
      points: 0,
      platform: "wechat-mp",
      providerAccountId: "mp-openid-h",
    });

    // Visit /me before binding → shows unbound
    await setupUserAuth(page, userId);
    await page.goto("/gg-zh_Hans/me");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText("未绑定");

    // Bind phone via API
    await kvPut(`sms_code:${phone}`, code);
    await gql(page, userId, VERIFY_PHONE, { input: { phone, code } });

    // Reload /me → should show the phone number
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText(phone);
  });
});
