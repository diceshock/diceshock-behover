import { GameControllerIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/client/components/modal";
import useAuth from "@/client/hooks/useAuth";
import type { Seat } from "@/shared/mahjong/constants";
import {
  FORMAT_LABELS,
  MATCH_TYPE_LABELS,
  MODE_LABELS,
  SEAT_LABELS,
} from "@/shared/mahjong/constants";
import type { PPCategory } from "@/shared/mahjong/pp";
import {
  aggregatePP,
  formatPP,
  getMatchPPIfValid,
  getPlayerPP,
  PP_CATEGORY_LABELS,
} from "@/shared/mahjong/pp";
import type { MatchType } from "@/shared/mahjong/types";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

interface MatchPlayer {
  userId: string;
  nickname: string;
  seat: string | null;
  finalScore: number;
}

interface Match {
  id: string;
  table_id: string | null;
  match_type: string | null;
  mode: "3p" | "4p";
  format: "tonpuu" | "hanchan";
  started_at: string;
  ended_at: string;
  termination_reason: string;
  players: MatchPlayer[] | null;
  config: { type?: string; mode: string; format: string } | null;
  created_at: string | null;
}

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

function getEffectiveMatchType(match: Match): MatchType {
  return (match.match_type ?? match.config?.type ?? "store") as MatchType;
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
  const sortedPlayers = [...players].sort(
    (a, b) => b.finalScore - a.finalScore,
  );

  const matchType = getEffectiveMatchType(match);
  const ppResult = getMatchPPIfValid(
    players,
    match.mode,
    match.format,
    matchType,
    match.termination_reason,
  );
  const ppMap = ppResult
    ? new Map(ppResult.players.map((p) => [p.userId, p.totalPP]))
    : new Map<string, number>();
  const isTournament = matchType === "tournament";

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
            {match.match_type && (
              <span className="badge badge-sm badge-primary">
                {MATCH_TYPE_LABELS[match.match_type] ?? match.match_type}
              </span>
            )}
            <span className="badge badge-sm badge-outline">
              {MODE_LABELS[match.mode] ?? match.mode}{" "}
              {FORMAT_LABELS[match.format] ?? match.format}
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
                const pp = ppMap.get(player.userId);
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
                    {player.seat && (
                      <span className="text-xs text-base-content/50">
                        {SEAT_LABELS[player.seat as Seat] ?? player.seat}
                      </span>
                    )}
                    <span className="font-mono text-sm tabular-nums">
                      {player.finalScore.toLocaleString()}
                    </span>
                    {pp != null && (
                      <span
                        className={clsx(
                          "font-mono text-xs font-semibold tabular-nums",
                          pp > 0
                            ? "text-success"
                            : pp < 0
                              ? "text-error"
                              : "text-base-content/50",
                        )}
                      >
                        {formatPP(pp)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {isTournament && ppResult && (
              <div className="text-xs text-base-content/40 text-center mt-2">
                立直麻将 PP 为预估值
              </div>
            )}
          </div>
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

  const ppStats = useMemo(() => {
    if (!userId || matches.length === 0) return [];
    const matchData = matches
      .filter((m) => m.players && m.players.length > 0)
      .map((m) => ({
        players: m.players!,
        mode: m.mode,
        format: m.format,
        matchType: getEffectiveMatchType(m),
        terminationReason: m.termination_reason,
      }));
    return aggregatePP(matchData, userId);
  }, [matches, userId]);

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
              <p className="text-base sm:text-lg font-bold mb-1">
                立直麻将历史
              </p>
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
              <p className="text-base sm:text-lg font-bold mb-1">
                立直麻将历史
              </p>
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
              <p className="text-base sm:text-lg font-bold">立直麻将历史</p>
              <p className="text-xs text-base-content/50">
                共 {matches.length} 场对局
              </p>
            </div>
          </div>

          {ppStats.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {ppStats.map((stat) => {
                const label =
                  PP_CATEGORY_LABELS[stat.category as PPCategory] ??
                  stat.category;
                const isTournament = stat.category === "tournament";
                return (
                  <div
                    key={stat.category}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-base-300/70 text-xs"
                  >
                    <span className="text-base-content/60">{label}</span>
                    <span
                      className={clsx(
                        "font-mono font-bold tabular-nums",
                        stat.totalPP > 0
                          ? "text-success"
                          : stat.totalPP < 0
                            ? "text-error"
                            : "text-base-content/50",
                      )}
                    >
                      {formatPP(stat.totalPP)}
                    </span>
                    <span className="text-base-content/40">
                      ({stat.matchCount}局)
                    </span>
                    {isTournament && (
                      <span className="text-base-content/30">*</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {matches.map((match) => {
              const players = match.players ?? [];
              const me = players.find((p) => p.userId === userId);
              const rank = me ? getRank(players, me.userId) : null;
              const badge = rank ? getRankBadge(rank) : null;

              const matchType = getEffectiveMatchType(match);
              const myPP =
                me && userId
                  ? getPlayerPP(
                      players,
                      userId,
                      match.mode,
                      match.format,
                      matchType,
                    )
                  : null;
              const isValidPP =
                match.termination_reason === "score_complete" ||
                match.termination_reason === "vote";

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

                  {match.match_type && (
                    <span className="badge badge-xs badge-primary shrink-0">
                      {MATCH_TYPE_LABELS[match.match_type] ?? match.match_type}
                    </span>
                  )}

                  <span className="badge badge-xs badge-outline shrink-0">
                    {MODE_LABELS[match.mode] ?? match.mode}{" "}
                    {FORMAT_LABELS[match.format] ?? match.format}
                  </span>

                  {me && (
                    <span className="text-xs text-base-content/60 shrink-0">
                      {me.seat
                        ? (SEAT_LABELS[me.seat as Seat] ?? me.seat) + "家"
                        : ""}
                    </span>
                  )}

                  <span className="flex-1" />

                  {me && myPP && isValidPP && (
                    <span
                      className={clsx(
                        "font-mono text-xs font-semibold tabular-nums shrink-0",
                        myPP.totalPP > 0
                          ? "text-success"
                          : myPP.totalPP < 0
                            ? "text-error"
                            : "text-base-content/50",
                      )}
                    >
                      {formatPP(myPP.totalPP)}
                    </span>
                  )}

                  {me && (
                    <span className="font-mono text-sm tabular-nums shrink-0">
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
