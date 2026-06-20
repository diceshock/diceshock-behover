import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { formatMessage, getTranslation } from "@/shared/i18n";
import { DEFAULT_LOCALE, type LocaleCode } from "@/shared/store-locale";

interface I18nContextValue {
  locale: LocaleCode;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: LocaleCode) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale?: LocaleCode;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<LocaleCode>(
    initialLocale ?? DEFAULT_LOCALE,
  );

  const t = (key: string, vars?: Record<string, string | number>) => {
    const translation = getTranslation(locale, key);
    return vars ? formatMessage(translation, vars) : translation;
  };

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18nContext must be used within I18nProvider");
  return ctx;
}
