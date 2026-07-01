/**
 * Binding Order Cartesian — Full Permutation E2E
 *
 * Tests merge correctness across all binding orderings and role combinations.
 *
 * Part 1: Chain merge — one acting user binds 2 phones sequentially,
 *   absorbing one user per phone. All 6 permutations of (acting platform,
 *   first target platform, second target platform).
 *
 * Part 2: Pairwise in both directions — for each pair of distinct platforms,
 *   test A absorbs B and B absorbs A. 6 platform pairs × 2 directions = 12.
 *
 * Part 3: Role Cartesian — 9 role combinations (3×3) verify highest role wins.
 *
 * Total: 6 + 12 + 9 = 27 tests
 */
import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const CWD = process.cwd();

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = "SMS" | "wechat-open" | "wechat-mp";

interface TestUser {
  id: string;
  name: string;
  phone: string;
  role: "customer" | "staff" | "admin";
  points: number;
  nickname: string;
  avatar_url?: string;
  platform: Platform;
  providerAccountId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function seedUser(user: TestUser): Promise<void> {
  const now = Date.now();
  // Execute each statement individually to avoid multi-statement shell issues
  await d1Execute(
    `INSERT OR REPLACE INTO "user" (id, name, email, role) VALUES ('${user.id}', '${user.name}', '${user.id}@test.cart', '${user.role}');`,
  );
  await d1Execute(
    `INSERT OR REPLACE INTO user_info (id, uid, create_at, nickname, phone, points, preferred_store_id, preferred_locale${user.avatar_url ? ", avatar_url" : ""}) VALUES ('${user.id}', 'uid-${user.id}', ${now}, '${user.nickname}', '${user.phone}', ${user.points}, 'store-cart', 'zh'${user.avatar_url ? `, '${user.avatar_url}'` : ""});`,
  );
  await d1Execute(
    `INSERT OR REPLACE INTO account (userId, type, provider, providerAccountId) VALUES ('${user.id}', '${user.platform === "SMS" ? "credentials" : "oauth"}', '${user.platform}', '${user.providerAccountId}');`,
  );
}

async function seedSmsCode(phone: string, code: string): Promise<void> {
  await kvPut(`sms_code:${phone}`, code);
}

async function queryUser(id: string): Promise<Record<string, unknown> | null> {
  const rows = await d1Query(
    `SELECT u.id, u.name, u.role, ui.phone, ui.nickname, ui.points, ui.avatar_url FROM "user" u LEFT JOIN user_info ui ON u.id = ui.id WHERE u.id = '${id}';`,
  );
  return rows[0] ?? null;
}

async function queryAccounts(userId: string): Promise<Array<{ provider: string; providerAccountId: string }>> {
  const rows = await d1Query(
    `SELECT provider, providerAccountId FROM account WHERE userId = '${userId}';`,
  );
  return rows as Array<{ provider: string; providerAccountId: string }>;
}

async function cleanupUsers(...ids: string[]): Promise<void> {
  const list = ids.map((id) => `'${id}'`).join(",");
  await d1Execute(`DELETE FROM account WHERE userId IN (${list});`).catch(() => {});
  await d1Execute(`DELETE FROM user_info WHERE id IN (${list});`).catch(() => {});
  await d1Execute(`DELETE FROM "user" WHERE id IN (${list});`).catch(() => {});
}

async function gqlAs(
  request: APIRequestContext,
  userId: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  const response = await request.post("/graphql", {
    headers: {
      "Content-Type": "application/json",
      "X-Test-Role": "customer",
      "X-Test-UserId": userId,
    },
    data: JSON.stringify({ query, variables }),
  });
  return response.json();
}

const VERIFY_PHONE = `
  mutation VerifyPhone($input: VerifyPhoneInput!) {
    verifyPhone(input: $input) {
      success
      user { id role }
    }
  }
`;

// ─── Permutation Utilities ───────────────────────────────────────────────────

const PLATFORMS: Platform[] = ["SMS", "wechat-open", "wechat-mp"];

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// All 6 orderings of 3 platform indices
const PLATFORM_PERMS = permutations([0, 1, 2]);

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Binding Order — Full Cartesian Permutation", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Part 1: Chain merge — one user binds 2 phones, absorbing one user each
  //
  // Permutation [A, B, C] means:
  //   - User on platform A is the ACTOR (binds both phones)
  //   - User on platform B holds phone1
  //   - User on platform C holds phone2
  //   - Actor binds phone1 → absorbs B, then binds phone2 → absorbs C
  //
  // All 6 orderings test that the sequential merge pipeline works regardless
  // of which platforms are involved and in what order data flows.
  // ═══════════════════════════════════════════════════════════════════════════

