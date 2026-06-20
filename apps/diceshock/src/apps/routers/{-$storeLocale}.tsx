import { createFileRoute, Outlet } from "@tanstack/react-router";
import useCrossData from "@/client/hooks/useCrossData";
import { StoreProvider } from "@/client/hooks/useStoreContext";
import { I18nProvider } from "@/client/providers/I18nProvider";
import {
  DEFAULT_LOCALE,
  DEFAULT_STORE,
  isValidLocale,
  isValidStore,
  parseStoreLocalePrefix,
} from "@/shared/store-locale";

export const Route = createFileRoute("/{-$storeLocale}")({
  component: StoreLocaleLayout,
});

function StoreLocaleLayout() {
  const { storeLocale } = Route.useParams();
  const crossData = useCrossData();
  const parsedStoreLocale = storeLocale
    ? parseStoreLocalePrefix(storeLocale)
    : null;

  const storeCode =
    parsedStoreLocale?.store ??
    (crossData?.StoreCode && isValidStore(crossData.StoreCode)
      ? crossData.StoreCode
      : DEFAULT_STORE);
  const locale =
    parsedStoreLocale?.locale ??
    (crossData?.LocaleCode && isValidLocale(crossData.LocaleCode)
      ? crossData.LocaleCode
      : DEFAULT_LOCALE);

  return (
    <StoreProvider storeCode={storeCode}>
      <I18nProvider locale={locale}>
        <Outlet />
      </I18nProvider>
    </StoreProvider>
  );
}
