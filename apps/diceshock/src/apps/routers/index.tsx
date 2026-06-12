import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_STORE } from "@/shared/store";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/$store", params: { store: DEFAULT_STORE } });
  },
  component: () => null,
});
