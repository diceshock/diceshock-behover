import Agents from "@/client/components/diceshock/Agents";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_with-home-lo/diceshock-agents")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <>
            <Agents className="mt-[10rem]" />

            <div className="w-full h-[20rem]" />
        </>
    );
}
