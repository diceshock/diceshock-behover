import db, { leaderboardSnapshotsTable } from "@lib/db";
import { and, desc, eq } from "drizzle-orm";
import type { Context } from "hono";
import { PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import type { HonoCtxEnv } from "@/shared/types";
import {
  cardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCardResponse,
} from "./shared";

export async function riichiRankingCard(c: Context<HonoCtxEnv>) {
  const r2Key = "card/riichi-ranking.png";

  try {
    return await renderCardResponse(c, r2Key, async () => {
      const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

      const snapshots = await db(c.env.DB)
        .select()
        .from(leaderboardSnapshotsTable)
        .where(
          and(
            eq(leaderboardSnapshotsTable.category, "store_4p_hanchan"),
            eq(leaderboardSnapshotsTable.period, "week"),
          ),
        )
        .orderBy(desc(leaderboardSnapshotsTable.created_at))
        .limit(1)
        .catch(() => []);

      const snapshot = snapshots[0];
      const entries = ((snapshot?.data as any[]) ?? []).slice(0, 8);

      const rows = entries
        .map(
          (e, i) => `
        <div style="display:flex;align-items:center;gap:16px;padding:8px 0;${i === 0 ? "font-size:24px;font-weight:700" : "font-size:20px"}">
          <span style="width:36px;text-align:center;color:${i < 3 ? "#36ffa1" : "#aaa"};font-weight:800">${e.rank}</span>
          <span style="flex:1;color:#333">${e.nickname}</span>
          <span style="color:#36ffa1;font-weight:700">${Number(e.totalPP).toFixed(1)} PP</span>
          <span style="color:#aaa;font-size:14px">${e.matchCount}局</span>
        </div>`,
        )
        .join("");

      return cardShell(`
<body>
<div class="card">
  <div class="header">
    <div class="header-title">日麻 PP 排行榜</div>
    <div class="header-badge">本周 · ${PP_CATEGORY_LABELS.store_4p_hanchan}</div>
  </div>
  <div class="divider"></div>
  <div class="content" style="gap:0">
    ${rows || '<div style="color:#aaa;font-size:24px;text-align:center;margin-top:80px">暂无排行数据</div>'}
  </div>
  <div class="footer">
    <img src="${logoDataUrl}" />
    <span>diceshock.com</span>
  </div>
</div>`);
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
}
