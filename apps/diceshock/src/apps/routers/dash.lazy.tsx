import {
  ClientOnly,
  createLazyFileRoute,
  Outlet,
} from "@tanstack/react-router";
import DashNavDrawer from "@/client/components/diceshock/DashNavMenu";

export const Route = createLazyFileRoute("/dash")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ClientOnly>
      <DashNavDrawer>
        <Outlet />
      </DashNavDrawer>
    </ClientOnly>
  );
}
