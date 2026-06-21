import type { LocaleCode } from "../store-locale";
import { getAllTranslations } from ".";
import type { TranslationDict } from "./types";

export async function loadLocale(locale: LocaleCode): Promise<TranslationDict> {
  if (locale === "zh_Hans") return getAllTranslations(locale);

  const module = await import(`./locales/${locale}.json`);
  return module.default as TranslationDict;
}
