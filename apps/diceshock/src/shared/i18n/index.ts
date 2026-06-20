import type { LocaleCode } from "../store-locale";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zhHans from "./locales/zh_Hans.json";
import zhHant from "./locales/zh_Hant.json";
import type { TranslationDict, TranslationKey } from "./types";

export type {
  TranslationDict,
  TranslationKey,
  TranslationValue,
} from "./types";

const TRANSLATIONS: Record<LocaleCode, TranslationDict> = {
  zh_Hans: zhHans,
  zh_Hant: zhHant,
  en,
  ja,
  ru,
  es,
  pt,
  fr,
  de,
};

const BASE_LOCALE: LocaleCode = "zh_Hans";

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
  const translation = resolvePath(TRANSLATIONS[locale], key);
  if (translation !== undefined) return translation;

  const fallback = resolvePath(TRANSLATIONS[BASE_LOCALE], key);
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
  return TRANSLATIONS[locale];
}

export function getMissingKeys(locale: LocaleCode): string[] {
  if (locale === BASE_LOCALE) return [];

  return collectKeys(TRANSLATIONS[BASE_LOCALE]).filter(
    (key) => resolvePath(TRANSLATIONS[locale], key) === undefined,
  );
}

export const SUPPORTED_LOCALES = Object.keys(TRANSLATIONS) as LocaleCode[];

export {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
} from "./formatters";
