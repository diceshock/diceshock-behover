import { useCallback, useState } from "react";
import type { StoreCode } from "@/shared/store-locale";

const STORAGE_KEY = "admin_store_filter";

export type AdminStoreFilter = StoreCode | null;

function readFromStorage(): AdminStoreFilter {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "gg" || stored === "jdk") return stored;
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }
  return null;
}

function writeToStorage(value: AdminStoreFilter): void {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // localStorage unavailable
  }
}

/**
 * Hook for the admin store filter dropdown.
 * Reads/writes the `admin_store_filter` localStorage key.
 * Returns `null` for "all stores", or a StoreCode for a specific store.
 */
export function useAdminStoreFilter() {
  const [storeFilter, setStoreFilterState] =
    useState<AdminStoreFilter>(readFromStorage);

  const setStoreFilter = useCallback((value: AdminStoreFilter) => {
    setStoreFilterState(value);
    writeToStorage(value);
  }, []);

  return { storeFilter, setStoreFilter } as const;
}
