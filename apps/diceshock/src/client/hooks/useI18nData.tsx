/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: i18n data injection */

import type React from "react";
import {
  getAllTranslations,
  setTranslations,
  type TranslationDict,
} from "@/shared/i18n";
import type { LocaleCode } from "@/shared/store-locale";

const INJECTION_KEY = "__I18N_DATA__";

/**
 * Server-only component that serializes the current locale's translations
 * into a <script> tag. The client reads this before hydration.
 *
 * Placed OUTSIDE the React hydration root (<div id="root">) so the extra
 * DOM node never causes a hydration mismatch.
 */
export const I18nScript: React.FC<{ locale: LocaleCode }> = ({ locale }) => {
  const dict = getAllTranslations(locale);
  const payload = JSON.stringify({ locale, dict });

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.${INJECTION_KEY} = ${payload}`,
      }}
    />
  );
};

/**
 * Client-side registration hook. Reads the serialised translation data
 * injected by <I18nScript> and registers it via setTranslations() so that
 * getTranslation() returns the correct locale during hydration.
 *
 * Must be called in a root component (once) before any useTranslation() calls.
 */
export function useI18nDataRegister(): void {
  // In SSR (no window), bail out – the module-level TRANSLATIONS registry
  // is already set up by fileRoute.tsx before rendering.
  if (typeof window === "undefined") return;

  const raw = (globalThis as Record<string, unknown>)[INJECTION_KEY];

  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    raw !== null &&
    "locale" in raw &&
    "dict" in raw
  ) {
    const { locale, dict } = raw as {
      locale: LocaleCode;
      dict: TranslationDict;
    };
    setTranslations(locale, dict);
  }
}
