import db, { leaderboardSnapshotsTable } from "@lib/db";
import { and, desc, eq } from "drizzle-orm";
import type { Context } from "hono";
import { PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import type { HonoCtxEnv } from "@/shared/types";
import {
  CardFooter,
  CardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCard,
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
      const entries = ((snapshot?.data ?? []) as unknown[]).slice(0, 8);

      return renderCard(
        <CardShell>
          <div className="card">
            <div className="header">
              <div className="header-title">日麻 PP 排行榜</div>
              <div className="header-badge">
                本周 · {PP_CATEGORY_LABELS.store_4p_hanchan}
              </div>
            </div>
            <div className="divider" />
            <div className="content" style={{ gap: 0 }}>
              {entries.length > 0 ? (
                entries.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "8px 0",
                      fontSize: i === 0 ? 24 : 20,
                      fontWeight: i === 0 ? 700 : undefined,
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        textAlign: "center",
                        color: i < 3 ? "#36ffa1" : "#aaa",
                        fontWeight: 800,
                      }}
                    >
                      {e.rank}
                    </span>
                    <span style={{ flex: 1, color: "#333" }}>{e.nickname}</span>
                    <span style={{ color: "#36ffa1", fontWeight: 700 }}>
                      {Number(e.totalPP).toFixed(1)} PP
                    </span>
                    <span style={{ color: "#aaa", fontSize: 14 }}>
                      {e.matchCount}局
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    color: "#aaa",
                    fontSize: 24,
                    textAlign: "center",
                    marginTop: 80,
                  }}
                >
                  暂无排行数据
                </div>
              )}
            </div>
            <CardFooter logoUrl={logoDataUrl} />
          </div>
        </CardShell>,
      );
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
}
