import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dash/users")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <main className=""></main>
    </>
  );
}
