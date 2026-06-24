import dbFactory from "@lib/db";
import type { Context } from "hono";
import { renderToString } from "react-dom/server";
import type { HonoCtxEnv } from "@/shared/types";
import {
  CardShell,
  fetchAsDataUrl,
  LOGO_URL,
  renderCardResponse,
} from "./ogCards/shared";

export async function avatarCard(c: Context<HonoCtxEnv>) {
  const userId = c.req.param("userId") ?? "";
  if (!userId) return c.notFound();
  const r2Key = `card/avatar/${userId}.png`;

  return renderCardResponse(c, r2Key, async () => {
    const tdb = dbFactory(c.env.DB);
    const user = await tdb.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { userInfo: true },
    });

    const nickname = user?.userInfo?.nickname ?? "Anonymous";
    const uid = user?.userInfo?.uid ?? "";
    const avatarUrl = user?.userInfo?.avatar_url;

    const avatarDataUrl = avatarUrl ? await fetchAsDataUrl(avatarUrl) : "";
    const logoDataUrl = await fetchAsDataUrl(LOGO_URL);

    return `<!DOCTYPE html>${renderToString(
      <CardShell>
        <div
          className="card"
          style={{
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            justifyContent: "center",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid rgba(54, 255, 161, 0.6)",
              }}
            />
          ) : (
            <div
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #36ffa1, #00d4aa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "72px",
                fontWeight: "800",
                color: "#1a1a2e",
              }}
            >
              {/^[\x20-\x7E\u00A0-\u024F\u0400-\u04FF]/.test(nickname)
                ? nickname.slice(0, 2).toUpperCase()
                : nickname.slice(0, 1)}
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "36px",
                fontWeight: "700",
                color: "#fff",
                margin: "0 0 8px",
              }}
            >
              {nickname}
            </p>
            {uid && (
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.5)",
                  margin: "0",
                }}
              >
                UID: {uid}
              </p>
            )}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "28px",
              right: "56px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {logoDataUrl && (
              <img
                src={logoDataUrl}
                style={{ width: "26px", height: "26px" }}
              />
            )}
            <span
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.5px",
              }}
            >
              diceshock.com
            </span>
          </div>
        </div>
      </CardShell>,
    )}`;
  });
}
