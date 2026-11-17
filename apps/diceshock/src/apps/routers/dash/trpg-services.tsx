import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/dash/trpg-services")({
  beforeLoad: () => {
    throw redirect({ to: "/dash/trpg-rewards" });
  },
});
