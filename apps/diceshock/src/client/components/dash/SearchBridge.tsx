import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import { pendingSearchAtom } from "./chatAtoms";

export function usePendingSearch() {
  const [pendingSearch, setPendingSearch] = useAtom(pendingSearchAtom);

  const clearPendingSearch = useCallback(() => {
    setPendingSearch(null);
  }, [setPendingSearch]);

  return { pendingSearch, setPendingSearch, clearPendingSearch };
}

export { useSetAtom } from "jotai";
export { pendingSearchAtom };