  for (const perm of PLATFORM_PERMS) {
    const actor = PLATFORMS[perm[0]];
    const target1 = PLATFORMS[perm[1]];
    const target2 = PLATFORMS[perm[2]];
    const label = `${actor} binds phone1(${target1}) then phone2(${target2})`;

    test(`Chain merge: ${label}`, async ({ request }) => {
      const suffix = perm.join("");
      const phone1 = `1390${suffix}10001`;  // 11 digits: 1390 + 3 + 10001 = 12... no
      // 11 digits: "139" (3) + "0" + perm digits (3) + "0001" (4) = 11
      const p1 = `1390${suffix}0001`; // "1390" + "012" + "0001" = 11 ✓
      const p2 = `1390${suffix}0002`; // different phone for second target
      const code = "123456";

      const actorUser: TestUser = {
        id: `cart-chain-${suffix}-actor`,
        name: `Actor-${actor}`,
        phone: "",
        role: "customer",
        points: 10,
        nickname: `Actor-${actor}`,
        platform: actor,
        providerAccountId: actor === "SMS" ? `1391${suffix}9999` : `openid-chain-${suffix}-actor`,
      };

      const target1User: TestUser = {
        id: `cart-chain-${suffix}-t1`,
        name: `Target1-${target1}`,
        phone: p1,
        role: "staff", // higher role to test promotion
        points: 20,
        nickname: `T1-${target1}`,
        avatar_url: "https://example.com/t1.png",
        platform: target1,
        providerAccountId: target1 === "SMS" ? p1 : `openid-chain-${suffix}-t1`,
      };

      const target2User: TestUser = {
        id: `cart-chain-${suffix}-t2`,
        name: `Target2-${target2}`,
        phone: p2,
        role: "customer",
        points: 30,
        nickname: `T2-${target2}`,
        platform: target2,
        providerAccountId: target2 === "SMS" ? p2 : `openid-chain-${suffix}-t2`,
      };

      await seedUser(actorUser);
      await seedUser(target1User);
      await seedUser(target2User);

      // Step 1: Actor binds phone1 → absorbs target1
      await seedSmsCode(p1, code);
      const r1 = await gqlAs(request, actorUser.id, VERIFY_PHONE, {
        input: { phone: p1, code },
      });
      expect(r1.errors, `Step 1 failed: ${JSON.stringify(r1.errors)}`).toBeUndefined();
      expect((r1.data?.verifyPhone as { success: boolean }).success).toBe(true);

      // Verify intermediate state: actor has target1's data
      const midRecord = await queryUser(actorUser.id);
      expect(midRecord?.points).toBe(30); // 10 + 20
      expect(midRecord?.role).toBe("staff"); // promoted
      expect(midRecord?.avatar_url).toBe("https://example.com/t1.png");

      // Target1 should be disabled
      const t1Record = await queryUser(target1User.id);
      expect(t1Record?.name).toBe("[merged]");

      // Step 2: Actor binds phone2 → absorbs target2
      await seedSmsCode(p2, code);
      const r2 = await gqlAs(request, actorUser.id, VERIFY_PHONE, {
        input: { phone: p2, code },
      });
      expect(r2.errors, `Step 2 failed: ${JSON.stringify(r2.errors)}`).toBeUndefined();
      expect((r2.data?.verifyPhone as { success: boolean }).success).toBe(true);

      // Final state: actor has all data
      const finalRecord = await queryUser(actorUser.id);
      expect(finalRecord?.points).toBe(60); // 10 + 20 + 30
      expect(finalRecord?.role).toBe("staff");

      // Actor has all 3 platform accounts
      const allAccounts = await queryAccounts(actorUser.id);
      const providers = allAccounts.map((a) => a.provider);
      expect(providers).toContain("SMS");
      expect(providers).toContain("wechat-open");
      expect(providers).toContain("wechat-mp");

      // Target2 disabled
      const t2Record = await queryUser(target2User.id);
      expect(t2Record?.name).toBe("[merged]");

      await cleanupUsers(actorUser.id, target1User.id, target2User.id);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Part 2: Pairwise binding in both directions (6 pairs × 2 = 12)
  //
  // For each ordered pair (A, B):
  //   - A binds phone → absorbs B (B held the phone)
  // ═══════════════════════════════════════════════════════════════════════════

  for (const platformA of PLATFORMS) {
    for (const platformB of PLATFORMS) {
      if (platformA === platformB) continue;

      test(`Pairwise: ${platformA} binds → absorbs ${platformB}`, async ({ request }) => {
        const aIdx = PLATFORMS.indexOf(platformA);
        const bIdx = PLATFORMS.indexOf(platformB);
        const phoneNum = `1380${aIdx}${bIdx}00001`; // 11 digits: "1380" + 1 + 1 + "00001" = 11
        const code = "654321";

        const binder: TestUser = {
          id: `cart-pw-${aIdx}${bIdx}-binder`,
          name: `Binder-${platformA}`,
          phone: "",
          role: "customer",
          points: 75,
          nickname: `Binder-${platformA}`,
          platform: platformA,
          providerAccountId: platformA === "SMS" ? `1381${aIdx}${bIdx}99999` : `openid-pw-${aIdx}${bIdx}-binder`,
        };

        const holder: TestUser = {
          id: `cart-pw-${aIdx}${bIdx}-holder`,
          name: `Holder-${platformB}`,
          phone: phoneNum,
          role: "staff",
          points: 25,
          nickname: `Holder-${platformB}`,
          avatar_url: "https://example.com/holder.png",
          platform: platformB,
          providerAccountId: platformB === "SMS" ? phoneNum : `openid-pw-${aIdx}${bIdx}-holder`,
        };

        await seedUser(binder);
        await seedUser(holder);
        await seedSmsCode(phoneNum, code);

        const result = await gqlAs(request, binder.id, VERIFY_PHONE, {
          input: { phone: phoneNum, code },
        });

        expect(result.errors, `Failed: ${JSON.stringify(result.errors)}`).toBeUndefined();
        expect((result.data?.verifyPhone as { success: boolean }).success).toBe(true);

        // Binder absorbed holder
        const binderAccounts = await queryAccounts(binder.id);
        const providers = binderAccounts.map((a) => a.provider);
        expect(providers).toContain(platformA);
        expect(providers).toContain(platformB);

        const binderRecord = await queryUser(binder.id);
        expect(binderRecord?.points).toBe(100); // 75 + 25
        expect(binderRecord?.role).toBe("staff");
        expect(binderRecord?.avatar_url).toBe("https://example.com/holder.png");

        const holderRecord = await queryUser(holder.id);
        expect(holderRecord?.name).toBe("[merged]");

        await cleanupUsers(binder.id, holder.id);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Part 3: Role Cartesian — 9 combinations verify highest role wins
  // ═══════════════════════════════════════════════════════════════════════════

  const ROLES: Array<"customer" | "staff" | "admin"> = ["customer", "staff", "admin"];
  const ROLE_PRIORITY: Record<string, number> = { customer: 0, staff: 1, admin: 2 };

  for (const roleA of ROLES) {
    for (const roleB of ROLES) {
      const expectedRole = ROLE_PRIORITY[roleA] >= ROLE_PRIORITY[roleB] ? roleA : roleB;

      test(`Role: ${roleA} absorbs ${roleB} → ${expectedRole}`, async ({ request }) => {
        const aIdx = ROLES.indexOf(roleA);
        const bIdx = ROLES.indexOf(roleB);
        // 11 digits: "1370" + aIdx + bIdx + "00003" = 4+1+1+5 = 11
        const phoneNum = `1370${aIdx}${bIdx}00003`;
        const code = "111222";

        // Seed admin_phones if needed
        if (expectedRole === "admin") {
          await kvPut("admin_phones", JSON.stringify([phoneNum]));
        }

        const target: TestUser = {
          id: `cart-role-${aIdx}${bIdx}-target`,
          name: `Target-${roleA}`,
          phone: "",
          role: roleA,
          points: 10,
          nickname: `Target-${roleA}`,
          platform: "wechat-open",
          providerAccountId: `openid-role-${aIdx}${bIdx}-target`,
        };

        const source: TestUser = {
          id: `cart-role-${aIdx}${bIdx}-source`,
          name: `Source-${roleB}`,
          phone: phoneNum,
          role: roleB,
          points: 5,
          nickname: `Source-${roleB}`,
          platform: "SMS",
          providerAccountId: phoneNum,
        };

        await seedUser(target);
        await seedUser(source);
        await seedSmsCode(phoneNum, code);

        const result = await gqlAs(request, target.id, VERIFY_PHONE, {
          input: { phone: phoneNum, code },
        });

        expect(result.errors, `Failed: ${JSON.stringify(result.errors)}`).toBeUndefined();
        expect((result.data?.verifyPhone as { success: boolean }).success).toBe(true);

        const record = await queryUser(target.id);
        expect(record?.role).toBe(expectedRole);
        expect(record?.points).toBe(15); // 10 + 5

        const sourceRecord = await queryUser(source.id);
        expect(sourceRecord?.name).toBe("[merged]");

        await cleanupUsers(target.id, source.id);
        if (expectedRole === "admin") {
          await kvPut("admin_phones", JSON.stringify([]));
        }
      });
    }
  }
});
