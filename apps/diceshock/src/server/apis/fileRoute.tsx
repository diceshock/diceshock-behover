import {
  createRequestHandler,
  RouterServer,
  renderRouterToStream,
} from "@tanstack/react-router/ssr/server";
import clsx from "clsx";
import type { Context } from "hono";
import {
  Link,
  ReactRefresh,
  Script,
  ViteClient,
} from "vite-ssr-components/react";
import { createRouter } from "@/apps/router";
import { CrossDataProvider } from "@/client/hooks/useCrossData";
import { ServerCtxProvider } from "@/client/hooks/useServerCtx";
import type { HonoCtxEnv } from "@/shared/types";
import { getOgMeta } from "../utils/ogMeta";
import themeGet from "../utils/themeGet";

export default async function fileRoute(c: Context<HonoCtxEnv>) {
  const handler = createRequestHandler({
    request: c.req.raw,
    createRouter,
  });

  c.header("Content-Type", "text/html");

  const [themeEl, theme] = themeGet(c);
  const pathname = new URL(c.req.url).pathname;
  const og = getOgMeta(pathname);

  const res = handler(({ request, responseHeaders, router }) => {
    router.history.replace(c.req.url);

    return renderRouterToStream({
      request,
      responseHeaders,
      router,
      children: (
        <html
          lang="zh-CN-Hans"
          className={clsx({ dark: theme === "dark" }, "antialiased")}
        >
          <head>
            <meta charSet="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, viewport-fit=cover"
            />

            <title>{og.title}</title>
            <meta name="description" content={og.description} />
            <meta property="og:site_name" content="DiceShock 骰惊" />
            <meta property="og:type" content="website" />
            <meta property="og:title" content={og.title} />
            <meta property="og:description" content={og.description} />
            <meta property="og:image" content={og.image} />
            <meta property="og:url" content={og.url} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={og.title} />
            <meta name="twitter:description" content={og.description} />
            <meta name="twitter:image" content={og.image} />

            <ViteClient />
            <ReactRefresh />

            <Script src="/src/apps/client.tsx" />

            <Link href="/src/apps/style.css" rel="stylesheet" />

            <link
              rel="icon"
              type="image/svg+xml"
              href="https://assets.runespark.fun/images/diceshock.favicon.svg"
            />

            <script
              src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
              defer
            ></script>
          </head>

          <body>
            <div id="root">
              <ServerCtxProvider c={c}>
                <CrossDataProvider c={c}>
                  <RouterServer router={router} />
                </CrossDataProvider>
              </ServerCtxProvider>
            </div>

            {themeEl}
          </body>
        </html>
      ),
    });
  });

  return res;
}
