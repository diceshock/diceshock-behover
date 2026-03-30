import { GameControllerIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/client/components/modal";
import useAuth from "@/client/hooks/useAuth";
import type { Seat, Wind } from "@/shared/mahjong/constants";
import { SEAT_LABELS, WIND_LABELS } from "@/shared/mahjong/constants";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

interface MatchPlayer {
  userId: string;
  nickname: string;
  seat: string;
  finalScore: number;
}

interface RoundHistoryEntry {
  round: number;
  wind: string;
  honba: number;
  dealerUserId: string;
  scores: Record<string, number>;
  result: string;
}

interface Match {
  id: string;
  table_id: string | null;
  mode: "3p" | "4p";
  format: "tonpuu" | "hanchan";
  started_at: string;
  ended_at: string;
  termination_reason: "format_complete" | "bust" | "vote";
  players: MatchPlayer[] | null;
  round_history: RoundHistoryEntry[] | null;
  config: { mode: string; format: string } | null;
  created_at: string | null;
}

const MODE_LABELS: Record<string, string> = { "3p": "三麻", "4p": "四麻" };
const FORMAT_LABELS: Record<string, string> = {
  tonpuu: "东风",
  hanchan: "半庄",
};
const RESULT_LABELS: Record<string, string> = {
  dealer_win: "庄家和了",
  non_dealer_win: "闲家和了",
  draw: "流局",
};
const CHINESE_NUMBERS = ["一", "二", "三", "四"];

function getRank(players: MatchPlayer[], userId: string): number {
  const sorted = [...players].sort((a, b) => b.finalScore - a.finalScore);
  return sorted.findIndex((p) => p.userId === userId) + 1;
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return {
        label: "1st",
        className:
          "badge badge-sm bg-amber-400/20 text-amber-600 border-amber-400/30",
      };
    case 2:
      return {
        label: "2nd",
        className:
          "badge badge-sm bg-gray-300/20 text-gray-500 border-gray-300/30",
      };
    case 3:
      return {
        label: "3rd",
        className:
          "badge badge-sm bg-orange-400/20 text-orange-600 border-orange-400/30",
      };
    default:
      return {
        label: `${rank}th`,
        className:
          "badge badge-sm bg-base-300/50 text-base-content/50 border-base-content/10",
      };
  }
}

function formatRoundLabel(
  wind: string,
  roundNumber: number,
  honba: number,
): string {
  const windLabel = WIND_LABELS[wind as Wind] ?? wind;
  const numLabel = CHINESE_NUMBERS[roundNumber - 1] ?? `${roundNumber}`;
  let label = `${windLabel}${numLabel}局`;
  if (honba > 0) label += ` ${honba}本场`;
  return label;
}

/**
 * In mahjong, "局" (round number within a wind) increments when the dealer changes.
 * When dealer wins or draws, honba increments but 局 stays the same.
 * Since round_history doesn't store the per-wind round number directly,
 * we derive it by tracking dealer changes within consecutive same-wind entries.
 */
function computeWindRoundNumber(
  entries: RoundHistoryEntry[],
  index: number,
): number {
  const entry = entries[index];
  let windRound = 1;
  for (let i = 1; i <= index; i++) {
    if (entries[i].wind !== entry.wind) continue;
    if (
      entries[i - 1].wind === entry.wind &&
      entries[i].dealerUserId !== entries[i - 1].dealerUserId
    ) {
      windRound++;
    }
  }
  return windRound;
}

