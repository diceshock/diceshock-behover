import db, {
  accounts,
  drizzle,
  userInfoTable,
  userMembershipPlansTable,
} from "@lib/db";
import dayjs from "dayjs";
import type { Context } from "hono";
import { renderToString } from "react-dom/server";
import type {
  ImageProcessMessage,
  ImageProcessResult,
} from "@/server/apis/imageProcess";
import type { HonoCtxEnv } from "@/shared/types";

const { and, eq } = drizzle;

interface MembershipCardData {
  nickname: string;
  uid: string;
  timePlans: Array<{
    type: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>;
  storedValue: { balance: number } | null;
  totalVisits?: number;
}

export async function generateAndSendMembershipCard(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<void> {
  const env = c.env as any;
  const d = db(env.DB);

  const account = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.providerAccountId, openId)))
    .limit(1);

  if (account.length === 0) {
    await sendCustomerTextMessage(
      env,
      openId,
      "您还未在 Diceshock 注册，无法查看会员信息。",
    );
    return;
  }

  const userId = account[0].userId;

  const [userInfo, plans] = await Promise.all([
    d.select().from(userInfoTable).where(eq(userInfoTable.id, userId)).limit(1),
    d
      .select()
      .from(userMembershipPlansTable)
      .where(eq(userMembershipPlansTable.user_id, userId)),
  ]);

  const now = new Date();
  const cardData: MembershipCardData = {
    nickname: userInfo[0]?.nickname || "会员",
    uid: userInfo[0]?.uid || "",
    timePlans: plans
      .filter((p) => p.plan_type !== "stored_value")
      .map((p) => ({
        type: planTypeLabel(p.plan_type),
        startDate: dayjs(p.start_date).format("YYYY-MM-DD"),
        endDate: p.end_date ? dayjs(p.end_date).format("YYYY-MM-DD") : "—",
        isActive: p.end_date ? p.end_date > now : false,
      })),
    storedValue: (() => {
      const sv = plans.find((p) => p.plan_type === "stored_value");
      return sv ? { balance: sv.amount ?? 0 } : null;
    })(),
  };

  const html = buildMembershipHtml(cardData);

  const taskId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const message: ImageProcessMessage = {
    taskId,
    type: "html2image",
    payload: {
      html,
      viewportWidth: 800,
      viewportHeight: 600,
      format: "png",
    },
  };

  await env.KV.put(
    `img-task:${taskId}`,
    JSON.stringify({ taskId, status: "pending" } satisfies ImageProcessResult),
    { expirationTtl: 3600 },
  );
  await env.IMAGE_QUEUE.send(message);

  const imageUrl = await pollForResult(env, taskId, 30_000);
  if (!imageUrl) {
    await sendCustomerTextMessage(
      env,
      openId,
      "会员卡片生成超时，请稍后再试。",
    );
    return;
  }

  const mediaId = await uploadImageToWechat(env, imageUrl);
  if (!mediaId) {
    await sendCustomerTextMessage(env, openId, "图片上传失败，请稍后再试。");
    return;
  }

  await sendCustomerImageMessage(env, openId, mediaId);
}

