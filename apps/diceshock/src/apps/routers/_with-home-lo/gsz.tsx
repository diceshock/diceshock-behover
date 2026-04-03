import {
  CrownSimpleIcon,
  GameControllerIcon,
  LightningIcon,
  MedalIcon,
  TrendDownIcon,
  TrendUpIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import type { PPCategory } from "@/shared/mahjong/pp";
import { formatPP, PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/_with-home-lo/gsz")({
  component: GszPage,
});

type Period = "day" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  day: "今日",
  week: "本周",
  month: "本月",
};

interface LeaderboardEntry {
  userId: string;
  nickname: string;
  totalPP: number;
  matchCount: number;
  rank: number;
  prevRank: number | null;
}

function RankChangeBadge({
  current,
  prev,
}: {
  current: number;
  prev: number | null;
}) {
  if (prev === null) {
    return <span className="badge badge-xs badge-accent">NEW</span>;
  }
  const change = prev - current;
  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 text-success text-xs font-semibold">
        <TrendUpIcon className="size-3" weight="bold" />
        {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex items-center gap-0.5 text-error text-xs font-semibold">
        <TrendDownIcon className="size-3" weight="bold" />
        {Math.abs(change)}
      </span>
    );
  }
  return <span className="text-base-content/30 text-xs">—</span>;
}

function TopThreeCard({
  entry,
  place,
  isMe,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  isMe: boolean;
}) {
  const colors = {
    1: "from-amber-500/20 to-amber-600/5 border-amber-400/40",
    2: "from-gray-400/15 to-gray-500/5 border-gray-400/30",
    3: "from-orange-500/15 to-orange-600/5 border-orange-400/30",
  };

  const crownColors = {
    1: "text-amber-400",
    2: "text-gray-400",
    3: "text-orange-400",
  };

  const sizes = {
    1: "w-full sm:w-64 py-6",
    2: "w-full sm:w-56 py-5",
    3: "w-full sm:w-56 py-5",
  };

  return (
    <div
      className={clsx(
        "relative rounded-xl border bg-gradient-to-b px-4 text-center transition-all",
        colors[place],
        sizes[place],
        isMe && "ring-2 ring-primary/50",
        place === 1 && "sm:order-2 sm:-mt-4",
        place === 2 && "sm:order-1",
        place === 3 && "sm:order-3",
      )}
    >
      <CrownSimpleIcon
        className={clsx("mx-auto size-6 sm:size-8 mb-1", crownColors[place])}
        weight="fill"
      />
      <p className="font-bold text-sm sm:text-base truncate">
        {entry.nickname}
        {isMe && <span className="text-primary ml-1 text-xs">(我)</span>}
      </p>
      <p
        className={clsx(
          "font-mono text-lg sm:text-xl font-bold tabular-nums mt-1",
          entry.totalPP > 0
            ? "text-success"
            : entry.totalPP < 0
              ? "text-error"
              : "text-base-content/50",
        )}
      >
        {formatPP(entry.totalPP)}
      </p>
      <div className="flex items-center justify-center gap-2 mt-1 text-xs text-base-content/50">
        <span>{entry.matchCount}局</span>
        <RankChangeBadge current={entry.rank} prev={entry.prevRank} />
      </div>
    </div>
  );
}

