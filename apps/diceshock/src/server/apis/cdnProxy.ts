import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

/**
 * Serve R2 assets through the Worker at /cdn/* so Chinese users
 * can reach them via the Caddy proxy (same-origin, no CORS needed).
 */
export async function cdnProxy(c: Context<HonoCtxEnv>) {
  const key = c.req.path.replace(/^\/cdn\//, "");
  if (!key) return c.text("Not found", 404);

  const obj = await c.env.R2.get(key);
  if (!obj) return c.text("Not found", 404);

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", "*");

  const ct = obj.httpMetadata?.contentType || guessContentType(key);
  if (ct) headers.set("Content-Type", ct);

  if (obj.httpMetadata?.contentEncoding) {
    headers.set("Content-Encoding", obj.httpMetadata.contentEncoding);
  }

  return new Response(obj.body, { headers });
}

function guessContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "avif":
      return "image/avif";
    case "woff2":
      return "font/woff2";
    case "woff":
      return "font/woff";
    case "ttf":
      return "font/ttf";
    case "otf":
      return "font/otf";
    case "css":
      return "text/css";
    case "js":
      return "application/javascript";
    case "json":
      return "application/json";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
}
