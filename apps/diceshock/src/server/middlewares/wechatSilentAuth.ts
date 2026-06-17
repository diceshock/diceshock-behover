import { getAuthUser } from "@hono/auth-js";
import type { HonoCtxEnv } from "@/shared/types";
import { FACTORY } from "../factory";

// 微信内置浏览器 + 未登录 → 自动跳转 snsapi_base 静默授权（防循环：跳过 API/auth/静态资源路径）

const SKIP_PREFIXES = [
  "/api/",
  "/edge/",
  "/apis/",
  "/sse/",
  "/action/",
  "/sitemap.xml",
  "/assets/",
  "/favicon",
];

function isWechatBrowser(ua: string): boolean {
  return /MicroMessenger/i.test(ua);
}

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const wechatSilentAuth = FACTORY.createMiddleware(async (c, next) => {
  const path = c.req.path;

  if (shouldSkip(path)) return next();

  const ua = c.req.header("user-agent") || "";
  if (!isWechatBrowser(ua)) return next();

  if (!c.env.WECHAT_MP_APP_ID || !c.env.WECHAT_MP_APP_SECRET) return next();

  const authUser = await getAuthUser(c);
  const userId = authUser?.token?.sub || authUser?.user?.id;

  if (userId) return next();

  const url = new URL(c.req.url);
  // 防止 OAuth 失败后死循环
  if (url.searchParams.has("__wx_silent_skip")) return next();

  const callbackUrl = url.href;

  const signInUrl = new URL("/api/auth/signin/wechat-mp-silent", url.origin);

  // Auth.js 要求 POST + CSRF token 才能触发 OAuth redirect，在 middleware 中模拟这个流程
  const csrfRes = await fetch(
    new URL("/api/auth/csrf", url.origin).toString(),
    { headers: { cookie: c.req.header("cookie") || "" } },
  );
  const csrfData = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = csrfRes.headers.get("set-cookie") || "";

  const body = new URLSearchParams();
  body.set("csrfToken", csrfData.csrfToken);
  body.set("callbackUrl", callbackUrl);

  const signInRes = await fetch(signInUrl.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: [c.req.header("cookie") || "", csrfCookies]
        .filter(Boolean)
        .join("; "),
    },
    body: body.toString(),
    redirect: "manual",
  });

  const redirectLocation = signInRes.headers.get("location");
  if (!redirectLocation) {
    console.log("[WeChat Silent Auth] No redirect from Auth.js, skipping");
    return next();
  }

  console.log("[WeChat Silent Auth] Redirecting to WeChat OAuth:", {
    from: path,
  });

  const setCookies: string[] = [];
  signInRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") setCookies.push(value);
  });

  const response = c.redirect(redirectLocation, 302);
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
});
