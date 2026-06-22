import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";
import { GraphQLProvider } from "@/client/graphql/provider";
import { useAuthRegister } from "@/client/hooks/useAuth";
import { useCrossDataRegister } from "@/client/hooks/useCrossData";
import { useI18nDataRegister } from "@/client/hooks/useI18nData";
import { MessagesContainer } from "@/client/hooks/useMessages";
import { StoreProvider, useStoreContext } from "@/client/hooks/useStoreContext";
import { I18nProvider } from "@/client/providers/I18nProvider";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useI18nDataRegister();
  useCrossDataRegister();
  useAuthRegister();

  return (
    <GraphQLProvider>
      <StoreProvider>
        <I18nProvider>
          <Outlet />
          <Scripts />
          <MessagesContainer />
        </I18nProvider>
      </StoreProvider>
    </GraphQLProvider>
  );
}
