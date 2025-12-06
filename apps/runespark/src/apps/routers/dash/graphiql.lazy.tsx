import { ClientOnly, createLazyFileRoute } from "@tanstack/react-router";
import { GraphiQlScreen } from "@/client/components/GraphiQL";

export const Route = createLazyFileRoute("/dash/graphiql")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen w-full">
      <ClientOnly>
        <GraphiQlScreen />
      </ClientOnly>
    </div>
  );
}
