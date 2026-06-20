#!/usr/bin/env -S npx tsx

/**
 * Seeds the stores table and backfills store_id on all store-scoped tables.
 *
 * Usage:
 *   pnpm run backfill
 *   # or directly:
 *   npx tsx scripts/backfill-store-id.ts
 *
 * Prerequisites:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN
 *   must be set in .env (loaded via dotenv).
 *
 * IMPORTANT: store_id columns store the store CODE ('gg'/'jdk'), NOT the UUID.
 * This matches how ctx.storeCode is set by middleware and used in tRPC filters.
 */

import "dotenv/config";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;

if (!ACCOUNT_ID || !DATABASE_ID || !TOKEN) {
  console.error(
    "Missing env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN",
  );
  process.exit(1);
}

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`;

interface D1ApiResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: Array<{
    results: Array<Record<string, unknown>> | null;
    success: boolean;
    meta?: {
      rows_written?: number;
      rows_read?: number;
      duration?: number;
      last_row_id?: number;
      changes?: number;
    };
  }>;
}

async function query(
  sql: string,
  params: unknown[] = [],
): Promise<D1ApiResponse["result"]> {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  const body = (await res.json()) as D1ApiResponse;

  if (!body.success) {
    const errors = body.errors.map((e) => `${e.code}: ${e.message}`).join(", ");
    throw new Error(`D1 query failed: ${errors}\nSQL: ${sql}`);
  }

  return body.result;
}

async function main() {
  console.log("🔧 Backfilling store_id...\n");

  // ── Step 1: Seed stores ──────────────────────────────────────────
  console.log("1. Seeding stores table...");

  await query(`
    INSERT OR IGNORE INTO stores (id, code, name, address) VALUES
      ('store_001', 'gg', '光谷店', '武汉市洪山区光谷广场'),
      ('store_002', 'jdk', '街道口店', '武汉市洪山区街道口')
  `);

  console.log(
    "   Stores seeded (existing entries skipped if already present).\n",
  );

  // ── Step 2: Verify stores exist ─────────────────────────────────
  const storeRows = await query("SELECT id, code, name FROM stores");
  const stores = storeRows[0]?.results ?? [];
  console.log("   Current stores:", JSON.stringify(stores, null, 2));
  console.log();

  // ── Step 3: Backfill all store-scoped tables ────────────────────
  const tables = [
    "tables",
    "events",
    "actives",
    "pricing_snapshots",
    "mahjong_matches",
    "leaderboard_snapshots",
  ];

  for (const table of tables) {
    const result = await query(
      `UPDATE "${table}" SET store_id = 'gg' WHERE store_id IS NULL`,
    );
    const rowsUpdated = result[0]?.meta?.rows_written ?? "?";
    console.log(`   ${table}: ${rowsUpdated} row(s) updated.`);
  }

  // ── Step 4: Verify null counts ──────────────────────────────────
  console.log("\n2. Verifying no null store_id values remain...");
  for (const table of tables) {
    const resultRaw = await query(
      `SELECT COUNT(*) as cnt FROM "${table}" WHERE store_id IS NULL`,
    );
    const rows = resultRaw[0]?.results ?? [];
    const cnt = (rows[0] as { cnt?: number } | undefined)?.cnt ?? "?";
    console.log(`   ${table}: ${cnt} null(s) remaining`);
  }

  console.log("\n✅ Backfill complete.");
  console.log(
    "   Run again anytime — it is idempotent (INSERT OR IGNORE + WHERE IS NULL).",
  );
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