async function pollForResult(
  env: any,
  taskId: string,
  timeoutMs: number,
): Promise<string | null> {
  const start = Date.now();
  const interval = 2000;

  while (Date.now() - start < timeoutMs) {
    const raw = await env.KV.get(`img-task:${taskId}`);
    if (raw) {
      const result = JSON.parse(raw) as ImageProcessResult;
      if (result.status === "done" && result.url) return result.url;
      if (result.status === "error") return null;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
}

async function getWechatAccessToken(env: any): Promise<string> {
  const cached = await env.KV.get("wechat:mp:access_token");
  if (cached) return cached;

  const appId = env.WECHAT_MP_APP_ID;
  const appSecret = env.WECHAT_MP_APP_SECRET;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  await env.KV.put("wechat:mp:access_token", data.access_token, {
    expirationTtl: data.expires_in - 300,
  });

  return data.access_token;
}

async function uploadImageToWechat(
  env: any,
  imageUrl: string,
): Promise<string | null> {
  const token = await getWechatAccessToken(env);
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) return null;

  const blob = await imageRes.blob();
  const formData = new FormData();
  formData.append("media", blob, "membership.png");

  const uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${token}&type=image`;
  const res = await fetch(uploadUrl, { method: "POST", body: formData });
  const data = (await res.json()) as { media_id?: string; errcode?: number };

  if (data.errcode || !data.media_id) return null;
  return data.media_id;
}

async function sendCustomerTextMessage(
  env: any,
  openId: string,
  content: string,
): Promise<void> {
  const token = await getWechatAccessToken(env);
  await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: openId,
        msgtype: "text",
        text: { content },
      }),
    },
  );
}

async function sendCustomerImageMessage(
  env: any,
  openId: string,
  mediaId: string,
): Promise<void> {
  const token = await getWechatAccessToken(env);
  await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: openId,
        msgtype: "image",
        image: { media_id: mediaId },
      }),
    },
  );
}

function planTypeLabel(type: string): string {
  switch (type) {
    case "monthly":
      return "月卡通行证";
    case "monthly_cc":
      return "月卡通行证(CC)";
    case "yearly":
      return "年卡通行证";
    default:
      return type;
  }
}

const MEMBERSHIP_CSS = `* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 800px;
  font-family: -apple-system, "Noto Sans SC", "Helvetica Neue", sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
  padding: 48px;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 36px; }
.brand { font-size: 14px; color: #666; letter-spacing: 2px; text-transform: uppercase; }
.user-section { margin-bottom: 40px; }
.nickname { font-size: 32px; font-weight: 700; margin-bottom: 6px; }
.uid { font-size: 14px; color: #888; }
.section { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px 28px; margin-bottom: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); }
.section-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; }
.plan-row { display: flex; align-items: center; gap: 16px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.plan-row:last-child { border-bottom: none; }
.plan-type { font-size: 16px; font-weight: 600; min-width: 140px; }
.plan-date { font-size: 14px; color: #aaa; flex: 1; }
.plan-status { font-size: 13px; font-weight: 600; }
.sv-section { display: flex; align-items: center; justify-content: space-between; }
.sv-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; }
.sv-balance { font-size: 42px; font-weight: 800; color: #36ffa1; }
.footer { margin-top: 32px; text-align: center; font-size: 12px; color: #555; }`;

function MembershipCardView({ data }: { data: MembershipCardData }) {
  const activePlan = data.timePlans.find((p) => p.isActive);
  const statusText = activePlan ? "有效" : "未激活";
  const statusColor = activePlan ? "#36ffa1" : "#ff6b6b";

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style dangerouslySetInnerHTML={{ __html: MEMBERSHIP_CSS }} />
      </head>
      <body>
        <div className="header">
          <span className="brand">Diceshock 会员</span>
          <span
            className="status-badge"
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background: `${statusColor}22`,
              color: statusColor,
              border: `1px solid ${statusColor}44`,
            }}
          >
            {statusText}
          </span>
        </div>
        <div className="user-section">
          <div className="nickname">{data.nickname}</div>
          {data.uid && <div className="uid">UID: {data.uid}</div>}
        </div>
        <div className="section">
          <div className="section-title">通行证</div>
          {data.timePlans.length > 0 ? (
            data.timePlans.map((p, i) => (
              <div key={i} className="plan-row">
                <span className="plan-type">{p.type}</span>
                <span className="plan-date">
                  {p.startDate} ~ {p.endDate}
                </span>
                <span
                  className="plan-status"
                  style={{ color: p.isActive ? "#36ffa1" : "#999" }}
                >
                  {p.isActive ? "有效" : "已过期"}
                </span>
              </div>
            ))
          ) : (
            <div className="plan-row">
              <span className="plan-type" style={{ color: "#999" }}>
                暂无通行证
              </span>
            </div>
          )}
        </div>
        <div className="section">
          <div className="sv-section">
            <span className="sv-label">储值卡余额</span>
            {data.storedValue ? (
              <div className="sv-balance">
                ¥{data.storedValue.balance.toFixed(0)}
              </div>
            ) : (
              <div className="sv-balance" style={{ color: "#999" }}>
                未开通
              </div>
            )}
          </div>
        </div>
        <div className="footer">
          diceshock.com · {dayjs().format("YYYY-MM-DD HH:mm")} 生成
        </div>
        <script
          dangerouslySetInnerHTML={{ __html: "window.__ready = true;" }}
        />
      </body>
    </html>
  );
}

function buildMembershipHtml(data: MembershipCardData): string {
  return `<!DOCTYPE html>${renderToString(<MembershipCardView data={data} />)}`;
}
