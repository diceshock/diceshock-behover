import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DEFAULT_STORE, isValidStore } from "@/shared/store";

export const Route = createFileRoute("/dash/$store")({
  beforeLoad: ({ params }) => {
    if (!isValidStore(params.store)) {
      throw redirect({
        to: "/dash/$store",
        params: { store: DEFAULT_STORE },
      });
    }
  },
  component: DashStoreLayout,
});

function DashStoreLayout() {
  return <Outlet />;
}
