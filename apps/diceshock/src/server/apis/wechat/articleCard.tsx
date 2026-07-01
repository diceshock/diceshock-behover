import db, {
  activeRegistrationsTable,
  activesTable,
  boardGamesTable,
  eventsTable,
  storesTable,
} from "@lib/db";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import { renderToString } from "react-dom/server";

// ─── 750px mobile-optimized article template ─────────────────────────────────
// Renders activity/event data as a tall image suitable for WeChat image articles.
// No fixed height — content drives the page length for fullPage screenshot.

const ARTICLE_WIDTH = 750;

const ARTICLE_CSS = `* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: ${ARTICLE_WIDTH}px;
  font-family: -apple-system, "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: #fff;
  color: #1a1a1a;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
.article {
  padding: 60px 48px 80px;
}
.cover {
  width: 100%;
  border-radius: 12px;
  object-fit: cover;
  max-height: 400px;
}
.badge {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: #36ffa1;
  background: #f0fff8;
  padding: 6px 16px;
  border-radius: 99px;
  border: 1.5px solid #36ffa1;
  margin-top: 28px;
}
.title {
  font-size: 36px;
  font-weight: 800;
  color: #1a1a1a;
  margin-top: 20px;
  line-height: 1.3;
}
.meta {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #666;
}
.meta-icon {
  font-size: 18px;
}
.divider {
  width: 48px;
  height: 3px;
  background: #36ffa1;
  margin: 32px 0;
  border-radius: 2px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 12px;
}
.description {
  font-size: 17px;
  color: #333;
  line-height: 1.9;
  white-space: pre-wrap;
}
.players-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.player-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 24px;
  padding: 8px 16px;
  font-size: 14px;
  color: #333;
}
.player-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  background: #ddd;
}
.game-card {
  margin-top: 8px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.game-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  background: #eee;
}
.game-info {
  flex: 1;
}
.game-name {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.game-meta {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}
.footer {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.footer-brand img {
  width: 24px;
  height: 24px;
}
.footer-brand span {
  font-size: 14px;
  color: #aaa;
  letter-spacing: 0.5px;
}
.footer-qr {
  font-size: 12px;
  color: #ccc;
}
.empty-slot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px dashed #ddd;
}`;

// ─── Data types ──────────────────────────────────────────────────────────────

export interface ArticleActiveData {
  type: "active";
  title: string;
  date: string;
  time: string | null;
  maxPlayers: number;
  storeName: string | null;
  gameName: string | null;
  gameThumbUrl: string | null;
  description: string | null;
  creatorName: string;
  players: { nickname: string; avatarUrl: string | null }[];
  coverUrl: string | null;
}

export interface ArticleEventData {
  type: "event";
  title: string;
  description: string | null;
  coverUrl: string | null;
  storeName: string | null;
}

export type ArticleData = ArticleActiveData | ArticleEventData;

// ─── Query helpers ───────────────────────────────────────────────────────────

export async function fetchActiveArticleData(
  dbBinding: D1Database,
  activeId: string,
): Promise<ArticleActiveData | null> {
  const d = db(dbBinding);
  const active = await d.query.activesTable.findFirst({
    where: eq(activesTable.id, activeId),
    with: {
      creator: true,
      boardGame: true,
      store: true,
      registrations: { with: { user: true } },
    },
  });
  if (!active) return null;

  return {
    type: "active",
    title: active.title,
    date: active.date,
    time: active.time,
    maxPlayers: active.max_players,
    storeName: (active.store as { name?: string } | null)?.name ?? null,
    gameName:
      (active.boardGame as { sch_name?: string } | null)?.sch_name ?? null,
    gameThumbUrl:
      (active.boardGame as { thumbnail_url?: string } | null)?.thumbnail_url ??
      null,
    description: active.content,
    creatorName:
      (active.creator as { nickname?: string } | null)?.nickname ?? "匿名",
    players: (
      active.registrations as {
        user: { nickname?: string | null; image?: string | null } | null;
      }[]
    ).map((r) => ({
      nickname: r.user?.nickname ?? "玩家",
      avatarUrl: r.user?.image ?? null,
    })),
    coverUrl: null,
  };
}

