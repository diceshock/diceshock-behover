import { createFileRoute } from "@tanstack/react-router";
import GameList from "@/client/components/diceshock/GameList";

export const Route = createFileRoute("/_with-home-lo/inventory")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="max-w-full min-h-screen overflow-x-clip py-14 px-4">
      <GameList className={{ filter: "top-24" }} />
    </main>
  );
}
