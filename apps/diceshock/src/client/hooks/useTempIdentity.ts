import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import type { TempIdentityData } from "@/shared/types";
import trpcClientPublic from "@/shared/utils/trpc";

const STORAGE_KEY = "diceshock_temp_identity";

function loadFromStorage(): TempIdentityData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.kind === "temp" &&
      typeof parsed.tempId === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed as TempIdentityData;
    }
  } catch {}
  return null;
}

function saveToStorage(data: TempIdentityData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearTempIdentityStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

const tempIdentityAtom = atom<TempIdentityData | null>(null);
const initializedAtom = atom(false);

export default function useTempIdentity() {
  const [tempIdentity, setTempIdentity] = useAtom(tempIdentityAtom);
  const [initialized, setInitialized] = useAtom(initializedAtom);
  const validatingRef = useRef(false);

  useEffect(() => {
    if (initialized) return;
    const stored = loadFromStorage();
    if (!stored) {
      setInitialized(true);
      return;
    }

    if (Date.now() > stored.expiresAt) {
      clearTempIdentityStorage();
      setInitialized(true);
      return;
    }

    if (validatingRef.current) return;
    validatingRef.current = true;

    trpcClientPublic.tempIdentity.validate
      .query({ tempId: stored.tempId })
      .then((result) => {
        if (result.valid) {
          setTempIdentity(stored);
        } else {
          clearTempIdentityStorage();
        }
      })
      .catch(() => {
        clearTempIdentityStorage();
      })
      .finally(() => {
        validatingRef.current = false;
        setInitialized(true);
      });
  }, [initialized, setTempIdentity, setInitialized]);

  useEffect(() => {
    if (!tempIdentity) return;
    const remaining = tempIdentity.expiresAt - Date.now();
    if (remaining <= 0) {
      setTempIdentity(null);
      clearTempIdentityStorage();
      return;
    }
    const timer = setTimeout(() => {
      setTempIdentity(null);
      clearTempIdentityStorage();
    }, remaining);
    return () => clearTimeout(timer);
  }, [tempIdentity, setTempIdentity]);

  const create = useCallback(async () => {
    const result = await trpcClientPublic.tempIdentity.create.mutate();
    const data: TempIdentityData = {
      kind: "temp",
      tempId: result.id,
      nickname: result.nickname,
      totpSecret: result.totpSecret,
      expiresAt: result.expiresAt,
    };
    setTempIdentity(data);
    saveToStorage(data);
    return data;
  }, [setTempIdentity]);

  const clear = useCallback(() => {
    setTempIdentity(null);
    clearTempIdentityStorage();
  }, [setTempIdentity]);

  return {
    tempIdentity,
    initialized,
    create,
    clear,
    isExpired: tempIdentity ? Date.now() > tempIdentity.expiresAt : false,
  };
}
