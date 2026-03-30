import { useCallback, useMemo } from "react";
import type { SocketState } from "@/server/durableObjects/SocketDO";
import type { Seat } from "@/shared/mahjong/constants";
import type { MatchConfig, RoundResult } from "@/shared/mahjong/types";

interface UseMahjongMatchOptions {
  wsState: SocketState | null;
  sendMessage: (msg: Record<string, unknown>) => void;
  userId: string;
}

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

  const setConfig = useCallback(
    (config: MatchConfig) =>
      sendMessage({ action: "mahjong_set_config", config }),
    [sendMessage],
  );

  const startSeatSelect = useCallback(
    () => sendMessage({ action: "mahjong_start_seat_select" }),
    [sendMessage],
  );

  const backToConfig = useCallback(
    () => sendMessage({ action: "mahjong_back_to_config" }),
    [sendMessage],
  );

  const join = useCallback(
    (nickname: string, phone: string | null, registered: boolean) =>
      sendMessage({ action: "mahjong_join", nickname, phone, registered }),
    [sendMessage],
  );

  const selectSeat = useCallback(
    (seat: Seat) => sendMessage({ action: "mahjong_select_seat", seat }),
    [sendMessage],
  );

  const setReady = useCallback(
    (ready: boolean) => sendMessage({ action: "mahjong_ready", ready }),
    [sendMessage],
  );

  const start = useCallback(
    () => sendMessage({ action: "mahjong_start" }),
    [sendMessage],
  );

  const beginScoring = useCallback(
    () => sendMessage({ action: "mahjong_begin_scoring" }),
    [sendMessage],
  );

  const submitScore = useCallback(
    (points: number) => sendMessage({ action: "mahjong_submit_score", points }),
    [sendMessage],
  );

  const confirmScores = useCallback(
    () => sendMessage({ action: "mahjong_confirm_scores" }),
    [sendMessage],
  );

  const endRound = useCallback(
    (result: RoundResult) =>
      sendMessage({ action: "mahjong_end_round", result }),
    [sendMessage],
  );

  const initiateVote = useCallback(
    () => sendMessage({ action: "mahjong_initiate_vote" }),
    [sendMessage],
  );

  const castVote = useCallback(
    (vote: boolean) => sendMessage({ action: "mahjong_cast_vote", vote }),
    [sendMessage],
  );

  const resolveVote = useCallback(
    () => sendMessage({ action: "mahjong_resolve_vote" }),
    [sendMessage],
  );

  const reset = useCallback(
    () => sendMessage({ action: "mahjong_reset" }),
    [sendMessage],
  );

  return {
    state: mahjong,
    myPlayer,
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
