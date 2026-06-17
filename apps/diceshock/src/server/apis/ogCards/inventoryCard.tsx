import db, { boardGamesTable } from "@lib/db";
import { count, eq } from "drizzle-orm";
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

export async function inventoryCard(c: Context<HonoCtxEnv>) {
  const r2Key = "card/inventory.png";

  return renderCardResponse(c, r2Key, async () => {
    const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

    const [result] = await db(c.env.DB)
      .select({ total: count() })
      .from(boardGamesTable)
      .where(eq(boardGamesTable.removeDate, new Date(0)));

    const total = result?.total ?? 0;

    return renderCard(
      <CardShell>
        <div
          className="card"
          style={{
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: "#36ffa1",
              lineHeight: 1,
            }}
          >
            {total}
          </div>
          <div style={{ fontSize: 32, color: "#666", marginTop: 16 }}>
            款桌游
          </div>
          <div style={{ fontSize: 20, color: "#aaa", marginTop: 8 }}>
            DiceShock 骰子奇兵 · 桌游库
          </div>
          <CardFooter logoUrl={logoDataUrl} />
        </div>
      </CardShell>,
    );
  });
}
