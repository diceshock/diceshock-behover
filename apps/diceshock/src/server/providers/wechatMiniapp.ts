import { HTTPException } from "hono/http-exception";
export type MiniappEnv = Pick<
  Cloudflare.Env,
  "DB" | "KV" | "WECHAT_MINIAPP_APP_ID" | "WECHAT_MINIAPP_APP_SECRET"
>;
type Env = MiniappEnv;
type WechatResult = { errcode?: number };
function credentials(env: Env) {
  if (!env.WECHAT_MINIAPP_APP_ID || !env.WECHAT_MINIAPP_APP_SECRET) {
    throw new HTTPException(503, { message: "小程序微信登录尚未配置" });
  }
  return {
    appid: env.WECHAT_MINIAPP_APP_ID,
    secret: env.WECHAT_MINIAPP_APP_SECRET,
  };
}

async function wechat<T extends WechatResult>(
  url: URL,
  body?: object,
): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    ...(body && {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  }).catch(() => null);
  const data = await response?.json<T>().catch(() => null);
  if (!response?.ok || !data)
    throw new HTTPException(503, { message: "暂时无法连接微信，请稍后重试" });
  if (data.errcode)
    throw new HTTPException(400, {
      message: `微信验证失败（${data.errcode}），请重试`,
    });
  return data;
}

export async function subject(env: Env, code: string) {
  const { appid, secret } = credentials(env);
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.search = new URLSearchParams({
    appid,
    secret,
    js_code: code,
    grant_type: "authorization_code",
  }).toString();
  const { openid } = await wechat<WechatResult & { openid?: string }>(url);
  if (!openid) throw new HTTPException(400, { message: "微信未返回登录身份" });
  return { provider: `wechat-miniapp:${appid}`, openid };
}

export async function verifiedPhone(env: Env, code: string) {
  const config = credentials(env);
  const key = `miniapp:stable-token:${config.appid}`;
  let token = await env.KV.get(key).catch(() => null);
  if (!token) {
    const data = await wechat<
      WechatResult & { access_token?: string; expires_in?: number }
    >(new URL("https://api.weixin.qq.com/cgi-bin/stable_token"), {
      ...config,
      grant_type: "client_credential",
      force_refresh: false,
    });
    if (!data.access_token)
      throw new HTTPException(503, { message: "微信未返回验证凭证" });
    token = data.access_token;
    await env.KV.put(key, token, {
      expirationTtl: Math.max(60, (data.expires_in ?? 7200) - 300),
    }).catch(() => {});
  }
  const url = new URL(
    "https://api.weixin.qq.com/wxa/business/getuserphonenumber",
  );
  url.searchParams.set("access_token", token);
  const data = await wechat<
    WechatResult & {
      phone_info?: { purePhoneNumber?: string; countryCode?: string };
    }
  >(url, { code });
  const phone = data.phone_info?.purePhoneNumber;
  if (
    !phone ||
    data.phone_info?.countryCode !== "86" ||
    !/^1\d{10}$/.test(phone)
  ) {
    throw new HTTPException(400, { message: "请验证中国大陆手机号" });
  }
  return phone;
}
