import {
  CalendarDotsIcon,
  FunnelIcon,
  GameControllerIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MedalIcon,
  RocketLaunchIcon,
  ShareNetworkIcon,
  TrendDownIcon,
  TrendUpIcon,
  TrophyIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import { copyToClipboard } from "@/server/utils";
import type { Seat } from "@/shared/mahjong/constants";
import {
  FORMAT_LABELS,
  MATCH_TYPE_LABELS,
  MODE_LABELS,
  SEAT_LABELS,
} from "@/shared/mahjong/constants";
import type { PPCategory } from "@/shared/mahjong/pp";
import { formatPP, getPlayerPP, PP_CATEGORY_LABELS } from "@/shared/mahjong/pp";
import type { MatchType } from "@/shared/mahjong/types";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/my-gsz/$id")({
  component: MyGszProfile,
});

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

interface Badge {
  id: string;
  badge_type: string;
  badge_rank: number;
  category: string;
  period_label: string;
  title: string;
  awarded_at: Date | string | null;
}

interface RankingEntry {
  category: PPCategory;
  period: string;
  rank: number | null;
  totalPP: number;
  prevRank: number | null;
  matchCount: number;
}

interface PPStat {
  category: PPCategory;
  totalPP: number;
  matchCount: number;
  avgPP: number;
}

const PERIOD_LABELS: Record<string, string> = {
  day: "今日",
  week: "本周",
  month: "本月",
};

