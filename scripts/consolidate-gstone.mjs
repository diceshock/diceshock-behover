/**
 * 批量清洗 Gstone 桌游规则书 → ds-library 整册格式
 *
 * 流程: D1 games 表 → R2 raw feed → DeepSeek V4 Flash 整理 → ds-library 输出
 *
 * Usage: cd scripts && node consolidate-gstone.mjs [--dry-run] [--game-id=1170] [--limit=50]
 */

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

// ─── Config ────────────────────────────────────────────────────────────────

const R2_ENDPOINT =
  "https://3244c8f91cd34317ce18652158e5853a.r2.cloudflarestorage.com";
const RAW_FEED_BUCKET = "ds-raw-feed";
const LIBRARY_BUCKET = "ds-library";
const CDN_BASE = "https://assets.runespark.fun/";

const CF_ACCOUNT_ID = "3244c8f91cd34317ce18652158e5853a";
const GSTONE_DB_ID = "fbe99ba3-8b12-4bf6-ab4b-93031a0f95a2";

const DEEPSEEK_BASE_URL = process.env.CF_AI_GATEWAY_ID
  ? `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${process.env.CF_AI_GATEWAY_ID}/deepseek`
  : "https://api.deepseek.com/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = "deepseek-chat"; // V4 Flash

const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 1000;

// ─── CLI Args ──────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const SINGLE_GAME = process.argv.find((a) => a.startsWith("--game-id="))
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
  // Fallback: read wrangler OAuth token
  try {
    const toml = readFileSync(homedir() + "/.wrangler/config/default.toml", "utf8");
    const match = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch (e) { console.error("[consolidate-gstone] wrangler config read error", e); }
  throw new Error("Missing CLOUDFLARE_API_TOKEN (set env or login via wrangler)");
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
  if (!data.success) throw new Error(`D1 error: ${JSON.stringify(data.errors)}`);
  return data.result[0].results;
}

// ─── R2 Helpers ────────────────────────────────────────────────────────────

