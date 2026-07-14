import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";
import { GraphQLProvider } from "@/client/graphql/provider";
import { useAuthRegister } from "@/client/hooks/useAuth";
import { useCrossDataRegister } from "@/client/hooks/useCrossData";
import { useI18nDataRegister } from "@/client/hooks/useI18nData";
import { MessagesContainer } from "@/client/hooks/useMessages";
import usePreferenceInit from "@/client/hooks/usePreferenceInit";
import { StoreProvider } from "@/client/hooks/useStoreContext";
import { I18nProvider } from "@/client/providers/I18nProvider";
import { NavigationProgress } from "@/client/components/NavigationProgress";

export const Route = createRootRoute({
  component: RootComponent,
});

function PreferenceInitializer() {
  usePreferenceInit();
  return null;
}

function RootComponent() {
  useI18nDataRegister();
  useCrossDataRegister();
  useAuthRegister();
  return (
    <>
      <NavigationProgress />
      <GraphQLProvider>
        <StoreProvider>
          <I18nProvider>
            <PreferenceInitializer />
            <Outlet />
            <Scripts />
            <MessagesContainer />
          </I18nProvider>
        </StoreProvider>
      </GraphQLProvider>
    </>
  );
}
