/**
 * 批量清洗已完成 OCR 文档的 frontmatter，将外部图片引用替换为本地 R2 CDN 引用。
 *
 * 外部: https://oss.gstonegames.com/static/image/document/...
 * 本地: https://assets.runespark.fun/gstone-doc-pages/{docId}/{pageIndex}.jpg
 *
 * Usage: cd scripts && pnpm tsx rewrite-rulebook-image-urls.ts [--dry-run]
 */

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const R2_ENDPOINT =
  "https://3244c8f91cd34317ce18652158e5853a.r2.cloudflarestorage.com";
const R2_BUCKET = "ds-raw-feed";
const R2_PREFIX = "gstone-rulebooks/";
const CDN_BASE = "https://assets.runespark.fun/";
const CONCURRENCY = 20;

const DRY_RUN = process.argv.includes("--dry-run");

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function listAllKeys(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: R2_PREFIX,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key?.endsWith(".md")) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);

  return keys;
}

async function getFile(key: string): Promise<string> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  );
  return (await res.Body?.transformToString("utf-8")) ?? "";
}

async function putFile(key: string, content: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: content,
      ContentType: "text/markdown; charset=utf-8",
    }),
  );
}

/**
 * Extract document_id from the R2 key: gstone-rulebooks/{gameId}/{docId}.md
 */
function extractDocId(key: string): number | null {
  const match = key.match(/gstone-rulebooks\/\d+\/(\d+)\.md$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

/**
 * Rewrite frontmatter image_url lines from external OSS to local R2 CDN.
 * Returns null if no changes were needed.
 */
function rewriteContent(content: string, docId: number): string | null {
  // Split frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return null;

  const frontmatter = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Check if there are any external image URLs
  if (!frontmatter.includes("oss.gstonegames.com")) return null;

  // Rewrite each page's image_url in the YAML frontmatter
  let pageIndex = 0;
  const rewritten = frontmatter.replace(
    /image_url:\s*"([^"]+)"/g,
    (_match, _url: string) => {
      const localUrl = `${CDN_BASE}gstone-doc-pages/${docId}/${pageIndex}.jpg`;
      pageIndex++;
      return `image_url: "${localUrl}"`;
    },
  );

  if (rewritten === frontmatter) return null;
  return `---\n${rewritten}\n---\n${body}`;
}

async function processBatch(keys: string[]): Promise<void> {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const docId = extractDocId(key);
      if (docId === null) return { key, status: "skip" as const };

      const content = await getFile(key);
      const rewritten = rewriteContent(content, docId);

      if (!rewritten) return { key, status: "unchanged" as const };

      if (!DRY_RUN) {
        await putFile(key, rewritten);
      }
      return { key, status: "rewritten" as const };
    }),
  );

  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`  ❌ Error: ${r.reason}`);
    }
  }
}

async function main() {
  console.log(
    `📝 Rewrite rulebook image URLs → local R2 CDN${DRY_RUN ? " (DRY RUN)" : ""}`,
  );
  console.log("═".repeat(50));

  const keys = await listAllKeys();
  console.log(`📂 Found ${keys.length} markdown files`);

  if (keys.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let rewritten = 0;
  let unchanged = 0;
  let errors = 0;

  for (let i = 0; i < keys.length; i += CONCURRENCY) {
    const batch = keys.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (key) => {
        const docId = extractDocId(key);
        if (docId === null) return "skip";

        const content = await getFile(key);
        const result = rewriteContent(content, docId);

        if (!result) return "unchanged";

        if (!DRY_RUN) {
          await putFile(key, result);
        }
        return "rewritten";
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value === "rewritten") rewritten++;
        else if (r.value === "unchanged") unchanged++;
      } else {
        errors++;
        console.error(`  ❌ ${r.reason}`);
      }
    }

    const progress = Math.min(i + CONCURRENCY, keys.length);
    process.stdout.write(
      `\r  📤 ${progress}/${keys.length} (rewritten: ${rewritten}, unchanged: ${unchanged}, errors: ${errors})`,
    );
  }

  console.log("\n\n" + "═".repeat(50));
  console.log(`✅ Done!`);
  console.log(`   Rewritten: ${rewritten}`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log(`   Errors: ${errors}`);
  if (DRY_RUN) console.log(`   ⚠️  DRY RUN — no files were modified`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
