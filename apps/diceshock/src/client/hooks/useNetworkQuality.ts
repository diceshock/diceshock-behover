import { useCallback, useEffect, useRef, useState } from "react";

interface PingRecord {
  sentAt: number;
  rtt: number | null;
}

export type SignalLevel = 0 | 1 | 2 | 3 | 4;

interface NetworkQuality {
  signalLevel: SignalLevel;
  avgRtt: number;
  packetLoss: number;
  connected: boolean;
}

interface UseNetworkQualityOptions {
  sendMessage: (msg: Record<string, unknown>) => void;
  connected: boolean;
  onPongMessage?: (callback: (ts: number, serverTime: number) => void) => void;
}

const PING_INTERVAL = 5000;
const PING_TIMEOUT = 3000;
const WINDOW_SIZE = 10;

function computeSignalLevel(
  connected: boolean,
  avgRtt: number,
  packetLoss: number,
): SignalLevel {
  if (!connected) return 0;
  if (packetLoss === 0 && avgRtt < 200) return 4;
  if (packetLoss < 0.2 && avgRtt < 500) return 3;
  if (packetLoss < 0.5 && avgRtt < 1000) return 2;
  return 1;
}

export default function useNetworkQuality({
  sendMessage,
  connected,
  onPongMessage,
}: UseNetworkQualityOptions): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>({
    signalLevel: connected ? 4 : 0,
    avgRtt: 0,
    packetLoss: 0,
    connected,
  });

  const windowRef = useRef<PingRecord[]>([]);
  const pendingRef = useRef<Map<number, number>>(new Map());
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const recalculate = useCallback(() => {
    const records = windowRef.current;
    if (records.length === 0) {
      setQuality({
        signalLevel: connected ? 4 : 0,
        avgRtt: 0,
        packetLoss: 0,
        connected,
      });
      return;
    }

    const received = records.filter((r) => r.rtt !== null);
    const avgRtt =
      received.length > 0
        ? received.reduce((sum, r) => sum + r.rtt!, 0) / received.length
        : 0;
    const packetLoss = (records.length - received.length) / records.length;
    const signalLevel = computeSignalLevel(connected, avgRtt, packetLoss);

    setQuality({ signalLevel, avgRtt, packetLoss, connected });
  }, [connected]);

  const handlePong = useCallback(
    (ts: number, _serverTime: number) => {
      const sentAt = pendingRef.current.get(ts);
      if (sentAt == null) return;
      pendingRef.current.delete(ts);

      const rtt = Date.now() - sentAt;
      windowRef.current.push({ sentAt, rtt });
      if (windowRef.current.length > WINDOW_SIZE) {
        windowRef.current.shift();
      }
      recalculate();
    },
    [recalculate],
  );

  useEffect(() => {
    if (onPongMessage) {
      onPongMessage(handlePong);
    }
  }, [onPongMessage, handlePong]);

  useEffect(() => {
    if (!connected) {
      setQuality((prev) => ({ ...prev, signalLevel: 0, connected: false }));
      return;
    }

    const pingInterval = setInterval(() => {
      const ts = Date.now();
      pendingRef.current.set(ts, ts);
      sendMessageRef.current({ action: "app_ping", ts });

      setTimeout(() => {
        if (pendingRef.current.has(ts)) {
          pendingRef.current.delete(ts);
          windowRef.current.push({ sentAt: ts, rtt: null });
          if (windowRef.current.length > WINDOW_SIZE) {
            windowRef.current.shift();
          }
          recalculate();
        }
      }, PING_TIMEOUT);
    }, PING_INTERVAL);

    return () => clearInterval(pingInterval);
  }, [connected, recalculate]);

  return quality;
}
