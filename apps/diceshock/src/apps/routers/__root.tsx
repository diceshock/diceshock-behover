import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuthRegister } from "@/client/hooks/useAuth";
import { useCrossDataRegister } from "@/client/hooks/useCrossData";

export const Route = createRootRoute({
  component: _Home,
});

function _Home() {
  useCrossDataRegister();
  useAuthRegister();

  return <Outlet />;
}
