import { getAuthUser } from "@hono/auth-js";
import { renderToString } from "react-dom/server";
import { Script } from "vite-ssr-components/react";
import { FACTORY } from "../factory";

// 微信内置浏览器 + 未登录 → 返回自动提交表单页面，触发 Auth.js OAuth 流程（snsapi_base 静默授权）

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

  const html = renderToString(
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        <form
          id="wx-silent-form"
          method="POST"
          action="/api/auth/signin/wechat-mp-silent"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="csrfToken" id="wx-csrf" value="" />
        </form>
        <Script src="/src/client/wechatSilentSubmit.ts" />
      </body>
    </html>,
  );

  return c.html(`<!DOCTYPE html>${html}`);
});
