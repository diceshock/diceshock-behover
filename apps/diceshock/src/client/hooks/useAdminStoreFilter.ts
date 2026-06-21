import { useCallback, useState } from "react";
import { DEFAULT_STORE, type StoreCode } from "@/shared/store-locale";

const STORAGE_KEY = "admin_store_filter";

function readFromStorage(): StoreCode {
  if (typeof window === "undefined") return DEFAULT_STORE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "gg" || stored === "jdk") return stored;
  } catch {}
  return DEFAULT_STORE;
}

function writeToStorage(value: StoreCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
}

export function useAdminStoreFilter() {
  const [storeFilter, setStoreFilterState] =
    useState<StoreCode>(readFromStorage);

  const setStoreFilter = useCallback((value: StoreCode) => {
    setStoreFilterState(value);
    writeToStorage(value);
  }, []);

  return { storeFilter, setStoreFilter } as const;
}
