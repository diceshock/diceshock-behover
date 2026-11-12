import { HTTPException } from "hono/http-exception";
import { nanoid } from "nanoid";

type Env = Pick<Cloudflare.Env, "DB" | "KV" | "WECHAT_MINIAPP_APP_ID" | "WECHAT_MINIAPP_APP_SECRET">;
type Account = { id: string; nickname: string; phone: string | null };
type WechatResult = { errcode?: number };
const tokenPrefix = "dsmini_";
const storedPrefix = "ds-miniapp:";
const bearer = (authorization?: string) => authorization?.match(/^Bearer (dsmini_[\da-f-]{72})$/i)?.[1];

async function tokenKey(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return storedPrefix + Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("");
}

function credentials(env: Env) {
  if (!env.WECHAT_MINIAPP_APP_ID || !env.WECHAT_MINIAPP_APP_SECRET) {
    throw new HTTPException(503, { message: "小程序微信登录尚未配置" });
  }
  return { appid: env.WECHAT_MINIAPP_APP_ID, secret: env.WECHAT_MINIAPP_APP_SECRET };
}

async function wechat<T extends WechatResult>(url: URL, body?: object): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    ...(body && { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  }).catch(() => null);
  const data = await response?.json<T>().catch(() => null);
  if (!response?.ok || !data) throw new HTTPException(503, { message: "暂时无法连接微信，请稍后重试" });
  if (data.errcode) throw new HTTPException(400, { message: `微信验证失败（${data.errcode}），请重试` });
  return data;
}

async function subject(env: Env, code: string) {
  const { appid, secret } = credentials(env);
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.search = new URLSearchParams({ appid, secret, js_code: code, grant_type: "authorization_code" }).toString();
  const { openid } = await wechat<WechatResult & { openid?: string }>(url);
  if (!openid) throw new HTTPException(400, { message: "微信未返回登录身份" });
  return { provider: `wechat-miniapp:${appid}`, openid };
}

async function verifiedPhone(env: Env, code: string) {
  const config = credentials(env);
  const key = `miniapp:stable-token:${config.appid}`;
  let token = await env.KV.get(key).catch(() => null);
  if (!token) {
    const data = await wechat<WechatResult & { access_token?: string; expires_in?: number }>(
      new URL("https://api.weixin.qq.com/cgi-bin/stable_token"),
      { ...config, grant_type: "client_credential", force_refresh: false },
    );
    if (!data.access_token) throw new HTTPException(503, { message: "微信未返回验证凭证" });
    token = data.access_token;
    await env.KV.put(key, token, { expirationTtl: Math.max(60, (data.expires_in ?? 7200) - 300) }).catch(() => {});
  }
  const url = new URL("https://api.weixin.qq.com/wxa/business/getuserphonenumber");
  url.searchParams.set("access_token", token);
  const data = await wechat<WechatResult & { phone_info?: { purePhoneNumber?: string; countryCode?: string } }>(url, { code });
  const phone = data.phone_info?.purePhoneNumber;
  if (!phone || data.phone_info?.countryCode !== "86" || !/^1\d{10}$/.test(phone)) {
    throw new HTTPException(400, { message: "请验证中国大陆手机号" });
  }
  return phone;
}

const lookupAccount = (db: Env["DB"], provider: string, openid: string) => db.prepare(
  `SELECT u.id, i.nickname, i.phone FROM account a JOIN "user" u ON u.id=a.userId
   JOIN user_info i ON i.id=u.id WHERE a.provider=? AND a.providerAccountId=? AND u.disabled=0`,
).bind(provider, openid).first<Account>();

async function issueSession(db: Env["DB"], account: Account) {
  const token = tokenPrefix + crypto.randomUUID() + crypto.randomUUID();
  await db.prepare("INSERT INTO session (sessionToken,userId,expires) VALUES (?,?,?)")
    .bind(await tokenKey(token), account.id, Date.now() + 7 * 86_400_000).run();
  return { accessToken: token, profile: { id: account.id, nickname: account.nickname, phoneVerified: Boolean(account.phone) } };
}

export async function miniappLogin(env: Env, code: string) {
  const { provider, openid } = await subject(env, code);
  const account = await lookupAccount(env.DB, provider, openid);
  return account?.phone ? issueSession(env.DB, account) : { accessToken: null, profile: null };
}

export async function miniappVerify(env: Env, code: string, phoneCode: string, nickname: string) {
  const [{ provider, openid }, phone] = await Promise.all([subject(env, code), verifiedPhone(env, phoneCode)]);
  const now = Date.now();
  const userId = crypto.randomUUID();
  const db = env.DB;
  await db.batch([
    db.prepare(`INSERT INTO "user"(id,name,role,disabled)
      SELECT ?,?,'customer',0 WHERE NOT EXISTS(SELECT 1 FROM user_info WHERE phone=?)
        AND NOT EXISTS(SELECT 1 FROM account WHERE provider=? AND providerAccountId=?)`)
      .bind(userId, nickname, phone, provider, openid),
    db.prepare(`INSERT INTO user_info(id,uid,nickname,phone,points,create_at)
      SELECT id,?,?,?,0,? FROM "user" WHERE id=?`)
      .bind(nanoid(), nickname, phone, now, userId),
    db.prepare(`INSERT INTO account("userId",type,provider,"providerAccountId")
      SELECT i.id,'oauth',?,? FROM user_info i JOIN "user" u ON u.id=i.id
      WHERE i.phone=? AND u.disabled=0 AND (SELECT count(*) FROM user_info WHERE phone=?)=1
      ON CONFLICT(provider,providerAccountId) DO NOTHING`).bind(provider, openid, phone, phone),
  ]);
  const account = await lookupAccount(db, provider, openid);
  if (!account || account.phone !== phone) {
    throw new HTTPException(409, { message: "手机号与现有会员资料需要核对，请联系店员" });
  }
  return issueSession(db, account);
}

export async function miniappAccount(db: Env["DB"], authorization?: string) {
  const token = bearer(authorization);
  if (!token) throw new HTTPException(401, { message: "请先微信登录" });
  const account = await db.prepare(
    `SELECT u.id,i.nickname,i.phone FROM session s JOIN "user" u ON u.id=s.userId
     JOIN user_info i ON i.id=u.id WHERE s.sessionToken=? AND s.expires>? AND u.disabled=0`,
  ).bind(await tokenKey(token), Date.now()).first<Account>();
  if (!account?.phone) throw new HTTPException(401, { message: "请重新登录并验证手机号" });
  return account;
}

export async function miniappLogout(db: Env["DB"], authorization?: string) {
  const token = bearer(authorization);
  if (token) await db.prepare("DELETE FROM session WHERE sessionToken=?").bind(await tokenKey(token)).run();
}
