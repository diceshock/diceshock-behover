/**
 * 微信 OAuth 登录 Provider (Auth.js v0.41+)
 *
 * 微信 API 使用非标准 OAuth2 流程：
 * - authorization 使用 appid 而非 client_id
 * - token endpoint 需要 GET + appid/secret 参数（非标准 POST）
 * 使用 token.request 直接处理 token 交换，避免 customFetch Symbol 问题
 */

import type { OAuthConfig } from "@auth/core/providers";

interface WechatProfile {
  openid: string;
  unionid?: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
}

interface WechatProviderConfig {
  clientId: string;
  clientSecret: string;
}

async function fetchWechatToken(
  appId: string,
  appSecret: string,
  code: string,
) {
  const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  tokenUrl.searchParams.set("appid", appId);
  tokenUrl.searchParams.set("secret", appSecret);
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("grant_type", "authorization_code");

  console.log("[WeChat OAuth] Fetching token:", tokenUrl.toString());
  const res = await fetch(tokenUrl.toString());
  const data = (await res.json()) as any;
  console.log("[WeChat OAuth] Token response:", JSON.stringify(data));

  if (data.errcode) {
    throw new Error(`WeChat token error: ${data.errcode} - ${data.errmsg}`);
  }

  return {
    tokens: {
      access_token: data.access_token,
      token_type: "bearer",
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      scope: data.scope || "snsapi_login",
      openid: data.openid,
    },
  };
}

async function fetchWechatUserinfo(
  accessToken: string,
  openid: string,
): Promise<WechatProfile> {
  const url = new URL("https://api.weixin.qq.com/sns/userinfo");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("openid", openid);
  url.searchParams.set("lang", "zh_CN");

  console.log("[WeChat OAuth] Fetching userinfo:", url.toString());
  const res = await fetch(url.toString());
  const data = (await res.json()) as any;
  console.log("[WeChat OAuth] Userinfo response:", JSON.stringify(data));

  if (data.errcode) {
    throw new Error(`WeChat userinfo error: ${data.errcode} - ${data.errmsg}`);
  }
  return data as WechatProfile;
}

/**
 * 微信开放平台 - PC 端扫码登录
 */
export function WechatOpen(config: WechatProviderConfig) {
  const { clientId, clientSecret } = config;

  return {
    id: "wechat-open",
    name: "微信扫码登录",
    type: "oauth",
    authorization: {
      url: "https://open.weixin.qq.com/connect/qrconnect",
      params: {
        appid: clientId,
        response_type: "code",
        scope: "snsapi_login",
      },
    },
    token: {
      url: "https://api.weixin.qq.com/sns/oauth2/access_token",
      async request({ params }: { params: URLSearchParams }) {
        const code = params.get("code");
        if (!code) throw new Error("Missing code in WeChat callback");
        return fetchWechatToken(clientId, clientSecret, code);
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request({
        tokens,
      }: {
        tokens: { access_token: string; openid?: string };
      }) {
        const openid = (tokens as any).openid || "";
        return fetchWechatUserinfo(tokens.access_token, openid);
      },
    },
    profile(profile: WechatProfile) {
      return {
        id: profile.unionid || profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
    clientId,
    clientSecret,
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    checks: ["state"],
  } satisfies OAuthConfig<WechatProfile>;
}

/**
 * 微信公众平台 - 微信内网页授权（需用户确认）
 * scope: snsapi_userinfo
 */
export function WechatMP(config: WechatProviderConfig) {
  const { clientId, clientSecret } = config;

  return {
    id: "wechat-mp",
    name: "微信授权登录",
    type: "oauth",
    authorization: {
      url: "https://open.weixin.qq.com/connect/oauth2/authorize",
      params: {
        appid: clientId,
        response_type: "code",
        scope: "snsapi_userinfo",
      },
    },
    token: {
      url: "https://api.weixin.qq.com/sns/oauth2/access_token",
      async request({ params }: { params: URLSearchParams }) {
        const code = params.get("code");
        if (!code) throw new Error("Missing code in WeChat MP callback");
        return fetchWechatToken(clientId, clientSecret, code);
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request({
        tokens,
      }: {
        tokens: { access_token: string; openid?: string };
      }) {
        const openid = (tokens as any).openid || "";
        return fetchWechatUserinfo(tokens.access_token, openid);
      },
    },
    profile(profile: WechatProfile) {
      return {
        id: profile.unionid || profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
    clientId,
    clientSecret,
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    checks: ["state"],
  } satisfies OAuthConfig<WechatProfile>;
}

/**
 * 微信公众平台 - 静默授权（无感登录）
 * scope: snsapi_base - 仅获取 openid
 */
export function WechatMPSilent(config: WechatProviderConfig) {
  const { clientId, clientSecret } = config;

  return {
    id: "wechat-mp-silent",
    name: "微信静默登录",
    type: "oauth",
    authorization: {
      url: "https://open.weixin.qq.com/connect/oauth2/authorize",
      params: {
        appid: clientId,
        response_type: "code",
        scope: "snsapi_base",
      },
    },
    token: {
      url: "https://api.weixin.qq.com/sns/oauth2/access_token",
      async request({ params }: { params: URLSearchParams }) {
        const code = params.get("code");
        if (!code) throw new Error("Missing code in WeChat silent callback");
        return fetchWechatToken(clientId, clientSecret, code);
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request({
        tokens,
      }: {
        tokens: { access_token: string; openid?: string };
      }) {
        const openid = (tokens as any).openid || "";
        console.log(
          "[WeChat Silent] Using openid from token response:",
          openid,
        );
        return {
          openid,
          nickname: "",
          sex: 0,
          province: "",
          city: "",
          country: "",
          headimgurl: "",
          privilege: [],
        } as WechatProfile;
      },
    },
    profile(profile: WechatProfile) {
      return {
        id: profile.unionid || profile.openid,
        name: "",
        image: "",
      };
    },
    clientId,
    clientSecret,
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    checks: ["state"],
  } satisfies OAuthConfig<WechatProfile>;
}
