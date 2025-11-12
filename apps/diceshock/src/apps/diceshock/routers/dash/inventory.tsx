import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dash/inventory")({
  component: RouteComponent,
});

function RouteComponent() {
  return <main className=""></main>;
}
