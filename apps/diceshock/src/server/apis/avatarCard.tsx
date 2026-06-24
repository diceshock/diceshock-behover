import puppeteer from "@cloudflare/puppeteer";
import dbFactory from "@lib/db";
import type { Context } from "hono";
import { renderToString } from "react-dom/server";
import type { HonoCtxEnv } from "@/shared/types";
import { fetchAsDataUrl, LOGO_URL } from "./ogCards/shared";

const AVATAR_SIZE = 512;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export async function avatarCard(c: Context<HonoCtxEnv>) {
  const userId = c.req.param("userId") ?? "";
  if (!userId) return c.notFound();
  const r2Key = `card/avatar/${userId}.png`;

  const cached = await c.env.R2.head(r2Key);
  if (cached?.uploaded) {
    const age = Date.now() - cached.uploaded.getTime();
    if (age < CACHE_TTL_MS) {
      const obj = await c.env.R2.get(r2Key);
      if (obj) {
        return new Response(obj.body, {
          headers: {
            "content-type": "image/png",
            "cache-control": "public, max-age=3600",
          },
        });
      }
    }
  }

  const tdb = dbFactory(c.env.DB);
  const user = await tdb.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
    with: { userInfo: true },
  });

  const nickname = user?.userInfo?.nickname ?? "Anonymous";
  const avatarUrl = user?.userInfo?.avatar_url;

  const avatarDataUrl = avatarUrl ? await fetchAsDataUrl(avatarUrl) : "";
  const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

  const initials = /^[\x20-\x7E\u00A0-\u024F\u0400-\u04FF]/.test(nickname)
    ? nickname.slice(0, 2).toUpperCase()
    : nickname.slice(0, 1);

  const html = `<!DOCTYPE html>${renderToString(
    <html>
      <head>
        <meta charSet="utf-8" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: ${AVATAR_SIZE}px;
  height: ${AVATAR_SIZE}px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wrap {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  position: relative;
}
.avatar-img {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid rgba(54, 255, 161, 0.6);
}
.avatar-initials {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: linear-gradient(135deg, #36ffa1, #00d4aa);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 96px;
  font-weight: 800;
  color: #1a1a2e;
}
.nickname {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.logo {
  position: absolute;
  bottom: 16px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.logo img { width: 18px; height: 18px; }
.logo span { font-size: 11px; color: rgba(255,255,255,0.35); }
`,
          }}
        />
      </head>
      <body>
        <div className="wrap">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} className="avatar-img" />
          ) : (
            <div className="avatar-initials">{initials}</div>
          )}
          <div className="nickname">{nickname}</div>
          <div className="logo">
            {logoDataUrl && <img src={logoDataUrl} />}
            <span>diceshock.com</span>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{ __html: "window.__ready = true;" }}
        />
      </body>
    </html>,
  )}`;

  const browser = await puppeteer.launch(c.env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: AVATAR_SIZE, height: AVATAR_SIZE });
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
        "cache-control": "public, max-age=3600",
      },
    });
  } finally {
    await browser.close();
  }
}
