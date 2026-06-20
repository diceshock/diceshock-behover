import { useI18nContext } from "../providers/I18nProvider";

export function useTranslation() {
  const { locale, t, setLocale } = useI18nContext();
  return { t, locale, setLocale };
}
