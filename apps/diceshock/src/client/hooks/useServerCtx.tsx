import React, { createContext, useContext } from "react";

import { HonoCtxEnv } from "@/shared/types";
import { Context } from "hono";

const ServerContext = createContext<Context<HonoCtxEnv> | null>(null);

export const ServerCtxProvider: React.FC<{
    c: Context<HonoCtxEnv>;
    children: React.ReactNode;
}> = ({ c, children }) => {
    return (
        <ServerContext.Provider value={c}>{children}</ServerContext.Provider>
    );
};

export default function useServerCtx() {
    return useContext(ServerContext);
}
