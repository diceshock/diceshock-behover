import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LocaleCode } from "@/shared/store-locale";
import { injectCrossDataZ } from "@/shared/types";
import { StoreProvider, useStoreContext } from "../hooks/useStoreContext";
import { useTranslation } from "../hooks/useTranslation";
import { I18nProvider } from "../providers/I18nProvider";

type I18nProviderProps = Parameters<typeof I18nProvider>[0];
type StoreProviderProps = Parameters<typeof StoreProvider>[0];
const requiredChildren: ReactNode = null;

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
        { locale: "en", children: requiredChildren } as I18nProviderProps,
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
        { storeCode: "jdk", children: requiredChildren } as StoreProviderProps,
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
      { storeCode: "gg", children: requiredChildren } as StoreProviderProps,
      createElement(
        I18nProvider,
        {
          locale: crossData.LocaleCode as LocaleCode | undefined,
          children: requiredChildren,
        } as I18nProviderProps,
        createElement(TranslationProbe),
      ),
    );

    expect(renderToString(app)).toBe(renderToString(app));
    expect(renderToString(app)).toContain("ホーム");
  });
});
