import { gstoneDb, gstoneDocumentsTable, gstoneGamesTable } from "@lib/db";
import { eq } from "drizzle-orm";
import type { GstoneOcrMessage } from "./gstoneDocCrawlConsumer";

export async function handleGstoneOcrQueue(
  batch: MessageBatch<GstoneOcrMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);

  for (const msg of batch.messages) {
    const { document_id: docId, page_index: pageIndex } = msg.body;

    try {
      const [doc] = await db
        .select()
        .from(gstoneDocumentsTable)
        .where(eq(gstoneDocumentsTable.document_id, docId))
        .limit(1);

      if (!doc || !doc.image_urls || doc.image_urls.length === 0) {
        msg.ack();
        continue;
      }

      const imageUrl = doc.image_urls[pageIndex];
      if (!imageUrl) {
        msg.ack();
        continue;
      }

      const pageText = await ocrImage(env, imageUrl);
      const verifiedText = await verifyOcr(env, imageUrl, pageText);

      const existingPages: string[] = doc.ocr_pages ?? [];
      existingPages[pageIndex] = verifiedText;

      const now = new Date().toISOString();
      await env.GSTONE_DB.prepare(
        "UPDATE documents SET ocr_pages = ?, updated_at = ? WHERE document_id = ?",
      )
        .bind(JSON.stringify(existingPages), now, docId)
        .run();

      const isLastPage = pageIndex >= doc.image_urls.length - 1;

      if (!isLastPage) {
        await env.GSTONE_OCR_QUEUE.send({
          document_id: docId,
          page_index: pageIndex + 1,
        });
      } else {
        const [game] = await db
          .select({
            name: gstoneGamesTable.name,
            eng_name: gstoneGamesTable.eng_name,
          })
          .from(gstoneGamesTable)
          .where(eq(gstoneGamesTable.gstone_id, doc.game_id))
          .limit(1);

        const validPages = existingPages.filter(
          (t) => t && t.trim().length > 20,
        );

        if (validPages.length === 0) {
          await env.GSTONE_DB.prepare(
            "UPDATE documents SET error = ?, updated_at = ? WHERE document_id = ?",
          )
            .bind("OCR produced no meaningful content", now, docId)
            .run();
          msg.ack();
          continue;
        }

        const correctedPages = await correctOcr(
          env,
          existingPages,
          doc.title ?? "Untitled",
        );

        const markdown = buildMarkdown({
          gameId: doc.game_id,
          gameName: game?.name ?? null,
          gameEngName: game?.eng_name ?? null,
          documentId: docId,
          documentTitle: doc.title ?? "Untitled",
          imageUrls: doc.image_urls,
          pages: correctedPages,
        });

        const r2Key = `gstone-rulebooks/${doc.game_id}/${docId}.md`;
        await env.RAW_FEED.put(r2Key, markdown, {
          httpMetadata: { contentType: "text/markdown; charset=utf-8" },
        });

        await env.GSTONE_DB.prepare(
          "UPDATE documents SET r2_key = ?, ocr_at = ?, error = NULL, updated_at = ? WHERE document_id = ?",
        )
          .bind(r2Key, now, now, docId)
          .run();
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const now = new Date().toISOString();
      await env.GSTONE_DB.prepare(
        "UPDATE documents SET error = ?, retry_count = retry_count + 1, updated_at = ? WHERE document_id = ?",
      )
        .bind(`[page ${pageIndex}] ${errMsg}`, now, docId)
        .run();
    }
    msg.ack();
  }
}

async function ocrImage(
  env: Cloudflare.Env,
  imageUrl: string,
): Promise<string> {
  const resizedUrl = imageUrl.includes("?")
    ? imageUrl
    : `${imageUrl}?x-oss-process=image/auto-orient,1/resize,m_lfit,w_800/quality,q_80`;

  const imageResp = await fetch(resizedUrl);
  if (!imageResp.ok) throw new Error(`Image fetch failed: ${imageResp.status}`);

  const imageData = await imageResp.arrayBuffer();
  const bytes = new Uint8Array(imageData);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const base64 = btoa(binary);

  const result = (await env.AI.run(
    "@cf/meta/llama-4-scout-17b-16e-instruct" as any,
    {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "提取这张桌游规则书页面中的所有内容。要求：\n1. 逐字提取所有文字，保留原文语言和换行\n2. 图中的图标/符号（如骰子图标、资源符号、箭头、星星等）用方括号描述，例如 [骰子图标] [金币符号] [箭头] [2点伤害图标]\n3. 如果有多栏排版，按从左到右、从上到下的正确阅读顺序输出\n4. 不要描述图片外观，不要翻译，不要添加说明，只输出提取的内容",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    } as any,
  )) as { response?: string };

  return result.response ?? "";
}

