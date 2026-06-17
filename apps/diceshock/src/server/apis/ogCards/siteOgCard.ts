import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { fetchAsDataUrl, LOGO_URL, renderCardResponse } from "./shared";

const LOGO_SVG_URL =
  "https://assets.runespark.fun/images/diceshock.favicon.svg";

export async function siteOgCard(c: Context<HonoCtxEnv>) {
  const r2Key = "card/site-og.png";

  return renderCardResponse(c, r2Key, async () => {
    const logoDataUrl = await fetchAsDataUrl(LOGO_SVG_URL);

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1200px; height: 630px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}
.logo {
  width: 200px;
  height: 200px;
}
.site-name {
  font-size: 52px;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: -1px;
}
.slogan-cn {
  font-size: 26px;
  color: #555;
  font-weight: 500;
}
.slogan-en {
  font-size: 18px;
  color: #36ffa1;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: -12px;
}
</style></head><body>
<div class="container">
  <img class="logo" src="${logoDataUrl}" />
  <div class="site-name">DiceShock 骰子奇兵</div>
  <div class="slogan-cn">跑团, 桌游, 日麻 我们都是专业的</div>
  <div class="slogan-en">Lift-off to be The Shock</div>
</div>
<script>window.__ready = true;</script>
</body></html>`;
  });
}
