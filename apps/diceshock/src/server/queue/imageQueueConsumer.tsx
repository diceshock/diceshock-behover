import puppeteer from "@cloudflare/puppeteer";
import type {
  Html2ImagePayload,
  ImageProcessMessage,
  QrCodePayload,
  TranscodePayload,
} from "@/server/apis/imageProcess";
import { renderToString } from "react-dom/server";

const PROCESS_PREFIX = "processed/";
const ERROR_SUFFIX = ".error";

type QueueEnv = Cloudflare.Env;

export async function handleImageQueue(
  batch: MessageBatch<ImageProcessMessage>,
  env: QueueEnv,
): Promise<void> {
  for (const msg of batch.messages) {
    const { taskId, type, payload } = msg.body;

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

      msg.ack();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);

      // On final retry, write error marker to R2 so callers stop waiting
      if (msg.attempts >= 2) {
        await env.R2.put(
          `${PROCESS_PREFIX}${taskId}${ERROR_SUFFIX}`,
          errMsg,
          { httpMetadata: { contentType: "text/plain" } },
        );
        msg.ack(); // stop retrying
      } else {
        msg.retry();
      }
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
    await page.waitForFunction(
      () => (window as { __ready?: boolean }).__ready === true,
      { timeout: 15000 },
    );

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

    const screenshotOptions: {
      type: "png" | "jpeg" | "webp";
      fullPage: boolean;
      quality?: number;
    } = {
      type: format as "png" | "jpeg" | "webp",
      fullPage: true,
    };
    if (format !== "png") {
      screenshotOptions.quality = quality;
    }

    const buffer = (await page.screenshot(screenshotOptions)) as Buffer;
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
    size = 256,
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
    await page.waitForFunction(
      () => (window as { __ready?: boolean }).__ready === true,
      { timeout: 15000 },
    );

    const dataUrl = await page.evaluate((fmt: string) => {
      const canvas = document.getElementById("canvas") as HTMLCanvasElement;
      return canvas.toDataURL(`image/${fmt}`);
    }, format);

    return { buffer: dataUrlToUint8Array(dataUrl), format };
  } finally {
    await browser.close();
  }
}

function TranscodeView({
  sourceUrl,
  w,
  h,
}: {
  sourceUrl: string;
  w: number;
  h: number;
}) {
  return (
    <html>
      <body style={{ margin: 0, background: "transparent" }}>
        <canvas id="canvas" width={w} height={h} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, ${w}, ${h});
                window.__ready = true;
              };
              img.onerror = () => { window.__ready = true; };
              img.src = '${sourceUrl.replace(/'/g, "\\'")}';
            `,
          }}
        />
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
  return (
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js" />
      </head>
      <body style={{ margin: 0, background: "transparent" }}>
        <canvas id="canvas" width={size} height={size} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (async () => {
                const canvas = document.getElementById('canvas');
                await QRCode.toCanvas(canvas, ${JSON.stringify(data)}, {
                  width: ${size},
                  color: { dark: '${fg}', light: '${bg}' },
                  margin: 1,
                  errorCorrectionLevel: 'H'
                });
                ${
                  logoUrl
                    ? `
                  const ctx = canvas.getContext('2d');
                  const logo = new Image();
                  logo.crossOrigin = 'anonymous';
                  logo.onload = () => {
                    const logoSize = ${size} * 0.22;
                    const x = (${size} - logoSize) / 2;
                    ctx.fillStyle = '${bg}';
                    ctx.fillRect(x - 4, x - 4, logoSize + 8, logoSize + 8);
                    ctx.drawImage(logo, x, x, logoSize, logoSize);
                    window.__ready = true;
                  };
                  logo.onerror = () => { window.__ready = true; };
                  logo.src = '${logoUrl.replace(/'/g, "\\'")}';
                `
                    : "window.__ready = true;"
                }
              })();
            `,
          }}
        />
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
  if (!base64) throw new Error("Invalid data URL");
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
