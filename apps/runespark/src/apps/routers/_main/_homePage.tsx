import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/_homePage")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_main/_homePage"!</div>;
}