export async function fetchEventArticleData(
  dbBinding: D1Database,
  eventId: string,
): Promise<ArticleEventData | null> {
  const d = db(dbBinding);
  const event = await d.query.eventsTable.findFirst({
    where: eq(eventsTable.id, eventId),
    with: { store: true },
  });
  if (!event) return null;

  return {
    type: "event",
    title: event.title,
    description: event.description,
    coverUrl: event.cover_image_url,
    storeName: (event.store as { name?: string } | null)?.name ?? null,
  };
}

// ─── React templates ─────────────────────────────────────────────────────────

function ActiveArticleView({
  data,
  logoDataUrl,
}: {
  data: ArticleActiveData;
  logoDataUrl: string;
}) {
  const spotsLeft = data.maxPlayers - data.players.length;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style dangerouslySetInnerHTML={{ __html: ARTICLE_CSS }} />
      </head>
      <body>
        <div className="article">
          <div className="badge">约局</div>
          <div className="title">{data.title}</div>

          <div className="meta">
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              {data.date}
              {data.time ? ` ${data.time}` : ""}
            </div>
            {data.storeName && (
              <div className="meta-item">
                <span className="meta-icon">📍</span>
                {data.storeName}
              </div>
            )}
            <div className="meta-item">
              <span className="meta-icon">👥</span>
              {data.players.length}/{data.maxPlayers} 人
            </div>
          </div>

          {data.gameName && (
            <>
              <div className="divider" />
              <div className="section-title">游戏</div>
              <div className="game-card">
                {data.gameThumbUrl && (
                  <img className="game-thumb" src={data.gameThumbUrl} />
                )}
                <div className="game-info">
                  <div className="game-name">{data.gameName}</div>
                </div>
              </div>
            </>
          )}

          {data.description && (
            <>
              <div className="divider" />
              <div className="section-title">详情</div>
              <div className="description">{data.description}</div>
            </>
          )}

          <div className="divider" />
          <div className="section-title">
            参与者 ({data.players.length}/{data.maxPlayers})
          </div>
          <div className="players-grid">
            {data.players.map((p, i) => (
              <div key={i} className="player-chip">
                {p.avatarUrl ? (
                  <img className="player-avatar" src={p.avatarUrl} />
                ) : (
                  <div className="player-avatar" />
                )}
                {p.nickname}
              </div>
            ))}
            {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
              <div key={`empty-${i}`} className="player-chip">
                <div className="empty-slot" />
                <span style={{ color: "#ccc" }}>空位</span>
              </div>
            ))}
          </div>

          <div className="footer">
            <div className="footer-brand">
              {logoDataUrl && <img src={logoDataUrl} />}
              <span>diceshock.com</span>
            </div>
            <span className="footer-qr">
              {dayjs().format("YYYY-MM-DD HH:mm")}
            </span>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: "window.__ready = true;" }} />
      </body>
    </html>
  );
}

function EventArticleView({
  data,
  logoDataUrl,
}: {
  data: ArticleEventData;
  logoDataUrl: string;
}) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style dangerouslySetInnerHTML={{ __html: ARTICLE_CSS }} />
      </head>
      <body>
        <div className="article">
          {data.coverUrl && <img className="cover" src={data.coverUrl} />}
          <div className="badge">活动</div>
          <div className="title">{data.title}</div>

          <div className="meta">
            {data.storeName && (
              <div className="meta-item">
                <span className="meta-icon">📍</span>
                {data.storeName}
              </div>
            )}
          </div>

          {data.description && (
            <>
              <div className="divider" />
              <div className="description">{data.description}</div>
            </>
          )}

          <div className="footer">
            <div className="footer-brand">
              {logoDataUrl && <img src={logoDataUrl} />}
              <span>diceshock.com</span>
            </div>
            <span className="footer-qr">
              {dayjs().format("YYYY-MM-DD HH:mm")}
            </span>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: "window.__ready = true;" }} />
      </body>
    </html>
  );
}

// ─── HTML builders ───────────────────────────────────────────────────────────

export function buildArticleHtml(
  data: ArticleData,
  logoDataUrl: string,
): string {
  if (data.type === "active") {
    return `<!DOCTYPE html>${renderToString(<ActiveArticleView data={data} logoDataUrl={logoDataUrl} />)}`;
  }
  return `<!DOCTYPE html>${renderToString(<EventArticleView data={data} logoDataUrl={logoDataUrl} />)}`;
}

export { ARTICLE_WIDTH };
