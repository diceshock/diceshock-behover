import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type SeatUpdatedSubscription,
  useSeatUpdatedSubscription,
} from "@/client/graphql/__generated__";
import type { SocketState } from "@/server/durableObjects/SocketDO";

const stateAtomCache = new Map<
  string,
  ReturnType<typeof atom<SocketState | null>>
>();

function getStateAtom(code: string) {
  let a = stateAtomCache.get(code);
  if (!a) {
    a = atom<SocketState | null>(null);
    stateAtomCache.set(code, a);
  }
  return a;
}

type PongListener = (ts: number, serverTime: number) => void;

interface UseSeatTimerOptions {
  code: string;
  userId?: string;
  role?: "user" | "dash";
  enabled?: boolean;
}

function mapSubscriptionToState(
  data: SeatUpdatedSubscription | undefined,
): SocketState | null {
  if (!data?.seatUpdated?.table) return null;

  const sub = data.seatUpdated;
  const t = sub.table;

  return {
    table: t
      ? {
          id: t.id,
          name: t.name,
          type: t.type.toLowerCase() as "fixed" | "solo",
          scope: t.scope.toLowerCase() as
            | "trpg"
            | "boardgame"
            | "console"
            | "mahjong",
          status: t.status.toLowerCase() as "active" | "inactive",
          capacity: t.capacity,
          code: t.code,
        }
      : null,
    occupancies: sub.occupancies.map((o) => ({
      id: o.id,
      user_id: o.userId ?? "",
      temp_id: null,
      nickname: o.nickname ?? "Anonymous",
      uid: o.uid ?? null,
      start_at: new Date(o.startAt).getTime(),
    })),
    serverTime: Date.now(),
    mahjong: null,
    step: Date.now(),
  };
}

export default function useSeatTimer({
  code,
  userId,
  role = "user",
  enabled = true,
}: UseSeatTimerOptions) {
  const stateAtom = useMemo(() => getStateAtom(code), [code]);
  const [state, setState] = useAtom(stateAtom);
  const setStateRef = useRef(setState);
  setStateRef.current = setState;
  const pongListenerRef = useRef<PongListener | null>(null);
  const localStepRef = useRef(state?.step ?? 0);

  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const {
    data,
    loading: subLoading,
    error: subError,
  } = useSeatUpdatedSubscription({
    variables: { tableCode: code },
    skip: !enabled || !code,
  });

  useEffect(() => {
    if (!data) return;
    const mapped = mapSubscriptionToState(data);
    if (mapped && mapped.step >= localStepRef.current) {
      localStepRef.current = mapped.step;
      setStateRef.current(mapped);
    }
  }, [data]);

  const connected = !subLoading && !subError && !!data && enabled;

  const getActionUrl = useCallback(() => {
    const params = new URLSearchParams({ role });
    if (userId) params.set("userId", userId);
    params.set("sessionId", sessionIdRef.current);
    return `/action/seat/${code}?${params.toString()}`;
  }, [code, userId, role]);

  const sendMessage = useCallback(
    (msg: Record<string, unknown>) => {
      void fetch(getActionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      }).catch(() => {});
    },
    [getActionUrl],
  );

  const requestSync = useCallback(() => {
    sendMessage({ action: "sync" });
  }, [sendMessage]);

  const onPongMessage = useCallback((listener: PongListener) => {
    pongListenerRef.current = listener;
  }, []);

  return { state, connected, requestSync, sendMessage, onPongMessage };
}
