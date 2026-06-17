import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";
import { useAuthRegister } from "@/client/hooks/useAuth";
import { useCrossDataRegister } from "@/client/hooks/useCrossData";
import { MessagesContainer } from "@/client/hooks/useMessages";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useCrossDataRegister();
  useAuthRegister();

  return (
    <>
      <Outlet />
      <Scripts />
      <MessagesContainer />
    </>
  );
}
