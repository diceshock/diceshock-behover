import type { Context } from "hono";
import type React from "react";
import { createContext, useContext } from "react";
import type { HonoCtxEnv } from "@/shared/types";

const ServerContext = createContext<Context<HonoCtxEnv> | null>(null);

export const ServerCtxProvider: React.FC<{
  c: Context<HonoCtxEnv>;
  children: React.ReactNode;
}> = ({ c, children }) => {
  return <ServerContext.Provider value={c}>{children}</ServerContext.Provider>;
};

export default function useServerCtx() {
  return useContext(ServerContext);
}
