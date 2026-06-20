import type { Context } from "hono";
import {
  buildStoreLocalePrefix,
  DEFAULT_LOCALE,
  DEFAULT_STORE,
  isValidLocale,
  isValidStore,
  type LocaleCode,
  parseStoreLocalePrefix,
  resolveLocaleFromAcceptLanguage,
  type StoreCode,
} from "@/shared/store-locale";
import type { HonoCtxEnv, InjectCrossData } from "@/shared/types";
import { FACTORY } from "../factory";
import { injectCrossDataToCtx } from "../utils";

const SKIP_PATH_PREFIXES = [
  "/dash",
  "/edge/",
  "/apis/",
  "/api/",
  "/wechat",
  "/sitemap",
  "/sse/",
  "/action/",
  "/MP_verify",
] as const;

function shouldSkipPath(path: string): boolean {
  return SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function resolveStoreFromUserPreference(value: unknown): StoreCode | undefined {
  return typeof value === "string" && isValidStore(value) ? value : undefined;
}

function resolveLocaleFromUserPreference(
  value: unknown,
): LocaleCode | undefined {
  return typeof value === "string" && isValidLocale(value) ? value : undefined;
}

type UserInfoWithPrefs = NonNullable<InjectCrossData["UserInfo"]> & {
  preferred_store_id?: unknown;
  preferred_locale?: unknown;
};

function setStoreLocaleContext(
  c: Context<HonoCtxEnv>,
  store: StoreCode,
  locale: LocaleCode,
) {
  c.set("StoreCode", store);
  c.set("LocaleCode", locale);
  injectCrossDataToCtx(c, { StoreCode: store, LocaleCode: locale });
}

const storeLocaleMiddleware = FACTORY.createMiddleware(async (c, next) => {
  if (shouldSkipPath(c.req.path)) return await next();

  const firstSegment = c.req.path.split("/")[1] ?? "";
  const urlStoreLocale = parseStoreLocalePrefix(firstSegment);

  if (urlStoreLocale) {
    setStoreLocaleContext(c, urlStoreLocale.store, urlStoreLocale.locale);
    return await next();
  }

  const injectCrossData = c.get("InjectCrossData");
  const userInfo = injectCrossData?.UserInfo as UserInfoWithPrefs | undefined;

  const store =
    resolveStoreFromUserPreference(userInfo?.preferred_store_id) ??
    DEFAULT_STORE;
  const locale =
    resolveLocaleFromUserPreference(userInfo?.preferred_locale) ??
    resolveLocaleFromAcceptLanguage(
      injectCrossData?.UserAgentMeta?.language ?? "",
    ) ??
    DEFAULT_LOCALE;

  setStoreLocaleContext(c, store, locale);

  if (userInfo) {
    return await next();
  }

  // Redirect prefix-less public routes to the store-locale prefixed URL.
  // Query string is preserved. Uses 302 (temporary) because user preferences
  // can change between requests (login, language switch, etc.).
  const url = new URL(c.req.url);
  const redirectPath = `/${buildStoreLocalePrefix(store, locale)}${url.pathname}`;
  const redirectUrl = redirectPath + url.search;

  return c.redirect(redirectUrl, 302);
});

export default storeLocaleMiddleware;
