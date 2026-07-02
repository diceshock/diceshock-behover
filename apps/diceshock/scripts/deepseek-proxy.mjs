/**
 * Local HTTP proxy for DeepSeek API.
 * workerd (miniflare) can't verify TLS certs on NixOS.
 * This proxy runs on localhost:9876 (plain HTTP — no TLS needed for local).
 * workerd fetches http://localhost:9876/v1/chat/completions
 * and this proxy forwards to https://api.deepseek.com/v1/chat/completions.
 *
 * Usage: node scripts/deepseek-proxy.mjs
 */
import { createServer } from "node:http";

const TARGET = "https://api.deepseek.com";
const PORT = 9876;

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const url = `${TARGET}${req.url}`;
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        ...Object.fromEntries(
          Object.entries(req.headers).filter(
            ([k]) => !["host", "connection"].includes(k)
          )
        ),
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    });

    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json",
    });
    const respBody = await upstream.arrayBuffer();
    res.end(Buffer.from(respBody));
  } catch (e) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[deepseek-proxy] listening on http://127.0.0.1:${PORT} → ${TARGET}`);
});
