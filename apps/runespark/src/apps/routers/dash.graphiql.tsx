import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { GraphiQlScreen } from "@/client/components/GraphiQL";

export const Route = createFileRoute("/dash/graphiql")({
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
