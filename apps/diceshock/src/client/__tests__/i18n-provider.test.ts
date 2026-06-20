import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { injectCrossDataZ } from "@/shared/types";
import { StoreProvider, useStoreContext } from "../hooks/useStoreContext";
import { useTranslation } from "../hooks/useTranslation";
import { I18nProvider } from "../providers/I18nProvider";

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
      createElement(
        I18nProvider,
        { locale: "en" },
        createElement(TranslationProbe),
      ),
    );

    expect(html).toContain('data-locale="en"');
    expect(html).toContain("Home");
  });

  it("renders with store context without error", () => {
    const html = renderToString(
      createElement(
        StoreProvider,
        { storeCode: "jdk" },
        createElement(StoreProbe),
      ),
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
    const app = createElement(
      StoreProvider,
      { storeCode: "gg" },
      createElement(
        I18nProvider,
        { locale: crossData.LocaleCode },
        createElement(TranslationProbe),
      ),
    );

    expect(renderToString(app)).toBe(renderToString(app));
    expect(renderToString(app)).toContain("ホーム");
  });
});
