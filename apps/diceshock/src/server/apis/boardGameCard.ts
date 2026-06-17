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
  const [coverDataUrl, logoDataUrl] = await Promise.all([
    fetchAsDataUrl(coverUrl),
    fetchAsDataUrl(LOGO_URL),
  ]);

  const html = buildCardHtml({
    schName: col.sch_name || game.sch_name || "",
    engName: col.eng_name || game.eng_name || "",
    coverUrl: coverDataUrl,
    logoUrl: logoDataUrl,
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
    await page.setViewport({ width: 1200, height: 630 });
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
  logoUrl: string;
  rating: number;
  playerNum: number[];
  bestPlayerNum: number[];
  categories: string[];
  mode: string;
  difficulty: number;
  avgTime: number;
  publishYear: number;
}

const LOGO_URL = "https://assets.runespark.fun/images/diceshock.favicon.svg";

function buildCardHtml(data: CardData): string {
  const playerRange = data.playerNum.length
    ? `${Math.min(...data.playerNum)}-${Math.max(...data.playerNum)}人`
    : "未知";
  const bestRange = data.bestPlayerNum.length
    ? `最佳 ${data.bestPlayerNum.join("/")}人`
    : "";
  const ratingDisplay = data.rating ? data.rating.toFixed(1) : "N/A";
  const tags = data.categories.slice(0, 3).join(" · ");
  const difficulty = data.difficulty
    ? `${"●".repeat(Math.round(data.difficulty))}${"○".repeat(5 - Math.round(data.difficulty))}`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1200px; height: 630px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: #fff;
  color: #1a1a1a;
  overflow: hidden;
}
.card {
  width: 100%; height: 100%;
  display: flex;
  position: relative;
}
.cover-section {
  width: 520px; height: 100%;
  position: relative;
  flex-shrink: 0;
}
.cover-section img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.cover-fade {
  position: absolute;
  top: 0; right: 0;
  width: 180px; height: 100%;
  background: linear-gradient(to right, transparent, #fff);
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 56px 48px 24px;
  text-align: right;
}
.rating {
  font-size: 56px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1;
}
.rating-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
  letter-spacing: 1px;
}
.title-sch {
  font-size: 36px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 28px;
  line-height: 1.2;
}
.title-eng {
  font-size: 15px;
  font-weight: 400;
  color: #888;
  margin-top: 6px;
}
.meta {
  margin-top: 28px;
  font-size: 15px;
  color: #555;
  line-height: 2;
}
.meta span {
  display: inline-block;
  margin-left: 20px;
}
.meta span:first-child { margin-left: 0; }
.tags {
  margin-top: 16px;
  font-size: 13px;
  color: #aaa;
}
.footer {
  position: absolute;
  bottom: 32px; right: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.footer img {
  width: 28px; height: 28px;
}
.footer span {
  font-size: 14px;
  color: #bbb;
  letter-spacing: 0.5px;
}
</style>
</head><body>
<div class="card">
  <div class="cover-section">
    <img id="cover" crossorigin="anonymous" src="${data.coverUrl}" />
    <div class="cover-fade"></div>
  </div>
  <div class="info">
    <div class="rating">${ratingDisplay}</div>
    <div class="rating-label">GSTONE RATING</div>
    <div class="title-sch">${data.schName}</div>
    <div class="title-eng">${data.engName}</div>
    <div class="meta">
      <span>${playerRange}</span>
      <span>${data.avgTime ? data.avgTime + "min/人" : ""}</span>
      <span>${data.mode || ""}</span>
      ${difficulty ? `<span>${difficulty}</span>` : ""}
    </div>
    <div class="tags">${tags}${bestRange ? ` · ${bestRange}` : ""}${data.publishYear ? ` · ${data.publishYear}` : ""}</div>
  </div>
  <div class="footer">
    <img src="${data.logoUrl}" />
    <span>diceshock.com</span>
  </div>
</div>
<script>
const img = document.getElementById("cover");
if (img.complete && img.naturalWidth > 0) { window.__ready = true; }
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
