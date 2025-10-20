import Footer from "@/client/components/diceshock/Footer";
import Msg from "@/client/components/diceshock/Msg";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$site_name}/_with-footer")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <>
            <>
                <Outlet />

                <Footer />

                <Msg />
            </>
        </>
    );
}
