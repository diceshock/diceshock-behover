import db from "@lib/db";
import type { Context } from "hono";
import { renderToString } from "react-dom/server";
import type { HonoCtxEnv } from "@/shared/types";
import {
  CardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCard,
  renderCardResponse,
} from "./ogCards/shared";

export async function boardGameCard(c: Context<HonoCtxEnv>) {
  const id = c.req.param("id") as string;
  const r2Key = `card/board-game/${id}.png`;

  return renderCardResponse(c, r2Key, async () => {
    const game = await db(c.env.DB).query.boardGamesTable.findFirst({
      where: (g, { eq }) => eq(g.id, id),
    });

    if (!game?.content) {
      return renderCard(
        <CardShell>
          <p>Not found</p>
        </CardShell>,
      );
    }

    const col = game.content;
    const coverUrl = col.sch_cover_url || col.eng_cover_url || "";
    const [coverDataUrl, logoDataUrl] = await Promise.all([
      fetchAsDataUrl(coverUrl),
      fetchAsDataUrl(LOGO_URL),
    ]);

    return buildCardHtml({
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
  });
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

const BOARD_GAME_CSS = `* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1200px; height: 630px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: #fff;
  color: #1a1a1a;
  overflow: hidden;
}
.card { width: 100%; height: 100%; display: flex; position: relative; }
.cover-section { width: 420px; height: 100%; position: relative; flex-shrink: 0; }
.cover-section img { width: 100%; height: 100%; object-fit: cover; }
.cover-fade { position: absolute; top: 0; right: 0; width: 80px; height: 100%; background: linear-gradient(to right, transparent, #fff); }
.info { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 48px 56px 80px 24px; text-align: right; }
.rating { position: absolute; top: 36px; right: 56px; font-size: 48px; font-weight: 800; color: #36ffa1; line-height: 1; }
.rating-label { position: absolute; top: 88px; right: 56px; font-size: 12px; color: #c4c4c4; letter-spacing: 1.5px; text-transform: uppercase; }
.title-sch { font-size: 46px; font-weight: 800; color: #1a1a1a; line-height: 1.15; }
.title-eng { font-size: 18px; font-weight: 400; color: #999; margin-top: 10px; }
.divider { width: 48px; height: 3px; background: #36ffa1; margin-top: 24px; margin-left: auto; border-radius: 2px; }
.meta { margin-top: 24px; font-size: 20px; color: #444; line-height: 2.2; }
.meta-row { display: flex; justify-content: flex-end; gap: 24px; }
.meta-item .label { font-size: 12px; color: #bbb; text-transform: uppercase; letter-spacing: 0.5px; }
.meta-item .value { font-size: 22px; font-weight: 600; color: #333; margin-top: 2px; }
.tags { margin-top: 20px; font-size: 16px; color: #999; }
.footer { position: absolute; bottom: 28px; right: 56px; display: flex; align-items: center; gap: 10px; }
.footer img { width: 26px; height: 26px; }
.footer span { font-size: 15px; color: #ccc; letter-spacing: 0.5px; }`;

function BoardGameCardView({ data }: { data: CardData }) {
  const playerRange = data.playerNum.length
    ? `${Math.min(...data.playerNum)}-${Math.max(...data.playerNum)}人`
    : "未知";
  const bestRange = data.bestPlayerNum.length
    ? `${data.bestPlayerNum.join("/")}人`
    : "";
  const ratingDisplay = data.rating ? data.rating.toFixed(1) : "N/A";
  const tags = data.categories.slice(0, 3).join(" · ");
  const difficulty = data.difficulty
    ? `${"●".repeat(Math.round(data.difficulty))}${"○".repeat(5 - Math.round(data.difficulty))}`
    : "";

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated card CSS */}
        <style dangerouslySetInnerHTML={{ __html: BOARD_GAME_CSS }} />
      </head>
      <body>
        <div className="card">
          <div className="cover-section">
            <img id="cover" crossOrigin="anonymous" src={data.coverUrl} />
            <div className="cover-fade" />
          </div>
          <div className="info">
            <div className="title-sch">{data.schName}</div>
            <div className="title-eng">{data.engName}</div>
            <div className="divider" />
            <div className="meta">
              <div className="meta-row">
                <div className="meta-item">
                  <div className="label">人数</div>
                  <div className="value">{playerRange}</div>
                </div>
                <div className="meta-item">
                  <div className="label">时长</div>
                  <div className="value">
                    {data.avgTime ? `${data.avgTime} min/人` : "—"}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="label">类型</div>
                  <div className="value">{data.mode || "—"}</div>
                </div>
              </div>
              <div className="meta-row" style={{ marginTop: 12 }}>
                {difficulty && (
                  <div className="meta-item">
                    <div className="label">难度</div>
                    <div className="value">{difficulty}</div>
                  </div>
                )}
                {bestRange && (
                  <div className="meta-item">
                    <div className="label">最佳</div>
                    <div className="value">{bestRange}</div>
                  </div>
                )}
                {data.publishYear > 0 && (
                  <div className="meta-item">
                    <div className="label">发行</div>
                    <div className="value">{data.publishYear}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="tags">{tags}</div>
          </div>
          <div className="rating">{ratingDisplay}</div>
          <div className="rating-label">RATING</div>
          <div className="footer">
            <img src={data.logoUrl} />
            <span>diceshock.com</span>
          </div>
        </div>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: generated readiness script
          dangerouslySetInnerHTML={{
            __html: `
const img = document.getElementById("cover");
if (img.complete && img.naturalWidth > 0) { window.__ready = true; }
else {
  img.onload = () => { window.__ready = true; };
  img.onerror = () => { window.__ready = true; };
}`,
          }}
        />
      </body>
    </html>
  );
}

function buildCardHtml(data: CardData): string {
  return `<!DOCTYPE html>${renderToString(<BoardGameCardView data={data} />)}`;
}