function getEffectiveMatchType(match: Match): MatchType {
  return (match.match_type ?? match.config?.type ?? "store") as MatchType;
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

function HeatmapCalendar({ data }: { data: Record<string, number> }) {
  const days = useMemo(() => {
    const today = dayjs();
    const result: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 365; i++) {
      const d = today.subtract(i, "day");
      const dateStr = d.format("YYYY-MM-DD");
      result.push({ date: dateStr, count: data[dateStr] ?? 0 });
    }
    return result;
  }, [data]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(data));
  }, [data]);

  function getColor(count: number): string {
    if (count === 0) return "bg-base-300/30";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "bg-primary/20";
    if (intensity < 0.5) return "bg-primary/40";
    if (intensity < 0.75) return "bg-primary/60";
    return "bg-primary/90";
  }

  return (
    <div>
      <div className="flex flex-wrap gap-[3px]">
        {days.map((day) => (
          <div
            key={day.date}
            className={clsx(
              "size-3 rounded-sm transition-colors",
              getColor(day.count),
            )}
            title={`${day.date}: ${day.count}局`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-xs text-base-content/40">
        <span>少</span>
        <div className="size-3 rounded-sm bg-base-300/30" />
        <div className="size-3 rounded-sm bg-primary/20" />
        <div className="size-3 rounded-sm bg-primary/40" />
        <div className="size-3 rounded-sm bg-primary/60" />
        <div className="size-3 rounded-sm bg-primary/90" />
        <span>多</span>
      </div>
    </div>
  );
}

function getBadgeConfig(badge: Badge): {
  icon: typeof TrophyIcon;
  iconColor: string;
  bgGradient: string;
  borderColor: string;
  subtitle: string;
} {
  if (badge.badge_type === "newcomer") {
    return {
      icon: RocketLaunchIcon,
      iconColor: "text-secondary",
      bgGradient: "bg-gradient-to-br from-secondary/10 to-secondary/5",
      borderColor: "border-secondary/20",
      subtitle: "欢迎加入",
    };
  }
  if (badge.badge_type === "first_game") {
    return {
      icon: LightningIcon,
      iconColor: "text-accent",
      bgGradient: "bg-gradient-to-br from-accent/10 to-accent/5",
      borderColor: "border-accent/20",
      subtitle: "完成首次对局",
    };
  }

  const rankConfigs: Record<
    number,
    { iconColor: string; bgGradient: string; borderColor: string }
  > = {
    1: {
      iconColor: "text-amber-400",
      bgGradient: "bg-gradient-to-br from-amber-400/15 to-amber-400/5",
      borderColor: "border-amber-400/25",
    },
    2: {
      iconColor: "text-gray-400",
      bgGradient: "bg-gradient-to-br from-gray-400/15 to-gray-400/5",
      borderColor: "border-gray-400/25",
    },
    3: {
      iconColor: "text-orange-400",
      bgGradient: "bg-gradient-to-br from-orange-400/15 to-orange-400/5",
      borderColor: "border-orange-400/25",
    },
  };

  const rankConfig = rankConfigs[badge.badge_rank] ?? {
    iconColor: "text-primary",
    bgGradient: "bg-gradient-to-br from-primary/10 to-primary/5",
    borderColor: "border-primary/20",
  };

  return {
    icon: TrophyIcon,
    subtitle: badge.period_label,
    ...rankConfig,
  };
}

function BadgeWall({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-6 text-base-content/40 text-sm">
        暂无徽章
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge) => {
        const config = getBadgeConfig(badge);
        const Icon = config.icon;
        return (
          <div key={badge.id} className="hover-3d">
            <div
              className={clsx(
                "card shadow-xl border w-36 sm:w-44",
                config.bgGradient,
                config.borderColor,
              )}
            >
              <figure className="pt-4 px-4 flex justify-center">
                <Icon
                  className={clsx("size-8 sm:size-10", config.iconColor)}
                  weight="fill"
                />
              </figure>
              <div className="card-body p-3 sm:p-4 items-center text-center gap-0.5">
                <h3 className="card-title text-xs sm:text-sm font-bold">
                  {badge.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-base-content/50">
                  {config.subtitle}
                </p>
              </div>
            </div>
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
          </div>
        );
      })}
    </div>
  );
}

function RankingsPanel({ rankings }: { rankings: RankingEntry[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, RankingEntry[]>();
    for (const r of rankings) {
      const key = r.period;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [rankings]);

  if (rankings.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {(["day", "week", "month"] as const).map((period) => {
        const entries = grouped.get(period);
        if (!entries || entries.length === 0) return null;
        return (
          <div key={period}>
            <h4 className="text-xs font-semibold text-base-content/50 mb-1.5">
              {PERIOD_LABELS[period]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {entries.map((r) => (
                <div
                  key={`${r.category}-${r.period}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-base-200/80 text-xs"
                >
                  <span className="text-base-content/60">
                    {PP_CATEGORY_LABELS[r.category]}
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    #{r.rank}
                  </span>
                  <span
                    className={clsx(
                      "font-mono font-semibold tabular-nums",
                      r.totalPP > 0
                        ? "text-success"
                        : r.totalPP < 0
                          ? "text-error"
                          : "text-base-content/50",
                    )}
                  >
                    {formatPP(r.totalPP)}
                  </span>
                  {r.prevRank !== null ? (
                    (() => {
                      const change = r.prevRank - (r.rank ?? 0);
                      if (change > 0)
                        return (
                          <span className="flex items-center text-success">
                            <TrendUpIcon className="size-3" weight="bold" />
                            {change}
                          </span>
                        );
                      if (change < 0)
                        return (
                          <span className="flex items-center text-error">
                            <TrendDownIcon className="size-3" weight="bold" />
                            {Math.abs(change)}
                          </span>
                        );
                      return <span className="text-base-content/30">—</span>;
                    })()
                  ) : (
                    <span className="badge badge-xs badge-accent">NEW</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MyGszProfile() {
  const { id: profileUserId } = Route.useParams();
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const isOwnProfile = currentUserId === profileUserId;

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchCursor, setMatchCursor] = useState<string | null>(null);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [ppStats, setPpStats] = useState<PPStat[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [searchText, setSearchText] = useState("");
  const [matchTypeFilter, setMatchTypeFilter] = useState<
    "all" | "store" | "tournament"
  >("all");
  const [modeFilter, setModeFilter] = useState<"all" | "3p" | "4p">("all");
  const [formatFilter, setFormatFilter] = useState<
    "all" | "tonpuu" | "hanchan"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef(searchText);
  useEffect(() => {
    searchRef.current = searchText;
  }, [searchText]);

  const buildFilterParams = useCallback(() => {
    const params: Record<string, unknown> = {};
    if (searchRef.current.trim()) params.search = searchRef.current.trim();
    if (matchTypeFilter !== "all") params.matchType = matchTypeFilter;
    if (modeFilter !== "all") params.mode = modeFilter;
    if (formatFilter !== "all") params.format = formatFilter;
    if (startDate) {
      params.startDate = dayjs
        .tz(startDate, "Asia/Shanghai")
        .startOf("day")
        .valueOf();
    }
    if (endDate) {
      params.endDate = dayjs
        .tz(endDate, "Asia/Shanghai")
        .endOf("day")
        .valueOf();
    }
    return params;
  }, [matchTypeFilter, modeFilter, formatFilter, startDate, endDate]);

  const fetchMatches = useCallback(
    async (cursor?: string) => {
      const filterParams = buildFilterParams();
      try {
        const data = await trpcClientPublic.leaderboard.getMatchHistory.query({
          userId: profileUserId,
          limit: 20,
          cursor,
          ...filterParams,
        });
        if (cursor) {
          setMatches((prev) => [...prev, ...(data.items as Match[])]);
        } else {
          setMatches(data.items as Match[]);
        }
        setMatchCursor(data.nextCursor);
        setHasMoreMatches(!!data.nextCursor);
      } catch {}
    },
    [profileUserId, buildFilterParams],
  );

  useEffect(() => {
    setIsLoading(true);
    const promises: Promise<void>[] = [];

    if (isOwnProfile && currentUserId) {
      promises.push(
        trpcClientPublic.leaderboard.getMyPPStats
          .query()
          .then((data) => setPpStats(data as PPStat[]))
          .catch(() => {}),
      );
      promises.push(
        trpcClientPublic.leaderboard.getHeatmapData
          .query({ userId: profileUserId })
          .then((data) => setHeatmap(data))
          .catch(() => {}),
      );
      promises.push(
        trpcClientPublic.leaderboard.getMyBadges
          .query()
          .then((data) => setBadges(data as Badge[]))
          .catch(() => {}),
      );
      promises.push(
        trpcClientPublic.leaderboard.getMyRankings
          .query()
          .then((data) => setRankings(data as RankingEntry[]))
          .catch(() => {}),
      );
    } else {
      promises.push(
        trpcClientPublic.leaderboard.getUserBadges
          .query({ userId: profileUserId })
          .then((data) => setBadges(data as Badge[]))
          .catch(() => {}),
      );
    }

    Promise.allSettled(promises).finally(() => setIsLoading(false));
  }, [profileUserId, currentUserId, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile && currentUserId) {
      setMatches([]);
      setMatchCursor(null);
      setHasMoreMatches(true);
      void fetchMatches();
    }
  }, [fetchMatches, isOwnProfile, currentUserId]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const ok = await copyToClipboard(url);
    setShareMsg(ok ? "链接已复制" : "复制失败");
    setTimeout(() => setShareMsg(null), 2000);
  }, []);

  const loadMoreMatches = useCallback(async () => {
    if (!matchCursor || isLoadingMore || !hasMoreMatches) return;
    setIsLoadingMore(true);
    await fetchMatches(matchCursor);
    setIsLoadingMore(false);
  }, [matchCursor, isLoadingMore, hasMoreMatches, fetchMatches]);

  const handleSearch = useCallback(() => {
    setMatches([]);
    setMatchCursor(null);
    setHasMoreMatches(true);
    void fetchMatches();
  }, [fetchMatches]);

  const hasActiveFilters =
    searchText.trim() !== "" ||
    matchTypeFilter !== "all" ||
    modeFilter !== "all" ||
    formatFilter !== "all" ||
    startDate !== "" ||
    endDate !== "";

  const clearFilters = useCallback(() => {
    setSearchText("");
    setMatchTypeFilter("all");
    setModeFilter("all");
    setFormatFilter("all");
    setStartDate("");
    setEndDate("");
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMoreMatches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreMatches();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreMatches, hasMoreMatches]);

  const totalMatches = matches.length;
  const totalPP = useMemo(
    () => ppStats.reduce((sum, s) => sum + s.totalPP, 0),
    [ppStats],
  );

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-3xl flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              {isOwnProfile ? "我的公式战" : "公式战成绩"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/gsz" className="btn btn-ghost btn-sm">
              排行榜
            </a>
            <button
              onClick={handleShare}
              className="btn btn-outline btn-sm gap-1"
            >
              <ShareNetworkIcon className="size-4" />
              {shareMsg ?? "分享"}
            </button>
          </div>
        </div>

        {isOwnProfile && ppStats.length > 0 && (
          <section className="card bg-base-200 border border-base-content/10 shadow-sm mb-6">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <MedalIcon className="size-5 text-primary" weight="fill" />
                <h2 className="font-bold text-base">PP 总览</h2>
                <span className="text-xs text-base-content/40 ml-auto">
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
                    {formatPP(Math.round(totalPP * 10) / 10)}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ppStats.map((stat) => {
                  const rounded = Math.round(stat.totalPP * 10) / 10;
                  const absVal = Math.abs(rounded);
                  const intPart = Math.floor(absVal).toString();
                  const decPart = (absVal % 1).toFixed(1).slice(1);

                  return (
                    <div
                      key={stat.category}
                      className="flex flex-col gap-2 rounded-xl bg-base-300/50 border border-base-content/5 p-4"
                    >
                      <span className="text-xs font-medium text-base-content/50 truncate">
                        {PP_CATEGORY_LABELS[stat.category]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {rounded > 0 ? (
                          <TrendUpIcon
                            className="size-5 text-success shrink-0"
                            weight="bold"
                          />
                        ) : rounded < 0 ? (
                          <TrendDownIcon
                            className="size-5 text-error shrink-0"
                            weight="bold"
                          />
                        ) : (
                          <span className="text-base-content/30 text-sm shrink-0">
                            —
                          </span>
                        )}
                        <span
                          className={clsx(
                            "font-mono tabular-nums leading-none",
                            rounded > 0
                              ? "text-success"
                              : rounded < 0
                                ? "text-error"
                                : "text-base-content/50",
                          )}
                        >
                          <span className="text-2xl font-bold">{intPart}</span>
                          <span className="text-sm font-semibold opacity-60">
                            {decPart}
                          </span>
                        </span>
                      </div>
                      <span className="text-[11px] text-base-content/40">
                        {stat.matchCount}局 · 均{formatPP(stat.avgPP)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {isOwnProfile && rankings.length > 0 && (
          <section className="card bg-base-200 border border-base-content/10 shadow-sm mb-6">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendUpIcon className="size-5 text-secondary" weight="bold" />
                <h2 className="font-bold text-base">店内排名</h2>
              </div>
              <RankingsPanel rankings={rankings} />
            </div>
          </section>
        )}

        {Object.keys(heatmap).length > 0 && (
          <section className="card bg-base-200 border border-base-content/10 shadow-sm mb-6">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDotsIcon
                  className="size-5 text-accent"
                  weight="fill"
                />
                <h2 className="font-bold text-base">对局活跃度</h2>
              </div>
              <HeatmapCalendar data={heatmap} />
            </div>
          </section>
        )}

        <section className="card bg-base-200 border border-base-content/10 shadow-sm mb-6">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrophyIcon className="size-5 text-warning" weight="fill" />
              <h2 className="font-bold text-base">徽章墙</h2>
            </div>
            <BadgeWall badges={badges} />
          </div>
        </section>

        {isOwnProfile && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <GameControllerIcon
                className="size-5 text-primary"
                weight="fill"
              />
              <h2 className="font-bold text-base">对局历史</h2>
              {matches.length > 0 && (
                <span className="text-xs text-base-content/40 ml-auto">
                  共 {matches.length}+ 场
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
                  <MagnifyingGlassIcon className="size-4 opacity-50 shrink-0" />
                  <input
                    type="text"
                    className="grow min-w-0"
                    placeholder="搜索玩家昵称..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  {searchText && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={() => {
                        setSearchText("");
                        searchRef.current = "";
                        void fetchMatches();
                      }}
                    >
                      <XIcon className="size-3" weight="bold" />
                    </button>
                  )}
                </label>
                <button
                  type="button"
                  className={clsx(
                    "btn btn-sm btn-square",
                    showFilters ? "btn-primary" : "btn-ghost",
                  )}
                  onClick={() => setShowFilters((v) => !v)}
                >
                  <FunnelIcon
                    className="size-4"
                    weight={showFilters ? "fill" : "regular"}
                  />
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-base-200 border border-base-content/10">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs text-base-content/50 w-12 shrink-0">
                      类型
                    </span>
                    {(
                      [
                        ["all", "全部"],
                        ["store", "店内"],
                        ["tournament", "公式战"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={clsx(
                          "btn btn-xs",
                          matchTypeFilter === key ? "btn-primary" : "btn-ghost",
                        )}
                        onClick={() => {
                          setMatchTypeFilter(key);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs text-base-content/50 w-12 shrink-0">
                      模式
                    </span>
                    {(
                      [
                        ["all", "全部"],
                        ["4p", "四麻"],
                        ["3p", "三麻"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={clsx(
                          "btn btn-xs",
                          modeFilter === key ? "btn-secondary" : "btn-ghost",
                        )}
                        onClick={() => {
                          setModeFilter(key);
                        }}
                      >
                        {label}
                      </button>
                    ))}

                    <span className="text-base-content/20 mx-1">|</span>

                    {(
                      [
                        ["all", "全部"],
                        ["hanchan", "半庄"],
                        ["tonpuu", "东风"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={clsx(
                          "btn btn-xs",
                          formatFilter === key ? "btn-accent" : "btn-ghost",
                        )}
                        onClick={() => {
                          setFormatFilter(key);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs text-base-content/50 w-12 shrink-0">
                      时间
                    </span>
                    <input
                      type="date"
                      className="input input-bordered input-xs"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                      }}
                    />
                    <span className="text-xs text-base-content/40">~</span>
                    <input
                      type="date"
                      className="input input-bordered input-xs"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                      }}
                    />
                  </div>

                  {hasActiveFilters && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          clearFilters();
                        }}
                      >
                        <XIcon className="size-3" weight="bold" />
                        清除筛选
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {matches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.map((match) => {
                  const players = match.players ?? [];
                  const me = players.find((p) => p.userId === profileUserId);
                  const rank = me ? getRank(players, me.userId) : null;
                  const badge = rank ? getRankBadge(rank) : null;
                  const matchType = getEffectiveMatchType(match);
                  const myPP = me
                    ? getPlayerPP(
                        players,
                        me.userId,
                        match.mode,
                        match.format,
                        matchType,
                      )
                    : null;
                  const isValidPP =
                    match.termination_reason === "score_complete" ||
                    match.termination_reason === "vote";
                  const sortedPlayers = [...players].sort(
                    (a, b) => b.finalScore - a.finalScore,
                  );

                  return (
                    <div
                      key={match.id}
                      className="card bg-base-200 border border-base-content/10 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="card-body p-4 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {badge && (
                            <span className={clsx(badge.className, "shrink-0")}>
                              {badge.label}
                            </span>
                          )}
                          {match.match_type && (
                            <span className="badge badge-xs badge-primary">
                              {MATCH_TYPE_LABELS[match.match_type] ??
                                match.match_type}
                            </span>
                          )}
                          <span className="badge badge-xs badge-outline">
                            {MODE_LABELS[match.mode] ?? match.mode}{" "}
                            {FORMAT_LABELS[match.format] ?? match.format}
                          </span>
                          <span className="text-[10px] text-base-content/40 ml-auto">
                            {dayjs(match.started_at).format("MM/DD HH:mm")}
                          </span>
                        </div>

                        {me && myPP && isValidPP && (
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono text-xl font-bold tabular-nums">
                              {me.finalScore.toLocaleString()}
                            </span>
                            <span
                              className={clsx(
                                "font-mono text-sm font-semibold tabular-nums",
                                myPP.totalPP > 0
                                  ? "text-success"
                                  : myPP.totalPP < 0
                                    ? "text-error"
                                    : "text-base-content/50",
                              )}
                            >
                              {formatPP(myPP.totalPP)}
                            </span>
                            {me.seat && (
                              <span className="text-xs text-base-content/40 ml-auto">
                                {SEAT_LABELS[me.seat as Seat] ?? me.seat}家
                              </span>
                            )}
                          </div>
                        )}

                        {!myPP && me && (
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono text-xl font-bold tabular-nums">
                              {me.finalScore.toLocaleString()}
                            </span>
                            {me.seat && (
                              <span className="text-xs text-base-content/40 ml-auto">
                                {SEAT_LABELS[me.seat as Seat] ?? me.seat}家
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5 mt-1">
                          {sortedPlayers.map((p, idx) => {
                            const isMe = p.userId === profileUserId;
                            return (
                              <div
                                key={p.userId}
                                className={clsx(
                                  "flex items-center gap-1.5 text-xs px-2 py-1 rounded",
                                  isMe
                                    ? "bg-primary/8 font-semibold"
                                    : "text-base-content/60",
                                )}
                              >
                                <span className="w-4 text-center text-[10px] text-base-content/40">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 truncate">
                                  {p.nickname}
                                </span>
                                <span className="font-mono tabular-nums">
                                  {p.finalScore.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/40 text-sm">
                {hasActiveFilters ? "没有匹配的对局记录" : "暂无对局记录"}
              </div>
            )}

            <div ref={sentinelRef} className="flex justify-center py-6">
              {isLoadingMore && (
                <span className="loading loading-spinner loading-md text-primary" />
              )}
              {!hasMoreMatches && matches.length > 0 && (
                <span className="text-xs text-base-content/30">
                  已加载全部对局
                </span>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
