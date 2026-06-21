/**
 * Archives of Nethys 爬虫 - 爬取 PF1/PF2/SF1 规则
 * 所有站点使用相同的 Rules.aspx?ID=XXX 结构
 *
 * Usage: cd scripts && pnpm tsx crawl-aon-rules.ts [pf1|pf2|sf1|all]
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import TurndownService from "turndown";

const SITES = {
  pf2: {
    name: "Pathfinder 2e",
    baseUrl: "https://2e.aonprd.com",
    tocUrl: "https://2e.aonprd.com/Rules.aspx",
    prefix: "pf2-rules/",
  },
  pf1: {
    name: "Pathfinder 1e",
    baseUrl: "https://aonprd.com",
    tocUrl: "https://aonprd.com/Rules.aspx",
    prefix: "pf1-rules/",
  },
  sf1: {
    name: "Starfinder 1e",
    baseUrl: "https://aonsrd.com",
    tocUrl: "https://aonsrd.com/Rules.aspx",
    prefix: "sf1-rules/",
  },
} as const;

type SiteKey = keyof typeof SITES;

const R2_ENDPOINT =
  "https://3244c8f91cd34317ce18652158e5853a.r2.cloudflarestorage.com";
const R2_BUCKET = "ds-raw-feed";
const CONCURRENCY = 10;
const DELAY_MS = 100;

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

interface RulePage {
  id: string;
  title: string;
  url: string;
}

async function parseTOC(site: (typeof SITES)[SiteKey]): Promise<RulePage[]> {
  console.log(`📖 Fetching TOC: ${site.tocUrl}`);
  const res = await fetch(site.tocUrl);
  const html = await res.text();

  const linkRegex = /Rules\.aspx\?ID=(\d+)[^"]*"[^>]*>([^<]+)</g;
  const seen = new Set<string>();
  const pages: RulePage[] = [];

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const id = match[1];
    const title = match[2].trim();
    if (seen.has(id)) continue;
    seen.add(id);
    pages.push({
      id,
      title,
      url: `${site.baseUrl}/Rules.aspx?ID=${id}`,
    });
  }

  console.log(`  Found ${pages.length} unique rule pages`);
  return pages;
}

async function fetchAndClean(
  page: RulePage,
  site: (typeof SITES)[SiteKey],
): Promise<{ key: string; markdown: string } | null> {
  try {
    const res = await fetch(page.url, {
      headers: { "User-Agent": "DiceShock-RulesCrawler/1.0 (TRPG index)" },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extract main content - AoN uses <div id="ctl00_MainContent_..."> or <span id="ctl00_MainContent_...">
    let content = "";
    const mainMatch = html.match(
      /<span[^>]*id="ctl00_MainContent_DetailedOutput"[^>]*>([\s\S]*?)<\/span>\s*(?:<br|<\/div|<div class="footer)/i,
    );
    if (mainMatch) {
      content = mainMatch[1];
    } else {
      const altMatch = html.match(
        /<div[^>]*class="main"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="footer"/i,
      );
      if (altMatch) {
        content = altMatch[1];
      } else {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        content = bodyMatch ? bodyMatch[1] : html;
      }
    }

    content = content.replace(
      /<div[^>]*class="[^"]*nav[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      "",
    );
    content = content.replace(
      /<a[^>]*class="[^"]*bread[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
      "",
    );

    let md = turndown.turndown(content);
    md = md.replace(/\n{3,}/g, "\n\n").trim();

    if (md.length < 20) return null;

    const frontmatter = [
      "---",
      `title: "${page.title.replace(/"/g, '\\"')}"`,
      `system: "${site.name}"`,
      `source_url: "${page.url}"`,
      `rule_id: ${page.id}`,
      `crawled_at: "${new Date().toISOString()}"`,
      "---",
      "",
    ].join("\n");

    const key = `${site.prefix}${page.id}-${slugify(page.title)}.md`;
    return { key, markdown: frontmatter + md };
  } catch {
    return null;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function uploadToR2(key: string, content: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: content,
      ContentType: "text/markdown; charset=utf-8",
    }),
  );
}

async function crawlSite(
  siteKey: SiteKey,
): Promise<{ success: number; failed: number }> {
  const site = SITES[siteKey];
  console.log(`\n🎲 Crawling ${site.name}`);
  console.log("═".repeat(50));

  const pages = await parseTOC(site);
  if (pages.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pages.length; i += CONCURRENCY) {
    const batch = pages.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((p) => fetchAndClean(p, site)));

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
      `\r  📤 ${site.name}: ${progress}/${pages.length} (ok: ${success}, skip: ${failed})`,
    );

    if (i + CONCURRENCY < pages.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log("");

  // Upload manifest
  const manifest = {
    system: site.name,
    source: site.tocUrl,
    crawled_at: new Date().toISOString(),
    total_pages: success,
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      key: `${site.prefix}${p.id}-${slugify(p.title)}.md`,
    })),
  };
  await uploadToR2(
    `${site.prefix}_manifest.json`,
    JSON.stringify(manifest, null, 2),
  );

  console.log(
    `  ✅ ${site.name}: ${success} pages uploaded, ${failed} skipped`,
  );
  return { success, failed };
}

async function main() {
  const arg = process.argv[2] || "all";
  const targets: SiteKey[] =
    arg === "all" ? ["pf2", "pf1", "sf1"] : [arg as SiteKey];

  if (targets.some((t) => !(t in SITES))) {
    console.error("Usage: pnpm tsx crawl-aon-rules.ts [pf1|pf2|sf1|all]");
    process.exit(1);
  }

  console.log("🎲 Archives of Nethys Crawler → R2 (ds-raw-feed)");
  console.log(`  Targets: ${targets.join(", ")}`);

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const target of targets) {
    const { success, failed } = await crawlSite(target);
    totalSuccess += success;
    totalFailed += failed;
  }

  console.log("\n" + "═".repeat(50));
  console.log(
    `🏁 All done! ${totalSuccess} pages uploaded, ${totalFailed} skipped`,
  );
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
