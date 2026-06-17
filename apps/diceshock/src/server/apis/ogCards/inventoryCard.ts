import db, { boardGamesTable } from "@lib/db";
import { count } from "drizzle-orm";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import {
  cardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCardResponse,
} from "./shared";

export async function inventoryCard(c: Context<HonoCtxEnv>) {
  const r2Key = "card/inventory.png";

  return renderCardResponse(c, r2Key, async () => {
    const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

    const [result] = await db(c.env.DB)
      .select({ total: count() })
      .from(boardGamesTable);

    const total = result?.total ?? 0;

    return cardShell(`
<body>
<div class="card" style="align-items:center;justify-content:center;text-align:center">
  <div style="font-size:120px;font-weight:900;color:#36ffa1;line-height:1">${total}</div>
  <div style="font-size:32px;color:#666;margin-top:16px">款桌游</div>
  <div style="font-size:20px;color:#aaa;margin-top:8px">DiceShock 骰子奇兵 · 桌游库</div>
  <div class="footer">
    <img src="${logoDataUrl}" />
    <span>diceshock.com</span>
  </div>
</div>`);
  });
}
