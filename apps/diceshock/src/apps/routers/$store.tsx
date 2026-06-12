import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DEFAULT_STORE, isValidStore } from "@/shared/store";

export const Route = createFileRoute("/$store")({
  beforeLoad: ({ params }) => {
    if (!isValidStore(params.store)) {
      throw redirect({ to: "/$store", params: { store: DEFAULT_STORE } });
    }
  },
  component: StoreLayout,
});

function StoreLayout() {
  return <Outlet />;
}
