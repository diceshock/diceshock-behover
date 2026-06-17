import puppeteer from "@cloudflare/puppeteer";
import type { Context } from "hono";
import type { PropsWithChildren } from "react";
import { renderToString } from "react-dom/server";
import type { HonoCtxEnv } from "@/shared/types";

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
export const LOGO_URL =
  "https://assets.runespark.fun/images/diceshock.favicon.svg";

export async function fetchAsDataUrl(url: string): Promise<string> {
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

export async function renderCardResponse(
  c: Context<HonoCtxEnv>,
  r2Key: string,
  buildHtml: () => Promise<string> | string,
): Promise<Response> {
  const cached = await c.env.R2.head(r2Key);
  if (cached?.uploaded) {
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

  const html = await buildHtml();

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

const CARD_SHELL_CSS = `* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1200px; height: 630px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: #fff;
  color: #1a1a1a;
  overflow: hidden;
}
.card {
  width: 100%; height: 100%;
  position: relative;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-title {
  font-size: 36px;
  font-weight: 800;
  color: #1a1a1a;
}
.header-badge {
  font-size: 14px;
  font-weight: 600;
  color: #36ffa1;
  background: #f0fff8;
  padding: 6px 16px;
  border-radius: 99px;
  border: 1.5px solid #36ffa1;
}
.divider {
  width: 48px; height: 3px;
  background: #36ffa1;
  margin-top: 20px;
  border-radius: 2px;
}
.content {
  flex: 1;
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.footer {
  position: absolute;
  bottom: 28px; right: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.footer img {
  width: 26px; height: 26px;
}
.footer span {
  font-size: 15px;
  color: #ccc;
  letter-spacing: 0.5px;
}`;

export function CardShell({ children }: PropsWithChildren) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style dangerouslySetInnerHTML={{ __html: CARD_SHELL_CSS }} />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{ __html: "window.__ready = true;" }}
        />
      </body>
    </html>
  );
}

export function CardFooter({ logoUrl }: { logoUrl: string }) {
  return (
    <div className="footer">
      <img src={logoUrl} />
      <span>diceshock.com</span>
    </div>
  );
}

export function renderCard(element: React.ReactElement): string {
  return `<!DOCTYPE html>${renderToString(element)}`;
}

export function cardShell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${CARD_SHELL_CSS}</style>
</head>
${bodyContent}
<script>window.__ready = true;</script>
</body></html>`;
}
