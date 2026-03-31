import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
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

export default function useSeatTimer({
  code,
  userId,
  role = "user",
  enabled = true,
}: UseSeatTimerOptions) {
  const stateAtom = useMemo(() => getStateAtom(code), [code]);
  const [state, setState] = useAtom(stateAtom);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<ReconnectingWebSocket | null>(null);
  const localStepRef = useRef(state?.step ?? 0);
  const setStateRef = useRef(setState);
  setStateRef.current = setState;
  const pongListenerRef = useRef<PongListener | null>(null);

  useEffect(() => {
    if (!enabled || !code) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const params = new URLSearchParams({ role });
    if (userId) params.set("userId", userId);
    const url = `${protocol}//${location.host}/ws/seat/${code}?${params.toString()}`;

    const ws = new ReconnectingWebSocket(url, [], {
      connectionTimeout: 4000,
      maxRetries: Infinity,
      maxReconnectionDelay: 30000,
      minReconnectionDelay: 1000,
    });
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setConnected(true);
    });

    ws.addEventListener("close", () => {
      setConnected(false);
    });

    ws.addEventListener("message", (event: MessageEvent) => {
      if (event.data === "pong") return;
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
    });

    return () => {
      ws.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [enabled, code, userId, role]);

  const requestSync = useCallback(() => {
    if (wsRef.current?.readyState === ReconnectingWebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "sync" }));
    }
  }, []);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === ReconnectingWebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const onPongMessage = useCallback((listener: PongListener) => {
    pongListenerRef.current = listener;
  }, []);

  return { state, connected, requestSync, sendMessage, onPongMessage };
}
