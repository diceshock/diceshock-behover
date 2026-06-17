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

const BADGE_STYLE: React.CSSProperties = {
  background: "#f0fff8",
  border: "1.5px solid #36ffa1",
  borderRadius: 99,
  padding: "8px 24px",
  color: "#36ffa1",
  fontWeight: 600,
};

const BADGES = ["桌游", "日麻", "主机"];

export async function activesListCard(c: Context<HonoCtxEnv>) {
  const r2Key = "card/actives.png";

  return renderCardResponse(c, r2Key, async () => {
    const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

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
              fontSize: 64,
              fontWeight: 900,
              color: "#1a1a1a",
              lineHeight: 1,
            }}
          >
            约局 &amp; 活动
          </div>
          <div style={{ fontSize: 24, color: "#666", marginTop: 20 }}>
            查看最新约局，参与社区活动
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
            {BADGES.map((label) => (
              <div key={label} style={BADGE_STYLE}>
                {label}
              </div>
            ))}
          </div>
          <CardFooter logoUrl={logoDataUrl} />
        </div>
      </CardShell>,
    );
  });
}
