import type { ReactNode } from "react";
import { createContext, createElement, useContext, useState } from "react";
import { DEFAULT_STORE, STORES, type StoreCode } from "@/shared/store-locale";

interface StoreContextValue {
  storeCode: StoreCode;
  storeName: string;
  setStore: (store: StoreCode) => void;
}

export const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  storeCode: initialStoreCode,
  children,
}: {
  storeCode?: StoreCode;
  children: ReactNode;
}) {
  const [storeCode, setStore] = useState<StoreCode>(
    initialStoreCode ?? DEFAULT_STORE,
  );

  return createElement(
    StoreContext.Provider,
    { value: { storeCode, storeName: STORES[storeCode].name, setStore } },
    children,
  );
}

export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx)
    throw new Error("useStoreContext must be used within StoreProvider");
  return ctx;
}
