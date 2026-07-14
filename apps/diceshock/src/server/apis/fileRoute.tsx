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
import { I18nScript } from "@/client/hooks/useI18nData";
import { ServerCtxProvider } from "@/client/hooks/useServerCtx";
import { setTranslations } from "@/shared/i18n";
import { loadLocale } from "@/shared/i18n/loader";
import {
  buildStoreLocalePrefix,
  DEFAULT_LOCALE,
  LOCALES,
  type LocaleCode,
  type StoreCode,
} from "@/shared/store-locale";
import type { HonoCtxEnv } from "@/shared/types";
import { getOgMeta } from "../utils/ogMeta";
import themeGet from "../utils/themeGet";

const ALL_LOCALE_CODES: LocaleCode[] = [
  "zh_Hans",
  "zh_Hant",
  "en",
  "ja",
  "ru",
  "es",
  "pt",
  "fr",
  "de",
];

export default async function fileRoute(c: Context<HonoCtxEnv>) {
  const handler = createRequestHandler({
    request: c.req.raw,
    createRouter,
  });

  c.header("Content-Type", "text/html");

  const [themeEl, theme] = themeGet(c);
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  const og = getOgMeta(pathname);

  const store = c.var.StoreCode as StoreCode | undefined;
  const locale = c.var.LocaleCode as LocaleCode | undefined;
  const activeLocale = locale ?? DEFAULT_LOCALE;
  const htmlLang = store && locale ? LOCALES[locale].bcp47 : "zh-Hans";

  const dict = await loadLocale(activeLocale);
  setTranslations(activeLocale, dict);

  let remainingPath = pathname;
  if (store && locale) {
    const prefix = `/${buildStoreLocalePrefix(store, locale)}`;
    if (pathname.startsWith(prefix)) {
      remainingPath = pathname.slice(prefix.length) || "/";
    }
  }

  const res = handler(({ request, responseHeaders, router }) => {
    router.history.replace(c.req.url);

    return renderRouterToStream({
      request,
      responseHeaders,
      router,
      children: (
        <html
          lang={htmlLang}
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
            <meta property="og:site_name" content="DiceShock 骰子奇兵" />
            <meta property="og:type" content="website" />
            <meta property="og:title" content={og.title} />
            <meta property="og:description" content={og.description} />
            <meta property="og:image" content={og.image} />
            <meta property="og:url" content={og.url} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={og.title} />
            <meta name="twitter:description" content={og.description} />
            <meta name="twitter:image" content={og.image} />

            {store &&
              ALL_LOCALE_CODES.map((loc) => (
                <link
                  key={loc}
                  rel="alternate"
                  hrefLang={LOCALES[loc].bcp47}
                  href={`/${buildStoreLocalePrefix(store, loc)}${remainingPath}`}
                />
              ))}
            {store && (
              <link
                rel="alternate"
                hrefLang="x-default"
                href={`/${buildStoreLocalePrefix(store, "zh_Hans")}${remainingPath}`}
              />
            )}

            <ViteClient />
            <ReactRefresh />

            <Script src="/src/apps/client.tsx" />

            <Link href="/src/apps/style.css" rel="stylesheet" />

            <link rel="stylesheet" href={`/fonts/css/${activeLocale}.css`} />

            <link
              rel="icon"
              type="image/svg+xml"
              href="/cdn/images/diceshock.favicon.svg"
            />

            <script
              src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
              defer
            ></script>
          </head>

          <body>
            <I18nScript locale={activeLocale} />
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
