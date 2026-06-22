import { useApolloClient } from "@apollo/client";
import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  CreateTempIdentityDocument,
  type CreateTempIdentityMutation,
  type CreateTempIdentityMutationVariables,
  ValidateTempIdentityDocument,
  type ValidateTempIdentityQuery,
  type ValidateTempIdentityQueryVariables,
} from "@/client/graphql/__generated__";
import type { TempIdentityData } from "@/shared/types";

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
  const client = useApolloClient();
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

    client
      .query<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>({
        query: ValidateTempIdentityDocument,
        variables: { tempId: stored.tempId },
      })
      .then((result) => {
        if (result.data.validateTempIdentity.valid) {
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
  }, [initialized, setTempIdentity, setInitialized, client]);

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
    const result = await client.mutate<
      CreateTempIdentityMutation,
      CreateTempIdentityMutationVariables
    >({
      mutation: CreateTempIdentityDocument,
    });
    const created = result.data!.createTempIdentity;
    const data: TempIdentityData = {
      kind: "temp",
      tempId: created.id,
      nickname: created.nickname,
      totpSecret: created.totpSecret,
      expiresAt: created.expiresAt,
    };
    setTempIdentity(data);
    saveToStorage(data);
    return data;
  }, [setTempIdentity, client]);

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
