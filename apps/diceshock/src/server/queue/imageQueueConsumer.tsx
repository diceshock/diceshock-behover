import puppeteer from "@cloudflare/puppeteer";
import type {
  Html2ImagePayload,
  ImageProcessMessage,
  ImageProcessResult,
  QrCodePayload,
  TranscodePayload,
} from "@/server/apis/imageProcess";

const CDN_BASE = "https://assets.runespark.fun/";
const PROCESS_PREFIX = "processed/";

type QueueEnv = Cloudflare.Env;

export async function handleImageQueue(
  batch: MessageBatch<ImageProcessMessage>,
  env: QueueEnv,
): Promise<void> {
  for (const msg of batch.messages) {
    const { taskId, type, payload } = msg.body;

    await env.KV.put(
      `img-task:${taskId}`,
      JSON.stringify({
        taskId,
        status: "processing",
      } satisfies ImageProcessResult),
      { expirationTtl: 3600 },
    );

    try {
      let buffer: Uint8Array;
      let format: string;

      switch (type) {
        case "transcode":
          ({ buffer, format } = await processTranscode(
            env,
            payload as TranscodePayload,
          ));
          break;
        case "html2image":
          ({ buffer, format } = await processHtml2Image(
            env,
            payload as Html2ImagePayload,
          ));
          break;
        case "qrcode":
          ({ buffer, format } = await processQrCode(
            env,
            payload as QrCodePayload,
          ));
          break;
        default:
          throw new Error(`Unknown task type: ${type}`);
      }

      const key = `${PROCESS_PREFIX}${taskId}.${format}`;
      await env.R2.put(key, buffer, {
        httpMetadata: { contentType: `image/${format}` },
      });

      await env.KV.put(
        `img-task:${taskId}`,
        JSON.stringify({
          taskId,
          status: "done",
          url: `${CDN_BASE}${key}`,
        } satisfies ImageProcessResult),
        { expirationTtl: 3600 },
      );

      msg.ack();
    } catch (e) {
      await env.KV.put(
        `img-task:${taskId}`,
        JSON.stringify({
          taskId,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        } satisfies ImageProcessResult),
        { expirationTtl: 3600 },
      );

      msg.retry();
    }
  }
}

async function processTranscode(
  env: QueueEnv,
  payload: TranscodePayload,
): Promise<{ buffer: Uint8Array; format: string }> {
  const { sourceUrl, format, quality = 92, width, height } = payload;

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();

    const w = width || 1920;
    const h = height || 1080;
    await page.setViewport({ width: w, height: h });

    const html = buildTranscodeHtml(sourceUrl, w, h);
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => (window as any).__ready === true, {
      timeout: 15000,
    });

    const dataUrl = await page.evaluate(
      (fmt: string, q: number) => {
        const canvas = document.getElementById("canvas") as HTMLCanvasElement;
        return canvas.toDataURL(`image/${fmt}`, q / 100);
      },
      format,
      quality,
    );

    return { buffer: dataUrlToUint8Array(dataUrl), format };
  } finally {
    await browser.close();
  }
}

async function processHtml2Image(
  env: QueueEnv,
  payload: Html2ImagePayload,
): Promise<{ buffer: Uint8Array; format: string }> {
  const {
    html,
    viewportWidth = 1280,
    viewportHeight = 720,
    format = "png",
    quality = 92,
  } = payload;

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewportWidth, height: viewportHeight });
    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = (await page.screenshot({
      type: format as "png" | "jpeg" | "webp",
      fullPage: true,
      ...(format !== "png" ? { quality } : {}),
    })) as Buffer;
    return { buffer: new Uint8Array(buffer), format };
  } finally {
    await browser.close();
  }
}

async function processQrCode(
  env: QueueEnv,
  payload: QrCodePayload,
): Promise<{ buffer: Uint8Array; format: string }> {
  const {
    data,
    size = 512,
    foreground = "#000000",
    background = "#ffffff",
    logoUrl,
    format = "png",
  } = payload;

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size });

    const html = buildQrCodeHtml(data, size, foreground, background, logoUrl);
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => (window as any).__ready === true, {
      timeout: 15000,
    });

    const dataUrl = await page.evaluate((fmt: string) => {
      const canvas = document.getElementById("canvas") as HTMLCanvasElement;
      return canvas.toDataURL(`image/${fmt}`);
    }, format);

    return { buffer: dataUrlToUint8Array(dataUrl), format };
  } finally {
    await browser.close();
  }
}

import { renderToString } from "react-dom/server";

function TranscodeView({
  sourceUrl,
  w,
  h,
}: {
  sourceUrl: string;
  w: number;
  h: number;
}) {
  const script = `(async () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    canvas.width = ${w || "img.naturalWidth"};
    canvas.height = ${h || "img.naturalHeight"};
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    window.__ready = true;
  };
  img.onerror = () => { window.__ready = true; };
  img.src = ${JSON.stringify(sourceUrl)};
})();`;

  return (
    <html>
      <body>
        <canvas id="canvas" width={w} height={h} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated canvas script */}
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </body>
    </html>
  );
}

function buildTranscodeHtml(sourceUrl: string, w: number, h: number): string {
  return `<!DOCTYPE html>${renderToString(<TranscodeView sourceUrl={sourceUrl} w={w} h={h} />)}`;
}

function QrCodeView({
  data,
  size,
  fg,
  bg,
  logoUrl,
}: {
  data: string;
  size: number;
  fg: string;
  bg: string;
  logoUrl?: string;
}) {
  const logoScript = logoUrl
    ? `
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => {
      const logoSize = size * 0.25;
      const x = (size - logoSize) / 2;
      const y = (size - logoSize) / 2;
      ctx.fillStyle = ${JSON.stringify(bg)};
      ctx.fillRect(x - 4, y - 4, logoSize + 8, logoSize + 8);
      ctx.drawImage(logo, x, y, logoSize, logoSize);
      window.__ready = true;
    };
    logo.onerror = () => { window.__ready = true; };
    logo.src = ${JSON.stringify(logoUrl)};`
    : "window.__ready = true;";

  const script = `(function() {
  const size = ${size};
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const qr = qrcode(0, "M");
  qr.addData(${JSON.stringify(data)});
  qr.make();
  const modules = qr.getModuleCount();
  const cellSize = size / modules;
  ctx.fillStyle = ${JSON.stringify(bg)};
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ${JSON.stringify(fg)};
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
  ${logoScript}
})();`;

  return (
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js" />
      </head>
      <body>
        <canvas id="canvas" width={size} height={size} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated QR canvas script */}
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </body>
    </html>
  );
}

function buildQrCodeHtml(
  data: string,
  size: number,
  fg: string,
  bg: string,
  logoUrl?: string,
): string {
  return `<!DOCTYPE html>${renderToString(<QrCodeView data={data} size={size} fg={fg} bg={bg} logoUrl={logoUrl} />)}`;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
