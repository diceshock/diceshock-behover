/**
 * 微信 OAuth 登录 Provider (Auth.js v0.40+ 兼容版)
 *
 * 两种模式：
 * 1. WechatOpen - 微信开放平台（PC 端扫码登录）
 * 2. WechatMP - 微信公众平台（微信内网页授权）
 *
 * Auth.js 0.40 使用 oauth4webapi 发标准 POST 请求到 token endpoint，
 * 但微信 API 需要 GET + query params (appid, secret, code, grant_type)。
 * 因此我们通过 [customFetch] 拦截 token 请求并改写为微信兼容格式。
 */

import { customFetch } from "@auth/core";
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

/**
 * 创建自定义 fetch 函数，拦截 token endpoint 请求
 * 将 Auth.js 的标准 OAuth2 POST 改为微信的 GET + query params
 */
function createWechatFetch(appId: string, appSecret: string) {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(input.toString());

    // 拦截 token endpoint 请求
    if (url.pathname === "/sns/oauth2/access_token") {
      // 从 POST body 提取 code
      let code = "";
      if (init?.body) {
        const body =
          init.body instanceof URLSearchParams
            ? init.body
            : new URLSearchParams(init.body as string);
        code = body.get("code") || "";
      }

      // 改用 GET 请求 + 微信专用参数
      const tokenUrl = new URL(
        "https://api.weixin.qq.com/sns/oauth2/access_token",
      );
      tokenUrl.searchParams.set("appid", appId);
      tokenUrl.searchParams.set("secret", appSecret);
      tokenUrl.searchParams.set("code", code);
      tokenUrl.searchParams.set("grant_type", "authorization_code");

      console.log("[WeChat OAuth] Fetching token:", tokenUrl.toString());

      const res = await fetch(tokenUrl.toString());
      const data = (await res.json()) as any;

      console.log("[WeChat OAuth] Token response:", JSON.stringify(data));

      if (data.errcode) {
        // 返回 OAuth2 标准错误格式
        return new Response(
          JSON.stringify({
            error: "server_error",
            error_description: `WeChat: ${data.errcode} - ${data.errmsg}`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // 将微信响应转换为标准 OAuth2 token 响应
      const oauthResponse = {
        access_token: data.access_token,
        token_type: "bearer",
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        scope: data.scope || "snsapi_login",
        // 把 openid 存入以便 userinfo 阶段使用
        openid: data.openid,
      };

      return new Response(JSON.stringify(oauthResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 其他请求正常 fetch
    return fetch(input, init);
  };
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
    // 微信的 authorization URL 使用 appid 而非 client_id
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
      // conform 确保返回的 response 有正确的 Content-Type
      async conform(response: Response) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) return response;
        // 如果没有正确的 content-type，重新包装
        const text = await response.text();
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(text, {
          status: response.status,
          headers,
        });
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request({
        tokens,
      }: {
        tokens: { access_token: string; openid?: string };
      }) {
        // openid 从 token 响应中的额外字段获取
        const openid = (tokens as any).openid || "";
        const url = new URL("https://api.weixin.qq.com/sns/userinfo");
        url.searchParams.set("access_token", tokens.access_token);
        url.searchParams.set("openid", openid);
        url.searchParams.set("lang", "zh_CN");

        console.log("[WeChat OAuth] Fetching userinfo:", url.toString());
        const res = await fetch(url.toString());
        const data = (await res.json()) as any;
        console.log("[WeChat OAuth] Userinfo response:", JSON.stringify(data));

        if (data.errcode) {
          throw new Error(
            `WeChat userinfo error: ${data.errcode} - ${data.errmsg}`,
          );
        }
        return data as WechatProfile;
      },
    },
    profile(profile: WechatProfile) {
      return {
        id: profile.unionid || profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
    // Auth.js 会用这些发标准 OAuth2 请求，但 customFetch 拦截并改写
    clientId,
    clientSecret,
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    // 使用 customFetch 拦截 token endpoint 请求
    [customFetch]: createWechatFetch(clientId, clientSecret),
    checks: ["state"],
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
      async conform(response: Response) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) return response;
        const text = await response.text();
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(text, {
          status: response.status,
          headers,
        });
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
        const url = new URL("https://api.weixin.qq.com/sns/userinfo");
        url.searchParams.set("access_token", tokens.access_token);
        url.searchParams.set("openid", openid);
        url.searchParams.set("lang", "zh_CN");

        const res = await fetch(url.toString());
        const data = (await res.json()) as any;

        if (data.errcode) {
          throw new Error(
            `WeChat userinfo error: ${data.errcode} - ${data.errmsg}`,
          );
        }
        return data as WechatProfile;
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
    [customFetch]: createWechatFetch(clientId, clientSecret),
    checks: ["state"],
  } satisfies OAuthConfig<WechatProfile>;
}
