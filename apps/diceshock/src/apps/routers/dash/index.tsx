import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_STORE } from "@/shared/store";

export const Route = createFileRoute("/dash/")({
  beforeLoad: () => {
    throw redirect({
      to: "/dash/$store",
      params: { store: DEFAULT_STORE },
    });
  },
  component: () => null,
});
