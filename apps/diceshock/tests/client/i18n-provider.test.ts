import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { setTranslations } from "@/shared/i18n";
import { loadLocale } from "@/shared/i18n/loader";
import type { LocaleCode } from "@/shared/store-locale";
import { injectCrossDataZ } from "@/shared/types";
import { StoreProvider, useStoreContext } from "@/client/hooks/useStoreContext";
import { useTranslation } from "@/client/hooks/useTranslation";
import { I18nProvider } from "@/client/providers/I18nProvider";

beforeAll(async () => {
  await Promise.all(
    (["en", "ja"] as const).map(async (locale) => {
      setTranslations(locale, await loadLocale(locale));
    }),
  );
});

function TranslationProbe() {
  const { locale, t } = useTranslation();
  return createElement("span", { "data-locale": locale }, t("nav.home"));
}

function StoreProbe() {
  const { storeCode, storeName } = useStoreContext();
  return createElement("span", { "data-store": storeCode }, storeName);
}

describe("I18nProvider", () => {
  it("provides a translation function for the selected locale", () => {
    const html = renderToString(
      createElement(I18nProvider, {
        locale: "en",
        children: createElement(TranslationProbe),
      }),
    );

    expect(html).toContain('data-locale="en"');
    expect(html).toContain("Home");
  });

  it("renders with store context without error", () => {
    const html = renderToString(
      createElement(StoreProvider, {
        storeCode: "jdk",
        children: createElement(StoreProbe),
      }),
    );

    expect(html).toContain('data-store="jdk"');
    expect(html).toContain("街道口店");
  });

  it("uses SSR-injected locale values as client initial state", () => {
    const crossData = injectCrossDataZ.parse({
      RequestId: "req-1",
      StoreCode: "gg",
      LocaleCode: "ja",
    });
    const app = createElement(StoreProvider, {
      storeCode: "gg",
      children: createElement(I18nProvider, {
        locale: crossData.LocaleCode as LocaleCode,
        children: createElement(TranslationProbe),
      }),
    });

    expect(renderToString(app)).toBe(renderToString(app));
    expect(renderToString(app)).toContain("ホーム");
  });
});
