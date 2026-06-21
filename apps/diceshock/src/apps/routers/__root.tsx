import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";
import { useAuthRegister } from "@/client/hooks/useAuth";
import { useCrossDataRegister } from "@/client/hooks/useCrossData";
import { MessagesContainer } from "@/client/hooks/useMessages";
import { StoreProvider, useStoreContext } from "@/client/hooks/useStoreContext";
import { I18nProvider } from "@/client/providers/I18nProvider";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useCrossDataRegister();
  useAuthRegister();

  return (
    <StoreProvider>
      <I18nProvider>
        <Outlet />
        <Scripts />
        <MessagesContainer />
      </I18nProvider>
    </StoreProvider>
  );
}
