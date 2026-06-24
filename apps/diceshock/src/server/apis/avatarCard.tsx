import puppeteer from "@cloudflare/puppeteer";
import dbFactory from "@lib/db";
import type { Context } from "hono";
import { renderToString } from "react-dom/server";
import type { HonoCtxEnv } from "@/shared/types";

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

  const nickname = user?.userInfo?.nickname ?? "A";
  const initial = /^[\x20-\x7E\u00A0-\u024F\u0400-\u04FF]/.test(nickname)
    ? nickname.slice(0, 2).toUpperCase()
    : nickname.slice(0, 1);

  const hue = hashToHue(userId);

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
  background: hsl(${hue}, 55%, 45%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.initial {
  font-size: 220px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}`,
          }}
        />
      </head>
      <body>
        <div className="initial">{initial}</div>
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

function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
