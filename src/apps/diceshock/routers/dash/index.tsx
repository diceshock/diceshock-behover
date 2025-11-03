import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dash/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <main></main>
    </>
  );
}
