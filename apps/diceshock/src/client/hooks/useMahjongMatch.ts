import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SocketState } from "@/server/durableObjects/SocketDO";
import type { Seat } from "@/shared/mahjong/constants";
import type { MatchConfig, MatchPhase } from "@/shared/mahjong/types";

interface PendingAction {
  action: string;
  sentAt: number;
  retryCount: number;
  payload: Record<string, unknown>;
}

interface UseMahjongMatchOptions {
  wsState: SocketState | null;
  sendMessage: (msg: Record<string, unknown>) => void;
  userId: string;
}

const RETRY_TIMEOUT = 3000;
const MAX_RETRIES = 3;

export default function useMahjongMatch({
  wsState,
  sendMessage,
  userId,
}: UseMahjongMatchOptions) {
  const mahjong = wsState?.mahjong ?? null;

  const myPlayer = useMemo(
    () => mahjong?.players.find((p) => p.userId === userId) ?? null,
    [mahjong, userId],
  );

  const [pendingActions, setPendingActions] = useState<
    Map<string, PendingAction>
  >(() => new Map());
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  const prevPhaseRef = useRef<MatchPhase | null>(mahjong?.phase ?? null);
  const prevStepRef = useRef(wsState?.step ?? 0);

  useEffect(() => {
    const currentPhase = mahjong?.phase ?? null;
    const currentStep = wsState?.step ?? 0;

    if (
      currentStep > prevStepRef.current ||
      currentPhase !== prevPhaseRef.current
    ) {
      setPendingActions((prev) => {
        if (prev.size === 0) return prev;
        return new Map();
      });
    }

    prevPhaseRef.current = currentPhase;
    prevStepRef.current = currentStep;
  }, [mahjong?.phase, wsState?.step]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPendingActions((prev) => {
        if (prev.size === 0) return prev;
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);

        for (const [key, pending] of next) {
          if (
            now - pending.sentAt > RETRY_TIMEOUT &&
            pending.retryCount < MAX_RETRIES
          ) {
            sendMessageRef.current(pending.payload);
            next.set(key, {
              ...pending,
              sentAt: now,
              retryCount: pending.retryCount + 1,
            });
            changed = true;
          } else if (pending.retryCount >= MAX_RETRIES) {
            next.delete(key);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, RETRY_TIMEOUT);

    return () => clearInterval(interval);
  }, []);

  const dispatch = useCallback(
    (actionType: string, payload: Record<string, unknown>) => {
      sendMessageRef.current(payload);
      setPendingActions((prev) => {
        const next = new Map(prev);
        next.set(actionType, {
          action: actionType,
          sentAt: Date.now(),
          retryCount: 0,
          payload,
        });
        return next;
      });
    },
    [],
  );

  const isPending = useCallback(
    (actionType: string): boolean => pendingActions.has(actionType),
    [pendingActions],
  );

  const setConfig = useCallback(
    (config: MatchConfig) =>
      dispatch("mahjong_set_config", { action: "mahjong_set_config", config }),
    [dispatch],
  );

  const startSeatSelect = useCallback(
    () =>
      dispatch("mahjong_start_seat_select", {
        action: "mahjong_start_seat_select",
      }),
    [dispatch],
  );

  const backToConfig = useCallback(
    () =>
      dispatch("mahjong_back_to_config", { action: "mahjong_back_to_config" }),
    [dispatch],
  );

  const join = useCallback(
    (nickname: string, phone: string | null, registered: boolean) =>
      dispatch("mahjong_join", {
        action: "mahjong_join",
        nickname,
        phone,
        registered,
      }),
    [dispatch],
  );

  const selectSeat = useCallback(
    (seat: Seat) =>
      dispatch("mahjong_select_seat", { action: "mahjong_select_seat", seat }),
    [dispatch],
  );

  const start = useCallback(
    () => dispatch("mahjong_start", { action: "mahjong_start" }),
    [dispatch],
  );

  const beginScoring = useCallback(
    () =>
      dispatch("mahjong_begin_scoring", { action: "mahjong_begin_scoring" }),
    [dispatch],
  );

  const cancelScoring = useCallback(
    () =>
      dispatch("mahjong_cancel_scoring", { action: "mahjong_cancel_scoring" }),
    [dispatch],
  );

  const submitScore = useCallback(
    (targetUserId: string, points: number) =>
      dispatch("mahjong_submit_score", {
        action: "mahjong_submit_score",
        targetUserId,
        points,
      }),
    [dispatch],
  );

  const confirmScore = useCallback(
    () =>
      dispatch("mahjong_confirm_score", { action: "mahjong_confirm_score" }),
    [dispatch],
  );

  const cancelConfirm = useCallback(
    () =>
      dispatch("mahjong_cancel_confirm", { action: "mahjong_cancel_confirm" }),
    [dispatch],
  );

  const reset = useCallback(
    (mode: "keep_config" | "to_config") =>
      dispatch("mahjong_reset", { action: "mahjong_reset", mode }),
    [dispatch],
  );

  return {
    state: mahjong,
    myPlayer,
    isPending,
    actions: {
      setConfig,
      startSeatSelect,
      backToConfig,
      join,
      selectSeat,
      start,
      beginScoring,
      cancelScoring,
      submitScore,
      confirmScore,
      cancelConfirm,
      reset,
    },
  };
}
