import clsx from "clsx";
import {
    Link,
    ReactRefresh,
    Script,
    ViteClient,
} from "vite-ssr-components/react";
import {
    createRequestHandler,
    renderRouterToStream,
    RouterServer,
} from "@tanstack/react-router/ssr/server";
import { Context } from "hono";
import { HonoCtxEnv } from "@/shared/types";
import themeGet from "../utils/themeGet";

import { createRouter } from "@/apps/diceshock/router";

import { CrossDataProvider } from "@/client/hooks/useCrossData";
import { ServerCtxProvider } from "@/client/hooks/useServerCtx";

export default async function diceshockRouter(c: Context<HonoCtxEnv>) {
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

                        <Script src="/src/apps/diceshock/client.tsx" />

                        <Link
                            href="/src/apps/diceshock/style.css"
                            rel="stylesheet"
                        />

                        <link
                            rel="icon"
                            type="image/svg+xml"
                            href="https://assets.diceshock.com/images/diceshock.favicon.svg"
                        />
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
