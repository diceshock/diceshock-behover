/**
 * 清洗已爬取的 AoN/5E markdown 文件 + 补爬 PF1 缺失页面
 *
 * Usage: cd scripts && pnpm tsx clean-and-recrawl.ts
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import TurndownService from "turndown";

const R2_ENDPOINT =
  "https://3244c8f91cd34317ce18652158e5853a.r2.cloudflarestorage.com";
const R2_BUCKET = "ds-raw-feed";
const CONCURRENCY = 15;
const DELAY_MS = 80;

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

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
turndown.remove(["script", "style", "img", "iframe", "nav"]);

function cleanMarkdownBody(md: string): string {
  let cleaned = md;

  // Strip AoN nav header: "# [Rules Index](...) | [GM Screen](...) | ..."
  cleaned = cleaned.replace(/^#\s*\[Rules Index\][^\n]*\n+/m, "");

  // Strip "---" or "* * *" horizontal rules at the very start
  cleaned = cleaned.replace(/^\* \* \*\n+/m, "");
  cleaned = cleaned.replace(/^---\n+/m, "");

  // Strip breadcrumb lines like "Player Core [Chapter 8: Playing the Game](/Rules.aspx?...)"
  // These are lines that start with a source book name followed by a bracketed chapter link
  cleaned = cleaned.replace(
    /^[A-Z][^\n]{0,40}\[Chapter \d+[^\]]*\]\([^)]+\)\s*\n+/gm,
    "",
  );
  cleaned = cleaned.replace(
    /^(?:Player Core|GM Core|Monster Core|NPC Core|Core Rulebook|Bestiary|Gamemastery Guide|Advanced Player's Guide|Secrets of Magic|Guns & Gears|Book of the Dead|Dark Archive|Treasure Vault|Rage of Elements|Howl of the Wild|Player Core 2|Starfinder Core Rulebook|Character Operations Manual|Starfinder Enhanced|Galaxy Exploration Manual|Tech Revolution)[^\n]*\n+/gm,
    "",
  );

  // Convert internal AoN links to plain text: [Some Rule](/Rules.aspx?ID=123) → Some Rule
  cleaned = cleaned.replace(
    /\[([^\]]+)\]\(\/?(Rules|Spells|Feats|Classes|Equipment|Traits|Conditions|Actions|Skills|Creatures|Ancestries|Backgrounds|Archetypes|MagicItems|Monsters|Races)[^)]*\)/g,
    "$1",
  );

  // Strip remaining relative links but keep text: [text](Something.aspx...) → text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([A-Z][^)]*\.aspx[^)]*\)/g, "$1");

  // Clean up "**Source** [Book pg. X](URL)" → "Source: Book pg. X"
  cleaned = cleaned.replace(
    /\*\*Source\*\*\s*\[([^\]]+)\]\([^)]+\)/g,
    "Source: $1",
  );

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

async function listAllKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents || []) {
      if (obj.Key && obj.Key.endsWith(".md")) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function getFile(key: string): Promise<string> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  );
  return await res.Body!.transformToString("utf-8");
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

async function cleanExistingFiles(
  prefix: string,
): Promise<{ cleaned: number; unchanged: number }> {
  const keys = await listAllKeys(prefix);
  console.log(`  ${prefix}: ${keys.length} files to process`);

  let cleaned = 0;
  let unchanged = 0;

  for (let i = 0; i < keys.length; i += CONCURRENCY) {
    const batch = keys.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (key) => {
        const content = await getFile(key);
        const parts = content.split("---\n");

        if (parts.length < 3) {
          unchanged++;
          return;
        }

        const frontmatter = parts.slice(0, 2).join("---\n") + "---\n";
        const body = parts.slice(2).join("---\n");
        const cleanedBody = cleanMarkdownBody(body);

        if (cleanedBody === body.trim()) {
          unchanged++;
          return;
        }

        await putFile(key, frontmatter + cleanedBody);
        cleaned++;
      }),
    );

    const progress = Math.min(i + CONCURRENCY, keys.length);
    process.stdout.write(
      `\r  ${prefix}: ${progress}/${keys.length} (cleaned: ${cleaned})`,
    );
  }

  console.log("");
  return { cleaned, unchanged };
}

// ─── PF1 re-crawl with expanded ID range ─────────────────────────────────────

async function crawlPf1Missing(): Promise<{ success: number; failed: number }> {
  const baseUrl = "https://aonprd.com";
  const prefix = "pf1-rules/";

  const existingKeys = await listAllKeys(prefix);
  const existingIds = new Set(
    existingKeys.map((k) => k.match(/pf1-rules\/(\d+)-/)?.[1]).filter(Boolean),
  );
  console.log(`  PF1 existing: ${existingIds.size} rule IDs`);

  // PF1 has rule IDs from 1 to ~2550
  const allIds: number[] = [];
  for (let id = 1; id <= 2550; id++) {
    if (!existingIds.has(String(id))) allIds.push(id);
  }
  console.log(`  PF1 missing: ${allIds.length} IDs to crawl`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < allIds.length; i += CONCURRENCY) {
    const batch = allIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const url = `${baseUrl}/Rules.aspx?ID=${id}`;
          const res = await fetch(url, {
            headers: { "User-Agent": "DiceShock-RulesCrawler/1.0" },
          });
          if (!res.ok) return null;

          const html = await res.text();

          // Extract title from <title> or <h1>
          const titleMatch =
            html.match(/<title>([^<]+)<\/title>/i) ||
            html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/ - Archives.*$/, "").trim()
            : `Rule ${id}`;

          // Extract main content
          const mainMatch = html.match(
            /<span[^>]*id="[^"]*MainContent_DetailedOutput"[^>]*>([\s\S]*?)(?:<\/span>\s*<br|<\/span>\s*<\/div|<\/span>\s*<div[^>]*class="footer")/i,
          );

          if (!mainMatch || mainMatch[1].trim().length < 30) return null;

          let md = turndown.turndown(mainMatch[1]);
          md = cleanMarkdownBody(md);

          if (md.length < 20) return null;

          const frontmatter = [
            "---",
            `title: "${title.replace(/"/g, '\\"')}"`,
            `system: "Pathfinder 1e"`,
            `source_url: "${url}"`,
            `rule_id: ${id}`,
            `crawled_at: "${new Date().toISOString()}"`,
            "---",
            "",
          ].join("\n");

          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60);

          const key = `${prefix}${id}-${slug}.md`;
          await putFile(key, frontmatter + md);
          return key;
        } catch {
          return null;
        }
      }),
    );

    for (const r of results) {
      if (r) success++;
      else failed++;
    }

    const progress = Math.min(i + CONCURRENCY, allIds.length);
    process.stdout.write(
      `\r  PF1 re-crawl: ${progress}/${allIds.length} (ok: ${success}, skip: ${failed})`,
    );

    if (i + CONCURRENCY < allIds.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log("");
  return { success, failed };
}

// ─── SF1 re-crawl missing ────────────────────────────────────────────────────

async function crawlSf1Missing(): Promise<{ success: number; failed: number }> {
  const baseUrl = "https://aonsrd.com";
  const prefix = "sf1-rules/";

  const existingKeys = await listAllKeys(prefix);
  const existingIds = new Set(
    existingKeys.map((k) => k.match(/sf1-rules\/(\d+)-/)?.[1]).filter(Boolean),
  );
  console.log(`  SF1 existing: ${existingIds.size} rule IDs`);

  const allIds: number[] = [];
  for (let id = 1; id <= 2250; id++) {
    if (!existingIds.has(String(id))) allIds.push(id);
  }
  console.log(`  SF1 missing: ${allIds.length} IDs to crawl`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < allIds.length; i += CONCURRENCY) {
    const batch = allIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const url = `${baseUrl}/Rules.aspx?ID=${id}`;
          const res = await fetch(url, {
            headers: { "User-Agent": "DiceShock-RulesCrawler/1.0" },
          });
          if (!res.ok) return null;

          const html = await res.text();

          const titleMatch =
            html.match(/<title>([^<]+)<\/title>/i) ||
            html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/ - Archives.*$/, "").trim()
            : `Rule ${id}`;

          const mainMatch = html.match(
            /<span[^>]*id="[^"]*MainContent_DetailedOutput"[^>]*>([\s\S]*?)(?:<\/span>\s*<br|<\/span>\s*<\/div|<\/span>\s*<div[^>]*class="footer")/i,
          );

          if (!mainMatch || mainMatch[1].trim().length < 30) return null;

          let md = turndown.turndown(mainMatch[1]);
          md = cleanMarkdownBody(md);

          if (md.length < 20) return null;

          const frontmatter = [
            "---",
            `title: "${title.replace(/"/g, '\\"')}"`,
            `system: "Starfinder 1e"`,
            `source_url: "${url}"`,
            `rule_id: ${id}`,
            `crawled_at: "${new Date().toISOString()}"`,
            "---",
            "",
          ].join("\n");

          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60);

          const key = `${prefix}${id}-${slug}.md`;
          await putFile(key, frontmatter + md);
          return key;
        } catch {
          return null;
        }
      }),
    );

    for (const r of results) {
      if (r) success++;
      else failed++;
    }

    const progress = Math.min(i + CONCURRENCY, allIds.length);
    process.stdout.write(
      `\r  SF1 re-crawl: ${progress}/${allIds.length} (ok: ${success}, skip: ${failed})`,
    );

    if (i + CONCURRENCY < allIds.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log("");
  return { success, failed };
}

async function main() {
  console.log("🧹 Clean & Re-crawl TRPG Rules");
  console.log("═".repeat(50));

  // Phase 1: Clean existing files
  console.log("\n📝 Phase 1: Clean existing markdown files");
  for (const prefix of [
    "pf2-rules/",
    "pf1-rules/",
    "sf1-rules/",
    "5e-rules/",
  ]) {
    const { cleaned, unchanged } = await cleanExistingFiles(prefix);
    console.log(`  ✅ ${prefix}: ${cleaned} cleaned, ${unchanged} unchanged`);
  }

  // Phase 2: Re-crawl missing PF1 pages
  console.log("\n🕷️  Phase 2: Re-crawl missing PF1 pages");
  const pf1 = await crawlPf1Missing();
  console.log(
    `  ✅ PF1: ${pf1.success} new pages, ${pf1.failed} skipped (404/empty)`,
  );

  // Phase 3: Re-crawl missing SF1 pages
  console.log("\n🕷️  Phase 3: Re-crawl missing SF1 pages");
  const sf1 = await crawlSf1Missing();
  console.log(
    `  ✅ SF1: ${sf1.success} new pages, ${sf1.failed} skipped (404/empty)`,
  );

  // Final counts
  console.log("\n" + "═".repeat(50));
  for (const prefix of [
    "pf2-rules/",
    "pf1-rules/",
    "sf1-rules/",
    "5e-rules/",
  ]) {
    const keys = await listAllKeys(prefix);
    console.log(`  ${prefix.padEnd(12)} ${keys.length} files`);
  }
  console.log("🏁 Done!");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
