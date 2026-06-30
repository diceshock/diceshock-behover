import type { LocaleCode } from "../store-locale";
import zhHans from "./locales/zh_Hans.json";
import type { TranslationDict, TranslationKey } from "./types";

export type {
  TranslationDict,
  TranslationKey,
  TranslationValue,
} from "./types";

const BASE_LOCALE: LocaleCode = "zh_Hans";

const TRANSLATIONS: Partial<Record<LocaleCode, TranslationDict>> & {
  zh_Hans: TranslationDict;
} = {
  zh_Hans: zhHans,
};

export const SUPPORTED_LOCALES: LocaleCode[] = [
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

export function setTranslations(
  locale: LocaleCode,
  dict: TranslationDict,
): void {
  TRANSLATIONS[locale] = dict;
}

function resolvePath(dict: TranslationDict, key: string): string | undefined {
  let current: string | TranslationDict | undefined = dict;

  for (const segment of key.split(".")) {
    if (!segment || !current || typeof current === "string") return undefined;
    current = current[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function collectKeys(dict: TranslationDict, prefix = ""): string[] {
  return Object.entries(dict).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : collectKeys(value, path);
  });
}

export function getTranslation(
  locale: LocaleCode,
  key: TranslationKey,
): string {
  const translationDict = TRANSLATIONS[locale];
  const translation = translationDict
    ? resolvePath(translationDict, key)
    : undefined;
  if (translation !== undefined) return translation;

  const fallback = resolvePath(TRANSLATIONS[BASE_LOCALE]!, key);
  if (fallback !== undefined) {
    if (import.meta.env?.DEV) {
      console.warn(
        `[i18n] Translation key "${key}" missing in "${locale}", falling back to "${BASE_LOCALE}"`,
      );
    }
    return fallback;
  }

  if (import.meta.env?.DEV) {
    console.warn(`[i18n] Translation key "${key}" not found in any locale`);
  }
  return key;
}

export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export function getAllTranslations(locale: LocaleCode): TranslationDict {
  return TRANSLATIONS[locale] ?? TRANSLATIONS[BASE_LOCALE]!;
}

export function getMissingKeys(locale: LocaleCode): string[] {
  if (locale === BASE_LOCALE) return [];

  return collectKeys(TRANSLATIONS[BASE_LOCALE]!).filter(
    (key) => resolvePath(getAllTranslations(locale), key) === undefined,
  );
}

export {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
} from "./formatters";
