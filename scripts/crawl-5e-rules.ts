/**
 * 5E 不全书爬虫 - 爬取 https://5echm.kagangtuya.top/ 的所有规则页面
 * 清洗 HTML → Markdown，上传到 R2 ds-raw-feed bucket
 *
 * Usage: cd scripts && pnpm tsx crawl-5e-rules.ts
 */

import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import TurndownService from "turndown";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = "https://5echm.kagangtuya.top/";
const TOC_URL = `${BASE_URL}webhelpcontents.htm`;
const R2_ENDPOINT =
  "https://3244c8f91cd34317ce18652158e5853a.r2.cloudflarestorage.com";
const R2_BUCKET = "ds-raw-feed";
const R2_PREFIX = "5e-rules/"; // All files stored under this prefix
const CONCURRENCY = 5; // Parallel fetch limit
const DELAY_MS = 200; // Polite delay between batches

// ─── S3 Client ────────────────────────────────────────────────────────────────
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

// ─── Turndown (HTML → Markdown) ───────────────────────────────────────────────
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Remove images, scripts, styles
turndown.remove(["script", "style", "img", "iframe"]);

// Convert tables properly
turndown.addRule("tableCell", {
  filter: ["th", "td"],
  replacement(content, node) {
    return ` ${content.trim().replace(/\n/g, " ")} |`;
  },
});

turndown.addRule("tableRow", {
  filter: "tr",
  replacement(content) {
    return `|${content}\n`;
  },
});

turndown.addRule("tableHead", {
  filter: "thead",
  replacement(content) {
    // Add separator row after header
    const cols = (content.match(/\|/g) || []).length - 1;
    const sep = "|" + " --- |".repeat(cols);
    return `${content}${sep}\n`;
  },
});

turndown.addRule("tableBody", {
  filter: ["tbody", "tfoot"],
  replacement(content) {
    return content;
  },
});

turndown.addRule("table", {
  filter: "table",
  replacement(content) {
    return `\n${content}\n`;
  },
});

// ─── Step 1: Parse TOC to extract all page URLs ──────────────────────────────
async function parseTOC(): Promise<
  { url: string; title: string; path: string }[]
> {
  console.log("📖 Fetching TOC...");
  const res = await fetch(TOC_URL);
  const html = await res.text();

  // Extract all href links pointing to topics/ or scr/
  const linkRegex =
    /href="([^"#]+\.(html?|htm))"\s*[^>]*(?:target="content")?[^>]*title="([^"]*)"/g;
  const seen = new Set<string>();
  const pages: { url: string; title: string; path: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const title = match[3];

    // Skip separator lines and duplicate entries
    if (href.startsWith("#") || seen.has(href)) continue;
    if (title.includes("分割线")) continue;

    seen.add(href);
    pages.push({
      url: `${BASE_URL}${encodeURI(href)}`,
      title,
      path: href,
    });
  }

  console.log(`  Found ${pages.length} unique pages`);
  return pages;
}

// ─── Step 2: Fetch & clean a single page ─────────────────────────────────────
async function fetchAndClean(page: {
  url: string;
  title: string;
  path: string;
}): Promise<{ key: string; markdown: string } | null> {
  try {
    const res = await fetch(page.url);
    if (!res.ok) {
      console.warn(`  ⚠️  ${res.status} ${page.path}`);
      return null;
    }

    const html = await res.text();

    // Extract <body> content (skip head/nav chrome)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;

    // Convert to markdown
    let md = turndown.turndown(bodyHtml);

    // Clean up excessive whitespace
    md = md.replace(/\n{3,}/g, "\n\n").trim();

    // Add frontmatter
    const frontmatter = [
      "---",
      `title: "${page.title.replace(/"/g, '\\"')}"`,
      `source: "${page.path}"`,
      `crawled_at: "${new Date().toISOString()}"`,
      "---",
      "",
    ].join("\n");

    const fullMd = frontmatter + md;

    // Build R2 key: 5e-rules/topics/玩家手册2024/xxx.md
    const key = R2_PREFIX + page.path.replace(/\.(html?|htm)$/i, ".md");

    return { key, markdown: fullMd };
  } catch (err: any) {
    console.warn(`  ❌ Error fetching ${page.path}: ${err.message}`);
    return null;
  }
}

// ─── Step 3: Upload to R2 ────────────────────────────────────────────────────
async function uploadToR2(key: string, content: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: content,
      ContentType: "text/markdown; charset=utf-8",
      Metadata: {
        source: "5echm.kagangtuya.top",
        type: "trpg-rules",
      },
    }),
  );
}

// ─── Step 4: Process in batches ──────────────────────────────────────────────
async function processBatch(
  pages: { url: string; title: string; path: string }[],
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < pages.length; i += CONCURRENCY) {
    const batch = pages.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(fetchAndClean));

    for (const result of results) {
      if (result) {
        await uploadToR2(result.key, result.markdown);
        success++;
      } else {
        failed++;
      }
    }

    const progress = Math.min(i + CONCURRENCY, pages.length);
    process.stdout.write(
      `\r  📤 Uploaded: ${success}/${pages.length} (failed: ${failed})`,
    );

    // Polite delay
    if (i + CONCURRENCY < pages.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(""); // newline after progress
  return { success, failed };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🎲 5E 不全书 Crawler → R2 (ds-raw-feed)");
  console.log("═".repeat(50));

  // Verify R2 connectivity
  try {
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 1 }),
    );
    console.log(`✅ R2 connected (bucket: ${R2_BUCKET})`);
  } catch (e: any) {
    console.error(`❌ R2 connection failed: ${e.message}`);
    process.exit(1);
  }

  // Parse TOC
  const pages = await parseTOC();
  if (pages.length === 0) {
    console.error("❌ No pages found in TOC");
    process.exit(1);
  }

  // Crawl & upload
  console.log(
    `\n🕷️  Crawling ${pages.length} pages (concurrency: ${CONCURRENCY})...`,
  );
  const { success, failed } = await processBatch(pages);

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log(`✅ Done! ${success} pages uploaded to R2`);
  if (failed > 0) console.log(`⚠️  ${failed} pages failed`);
  console.log(`📁 R2 path: ${R2_BUCKET}/${R2_PREFIX}`);

  // Also upload a manifest/index
  const manifest = {
    source: "https://5echm.kagangtuya.top/",
    crawled_at: new Date().toISOString(),
    total_pages: success,
    pages: pages.map((p) => ({
      title: p.title,
      key: R2_PREFIX + p.path.replace(/\.(html?|htm)$/i, ".md"),
    })),
  };

  await uploadToR2(
    `${R2_PREFIX}_manifest.json`,
    JSON.stringify(manifest, null, 2),
  );
  console.log(`📋 Manifest uploaded: ${R2_PREFIX}_manifest.json`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
