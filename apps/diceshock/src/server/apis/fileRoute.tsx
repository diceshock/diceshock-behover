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
import themeGet from "../utils/themeGet";

export default async function fileRoute(c: Context<HonoCtxEnv>) {
  const handler = createRequestHandler({
    request: c.req.raw,
    createRouter,
  });

  c.header("Content-Type", "text/html");

  const [themeEl, theme] = themeGet(c);

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
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, viewport-fit=cover"
            />

            <ViteClient />
            <ReactRefresh />

            <Script src="/src/apps/client.tsx" />

            <Link href="/src/apps/style.css" rel="stylesheet" />

            <link
              rel="icon"
              type="image/svg+xml"
              href="https://assets.diceshock.com/images/diceshock.favicon.svg"
            />

            <script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
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
