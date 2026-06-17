import db, { eventsTable } from "@lib/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { renderToString } from "react-dom/server";
import type { HonoCtxEnv } from "@/shared/types";
import {
  CardFooter,
  CardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCard,
  renderCardResponse,
} from "./shared";

const COVER_CARD_CSS = `* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1200px; height: 630px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: #fff;
  color: #1a1a1a;
  overflow: hidden;
}
.card { width:100%; height:100%; display:flex; position:relative; }
.cover-section { width:420px; height:100%; position:relative; flex-shrink:0; }
.cover-section img { width:100%; height:100%; object-fit:cover; }
.cover-fade { position:absolute; top:0; right:0; width:80px; height:100%; background:linear-gradient(to right, transparent, #fff); }
.info { flex:1; display:flex; flex-direction:column; justify-content:center; padding:48px 56px 80px 24px; text-align:right; }
.title { font-size:42px; font-weight:800; color:#1a1a1a; line-height:1.2; }
.desc { font-size:20px; color:#666; margin-top:16px; line-height:1.6; }
.badge { display:inline-block; font-size:14px; font-weight:600; color:#36ffa1; background:#f0fff8; padding:6px 16px; border-radius:99px; border:1.5px solid #36ffa1; margin-top:24px; }
.footer { position:absolute; bottom:28px; right:56px; display:flex; align-items:center; gap:10px; }
.footer img { width:26px; height:26px; }
.footer span { font-size:15px; color:#ccc; letter-spacing:0.5px; }`;

function CoverEventCard({
  event,
  coverDataUrl,
  logoDataUrl,
}: {
  event: { title: string; description: string | null };
  coverDataUrl: string;
  logoDataUrl: string;
}) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style dangerouslySetInnerHTML={{ __html: COVER_CARD_CSS }} />
      </head>
      <body>
        <div className="card">
          <div className="cover-section">
            <img id="cover" src={coverDataUrl} />
            <div className="cover-fade" />
          </div>
          <div className="info">
            <div className="title">{event.title}</div>
            {event.description && (
              <div className="desc">{event.description.slice(0, 80)}</div>
            )}
            <div className="badge">活动</div>
          </div>
          <div className="footer">
            <img src={logoDataUrl} />
            <span>diceshock.com</span>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
const img = document.getElementById("cover");
if (img.complete && img.naturalWidth > 0) { window.__ready = true; }
else { img.onload = () => { window.__ready = true; }; img.onerror = () => { window.__ready = true; }; }`,
          }}
        />
      </body>
    </html>
  );
}

export async function eventCard(c: Context<HonoCtxEnv>) {
  const id = c.req.param("id") as string;
  const r2Key = `card/event/${id}.png`;

  return renderCardResponse(c, r2Key, async () => {
    const [logoDataUrl] = await Promise.all([fetchAsDataUrl(LOGO_URL)]);

    const event = await db(c.env.DB).query.eventsTable.findFirst({
      where: eq(eventsTable.id, id),
    });

    if (!event) {
      return renderCard(
        <CardShell>
          <div className="card">
            <div className="header">
              <div className="header-title">活动不存在</div>
            </div>
            <CardFooter logoUrl={logoDataUrl} />
          </div>
        </CardShell>,
      );
    }

    const coverDataUrl = event.cover_image_url
      ? await fetchAsDataUrl(event.cover_image_url)
      : "";

    if (coverDataUrl) {
      return `<!DOCTYPE html>${renderToString(
        <CoverEventCard
          event={event}
          coverDataUrl={coverDataUrl}
          logoDataUrl={logoDataUrl}
        />,
      )}`;
    }

    return renderCard(
      <CardShell>
        <div className="card">
          <div className="header">
            <div className="header-title">{event.title}</div>
            <div className="header-badge">活动</div>
          </div>
          <div className="divider" />
          <div className="content">
            {event.description && (
              <div
                style={{
                  fontSize: 24,
                  color: "#555",
                  marginTop: 24,
                  lineHeight: 1.8,
                }}
              >
                {event.description.slice(0, 120)}
              </div>
            )}
          </div>
          <CardFooter logoUrl={logoDataUrl} />
        </div>
      </CardShell>,
    );
  });
}
