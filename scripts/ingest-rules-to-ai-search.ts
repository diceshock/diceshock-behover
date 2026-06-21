/**
 * Ingest 5E rules from R2 (ds-raw-feed) into Cloudflare AI Search instance.
 * Uses Cloudflare API directly since AI Search items.upload requires the REST API from outside Workers.
 *
 * Usage: cd scripts && pnpm tsx ingest-rules-to-ai-search.ts
 */

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const R2_ENDPOINT =
  "https://3244c8f91cd34317ce18652158e5853a.r2.cloudflarestorage.com";
const R2_BUCKET = "ds-raw-feed";
const R2_PREFIX = "5e-rules/";

const CF_ACCOUNT_ID = "3244c8f91cd34317ce18652158e5853a";
const AI_SEARCH_INSTANCE = "nameless-resonance-0d56";

const BATCH_SIZE = 10;
const DELAY_MS = 500;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId:
      process.env.R2_ACCESS_KEY_ID || "3ee9baca07439354c98d70e55be61d66",
    secretAccessKey:
      process.env.R2_SECRET_ACCESS_KEY ||
      "2b81b04a457762f1aeaf48d9e554e3d5c24a3db606c615d61f4f76042356e610",
  },
});

function getCfApiToken(): string {
  const token =
    process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_D1_TOKEN;
  if (!token) {
    console.error(
      "❌ Set CLOUDFLARE_API_TOKEN env var (needs AI Search write permission)",
    );
    process.exit(1);
  }
  return token;
}

async function listAllKeys(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: R2_PREFIX,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );

    for (const obj of res.Contents || []) {
      if (
        obj.Key &&
        obj.Key.endsWith(".md") &&
        !obj.Key.endsWith("_manifest.json")
      ) {
        keys.push(obj.Key);
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function getFileContent(key: string): Promise<string> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  );
  return await res.Body!.transformToString("utf-8");
}

async function uploadToAiSearch(
  token: string,
  filename: string,
  content: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai-search/instances/${AI_SEARCH_INSTANCE}/items`;

  const formData = new FormData();
  const blob = new Blob([content], { type: "text/markdown" });
  formData.append("file", blob, filename);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 200) };
  }

  return { ok: true, status: res.status };
}

async function main() {
  console.log("📚 Ingesting 5E rules into AI Search");
  console.log("═".repeat(50));

  const token = getCfApiToken();

  console.log("📂 Listing R2 keys...");
  const keys = await listAllKeys();
  console.log(`  Found ${keys.length} markdown files`);

  if (keys.length === 0) {
    console.error("❌ No markdown files found in R2");
    process.exit(1);
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (key) => {
        const content = await getFileContent(key);

        if (content.length < 50) {
          skipped++;
          return;
        }

        const filename = key.replace(R2_PREFIX, "");
        const result = await uploadToAiSearch(token, filename, content);

        if (!result.ok) {
          if (result.status === 429) {
            await new Promise((r) => setTimeout(r, 2000));
            const retry = await uploadToAiSearch(token, filename, content);
            if (!retry.ok) {
              console.warn(`  ⚠️ ${filename}: ${retry.error}`);
              failed++;
              return;
            }
          } else {
            console.warn(`  ⚠️ ${filename}: ${result.status} ${result.error}`);
            failed++;
            return;
          }
        }
        success++;
      }),
    );

    const progress = Math.min(i + BATCH_SIZE, keys.length);
    process.stdout.write(
      `\r  📤 ${progress}/${keys.length} (ok: ${success}, fail: ${failed}, skip: ${skipped})`,
    );

    if (i + BATCH_SIZE < keys.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log("\n\n" + "═".repeat(50));
  console.log(`✅ Ingestion complete`);
  console.log(`   Uploaded: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped (too small): ${skipped}`);
  console.log(`   AI Search instance: ${AI_SEARCH_INSTANCE}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
