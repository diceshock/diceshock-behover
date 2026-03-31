import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SocketState } from "@/server/durableObjects/SocketDO";
import type { Seat } from "@/shared/mahjong/constants";
import type {
  MatchConfig,
  MatchPhase,
  RoundResult,
} from "@/shared/mahjong/types";

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

  const setReady = useCallback(
    (ready: boolean) =>
      dispatch("mahjong_ready", { action: "mahjong_ready", ready }),
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

  const submitScore = useCallback(
    (points: number) =>
      dispatch("mahjong_submit_score", {
        action: "mahjong_submit_score",
        points,
      }),
    [dispatch],
  );

  const confirmScores = useCallback(
    () =>
      dispatch("mahjong_confirm_scores", { action: "mahjong_confirm_scores" }),
    [dispatch],
  );

  const endRound = useCallback(
    (result: RoundResult) =>
      dispatch("mahjong_end_round", { action: "mahjong_end_round", result }),
    [dispatch],
  );

  const initiateVote = useCallback(
    () =>
      dispatch("mahjong_initiate_vote", { action: "mahjong_initiate_vote" }),
    [dispatch],
  );

  const castVote = useCallback(
    (vote: boolean) =>
      dispatch("mahjong_cast_vote", { action: "mahjong_cast_vote", vote }),
    [dispatch],
  );

  const resolveVote = useCallback(
    () => dispatch("mahjong_resolve_vote", { action: "mahjong_resolve_vote" }),
    [dispatch],
  );

  const reset = useCallback(
    () => dispatch("mahjong_reset", { action: "mahjong_reset" }),
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
      setReady,
      start,
      beginScoring,
      submitScore,
      confirmScores,
      endRound,
      initiateVote,
      castVote,
      resolveVote,
      reset,
    },
  };
}
