import db, { activesTable } from "@lib/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import {
  CardFooter,
  CardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCard,
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
      return renderCard(
        <CardShell>
          <div className="card">
            <div className="header">
              <div className="header-title">约局不存在</div>
            </div>
            <CardFooter logoUrl={logoDataUrl} />
          </div>
        </CardShell>,
      );
    }

    const regCount = active.registrations?.length ?? 0;
    const gameName = active.boardGame?.sch_name || "";

    const labelStyle: React.CSSProperties = {
      fontSize: 14,
      color: "#aaa",
      textTransform: "uppercase",
      letterSpacing: 1,
    };

    return renderCard(
      <CardShell>
        <div className="card">
          <div className="header">
            <div className="header-title">{active.title}</div>
            <div className="header-badge">约局</div>
          </div>
          <div className="divider" />
          <div className="content">
            <div style={{ display: "flex", gap: 48, marginTop: 16 }}>
              <div>
                <div style={labelStyle}>日期</div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#333",
                    marginTop: 4,
                  }}
                >
                  {active.date}
                </div>
              </div>
              <div>
                <div style={labelStyle}>时间</div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#333",
                    marginTop: 4,
                  }}
                >
                  {active.time || "待定"}
                </div>
              </div>
              <div>
                <div style={labelStyle}>人数</div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#36ffa1",
                    marginTop: 4,
                  }}
                >
                  {regCount}/{active.max_players}
                </div>
              </div>
            </div>
            {gameName && (
              <div style={{ marginTop: 32, fontSize: 22, color: "#666" }}>
                🎲 {gameName}
              </div>
            )}
            <div style={{ marginTop: "auto", fontSize: 18, color: "#aaa" }}>
              发起人: {(active.creator as any)?.nickname || "匿名"}
            </div>
          </div>
          <CardFooter logoUrl={logoDataUrl} />
        </div>
      </CardShell>,
    );
  });
}
