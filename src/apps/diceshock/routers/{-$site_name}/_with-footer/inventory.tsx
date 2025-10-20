import GameList from "@/client/components/diceshock/GameList";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$site_name}/_with-footer/inventory")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <main className="max-w-full min-h-screen overflow-x-clip py-14 px-4">
            <GameList className={{ filter: "top-24" }} />
        </main>
    );
}
