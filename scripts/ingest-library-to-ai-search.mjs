/**
 * Ingest cleaned library content from ds-library R2 into Cloudflare AI Search.
 * Replaces the old ingest-rules-to-ai-search.ts that used raw files.
 *
 * Usage: cd scripts && node ingest-library-to-ai-search.mjs [--dry-run] [--prefix=boardgames/]
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";

// ─── Config ────────────────────────────────────────────────────────────────

const CF_ACCOUNT_ID = "3244c8f91cd34317ce18652158e5853a";
const AI_SEARCH_INSTANCE = "nameless-resonance-0d56";
const LIBRARY_BUCKET = "ds-library";

const BATCH_SIZE = 5;
const DELAY_MS = 1000;

// ─── CLI Args ──────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const PREFIX = process.argv
  .find((a) => a.startsWith("--prefix="))
  ?.split("=")[1] || "";

// ─── Auth ──────────────────────────────────────────────────────────────────

function getCfApiToken() {
  const token =
    process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  if (token) return token;
  try {
    const toml = readFileSync(
      homedir() + "/.wrangler/config/default.toml",
      "utf8",
    );
    const match = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch {}
  throw new Error("Missing CLOUDFLARE_API_TOKEN");
}

// ─── R2 via CF API ─────────────────────────────────────────────────────────

async function listLibraryKeys(prefix) {
  const token = getCfApiToken();
  const keys = [];
  let cursor = "";

  do {
    const params = new URLSearchParams({
      prefix: prefix,
      per_page: "1000",
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${LIBRARY_BUCKET}/objects?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json();

    if (!data.success) throw new Error(`List failed: ${JSON.stringify(data.errors)}`);

    for (const obj of data.result?.objects || []) {
      if (obj.key.endsWith(".md")) keys.push(obj.key);
    }

    cursor = data.result?.truncated ? data.result_info?.cursor || "" : "";
  } while (cursor);

  return keys;
}

async function readLibraryFile(key) {
  const token = getCfApiToken();
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${LIBRARY_BUCKET}/objects/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Read failed ${key}: ${res.status}`);
  return res.text();
}

// ─── AI Search Upload ──────────────────────────────────────────────────────

async function uploadToAiSearch(token, filename, content) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai-search/instances/${AI_SEARCH_INSTANCE}/items`;

  const formData = new FormData();
  const blob = new Blob([content], { type: "text/markdown" });
  formData.append("file", blob, filename);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 200) };
  }
  return { ok: true, status: res.status };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `📚 Ingest ds-library → AI Search${DRY_RUN ? " (DRY RUN)" : ""}`,
  );
  console.log(`   Instance: ${AI_SEARCH_INSTANCE}`);
  console.log(`   Prefix: ${PREFIX || "(all)"}`);
  console.log("═".repeat(60));

  const token = getCfApiToken();

  console.log("📂 Listing library files...");
  const keys = await listLibraryKeys(PREFIX);
  console.log(`  Found ${keys.length} markdown files`);

  if (keys.length === 0) {
    console.log("Nothing to ingest.");
    return;
  }

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (key) => {
        const content = await readLibraryFile(key);

        if (content.length < 100) {
          skipped++;
          return;
        }

        if (DRY_RUN) {
          success++;
          return;
        }

        // Use the relative path as filename for AI Search
        const filename = key;
        const result = await uploadToAiSearch(token, filename, content);

        if (!result.ok) {
          if (result.status === 429) {
            await new Promise((r) => setTimeout(r, 3000));
            const retry = await uploadToAiSearch(token, filename, content);
            if (!retry.ok) {
              console.warn(`\n  ⚠️ ${filename}: ${retry.error}`);
              failed++;
              return;
            }
          } else {
            console.warn(`\n  ⚠️ ${filename}: ${result.status} ${result.error}`);
            failed++;
            return;
          }
        }
        success++;
      }),
    );

    for (const r of results) {
      if (r.status === "rejected") {
        failed++;
        console.error(`\n  ❌ ${r.reason}`);
      }
    }

    const progress = Math.min(i + BATCH_SIZE, keys.length);
    process.stdout.write(
      `\r  📤 ${progress}/${keys.length} (ok: ${success}, fail: ${failed}, skip: ${skipped})`,
    );

    if (i + BATCH_SIZE < keys.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log("\n\n" + "═".repeat(60));
  console.log(`✅ Ingestion complete`);
  console.log(`   Uploaded: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped (too small): ${skipped}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