async function verifyOcr(
  env: Cloudflare.Env,
  imageUrl: string,
  ocrText: string,
): Promise<string> {
  if (!ocrText || ocrText.trim().length < 20) return ocrText;

  const resizedUrl = imageUrl.includes("?")
    ? imageUrl
    : `${imageUrl}?x-oss-process=image/auto-orient,1/resize,m_lfit,w_800/quality,q_80`;

  const imageResp = await fetch(resizedUrl);
  if (!imageResp.ok) return ocrText;

  const imageData = await imageResp.arrayBuffer();
  const bytes = new Uint8Array(imageData);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const base64 = btoa(binary);

  const result = (await env.AI.run(
    "@cf/google/gemma-4-26b-a4b-it" as any,
    {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `对照原始图片校验以下 OCR 文本。重点修正：
1. 符号/图标：对照图片中实际的图标形状，确认 [xxx] 标记是否准确描述了图标内容
2. 文字错误：对照图片修正 OCR 识别错误的字符（尤其是中文/日文汉字）
3. 遗漏内容：如果图片中有文字但 OCR 遗漏了，补充进去

输出修正后的完整文本，保持原始格式。如果 OCR 已经准确则原样输出。

OCR 文本：
${ocrText}`,
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    } as any,
  )) as { response?: string };

  const verified = result.response ?? "";
  if (verified.trim().length < ocrText.trim().length * 0.3) return ocrText;
  return verified;
}

async function correctOcr(
  env: Cloudflare.Env,
  pages: string[],
  title: string,
): Promise<string[]> {
  const combined = pages
    .map((t, i) => `=== 第${i + 1}页 ===\n${(t ?? "").trim()}`)
    .join("\n\n");

  if (combined.trim().length < 50) return pages;

  const result = (await env.AI.run(
    "@cf/meta/llama-4-scout-17b-16e-instruct" as any,
    {
      messages: [
        {
          role: "user",
          content: `以下是桌游「${title}」规则书的 OCR 识别结果。请执行以下修正：

1. 阅读顺序：如果段落顺序明显因多栏排版被打乱，重新排列为正确的阅读流
2. 断行修复：合并被错误断开的句子，修正明显的 OCR 错别字
3. 引用关系：保留并用 [→ 见第X页] 格式标注规则间的交叉引用

禁止：不要推测或替换 [xxx图标] 标记（这些是多模态识别的结果），不要翻译，不要添加原文没有的内容。按原始分页输出，每页用 === 第N页 === 分隔。

${combined}`,
        },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    } as any,
  )) as { response?: string };

  const corrected = result.response ?? "";
  if (corrected.trim().length < combined.trim().length * 0.3) return pages;

  const correctedPages: string[] = [];
  const sections = corrected.split(/===\s*第\d+页\s*===/);
  for (let i = 0; i < pages.length; i++) {
    const section = sections[i + 1]?.trim();
    correctedPages[i] =
      section && section.length > 10 ? section : (pages[i] ?? "");
  }
  return correctedPages;
}

function buildMarkdown(opts: {
  gameId: number;
  gameName: string | null;
  gameEngName: string | null;
  documentId: number;
  documentTitle: string;
  imageUrls: string[];
  pages: string[];
}): string {
  const yamlPages = opts.imageUrls
    .map((url, i) => `  - page: ${i + 1}\n    image_url: "${url}"`)
    .join("\n");

  const header = [
    "---",
    `game_id: ${opts.gameId}`,
    `game_name: "${(opts.gameName ?? "").replace(/"/g, '\\"')}"`,
    `game_eng_name: "${(opts.gameEngName ?? "").replace(/"/g, '\\"')}"`,
    `document_id: ${opts.documentId}`,
    `document_title: "${opts.documentTitle.replace(/"/g, '\\"')}"`,
    `total_pages: ${opts.pages.length}`,
    `pages:`,
    yamlPages,
    `crawled_at: "${new Date().toISOString()}"`,
    "---",
    "",
  ].join("\n");

  const body = opts.pages
    .map((text, i) => `## Page ${i + 1}\n\n${(text ?? "").trim()}`)
    .join("\n\n");

  return header + body + "\n";
}