async function listGameDocs(gameId) {
  const prefix = `gstone-rulebooks/${gameId}/`;
  const keys = [];
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: RAW_FEED_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const obj of res.Contents || []) {
      if (obj.Key?.endsWith(".md")) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function readFile(bucket, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return res.Body?.transformToString("utf-8") ?? "";
}

async function writeFile(bucket, key, content) {
  if (bucket === LIBRARY_BUCKET) {
    // Use CF API for ds-library (S3 creds only cover ds-raw-feed)
    const token = getCfApiToken();
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`;
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
      throw new Error(`R2 write failed ${res.status}: ${err.slice(0, 200)}`);
    }
  } else {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: "text/markdown; charset=utf-8",
      }),
    );
  }
}

// ─── DeepSeek Cleaning ─────────────────────────────────────────────────────

const CLEAN_SYSTEM_PROMPT = `你是一个桌游规则书整理专家。你的任务是把 OCR 扫描得到的规则书原始文本整理成干净、结构化的 markdown。

要求:
1. 去掉所有 "## Page N" 标记 — 这是 OCR 分页标记，不是实际标题
2. 修正标题层级 — 规则书标题用 # ，章节用 ## ，小节用 ###，不要跳级
3. 清理 OCR 噪音 — 乱码字符、重复段落、无意义符号
4. 保持规则完整性 — 不要删除任何实际的规则内容、数值、术语
5. 表格用 markdown 表格格式
6. 如果内容是纯目录/封面/广告/没有实质规则内容，返回精确文本: [NO_CONTENT]
7. 不要添加你自己的注释、说明或总结
8. 保持原文语言（中文规则保持中文，英文保持英文）

输出纯净的 markdown 正文，不需要 frontmatter。`;

async function cleanWithDeepSeek(rawText, gameName, bookTitle) {
  if (!DEEPSEEK_API_KEY) throw new Error("Missing DEEPSEEK_API_KEY");

  const userPrompt = `以下是桌游「${gameName}」的规则书「${bookTitle}」的 OCR 原始文本。请整理成干净的 markdown：

---
${rawText}
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
        { role: "system", content: CLEAN_SYSTEM_PROMPT },
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

// ─── Frontmatter Builder ───────────────────────────────────────────────────

function buildFrontmatter(game, bookTitle, sourceDocIds) {
  const category = (() => {
    try {
      return JSON.parse(game.category || "[]").map((c) => c.value);
    } catch {
      return [];
    }
  })();

  const sourceDocuments = sourceDocIds.map((docId) => ({
    id: docId,
    source_image_prefix: `${CDN_BASE}gstone-doc-pages/${docId}/`,
  }));

  const yaml = [
    "---",
    `game_id: ${game.gstone_id}`,
    `game_name: "${(game.name || "").replace(/"/g, '\\"')}"`,
    game.eng_name
      ? `game_name_en: "${game.eng_name.replace(/"/g, '\\"')}"`
      : null,
    `category: [${category.map((c) => `"${c}"`).join(", ")}]`,
    game.player_num ? `player_num: "${game.player_num}"` : null,
    game.rating ? `rating: ${game.rating}` : null,
    `book_title: "${(bookTitle || "").replace(/"/g, '\\"')}"`,
    `source_documents:`,
    ...sourceDocuments.map(
      (d) =>
        `  - id: ${d.id}\n    source_image_prefix: "${d.source_image_prefix}"`,
    ),
    `consolidated_at: "${new Date().toISOString()}"`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  return yaml;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "rulebook";
}

// ─── Tracking ──────────────────────────────────────────────────────────────

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

async function getProcessedIds() {
  const rows = await d1Query(
    `SELECT source_id FROM library_consolidation WHERE source = 'gstone' AND status IN ('done', 'excluded')`,
  );
  return new Set(rows.map((r) => r.source_id));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function processGame(game) {
  const gameId = game.gstone_id;
  const gameName = game.name || game.eng_name || `Game ${gameId}`;

  // List all docs for this game in R2
  const docKeys = await listGameDocs(gameId);
  if (docKeys.length === 0) {
    await markStatus("gstone", String(gameId), "excluded", null, "no docs in R2", 0);
    return { status: "excluded", reason: "no docs" };
  }

  // Read all doc contents
  const docs = [];
  for (const key of docKeys) {
    const content = await readFile(RAW_FEED_BUCKET, key);
    const docId = key.match(/\/(\d+)\.md$/)?.[1];
    // Extract title from frontmatter
    const titleMatch = content.match(/document_title:\s*"([^"]+)"/);
    const title = titleMatch?.[1] || `Doc ${docId}`;
    // Extract body (after frontmatter)
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, "");
    if (body.trim().length < 80) {
      continue; // skip empty docs
    }
    docs.push({ docId, title, body, key });
  }

  if (docs.length === 0) {
    await markStatus("gstone", String(gameId), "excluded", null, "all docs empty", 0);
    return { status: "excluded", reason: "all empty" };
  }

  // Group by title — multiple docs with same title get merged
  const groups = new Map();
  for (const doc of docs) {
    const normalizedTitle = doc.title.trim();
    if (!groups.has(normalizedTitle)) {
      groups.set(normalizedTitle, []);
    }
    groups.get(normalizedTitle).push(doc);
  }

  let totalTokens = 0;
  const outputKeys = [];

  for (const [bookTitle, bookDocs] of groups) {
    // Merge all bodies for this book
    const mergedText = bookDocs.map((d) => d.body).join("\n\n");
    const docIds = bookDocs.map((d) => Number(d.docId));

    if (mergedText.length < 80) continue;

    // Call DeepSeek
    let cleanedContent;
    let tokens = 0;

    if (!DRY_RUN) {
      try {
        const result = await cleanWithDeepSeek(mergedText, gameName, bookTitle);
        cleanedContent = result.content;
        tokens = result.tokens;
        totalTokens += tokens;
      } catch (e) {
        await markStatus("gstone", String(gameId), "error", null, e.message, 0);
        return { status: "error", reason: e.message };
      }

      // Check if DeepSeek flagged as no content
      if (cleanedContent === "[NO_CONTENT]" || cleanedContent.length < 50) {
        continue; // skip this book
      }
    } else {
      cleanedContent = `[DRY RUN] Would clean ${mergedText.length} chars`;
    }

    // Build output
    const frontmatter = buildFrontmatter(game, bookTitle, docIds);
    const slug = slugify(bookTitle);
    const outputKey = `boardgames/${gameId}/${slug}.md`;
    const fullContent = `${frontmatter}\n\n${cleanedContent}\n`;

    if (!DRY_RUN) {
      await writeFile(LIBRARY_BUCKET, outputKey, fullContent);
    }
    outputKeys.push(outputKey);
  }

  if (outputKeys.length === 0) {
    await markStatus("gstone", String(gameId), "excluded", null, "no meaningful content", totalTokens);
    return { status: "excluded", reason: "no content after cleaning" };
  }

  const mainOutputKey = outputKeys[0];
  if (!DRY_RUN) {
    await markStatus("gstone", String(gameId), "done", mainOutputKey, null, totalTokens);
  }
  return { status: "done", outputKeys, tokens: totalTokens };
}

async function main() {
  console.log(
    `🧹 Gstone 桌游规则书清洗 → ds-library${DRY_RUN ? " (DRY RUN)" : ""}`,
  );
  console.log("═".repeat(60));

  if (!DEEPSEEK_API_KEY) {
    console.error("❌ Missing DEEPSEEK_API_KEY");
    process.exit(1);
  }

  // Get games with completed OCR
  let gamesQuery = `
    SELECT DISTINCT g.gstone_id, g.name, g.eng_name, g.category, g.player_num, g.rating
    FROM games g
    JOIN documents d ON d.game_id = g.gstone_id
    WHERE d.ocr_at IS NOT NULL
      AND d.ocr_pages IS NOT NULL
      AND length(d.ocr_pages) > 100
  `;

  if (SINGLE_GAME) {
    gamesQuery += ` AND g.gstone_id = ${SINGLE_GAME}`;
  }

  gamesQuery += " ORDER BY g.gstone_id";
  if (LIMIT > 0) gamesQuery += ` LIMIT ${LIMIT}`;

  console.log("📂 Querying games with completed OCR...");
  const games = await d1Query(gamesQuery);
  console.log(`  Found ${games.length} games`);

  // Filter out already processed
  const processed = await getProcessedIds();
  const pending = games.filter((g) => !processed.has(String(g.gstone_id)));
  console.log(
    `  Already processed: ${games.length - pending.length}, pending: ${pending.length}`,
  );

  if (pending.length === 0) {
    console.log("✅ Nothing to do!");
    return;
  }

  let done = 0,
    errors = 0,
    excluded = 0;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map((game) => processGame(game)),
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.status === "done") done++;
        else if (r.value.status === "excluded") excluded++;
        else errors++;
      } else {
        errors++;
        console.error(`  ❌ ${r.reason}`);
      }
    }

    const progress = Math.min(i + CONCURRENCY, pending.length);
    process.stdout.write(
      `\r  📤 ${progress}/${pending.length} (done: ${done}, excluded: ${excluded}, errors: ${errors})`,
    );

    if (i + CONCURRENCY < pending.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  console.log("\n\n" + "═".repeat(60));
  console.log(`✅ 完成!`);
  console.log(`   Done: ${done}`);
  console.log(`   Excluded: ${excluded}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
