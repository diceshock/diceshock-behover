import db from "@lib/db";
import type { Context } from "hono";
import type { PPCategory } from "@/shared/mahjong/pp";
import { formatPP, PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import type { HonoCtxEnv } from "@/shared/types";
import {
  CardFooter,
  CardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCard,
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

    const ppEntries = Object.entries(ppByCategory).slice(0, 4);
    const badgeColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

    return renderCard(
      <CardShell>
        <div className="card">
          <div className="header">
            <div className="header-title">{nickname}</div>
            <div className="header-badge">日麻战绩</div>
          </div>
          <div className="divider" />
          <div className="content">
            {ppEntries.length > 0 ? (
              ppEntries.map(([cat, data]) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ fontSize: 18, color: "#666" }}>
                    {PP_CATEGORY_LABELS[cat as PPCategory] ?? cat}
                  </span>
                  <span
                    style={{ fontSize: 22, fontWeight: 700, color: "#36ffa1" }}
                  >
                    {formatPP(data.totalPP)}
                  </span>
                  <span style={{ fontSize: 14, color: "#aaa" }}>
                    #{data.rank ?? "—"} · {data.matchCount}局
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: "#aaa", fontSize: 20 }}>暂无对局记录</div>
            )}
            {badges.length > 0 && (
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 14, color: "#aaa", marginRight: 8 }}>
                  徽章
                </span>
                {badges.slice(0, 5).map((b, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: badgeColors[b.badge_rank - 1] || "#aaa",
                      marginRight: 6,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <CardFooter logoUrl={logoDataUrl} />
        </div>
      </CardShell>,
    );
  });
}
