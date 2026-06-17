import puppeteer from "@cloudflare/puppeteer";
import db from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

const CARD_PREFIX = "card/board-game/";
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export async function boardGameCard(c: Context<HonoCtxEnv>) {
  const id = c.req.param("id") as string;
  const r2Key = `${CARD_PREFIX}${id}.png`;

  const cached = await c.env.R2.head(r2Key);
  if (cached && cached.uploaded) {
    const age = Date.now() - cached.uploaded.getTime();
    if (age < CACHE_TTL_MS) {
      const obj = await c.env.R2.get(r2Key);
      if (obj) {
        return new Response(obj.body, {
          headers: {
            "content-type": "image/png",
            "cache-control": "no-cache",
          },
        });
      }
    }
  }

  const game = await db(c.env.DB).query.boardGamesTable.findFirst({
    where: (g, { eq }) => eq(g.id, id),
  });

  if (!game || !game.content) {
    return c.json({ error: "桌游不存在" }, 404);
  }

  const col = game.content;
  const coverUrl = col.sch_cover_url || col.eng_cover_url || "";
  const coverDataUrl = await fetchAsDataUrl(coverUrl);

  const html = buildCardHtml({
    schName: col.sch_name || game.sch_name || "",
    engName: col.eng_name || game.eng_name || "",
    coverUrl: coverDataUrl,
    rating: game.gstone_rating ?? col.gstone_rating ?? 0,
    playerNum: game.player_num ?? col.player_num ?? [],
    bestPlayerNum: game.best_player_num ?? [],
    categories: (game.category ?? col.category ?? []).map(
      (c) => c.sch_domain_value,
    ),
    mode: col.mode?.sch_domain_value ?? "",
    difficulty: col.difficulty ?? 0,
    avgTime: col.average_time_per_player ?? 0,
    publishYear: col.publish_year ?? 0,
  });

  const browser = await puppeteer.launch(c.env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 600, height: 900 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => (window as any).__ready === true, {
      timeout: 15000,
    });

    const buffer = (await page.screenshot({ type: "png" })) as Buffer;
    const bytes = new Uint8Array(buffer);

    await c.env.R2.put(r2Key, bytes, {
      httpMetadata: { contentType: "image/png" },
    });

    return new Response(bytes, {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-cache",
      },
    });
  } finally {
    await browser.close();
  }
}

interface CardData {
  schName: string;
  engName: string;
  coverUrl: string;
  rating: number;
  playerNum: number[];
  bestPlayerNum: number[];
  categories: string[];
  mode: string;
  difficulty: number;
  avgTime: number;
  publishYear: number;
}

function buildCardHtml(data: CardData): string {
  const playerRange = data.playerNum.length
    ? `${Math.min(...data.playerNum)}-${Math.max(...data.playerNum)}人`
    : "未知";
  const bestRange = data.bestPlayerNum.length
    ? `最佳 ${data.bestPlayerNum.join("/")}人`
    : "";
  const stars =
    "★".repeat(Math.round(data.difficulty)) +
    "☆".repeat(5 - Math.round(data.difficulty));
  const ratingDisplay = data.rating ? data.rating.toFixed(1) : "N/A";
  const tags = data.categories.slice(0, 4).join(" · ");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 600px; height: 900px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
  overflow: hidden;
}
.card {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  padding: 32px;
}
.cover-wrap {
  width: 100%; height: 360px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  position: relative;
}
.cover-wrap img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.rating-badge {
  position: absolute;
  top: 16px; right: 16px;
  background: rgba(255,193,7,0.95);
  color: #1a1a2e;
  font-size: 28px; font-weight: 800;
  padding: 8px 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.info { flex:1; display:flex; flex-direction:column; padding-top:24px; }
.title-sch {
  font-size: 32px; font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.title-eng {
  font-size: 16px; font-weight: 400;
  opacity: 0.7; margin-top: 4px;
}
.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}
.meta-item {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 12px 16px;
}
.meta-label {
  font-size: 12px;
  text-transform: uppercase;
  opacity: 0.5;
  letter-spacing: 0.5px;
}
.meta-value {
  font-size: 18px; font-weight: 600;
  margin-top: 4px;
}
.tags {
  margin-top: auto;
  padding-top: 20px;
  font-size: 14px;
  opacity: 0.6;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px;
  font-size: 12px; opacity: 0.4;
}
</style>
</head><body>
<div class="card">
  <div class="cover-wrap">
    <img id="cover" crossorigin="anonymous" src="${data.coverUrl}" />
    <div class="rating-badge">${ratingDisplay}</div>
  </div>
  <div class="info">
    <div class="title-sch">${data.schName}</div>
    <div class="title-eng">${data.engName}</div>
    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">玩家人数</div>
        <div class="meta-value">${playerRange}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">难度</div>
        <div class="meta-value">${stars}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">游戏时间</div>
        <div class="meta-value">${data.avgTime ? data.avgTime + " 分钟/人" : "未知"}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">类型</div>
        <div class="meta-value">${data.mode || "未知"}</div>
      </div>
    </div>
    <div class="tags">${tags}${bestRange ? ` · ${bestRange}` : ""}</div>
    <div class="footer">
      <span>${data.publishYear ? data.publishYear + " 年发行" : ""}</span>
      <span>DICESHOCK</span>
    </div>
  </div>
</div>
<script>
const img = document.getElementById("cover");
if (img.complete) { window.__ready = true; }
else {
  img.onload = () => { window.__ready = true; };
  img.onerror = () => { window.__ready = true; };
}
</script>
</body></html>`;
}

async function fetchAsDataUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    const resp = await fetch(url);
    if (!resp.ok) return "";
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buf = await resp.arrayBuffer();
    const base64 = btoa(
      Array.from(new Uint8Array(buf))
        .map((b) => String.fromCharCode(b))
        .join(""),
    );
    return `data:${contentType};base64,${base64}`;
  } catch {
    return "";
  }
}
