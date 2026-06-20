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

function createWechatFetch(appId: string, appSecret: string) {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(input.toString());

    if (url.pathname === "/sns/oauth2/access_token") {
      let code = "";
      if (init?.body) {
        const body =
          init.body instanceof URLSearchParams
            ? init.body
            : new URLSearchParams(init.body as string);
        code = body.get("code") || "";
      }

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
        return new Response(
          JSON.stringify({
            error: "server_error",
            error_description: `WeChat: ${data.errcode} - ${data.errmsg}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          access_token: data.access_token,
          token_type: "bearer",
          expires_in: data.expires_in,
          refresh_token: data.refresh_token,
          scope: data.scope || "snsapi_login",
          openid: data.openid,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log("[WeChat OAuth] Passthrough fetch:", url.toString());
    return fetch(input, init);
  };
}

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
      async conform(response: Response) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) return response;
        const text = await response.text();
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(text, { status: response.status, headers });
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

        console.log("[WeChat OAuth] Fetching userinfo:", url.toString());
        const res = await fetch(url.toString());
        const data = (await res.json()) as any;
        console.log("[WeChat OAuth] Userinfo:", JSON.stringify(data));

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
        id: profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
    clientId,
    clientSecret,
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    checks: [] as [],
    [customFetch]: createWechatFetch(clientId, clientSecret),
  } satisfies OAuthConfig<WechatProfile>;
}

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
        return new Response(text, { status: response.status, headers });
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
        id: profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
    clientId,
    clientSecret,
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    checks: [] as [],
    [customFetch]: createWechatFetch(clientId, clientSecret),
  } satisfies OAuthConfig<WechatProfile>;
}

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
      async conform(response: Response) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) return response;
        const text = await response.text();
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(text, { status: response.status, headers });
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
        console.log("[WeChat Silent] openid from token:", openid);
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
    checks: [] as [],
    [customFetch]: createWechatFetch(clientId, clientSecret),
  } satisfies OAuthConfig<WechatProfile>;
}
