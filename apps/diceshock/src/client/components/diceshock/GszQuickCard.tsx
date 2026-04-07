import { GameControllerIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useEffect, useState } from "react";
import type { PPCategory } from "@/shared/mahjong/pp";
import { formatPP, PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import trpcClientPublic from "@/shared/utils/trpc";

interface PPStat {
  category: PPCategory;
  totalPP: number;
  matchCount: number;
  avgPP: number;
}

export default function GszQuickCard({
  userId,
}: {
  userId: string | undefined;
}) {
  const [ppStats, setPpStats] = useState<PPStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    trpcClientPublic.leaderboard.getMyPPStats
      .query()
      .then((data) => setPpStats(data as PPStat[]))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [userId]);

  const totalMatches = ppStats.reduce((sum, s) => sum + s.matchCount, 0);
  const totalPP =
    Math.round(ppStats.reduce((sum, s) => sum + s.totalPP, 0) * 10) / 10;

  return (
    <a
      href={userId ? `/my-riichi/${userId}` : "/riichi"}
      className="card bg-base-200 hover:bg-base-300 transition-colors w-full cursor-pointer border border-base-content/10 hover:border-base-content/20 shadow-sm hover:shadow-md"
    >
      <div className="card-body p-4 sm:p-6 md:p-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
            <GameControllerIcon className="size-5 sm:size-6 md:size-8 text-primary" />
          </div>
          <div className="flex flex-col items-start justify-start flex-1 min-w-0">
            <p className="text-base sm:text-lg font-bold mb-1">立直麻将</p>
            {isLoading ? (
              <span className="loading loading-dots loading-xs" />
            ) : totalMatches === 0 ? (
              <p className="text-xs sm:text-sm text-base-content/60">
                暂无对局记录
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 w-full">
                <p className="text-xs text-base-content/50">
                  {totalMatches}局 · 总PP{" "}
                  <span
                    className={clsx(
                      "font-mono font-bold",
                      totalPP > 0
                        ? "text-success"
                        : totalPP < 0
                          ? "text-error"
                          : "",
                    )}
                  >
                    {formatPP(totalPP)}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ppStats.slice(0, 3).map((stat) => (
                    <span
                      key={stat.category}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-base-300/70"
                    >
                      <span className="text-base-content/50">
                        {PP_CATEGORY_LABELS[stat.category]}
                      </span>{" "}
                      <span
                        className={clsx(
                          "font-mono font-semibold",
                          stat.totalPP > 0
                            ? "text-success"
                            : stat.totalPP < 0
                              ? "text-error"
                              : "text-base-content/50",
                        )}
                      >
                        {formatPP(stat.totalPP)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