function MahjongMatchDetailModal({
  match,
  isOpen,
  onClose,
  currentUserId,
}: {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | undefined;
}) {
  if (!match) return null;

  const players = match.players ?? [];
  const roundHistory = match.round_history ?? [];
  const sortedPlayers = [...players].sort(
    (a, b) => b.finalScore - a.finalScore,
  );
  const startingPoints = match.mode === "3p" ? 35000 : 25000;

  return (
    <Modal
      isCloseOnClick
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) onClose();
      }}
    >
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-2xl min-h-48 max-h-[85vh] rounded-xl px-0 pb-4 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
          "border border-base-content/30",
        )}
      >
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle absolute top-3 right-3 sm:top-4 sm:right-4 z-10"
          aria-label="关闭"
        >
          <XIcon className="size-4" weight="bold" />
        </button>

        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 flex-wrap">
            <span className="badge badge-sm badge-outline">
              {MODE_LABELS[match.mode]} {FORMAT_LABELS[match.format]}
            </span>
            <span className="text-xs text-base-content/50">
              {dayjs(match.started_at).format("YYYY/MM/DD HH:mm")}
            </span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-base-content/60 mb-2">
              最终排名
            </h4>
            <div className="flex flex-col gap-1.5">
              {sortedPlayers.map((player, idx) => {
                const rank = idx + 1;
                const badge = getRankBadge(rank);
                const isMe = player.userId === currentUserId;
                return (
                  <div
                    key={player.userId}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                      isMe
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-base-200/50",
                    )}
                  >
                    <span className={badge.className}>{badge.label}</span>
                    <span className="font-medium flex-1 truncate">
                      {player.nickname}
                      {isMe && (
                        <span className="text-xs text-primary ml-1">(我)</span>
                      )}
                    </span>
                    <span className="text-xs text-base-content/50">
                      {SEAT_LABELS[player.seat as Seat] ?? player.seat}
                    </span>
                    <span className="font-mono text-sm tabular-nums">
                      {player.finalScore.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {roundHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-base-content/60 mb-2">
                对局详情
              </h4>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="table table-xs sm:table-sm w-full min-w-[28rem]">
                  <thead>
                    <tr className="text-base-content/50">
                      <th className="text-xs">局</th>
                      {players.map((p) => (
                        <th
                          key={p.userId}
                          className={clsx(
                            "text-xs text-center",
                            p.userId === currentUserId && "text-primary",
                          )}
                        >
                          <span className="truncate max-w-16 inline-block">
                            {p.nickname}
                          </span>
                        </th>
                      ))}
                      <th className="text-xs text-center">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundHistory.map((round, idx) => {
                      const windRound = computeWindRoundNumber(
                        roundHistory,
                        idx,
                      );
                      const prevScores =
                        idx === 0
                          ? Object.fromEntries(
                              players.map((p) => [p.userId, startingPoints]),
                            )
                          : roundHistory[idx - 1].scores;

                      return (
                        <tr key={`round-${round.round}`} className="hover">
                          <td className="text-xs font-medium whitespace-nowrap">
                            {formatRoundLabel(
                              round.wind,
                              windRound,
                              round.honba,
                            )}
                          </td>
                          {players.map((p) => {
                            const score = round.scores[p.userId] ?? 0;
                            const prev = prevScores[p.userId] ?? startingPoints;
                            const delta = score - prev;
                            const isDealer = round.dealerUserId === p.userId;

                            return (
                              <td
                                key={p.userId}
                                className={clsx(
                                  "text-center",
                                  p.userId === currentUserId && "bg-primary/5",
                                )}
                              >
                                <div className="flex flex-col items-center">
                                  <span className="font-mono text-xs tabular-nums">
                                    {score.toLocaleString()}
                                    {isDealer && (
                                      <span className="text-warning ml-0.5">
                                        庄
                                      </span>
                                    )}
                                  </span>
                                  {delta !== 0 && (
                                    <span
                                      className={clsx(
                                        "text-[10px] tabular-nums",
                                        delta > 0
                                          ? "text-success"
                                          : "text-error",
                                      )}
                                    >
                                      {delta > 0 ? "+" : ""}
                                      {delta.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="text-[10px] text-center text-base-content/50 whitespace-nowrap">
                            {RESULT_LABELS[round.result] ?? round.result}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function MahjongMatchHistory() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    trpcClientPublic.mahjong.getMyMatches
      .query()
      .then((data) => setMatches(data as Match[]))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedMatch(null);
  }, []);

  if (isLoading) {
    return (
      <div className="card bg-base-200 w-full border border-base-content/10 shadow-sm">
        <div className="card-body p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="shrink-0 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
              <GameControllerIcon className="size-5 sm:size-6 md:size-8 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-base sm:text-lg font-bold mb-1">公式战历史</p>
              <span className="loading loading-dots loading-xs" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="card bg-base-200 w-full border border-base-content/10 shadow-sm">
        <div className="card-body p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
              <GameControllerIcon className="size-5 sm:size-6 md:size-8 text-primary" />
            </div>
            <div className="flex flex-col items-start justify-start flex-1 min-w-0">
              <p className="text-base sm:text-lg font-bold mb-1">公式战历史</p>
              <p className="text-xs sm:text-sm text-base-content/60">
                暂无对局记录
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card bg-base-200 w-full border border-base-content/10 shadow-sm">
        <div className="card-body p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4 mb-3">
            <div className="shrink-0 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
              <GameControllerIcon className="size-5 sm:size-6 md:size-8 text-primary" />
            </div>
            <div className="flex flex-col items-start justify-start flex-1 min-w-0">
              <p className="text-base sm:text-lg font-bold">公式战历史</p>
              <p className="text-xs text-base-content/50">
                共 {matches.length} 场对局
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {matches.map((match) => {
              const players = match.players ?? [];
              const me = players.find((p) => p.userId === userId);
              const rank = me ? getRank(players, me.userId) : null;
              const badge = rank ? getRankBadge(rank) : null;

              return (
                <button
                  key={match.id}
                  onClick={() => handleMatchClick(match)}
                  className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors cursor-pointer text-left w-full"
                >
                  {badge && (
                    <span className={clsx(badge.className, "shrink-0")}>
                      {badge.label}
                    </span>
                  )}

                  <span className="badge badge-xs badge-outline shrink-0">
                    {MODE_LABELS[match.mode]} {FORMAT_LABELS[match.format]}
                  </span>

                  {me && (
                    <span className="text-xs text-base-content/60 shrink-0">
                      {SEAT_LABELS[me.seat as Seat] ?? me.seat}家
                    </span>
                  )}

                  {me && (
                    <span className="font-mono text-sm tabular-nums flex-1 text-right">
                      {me.finalScore.toLocaleString()}
                    </span>
                  )}

                  <span className="text-[10px] sm:text-xs text-base-content/40 shrink-0">
                    {dayjs(match.started_at).format("MM/DD HH:mm")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <MahjongMatchDetailModal
        match={selectedMatch}
        isOpen={!!selectedMatch}
        onClose={handleCloseDetail}
        currentUserId={userId}
      />
    </>
  );
}
