/** Two physical store locations */
export type StoreCode = "gg" | "jdk";

/** Supported locale codes (language_script format, no region subtags) */
export type LocaleCode =
  | "zh_Hans"
  | "zh_Hant"
  | "en"
  | "ja"
  | "ru"
  | "es"
  | "pt"
  | "fr"
  | "de";

/** Combined store + locale context used throughout the app */
export interface StoreLocaleContext {
  store: StoreCode;
  locale: LocaleCode;
}

interface StoreEntry {
  code: StoreCode;
  name: string;
  shortName: string;
  address: string;
}

export const STORES: Record<StoreCode, StoreEntry> = {
  gg: {
    code: "gg",
    name: "光谷店",
    shortName: "光谷",
    address: "武汉市洪山区鲁磨路光谷广场",
  },
  jdk: {
    code: "jdk",
    name: "街道口店",
    shortName: "街道口",
    address: "武汉市洪山区珞喻路街道口",
  },
};

interface LocaleEntry {
  code: LocaleCode;
  name: string;
  bcp47: string;
}

export const LOCALES: Record<LocaleCode, LocaleEntry> = {
  zh_Hans: { code: "zh_Hans", name: "简体中文", bcp47: "zh-Hans" },
  zh_Hant: { code: "zh_Hant", name: "繁體中文", bcp47: "zh-Hant" },
  en: { code: "en", name: "English", bcp47: "en" },
  ja: { code: "ja", name: "日本語", bcp47: "ja" },
  ru: { code: "ru", name: "Русский", bcp47: "ru" },
  es: { code: "es", name: "Español", bcp47: "es" },
  pt: { code: "pt", name: "Português", bcp47: "pt" },
  fr: { code: "fr", name: "Français", bcp47: "fr" },
  de: { code: "de", name: "Deutsch", bcp47: "de" },
};

export const DEFAULT_STORE: StoreCode = "gg";
export const DEFAULT_LOCALE: LocaleCode = "zh_Hans";

const VALID_STORES: ReadonlySet<string> = new Set<StoreCode>(["gg", "jdk"]);
const VALID_LOCALES: ReadonlySet<string> = new Set<LocaleCode>([
  "zh_Hans",
  "zh_Hant",
  "en",
  "ja",
  "ru",
  "es",
  "pt",
  "fr",
  "de",
]);

/** Type guard: checks if a string is a valid StoreCode */
export function isValidStore(code: string): code is StoreCode {
  return VALID_STORES.has(code);
}

/** Type guard: checks if a string is a valid LocaleCode */
export function isValidLocale(code: string): code is LocaleCode {
  return VALID_LOCALES.has(code);
}

/**
 * Parse a URL path segment in the format `{store}-{locale}`.
 *
 * The store part comes first, followed by `-`, then the locale (which may
 * itself contain `_`). This means we split on the FIRST `-` only.
 *
 * Examples:
 *   'gg-zh_Hans' → { store: 'gg', locale: 'zh_Hans' }
 *   'jdk-en'     → { store: 'jdk', locale: 'en' }
 *   'invalid'     → null
 */
export function parseStoreLocalePrefix(
  segment: string,
): StoreLocaleContext | null {
  if (!segment) return null;

  const dashIdx = segment.indexOf("-");
  if (dashIdx === -1) return null;

  const store = segment.slice(0, dashIdx);
  const locale = segment.slice(dashIdx + 1);

  if (!isValidStore(store)) return null;
  if (!isValidLocale(locale)) return null;

  return { store, locale };
}

/**
 * Build a URL path segment from a store and locale.
 *
 * Example:
 *   buildStoreLocalePrefix('gg', 'zh_Hans') → 'gg-zh_Hans'
 */
export function buildStoreLocalePrefix(
  store: StoreCode,
  locale: LocaleCode,
): string {
  return `${store}-${locale}`;
}

const ACCEPT_LANGUAGE_MAP: Record<string, LocaleCode> = {
  "zh-hant": "zh_Hant",
  "zh-tw": "zh_Hant",
  "zh-hk": "zh_Hant",
  "zh-mo": "zh_Hant",
  "zh-hans": "zh_Hans",
  "zh-cn": "zh_Hans",
  "zh-sg": "zh_Hans",
  ja: "ja",
  en: "en",
  ru: "ru",
  es: "es",
  pt: "pt",
  fr: "fr",
  de: "de",
};

/**
 * Resolve the best LocaleCode from an HTTP Accept-Language header value.
 *
 * Parses the quality-value weighted list, matches against supported locales,
 * and falls back to DEFAULT_LOCALE when nothing matches.
 *
 * Examples:
 *   'ja,en;q=0.9'                    → 'ja'
 *   'zh-TW,zh;q=0.9'                 → 'zh_Hant'
 *   'zh-CN,zh;q=0.9,en;q=0.8'       → 'zh_Hans'
 *   ''                               → 'zh_Hans'
 */
export function resolveLocaleFromAcceptLanguage(header: string): LocaleCode {
  if (!header) return DEFAULT_LOCALE;

  const tags = header
    .split(",")
    .map((part) => (part.split(";")[0] ?? "").trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag !== "*");

  for (const tag of tags) {
    if (ACCEPT_LANGUAGE_MAP[tag]) return ACCEPT_LANGUAGE_MAP[tag];

    const primary = tag.split("-")[0];
    if (primary && ACCEPT_LANGUAGE_MAP[primary]) {
      return ACCEPT_LANGUAGE_MAP[primary];
    }
  }

  return DEFAULT_LOCALE;
}
