import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export default function useSeatTimer({
  code,
  userId,
  role = "user",
  enabled = true,
}: UseSeatTimerOptions) {
  const stateAtom = useMemo(() => getStateAtom(code), [code]);
  const [state, setState] = useAtom(stateAtom);
  const [connected, setConnected] = useState(false);
  const localStepRef = useRef(state?.step ?? 0);
  const setStateRef = useRef(setState);
  setStateRef.current = setState;
  const pongListenerRef = useRef<PongListener | null>(null);

  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY);

  const getActionUrl = useCallback(() => {
    const params = new URLSearchParams({ role });
    if (userId) params.set("userId", userId);
    params.set("sessionId", sessionIdRef.current);
    return `/action/seat/${code}?${params.toString()}`;
  }, [code, userId, role]);

  useEffect(() => {
    if (!enabled || !code) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setConnected(false);
      return;
    }

    function connect() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const params = new URLSearchParams({ role });
      if (userId) params.set("userId", userId);
      params.set("sessionId", sessionIdRef.current);
      const url = `/sse/seat/${code}?${params.toString()}`;

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        reconnectDelayRef.current = RECONNECT_DELAY;
      };

      es.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            data?: SocketState;
            ts?: number;
            serverTime?: number;
          };

          if (msg.type === "state" && msg.data) {
            if (msg.data.step >= localStepRef.current) {
              localStepRef.current = msg.data.step;
              setStateRef.current(msg.data);
            }
          } else if (
            msg.type === "app_pong" &&
            msg.ts != null &&
            msg.serverTime != null
          ) {
            pongListenerRef.current?.(msg.ts, msg.serverTime);
          }
        } catch {
          // noop
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        eventSourceRef.current = null;

        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setConnected(false);
    };
  }, [enabled, code, userId, role]);

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