function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string | undefined;
}) {
  const rest = entries.slice(3);
  if (rest.length === 0) return null;

  const myIndex = currentUserId
    ? entries.findIndex((e) => e.userId === currentUserId)
    : -1;
  const myEntry = myIndex >= 3 ? entries[myIndex] : null;

  return (
    <div className="flex flex-col gap-1 mt-4">
      {rest.map((entry) => {
        const isMe = entry.userId === currentUserId;
        return (
          <div
            key={entry.userId}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              isMe
                ? "bg-primary/10 border border-primary/20"
                : "bg-base-200/50 hover:bg-base-200",
            )}
          >
            <span className="w-8 text-center font-mono text-xs text-base-content/50 tabular-nums">
              #{entry.rank}
            </span>
            <span className="flex-1 font-medium truncate">
              {entry.nickname}
              {isMe && <span className="text-primary ml-1 text-xs">(我)</span>}
            </span>
            <RankChangeBadge current={entry.rank} prev={entry.prevRank} />
            <span className="text-xs text-base-content/50">
              {entry.matchCount}局
            </span>
            <span
              className={clsx(
                "font-mono text-sm font-semibold tabular-nums w-20 text-right",
                entry.totalPP > 0
                  ? "text-success"
                  : entry.totalPP < 0
                    ? "text-error"
                    : "text-base-content/50",
              )}
            >
              {formatPP(entry.totalPP)}
            </span>
          </div>
        );
      })}

      {myEntry && myIndex >= 3 && (
        <div className="mt-2 pt-2 border-t border-base-content/10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <span className="w-8 text-center font-mono text-xs tabular-nums">
              #{myEntry.rank}
            </span>
            <span className="flex-1 font-medium truncate">
              {myEntry.nickname}
              <span className="text-primary ml-1 text-xs">(我)</span>
            </span>
            <RankChangeBadge current={myEntry.rank} prev={myEntry.prevRank} />
            <span className="text-xs text-base-content/50">
              {myEntry.matchCount}局
            </span>
            <span
              className={clsx(
                "font-mono text-sm font-semibold tabular-nums w-20 text-right",
                myEntry.totalPP > 0
                  ? "text-success"
                  : myEntry.totalPP < 0
                    ? "text-error"
                    : "text-base-content/50",
              )}
            >
              {formatPP(myEntry.totalPP)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardPanel() {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const categories = Object.keys(PP_CATEGORY_LABELS) as PPCategory[];
  const [selectedCategory, setSelectedCategory] =
    useState<PPCategory>("tournament");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    trpcClientPublic.leaderboard.getLeaderboard
      .query({ category: selectedCategory, period: selectedPeriod })
      .then((data) => setEntries((data.entries ?? []) as LeaderboardEntry[]))
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, [selectedCategory, selectedPeriod]);

  const top3 = entries.slice(0, 3);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <MedalIcon className="size-6 text-primary" weight="fill" />
        <h2 className="text-xl sm:text-2xl font-bold">PP 排行榜</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={clsx(
              "btn btn-xs sm:btn-sm",
              selectedCategory === cat ? "btn-primary" : "btn-ghost",
            )}
          >
            {PP_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-4">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPeriod(p)}
            className={clsx(
              "btn btn-xs",
              selectedPeriod === p ? "btn-secondary" : "btn-ghost",
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          <GameControllerIcon className="size-12 mx-auto mb-2 opacity-30" />
          <p>暂无对局数据</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-end justify-center gap-3 sm:gap-4 mb-2">
            {top3.map((entry, i) => (
              <TopThreeCard
                key={entry.userId}
                entry={entry}
                place={(i + 1) as 1 | 2 | 3}
                isMe={entry.userId === currentUserId}
              />
            ))}
          </div>

          <LeaderboardTable entries={entries} currentUserId={currentUserId} />
        </>
      )}
    </section>
  );
}

function GszPage() {
  const { session, userInfo } = useAuth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              <LightningIcon
                className="inline size-8 sm:size-10 text-primary mr-2"
                weight="fill"
              />
              公式战
            </h1>
            <p className="text-sm text-base-content/50 mt-1">
              立直麻将 PP 排行榜 & 对局
            </p>
          </div>

          {isLoggedIn && session?.user?.id && (
            <a
              href={`/my-gsz/${session.user.id}`}
              className="btn btn-primary btn-sm sm:btn-md gap-1"
            >
              <UserIcon className="size-4" weight="bold" />
              我的公式战
            </a>
          )}
        </div>

        <LeaderboardPanel />
      </div>
    </main>
  );
}
