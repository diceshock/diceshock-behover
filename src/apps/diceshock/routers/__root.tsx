import { useCrossDataRegister } from "@/client/hooks/useCrossData";
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
    component: () => {
        useCrossDataRegister();
        
        return <Outlet />;
    },
});
