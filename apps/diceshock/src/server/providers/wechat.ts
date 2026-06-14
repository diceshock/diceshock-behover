/**
 * 微信 OAuth 登录 Provider
 *
 * 两种模式：
 * 1. WechatOpen - 微信开放平台（PC 端扫码登录）
 * 2. WechatMP - 微信公众平台（微信内网页授权）
 *
 * 注意：微信 OAuth 不遵循标准 OAuth2 规范，需要自定义参数名和请求方式。
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
  const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  url.searchParams.set("code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url.toString());
  const data = (await res.json()) as any;

  if (data.errcode) {
    throw new Error(`WeChat token error: ${data.errcode} - ${data.errmsg}`);
  }

  return {
    tokens: {
      access_token: data.access_token as string,
      token_type: "bearer" as const,
      expires_in: data.expires_in as number,
      refresh_token: data.refresh_token as string,
      scope: data.scope as string,
      // 把 openid 存到 id_token 字段以便在 userinfo 步骤中使用
      id_token: data.openid as string,
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

  const res = await fetch(url.toString());
  const data = (await res.json()) as any;

  if (data.errcode) {
    throw new Error(`WeChat userinfo error: ${data.errcode} - ${data.errmsg}`);
  }

  return data as WechatProfile;
}

/**
 * 微信开放平台 - PC 端扫码登录
 * 需要在 open.weixin.qq.com 注册应用
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
      async request(context: any) {
        return fetchWechatToken(clientId, clientSecret, context.params.code);
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request(context: any) {
        return fetchWechatUserinfo(
          context.tokens.access_token,
          context.tokens.id_token,
        );
      },
    },
    profile(profile: WechatProfile) {
      return {
        id: profile.unionid || profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
    clientId: "unused",
    clientSecret: "unused",
    checks: ["state"] as const,
  } satisfies OAuthConfig<WechatProfile>;
}

/**
 * 微信公众平台 - 微信内网页授权
 * 需要在 mp.weixin.qq.com 配置网页授权域名
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
      async request(context: any) {
        return fetchWechatToken(clientId, clientSecret, context.params.code);
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request(context: any) {
        return fetchWechatUserinfo(
          context.tokens.access_token,
          context.tokens.id_token,
        );
      },
    },
    profile(profile: WechatProfile) {
      return {
        id: profile.unionid || profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
    clientId: "unused",
    clientSecret: "unused",
    checks: ["state"] as const,
  } satisfies OAuthConfig<WechatProfile>;
}
