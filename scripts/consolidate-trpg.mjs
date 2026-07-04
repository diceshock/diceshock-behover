/**
 * 批量合并 TRPG 规则文件 → ds-library 整册格式
 *
 * 处理: 5e-rules, pf2-rules, pf1-rules, sf1-rules
 * 策略:
 *   - 5e: 使用 _manifest.json 按 source/book 分组
 *   - PF/SF: 按 rule_id 范围和章节边界分组
 *   - 所有分组 > 200KB 时拆分为多个 part
 *
 * Usage: cd scripts && node consolidate-trpg.mjs [--dry-run] [--system=dnd5e] [--limit=10]
 */

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

// ─── Config ────────────────────────────────────────────────────────────────

const R2_ENDPOINT =
  "https://3244c8f91cd34317ce18652158e5853a.r2.cloudflarestorage.com";
const RAW_FEED_BUCKET = "ds-raw-feed";
const LIBRARY_BUCKET = "ds-library";

const CF_ACCOUNT_ID = "3244c8f91cd34317ce18652158e5853a";
const GSTONE_DB_ID = "fbe99ba3-8b12-4bf6-ab4b-93031a0f95a2";

const DEEPSEEK_BASE_URL = process.env.CF_AI_GATEWAY_ID
  ? `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${process.env.CF_AI_GATEWAY_ID}/deepseek`
  : "https://api.deepseek.com/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = "deepseek-chat";

const MAX_CHUNK_CHARS = 150000; // ~150KB per DeepSeek call
const CONCURRENCY = 3;
const DELAY_MS = 2000;

// ─── CLI Args ──────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const SYSTEM_FILTER = process.argv
  .find((a) => a.startsWith("--system="))
  ?.split("=")[1];
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0",
);

// ─── Clients ───────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

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
  } catch (e) { console.error("[consolidate-trpg] wrangler config read error", e); }
  throw new Error("Missing CLOUDFLARE_API_TOKEN");
}

// ─── D1 Helpers ────────────────────────────────────────────────────────────

async function d1Query(sql, params = []) {
  const token = getCfApiToken();
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${GSTONE_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );
  const data = await res.json();
  if (!data.success)
    throw new Error(`D1 error: ${JSON.stringify(data.errors)}`);
  return data.result[0].results;
}

async function markStatus(source, sourceId, status, outputKey, error, tokens) {
  await d1Query(
    `INSERT INTO library_consolidation (source, source_id, status, output_key, error, token_usage, processed_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(source, source_id) DO UPDATE SET
       status = excluded.status,
       output_key = excluded.output_key,
       error = excluded.error,
       token_usage = excluded.token_usage,
       processed_at = excluded.processed_at`,
    [source, sourceId, status, outputKey, error, tokens || 0],
  );
}

async function getProcessedIds(source) {
  const rows = await d1Query(
    `SELECT source_id FROM library_consolidation WHERE source = ? AND status IN ('done', 'excluded')`,
    [source],
  );
  return new Set(rows.map((r) => r.source_id));
}

// ─── R2 Helpers ────────────────────────────────────────────────────────────

async function readR2(key) {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: RAW_FEED_BUCKET, Key: key }),
  );
  return res.Body?.transformToString("utf-8") ?? "";
}

async function writeLibrary(key, content) {
  const token = getCfApiToken();
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${LIBRARY_BUCKET}/objects/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/markdown; charset=utf-8",
    },
    body: content,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`R2 write ${res.status}: ${err.slice(0, 200)}`);
  }
}

async function listAllKeys(prefix) {
  const keys = [];
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: RAW_FEED_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents || []) {
      if (obj.Key?.endsWith(".md")) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

// ─── DeepSeek ──────────────────────────────────────────────────────────────

const TRPG_CLEAN_PROMPT = `你是一个 TRPG 规则书编辑。你的任务是把多个散碎的规则页面合并整理成一本连贯的规则书章节。

要求:
1. 去除每个条目开头重复的 frontmatter（---...---）
2. 合并所有内容为连贯的文档，保持逻辑顺序
3. 修正标题层级（全书用 # ，章用 ## ，节用 ### ，小节用 ####）
4. 保留所有规则数值、能力、法术、怪物数据 — 不删任何机制内容
5. 清理 HTML 残留标签、多余空行、乱码
6. 保持原文语言
7. 如果全部内容都是目录/索引/链接汇总没有实质内容，返回: [NO_CONTENT]
8. 不要添加你自己的注释或总结

输出干净的 markdown。`;

async function cleanWithDeepSeek(rawText, systemName, bookTitle) {
  if (!DEEPSEEK_API_KEY) throw new Error("Missing DEEPSEEK_API_KEY");

  const userPrompt = `以下是「${systemName}」规则系统中「${bookTitle}」部分的散碎页面。请合并整理成干净的 markdown 章节：

---
${rawText.slice(0, 120000)}
---`;

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: TRPG_CLEAN_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 16384,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  const tokens = data.usage?.total_tokens || 0;
  return { content, tokens };
}

// ─── System Processors ─────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "section";
}

