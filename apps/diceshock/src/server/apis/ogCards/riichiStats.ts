import db from "@lib/db";
import type { Context } from "hono";
import type { PPCategory } from "@/shared/mahjong/pp";
import { formatPP, PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import type { HonoCtxEnv } from "@/shared/types";
import {
  cardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCardResponse,
} from "./shared";

export async function riichiStatsCard(c: Context<HonoCtxEnv>) {
  const userId = c.req.param("userId") as string;
  const r2Key = `card/riichi-stats/${userId}.png`;

  return renderCardResponse(c, r2Key, async () => {
    const logoDataUrl = await fetchAsDataUrl(LOGO_URL);
    const tdb = db(c.env.DB);

    const [user, badges, snapshots] = await Promise.all([
      tdb.query.userInfoTable.findFirst({
        where: (s, { eq }) => eq(s.id, userId),
      }),
      tdb.query.userBadgesTable.findMany({
        where: (s, { eq }) => eq(s.user_id, userId),
        orderBy: (s, { desc }) => desc(s.awarded_at),
        limit: 6,
      }),
      tdb.query.leaderboardSnapshotsTable.findMany({
        where: (s, { eq }) => eq(s.period, "month"),
        orderBy: (s, { desc }) => desc(s.created_at),
        limit: 5,
      }),
    ]);

    const nickname = user?.nickname || "未知玩家";

    const ppByCategory: Record<
      string,
      { totalPP: number; rank: number | null; matchCount: number }
    > = {};
    for (const snap of snapshots) {
      if (ppByCategory[snap.category]) continue;
      const entries =
        (snap.data as Array<{
          userId: string;
          totalPP: number;
          rank: number;
          matchCount: number;
        }>) ?? [];
      const mine = entries.find((e) => e.userId === userId);
      if (mine) {
        ppByCategory[snap.category] = {
          totalPP: mine.totalPP,
          rank: mine.rank,
          matchCount: mine.matchCount,
        };
      }
    }

    const ppRows = Object.entries(ppByCategory)
      .slice(0, 4)
      .map(
        ([cat, data]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0">
        <span style="font-size:18px;color:#666">${PP_CATEGORY_LABELS[cat as PPCategory] ?? cat}</span>
        <span style="font-size:22px;font-weight:700;color:#36ffa1">${formatPP(data.totalPP)}</span>
        <span style="font-size:14px;color:#aaa">#${data.rank ?? "—"} · ${data.matchCount}局</span>
      </div>`,
      )
      .join("");

    const badgeIcons = badges
      .slice(0, 5)
      .map((b) => {
        const colors = ["#FFD700", "#C0C0C0", "#CD7F32"];
        const color = colors[b.badge_rank - 1] || "#aaa";
        return `<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${color};margin-right:6px"></span>`;
      })
      .join("");

    return cardShell(`
<body>
<div class="card">
  <div class="header">
    <div class="header-title">${nickname}</div>
    <div class="header-badge">日麻战绩</div>
  </div>
  <div class="divider"></div>
  <div class="content">
    ${ppRows || '<div style="color:#aaa;font-size:20px">暂无对局记录</div>'}
    ${badgeIcons ? `<div style="margin-top:auto;display:flex;align-items:center;gap:4px"><span style="font-size:14px;color:#aaa;margin-right:8px">徽章</span>${badgeIcons}</div>` : ""}
  </div>
  <div class="footer">
    <img src="${logoDataUrl}" />
    <span>diceshock.com</span>
  </div>
</div>`);
  });
}
