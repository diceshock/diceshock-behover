import db, { activeRegistrationsTable, activesTable, users } from "@lib/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import {
  cardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCardResponse,
} from "./shared";

export async function activeCard(c: Context<HonoCtxEnv>) {
  const id = c.req.param("id") as string;
  const r2Key = `card/active/${id}.png`;

  return renderCardResponse(c, r2Key, async () => {
    const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

    const active = await db(c.env.DB).query.activesTable.findFirst({
      where: eq(activesTable.id, id),
      with: {
        creator: true,
        registrations: true,
        boardGame: true,
      },
    });

    if (!active) {
      return cardShell(`
<body>
<div class="card">
  <div class="header"><div class="header-title">约局不存在</div></div>
  <div class="footer"><img src="${logoDataUrl}" /><span>diceshock.com</span></div>
</div>`);
    }

    const regCount = active.registrations?.length ?? 0;
    const gameName = active.boardGame?.sch_name || "";

    return cardShell(`
<body>
<div class="card">
  <div class="header">
    <div class="header-title">${active.title}</div>
    <div class="header-badge">约局</div>
  </div>
  <div class="divider"></div>
  <div class="content">
    <div style="display:flex;gap:48px;margin-top:16px">
      <div>
        <div style="font-size:14px;color:#aaa;text-transform:uppercase;letter-spacing:1px">日期</div>
        <div style="font-size:28px;font-weight:700;color:#333;margin-top:4px">${active.date}</div>
      </div>
      <div>
        <div style="font-size:14px;color:#aaa;text-transform:uppercase;letter-spacing:1px">时间</div>
        <div style="font-size:28px;font-weight:700;color:#333;margin-top:4px">${active.time || "待定"}</div>
      </div>
      <div>
        <div style="font-size:14px;color:#aaa;text-transform:uppercase;letter-spacing:1px">人数</div>
        <div style="font-size:28px;font-weight:700;color:#36ffa1;margin-top:4px">${regCount}/${active.max_players}</div>
      </div>
    </div>
    ${gameName ? `<div style="margin-top:32px;font-size:22px;color:#666">🎲 ${gameName}</div>` : ""}
    <div style="margin-top:auto;font-size:18px;color:#aaa">发起人: ${(active.creator as any)?.nickname || "匿名"}</div>
  </div>
  <div class="footer">
    <img src="${logoDataUrl}" />
    <span>diceshock.com</span>
  </div>
</div>`);
  });
}
