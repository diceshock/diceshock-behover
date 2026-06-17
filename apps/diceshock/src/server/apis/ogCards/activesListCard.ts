import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import {
  cardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCardResponse,
} from "./shared";

export async function activesListCard(c: Context<HonoCtxEnv>) {
  const r2Key = "card/actives.png";

  return renderCardResponse(c, r2Key, async () => {
    const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

    return cardShell(`
<body>
<div class="card" style="align-items:center;justify-content:center;text-align:center">
  <div style="font-size:64px;font-weight:900;color:#1a1a1a;line-height:1">约局 & 活动</div>
  <div style="font-size:24px;color:#666;margin-top:20px">查看最新约局，参与社区活动</div>
  <div style="display:flex;gap:16px;margin-top:32px">
    <div style="background:#f0fff8;border:1.5px solid #36ffa1;border-radius:99px;padding:8px 24px;color:#36ffa1;font-weight:600">桌游</div>
    <div style="background:#f0fff8;border:1.5px solid #36ffa1;border-radius:99px;padding:8px 24px;color:#36ffa1;font-weight:600">日麻</div>
    <div style="background:#f0fff8;border:1.5px solid #36ffa1;border-radius:99px;padding:8px 24px;color:#36ffa1;font-weight:600">主机</div>
  </div>
  <div class="footer">
    <img src="${logoDataUrl}" />
    <span>diceshock.com</span>
  </div>
</div>`);
  });
}