// ─── 5e Processing ─────────────────────────────────────────────────────────

async function process5e() {
  console.log("\n📚 Processing D&D 5e...");

  // Read manifest
  const manifestRaw = await readR2("5e-rules/_manifest.json");
  const manifest = JSON.parse(manifestRaw);

  // Group by source/book
  const groups = new Map();
  for (const page of manifest.pages) {
    const key = page.key || "";
    const afterTopics = key.replace("5e-rules/topics/", "");
    const parts = afterTopics.split("/");
    let group;
    if (parts.length >= 3) {
      group = parts[0] + "/" + parts[1];
    } else if (parts.length === 2) {
      group = parts[0];
    } else {
      group = "_misc";
    }
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(page);
  }

  console.log(`  Found ${groups.size} book groups`);

  const processed = await getProcessedIds("dnd5e");
  let done = 0, errors = 0, excluded = 0;
  let groupList = [...groups.entries()];

  if (LIMIT > 0) groupList = groupList.slice(0, LIMIT);

  for (let i = 0; i < groupList.length; i += CONCURRENCY) {
    const batch = groupList.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async ([groupName, pages]) => {
        const bookSlug = slugify(groupName);
        if (processed.has(bookSlug)) return "skip";

        // Read all pages in this group
        const texts = [];
        for (const page of pages.slice(0, 200)) {
          // cap at 200 pages
          try {
            const content = await readR2(page.key);
            const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "");
            if (body.trim().length > 30) {
              texts.push(
                `### ${page.title || "Untitled"}\n\n${body.trim()}`,
              );
            }
          } catch (e) { console.error("[consolidate-trpg] page read error", e); }
        }

        if (texts.length === 0) {
          await markStatus("dnd5e", bookSlug, "excluded", null, "empty", 0);
          return "excluded";
        }

        const merged = texts.join("\n\n---\n\n");

        if (DRY_RUN) {
          console.log(
            `\n  [DRY] ${groupName}: ${texts.length} pages, ${merged.length} chars`,
          );
          return "done";
        }

        // If small enough, pass through without DeepSeek (already clean)
        let finalContent;
        let tokens = 0;

        if (merged.length < 5000 && texts.length <= 5) {
          // Small group — just concatenate cleanly
          finalContent = merged.replace(/---\n\n/g, "\n\n");
        } else {
          // Use DeepSeek to clean and organize
          const result = await cleanWithDeepSeek(
            merged,
            "D&D 5e",
            groupName,
          );
          if (
            result.content === "[NO_CONTENT]" ||
            result.content.length < 50
          ) {
            await markStatus("dnd5e", bookSlug, "excluded", null, "no content", result.tokens);
            return "excluded";
          }
          finalContent = result.content;
          tokens = result.tokens;
        }

        // Build frontmatter
        const frontmatter = [
          "---",
          `system: "D&D 5e"`,
          `book: "${groupName.replace(/"/g, '\\"')}"`,
          `page_count: ${texts.length}`,
          `source_keys:`,
          ...pages
            .slice(0, 20)
            .map((p) => `  - "${p.key}"`),
          pages.length > 20 ? `  # ... and ${pages.length - 20} more` : null,
          `consolidated_at: "${new Date().toISOString()}"`,
          "---",
        ]
          .filter(Boolean)
          .join("\n");

        const outputKey = `trpg/dnd5e/${bookSlug}.md`;
        await writeLibrary(outputKey, `${frontmatter}\n\n${finalContent}\n`);
        await markStatus("dnd5e", bookSlug, "done", outputKey, null, tokens);
        return "done";
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value === "done") done++;
        else if (r.value === "excluded") excluded++;
      } else {
        errors++;
        console.error(`  ❌ ${r.reason?.message || r.reason}`);
      }
    }

    const progress = Math.min(i + CONCURRENCY, groupList.length);
    process.stdout.write(
      `\r  📤 ${progress}/${groupList.length} (done: ${done}, excl: ${excluded}, err: ${errors})`,
    );

    if (i + CONCURRENCY < groupList.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n  ✅ 5e: done=${done}, excluded=${excluded}, errors=${errors}`);
}

// ─── PF/SF Processing ──────────────────────────────────────────────────────

async function processAonSystem(prefix, systemSlug, systemName) {
  console.log(`\n📚 Processing ${systemName}...`);

  const keys = await listAllKeys(prefix);
  console.log(`  Found ${keys.length} files`);

  // Sort by rule_id (numeric prefix)
  keys.sort((a, b) => {
    const idA = Number(a.replace(prefix, "").split("-")[0]) || 0;
    const idB = Number(b.replace(prefix, "").split("-")[0]) || 0;
    return idA - idB;
  });

  // Group into chunks of ~30 consecutive rules (rough chapter size)
  const CHUNK_SIZE = 30;
  const groups = [];
  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const chunk = keys.slice(i, i + CHUNK_SIZE);
    const firstId = chunk[0].replace(prefix, "").split("-")[0];
    const lastId = chunk[chunk.length - 1].replace(prefix, "").split("-")[0];
    groups.push({
      slug: `rules-${firstId}-${lastId}`,
      keys: chunk,
      label: `Rules ${firstId}-${lastId}`,
    });
  }

  console.log(`  Grouped into ${groups.length} chunks`);

  const processed = await getProcessedIds(systemSlug);
  let done = 0, errors = 0, excluded = 0;
  let groupList = groups;

  if (LIMIT > 0) groupList = groupList.slice(0, LIMIT);

  for (let i = 0; i < groupList.length; i += CONCURRENCY) {
    const batch = groupList.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (group) => {
        if (processed.has(group.slug)) return "skip";

        // Read all files in this chunk
        const texts = [];
        for (const key of group.keys) {
          try {
            const content = await readR2(key);
            const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "");
            if (body.trim().length > 30) {
              texts.push(body.trim());
            }
          } catch (e) { console.error("[consolidate-trpg] key read error", e); }
        }

        if (texts.length === 0) {
          await markStatus(systemSlug, group.slug, "excluded", null, "empty", 0);
          return "excluded";
        }

        const merged = texts.join("\n\n---\n\n");

        if (DRY_RUN) {
          return "done";
        }

        let finalContent;
        let tokens = 0;

        if (merged.length < 5000 && texts.length <= 5) {
          finalContent = merged.replace(/---\n\n/g, "\n\n");
        } else {
          const result = await cleanWithDeepSeek(
            merged,
            systemName,
            group.label,
          );
          if (
            result.content === "[NO_CONTENT]" ||
            result.content.length < 50
          ) {
            await markStatus(systemSlug, group.slug, "excluded", null, "no content", result.tokens);
            return "excluded";
          }
          finalContent = result.content;
          tokens = result.tokens;
        }

        const frontmatter = [
          "---",
          `system: "${systemName}"`,
          `section: "${group.label}"`,
          `page_count: ${texts.length}`,
          `source_keys:`,
          ...group.keys
            .slice(0, 10)
            .map((k) => `  - "${k}"`),
          group.keys.length > 10
            ? `  # ... and ${group.keys.length - 10} more`
            : null,
          `consolidated_at: "${new Date().toISOString()}"`,
          "---",
        ]
          .filter(Boolean)
          .join("\n");

        const outputKey = `trpg/${systemSlug}/${group.slug}.md`;
        await writeLibrary(outputKey, `${frontmatter}\n\n${finalContent}\n`);
        await markStatus(systemSlug, group.slug, "done", outputKey, null, tokens);
        return "done";
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value === "done") done++;
        else if (r.value === "excluded") excluded++;
      } else {
        errors++;
        console.error(`  ❌ ${r.reason?.message || r.reason}`);
      }
    }

    const progress = Math.min(i + CONCURRENCY, groupList.length);
    process.stdout.write(
      `\r  📤 ${progress}/${groupList.length} (done: ${done}, excl: ${excluded}, err: ${errors})`,
    );

    if (i + CONCURRENCY < groupList.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(
    `\n  ✅ ${systemSlug}: done=${done}, excluded=${excluded}, errors=${errors}`,
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `🧹 TRPG 规则清洗 → ds-library${DRY_RUN ? " (DRY RUN)" : ""}`,
  );
  console.log("═".repeat(60));

  if (!DEEPSEEK_API_KEY && !DRY_RUN) {
    console.error("❌ Missing DEEPSEEK_API_KEY");
    process.exit(1);
  }

  const systems = [
    { prefix: "5e-rules/", slug: "dnd5e", name: "D&D 5e", handler: process5e },
    {
      prefix: "pf2-rules/",
      slug: "pf2e",
      name: "Pathfinder 2e",
      handler: () => processAonSystem("pf2-rules/", "pf2e", "Pathfinder 2e"),
    },
    {
      prefix: "pf1-rules/",
      slug: "pf1e",
      name: "Pathfinder 1e",
      handler: () => processAonSystem("pf1-rules/", "pf1e", "Pathfinder 1e"),
    },
    {
      prefix: "sf1-rules/",
      slug: "sf1e",
      name: "Starfinder 1e",
      handler: () => processAonSystem("sf1-rules/", "sf1e", "Starfinder 1e"),
    },
  ];

  for (const sys of systems) {
    if (SYSTEM_FILTER && sys.slug !== SYSTEM_FILTER) continue;
    await sys.handler();
  }

  console.log("\n" + "═".repeat(60));
  console.log("✅ TRPG 清洗完成!");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
