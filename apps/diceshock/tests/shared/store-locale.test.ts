import { describe, expect, it } from "vitest";
import type { LocaleCode, StoreCode } from "@/shared/store-locale";
import {
  buildStoreLocalePrefix,
  DEFAULT_LOCALE,
  DEFAULT_STORE,
  isValidLocale,
  isValidStore,
  LOCALES,
  parseStoreLocalePrefix,
  resolveLocaleFromAcceptLanguage,
  STORES,
} from "@/shared/store-locale";

describe("STORES", () => {
  it("has two entries: gg and jdk", () => {
    const keys = Object.keys(STORES);
    expect(keys).toHaveLength(2);
    expect(keys).toContain("gg");
    expect(keys).toContain("jdk");
  });

  it("gg store has correct fields", () => {
    expect(STORES.gg.code).toBe("gg");
    expect(STORES.gg.name).toBe("光谷店");
    expect(STORES.gg.shortName).toBe("光谷");
    expect(STORES.gg.address).toBe("武汉市洪山区鲁磨路光谷广场");
  });

  it("jdk store has correct fields", () => {
    expect(STORES.jdk.code).toBe("jdk");
    expect(STORES.jdk.name).toBe("街道口店");
    expect(STORES.jdk.shortName).toBe("街道口");
    expect(STORES.jdk.address).toBe("武汉市洪山区珞喻路街道口");
  });
});
describe("LOCALES", () => {
  it("has 9 locale entries", () => {
    expect(Object.keys(LOCALES)).toHaveLength(9);
  });

  it.each([
    ["zh_Hans", "简体中文", "zh-Hans"],
    ["zh_Hant", "繁體中文", "zh-Hant"],
    ["en", "English", "en"],
    ["ja", "日本語", "ja"],
    ["ru", "Русский", "ru"],
    ["es", "Español", "es"],
    ["pt", "Português", "pt"],
    ["fr", "Français", "fr"],
    ["de", "Deutsch", "de"],
  ] as const)("%s → name=%s, bcp47=%s", (code, name, bcp47) => {
    expect(LOCALES[code].code).toBe(code);
    expect(LOCALES[code].name).toBe(name);
    expect(LOCALES[code].bcp47).toBe(bcp47);
  });
});
describe("DEFAULT_STORE / DEFAULT_LOCALE", () => {
  it("DEFAULT_STORE is gg", () => {
    expect(DEFAULT_STORE).toBe("gg");
  });

  it("DEFAULT_LOCALE is zh_Hans", () => {
    expect(DEFAULT_LOCALE).toBe("zh_Hans");
  });
});
describe("isValidStore", () => {
  it.each(["gg", "jdk"] as const)("returns true for '%s'", (code) => {
    expect(isValidStore(code)).toBe(true);
  });

  it.each([
    "GG",
    "JDK",
    "unknown",
    "",
    "ggg",
    "j",
    "123",
  ])("returns false for '%s'", (code) => {
    expect(isValidStore(code)).toBe(false);
  });
});
describe("isValidLocale", () => {
  it.each([
    "zh_Hans",
    "zh_Hant",
    "en",
    "ja",
    "ru",
    "es",
    "pt",
    "fr",
    "de",
  ] as const)("returns true for '%s'", (code) => {
    expect(isValidLocale(code)).toBe(true);
  });

  it.each([
    "klingon",
    "",
    "EN",
    "ZH_HANS",
    "zh-CN",
    "zh",
    "123",
  ])("returns false for '%s'", (code) => {
    expect(isValidLocale(code)).toBe(false);
  });
});
describe("parseStoreLocalePrefix — valid", () => {
  const validCases: [string, StoreCode, LocaleCode][] = [
    ["gg-zh_Hans", "gg", "zh_Hans"],
    ["jdk-en", "jdk", "en"],
    ["gg-ja", "gg", "ja"],
    ["jdk-ru", "jdk", "ru"],
    ["gg-zh_Hant", "gg", "zh_Hant"],
    ["jdk-fr", "jdk", "fr"],
    ["gg-de", "gg", "de"],
    ["jdk-es", "jdk", "es"],
    ["gg-pt", "gg", "pt"],
  ];

  it.each(
    validCases,
  )("'%s' → { store: '%s', locale: '%s' }", (segment, store, locale) => {
    const result = parseStoreLocalePrefix(segment);
    expect(result).not.toBeNull();
    expect(result!.store).toBe(store);
    expect(result!.locale).toBe(locale);
  });
});
describe("parseStoreLocalePrefix — invalid", () => {
  it.each([
    ["invalid", "no dash separator"],
    ["xx-en", "invalid store code"],
    ["gg-klingon", "invalid locale code"],
    ["", "empty string"],
    ["gg", "store only, no dash"],
    ["zh_Hans", "locale only, no dash"],
    ["GG-EN", "uppercase store and locale"],
  ])("returns null for '%s' (%s)", (segment, _reason) => {
    expect(parseStoreLocalePrefix(segment)).toBeNull();
  });
});
describe("buildStoreLocalePrefix", () => {
  it("builds gg-zh_Hans", () => {
    expect(buildStoreLocalePrefix("gg", "zh_Hans")).toBe("gg-zh_Hans");
  });

  it("builds jdk-en", () => {
    expect(buildStoreLocalePrefix("jdk", "en")).toBe("jdk-en");
  });

  it("builds gg-ja", () => {
    expect(buildStoreLocalePrefix("gg", "ja")).toBe("gg-ja");
  });

  it("round-trips with parseStoreLocalePrefix", () => {
    const stores: StoreCode[] = ["gg", "jdk"];
    const locales: LocaleCode[] = ["zh_Hans", "en", "ja"];
    for (const store of stores) {
      for (const locale of locales) {
        const segment = buildStoreLocalePrefix(store, locale);
        const parsed = parseStoreLocalePrefix(segment);
        expect(parsed).toEqual({ store, locale });
      }
    }
  });
});
describe("resolveLocaleFromAcceptLanguage", () => {
  it("returns 'ja' for 'ja,en;q=0.9'", () => {
    expect(resolveLocaleFromAcceptLanguage("ja,en;q=0.9")).toBe("ja");
  });

  it("returns 'ru' for 'ru-RU,ru;q=0.9,en;q=0.8'", () => {
    expect(resolveLocaleFromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe(
      "ru",
    );
  });

  it("returns 'zh_Hant' for 'zh-TW,zh;q=0.9'", () => {
    expect(resolveLocaleFromAcceptLanguage("zh-TW,zh;q=0.9")).toBe("zh_Hant");
  });

  it("returns 'zh_Hans' for 'zh-CN,zh;q=0.9,en;q=0.8'", () => {
    expect(resolveLocaleFromAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8")).toBe(
      "zh_Hans",
    );
  });

  it("returns 'pt' for 'pt-BR,pt;q=0.9'", () => {
    expect(resolveLocaleFromAcceptLanguage("pt-BR,pt;q=0.9")).toBe("pt");
  });

  it("returns 'fr' for 'fr-FR'", () => {
    expect(resolveLocaleFromAcceptLanguage("fr-FR")).toBe("fr");
  });

  it("returns 'zh_Hans' (default) for '*' wildcard", () => {
    expect(resolveLocaleFromAcceptLanguage("*")).toBe("zh_Hans");
  });

  it("returns 'zh_Hans' (default) for empty string", () => {
    expect(resolveLocaleFromAcceptLanguage("")).toBe("zh_Hans");
  });

  it("returns 'zh_Hant' for 'zh-HK' (Hong Kong)", () => {
    expect(resolveLocaleFromAcceptLanguage("zh-HK")).toBe("zh_Hant");
  });

  it("returns 'zh_Hant' for 'zh-MO' (Macau)", () => {
    expect(resolveLocaleFromAcceptLanguage("zh-MO")).toBe("zh_Hant");
  });

  it("returns 'zh_Hans' for 'zh-SG' (Singapore)", () => {
    expect(resolveLocaleFromAcceptLanguage("zh-SG")).toBe("zh_Hans");
  });

  it("returns 'es' for 'es-ES,es;q=0.9'", () => {
    expect(resolveLocaleFromAcceptLanguage("es-ES,es;q=0.9")).toBe("es");
  });

  it("returns 'de' for 'de-DE'", () => {
    expect(resolveLocaleFromAcceptLanguage("de-DE")).toBe("de");
  });

  it("falls back to default for completely unknown language 'xx-XX'", () => {
    expect(resolveLocaleFromAcceptLanguage("xx-XX")).toBe("zh_Hans");
  });

  it("handles mixed-case header: 'ZH-tw,en;q=0.5' → zh_Hant", () => {
    expect(resolveLocaleFromAcceptLanguage("ZH-tw,en;q=0.5")).toBe("zh_Hant");
  });
});
