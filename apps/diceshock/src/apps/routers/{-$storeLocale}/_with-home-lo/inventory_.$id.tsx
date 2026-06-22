import type { BoardGame } from "@lib/db";
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  ClockIcon,
  CrownSimpleIcon,
  GameControllerIcon,
  GlobeSimpleIcon,
  StarIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import LoadingImg from "@/client/components/diceshock/GameList/LoadingImg";
import type { GetOwnedBoardGameQuery } from "@/client/graphql/__generated__";
import { useGetOwnedBoardGameQuery } from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";

const SITE_URL = "https://origin.runespark.fun";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/inventory_/$id",
)({
  head: ({ params }) => ({
    meta: [
      { title: "桌游详情 - DiceShock 骰子奇兵" },
      { name: "description", content: "查看桌游详细信息、评分、游戏人数等" },
      { property: "og:title", content: "桌游详情 - DiceShock 骰子奇兵" },
      {
        property: "og:description",
        content: "查看桌游详细信息、评分、游戏人数等",
      },
      {
        property: "og:image",
        content: `${SITE_URL}/edge/media/card/board-game/${params.id}`,
      },
      { property: "og:url", content: `${SITE_URL}/inventory/${params.id}` },
    ],
  }),
  component: BoardGameDetailPage,
});

type GameRow = NonNullable<GetOwnedBoardGameQuery["ownedBoardGame"]>;

function formatPlayerRange(nums: number[] | null | undefined): string {
  if (!nums || nums.length === 0) return "—";
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length === 1) return `${sorted[0]}`;
  return `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

function ratingColor(r: number): string {
  if (r >= 8) return "text-secondary";
  if (r >= 6) return "text-primary";
  if (r >= 4) return "text-warning";
  return "text-error";
}

function PlayerAxis({
  playerNum,
  bestPlayerNum,
}: {
  playerNum: number[];
  bestPlayerNum: number[];
}) {
  const { t } = useTranslation();
  const bestSet = new Set(bestPlayerNum);
  const min = Math.min(...playerNum);
  const max = Math.max(...playerNum);
  const allNums = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div className="flex items-end gap-1 sm:gap-2">
      {allNums.map((n) => {
        const isSupported = playerNum.includes(n);
        const isBest = bestSet.has(n);
        return (
          <div key={n} className="flex flex-col items-center gap-1">
            {isBest && (
              <CrownSimpleIcon
                className="size-3.5 text-warning animate-pulse"
                weight="fill"
              />
            )}
            <div
              className={`
                relative flex items-center justify-center rounded-lg transition-all
                ${
                  isBest
                    ? "w-10 h-12 sm:w-12 sm:h-14 bg-gradient-to-b from-warning/30 to-warning/5 border-2 border-warning shadow-[0_0_12px_rgba(201,234,128,0.3)]"
                    : isSupported
                      ? "w-9 h-11 sm:w-10 sm:h-12 bg-base-200 border border-base-300"
                      : "w-9 h-11 sm:w-10 sm:h-12 bg-base-300/30 border border-base-300/30 opacity-30"
                }
              `}
            >
              <span
                className={`
                  font-bold
                  ${isBest ? "text-lg sm:text-xl text-warning" : isSupported ? "text-base sm:text-lg text-base-content" : "text-sm text-neutral-content/30"}
                `}
              >
                {n}
              </span>
            </div>
            <span className="text-[0.625rem] text-neutral-content/40">
              {isBest
                ? t("inventory.best")
                : isSupported
                  ? t("inventory.playable")
                  : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DifficultyMeter({ value }: { value: number }) {
  const maxDots = 10;
  const filled = Math.round(value);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxDots }, (_, i) => (
        <div
          key={i}
          className={`
            size-2.5 rounded-full transition-colors
            ${i < filled ? "bg-error shadow-[0_0_6px_rgba(230,160,122,0.5)]" : "bg-base-300"}
          `}
        />
      ))}
      <span className="ml-1.5 text-xs text-base-content/50">
        {value.toFixed(1)}/10
      </span>
    </div>
  );
}

function RatingRing({ rating, size = 120 }: { rating: number; size?: number }) {
  const pct = (rating / 10) * 100;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.3 0.01 266)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ratingGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="ratingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.678 0.178 292.52)" />
            <stop offset="100%" stopColor="oklch(0.885 0.2 156.66)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${ratingColor(rating)}`}>
          {rating.toFixed(1)}
        </span>
        <span className="text-xs text-base-content/40">/10</span>
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-base-200/60 rounded-lg border border-base-300/50">
      <span className="text-primary">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[0.625rem] text-base-content/40 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}

function BoardGameDetailPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const [game, setGame] = useState<GameRow | null>(null);
  const [loading, setLoading] = useState(true);

  const { data, loading: queryLoading } = useGetOwnedBoardGameQuery({
    variables: { id },
  });

  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading]);

  useEffect(() => {
    if (data?.ownedBoardGame) {
      setGame(data.ownedBoardGame);
    }
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-5xl flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-5xl text-center py-20">
          <p className="text-lg text-base-content/60">
            {t("inventory.gameNotFound")}
          </p>
          <Link to="/{-$storeLocale}/inventory" className="btn btn-ghost mt-4">
            {t("inventory.backToInventory")}
          </Link>
        </div>
      </main>
    );
  }

  const content = (
    game.content ? JSON.parse(game.content) : null
  ) as BoardGame.BoardGameCol | null;
  const coverUrl = content?.sch_cover_url || content?.eng_cover_url || "";
  const gameName = game.schName || game.engName || "Unknown";
  const engName = game.engName || "";
  const rating = game.gstoneRating ?? 0;
  const playerNum = (
    game.playerNum ? JSON.parse(game.playerNum) : []
  ) as number[];
  const bestPlayerNum = (
    game.bestPlayerNum ? JSON.parse(game.bestPlayerNum) : []
  ) as number[];
  const parsedCategory = game.category ? JSON.parse(game.category) : null;
  const categories = (
    Array.isArray(parsedCategory)
      ? parsedCategory
      : parsedCategory
        ? [parsedCategory]
        : []
  ) as BoardGame.Category[];
  const parsedMode = game.mode ? JSON.parse(game.mode) : null;
  const mode = parsedMode as BoardGame.Mode | BoardGame.Mode[] | null;
  const modes: BoardGame.Mode[] = Array.isArray(mode)
    ? mode
    : mode
      ? [mode]
      : [];
  const difficulty = content?.difficulty ?? 0;
  const publishYear = content?.publish_year ?? 0;
  const avgTime = content?.average_time_per_player ?? 0;
  const language = content?.primary_language ?? "";

  return (
    <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          to="/{-$storeLocale}/inventory"
          className="btn btn-ghost btn-sm mb-6 -ml-2 gap-1"
        >
          <ArrowLeftIcon className="size-4" />
          {t("inventory.backToInventory")}
        </Link>

        <div className="relative rounded-2xl overflow-hidden mb-8">
          {coverUrl && (
            <div className="absolute inset-0">
              <LoadingImg
                src={coverUrl}
                alt=""
                className="size-full object-cover scale-110 blur-2xl opacity-40"
                width={400}
                height={400}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/80 to-base-100/40" />
            </div>
          )}

          <div className="relative flex flex-col md:flex-row gap-6 md:gap-10 p-6 sm:p-8 md:p-10">
            {coverUrl && (
              <div className="shrink-0 self-center md:self-start">
                <div className="w-48 sm:w-56 md:w-64 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-base-content/10 ring-1 ring-primary/20">
                  <LoadingImg
                    src={coverUrl}
                    alt={gameName}
                    className="size-full object-cover"
                    width={1600}
                    height={900}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                  {gameName}
                </h1>
                {engName && gameName !== engName && (
                  <p className="mt-1 text-base sm:text-lg text-base-content/50 font-light">
                    {engName}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {content?.is_expansion === 1 && (
                    <span className="badge badge-warning badge-sm">
                      {t("inventory.expansion")}
                    </span>
                  )}
                  {categories.map((c) => (
                    <span
                      key={c.eng_domain_value}
                      className="badge badge-accent badge-outline badge-sm"
                    >
                      {c.sch_domain_value || c.eng_domain_value}
                    </span>
                  ))}
                  {modes.map((m) => (
                    <span
                      key={m.eng_domain_value}
                      className="badge badge-primary badge-outline badge-sm"
                    >
                      {m.sch_domain_value || m.eng_domain_value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 mt-6">
                {rating >= 0.5 && <RatingRing rating={rating} size={100} />}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <UsersIcon className="size-4 text-primary" />
                    <span className="text-base-content/70">
                      {formatPlayerRange(playerNum)}
                      {t("inventory.playersUnit")}
                    </span>
                  </div>
                  {bestPlayerNum.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <CrownSimpleIcon
                        className="size-4 text-warning"
                        weight="fill"
                      />
                      <span className="text-warning">
                        {t("inventory.best")} {formatPlayerRange(bestPlayerNum)}
                        {t("inventory.playersUnit")}
                      </span>
                    </div>
                  )}
                  {difficulty > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <GameControllerIcon className="size-4 text-error/70" />
                      <DifficultyMeter value={difficulty} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {playerNum.length > 0 && (
            <InfoPill
              icon={<UsersIcon className="size-4" />}
              label={t("inventory.playerCount")}
              value={`${formatPlayerRange(playerNum)}${t("inventory.playersUnit")}`}
            />
          )}
          {bestPlayerNum.length > 0 && (
            <InfoPill
              icon={<CrownSimpleIcon className="size-4" weight="fill" />}
              label={t("inventory.bestPlayerCount")}
              value={`${formatPlayerRange(bestPlayerNum)}${t("inventory.playersUnit")}`}
            />
          )}
          {avgTime > 0 && (
            <InfoPill
              icon={<ClockIcon className="size-4" />}
              label={t("inventory.avgTimePerPlayer")}
              value={`${avgTime}${t("inventory.minutesUnit")}`}
            />
          )}
          {publishYear > 0 && (
            <InfoPill
              icon={<CalendarBlankIcon className="size-4" />}
              label={t("inventory.publishYear")}
              value={`${publishYear}`}
            />
          )}
          {language && (
            <InfoPill
              icon={<GlobeSimpleIcon className="size-4" />}
              label={t("inventory.language")}
              value={language}
            />
          )}
          {rating >= 0.5 && (
            <InfoPill
              icon={<StarIcon className="size-4" weight="fill" />}
              label={t("inventory.rating")}
              value={`${rating.toFixed(1)} / 10`}
            />
          )}
        </div>

        {playerNum.length > 0 && (
          <div className="card bg-neutral text-neutral-content border border-base-content/5 mb-8">
            <div className="card-body p-5 sm:p-6">
              <h3 className="text-sm font-bold text-neutral-content/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UsersIcon className="size-4" />
                {t("inventory.playerFit")}
              </h3>
              <div className="flex justify-center">
                <PlayerAxis
                  playerNum={playerNum}
                  bestPlayerNum={bestPlayerNum}
                />
              </div>
              {bestPlayerNum.length > 0 && (
                <p className="text-xs text-neutral-content/30 text-center mt-3">
                  <CrownSimpleIcon
                    className="inline size-3 text-warning mr-1"
                    weight="fill"
                  />
                  {t("inventory.bestPlayerMark")}
                </p>
              )}
            </div>
          </div>
        )}

        {(categories.length > 0 || modes.length > 0) && (
          <div className="card bg-neutral text-neutral-content border border-base-content/5 mb-8">
            <div className="card-body p-5 sm:p-6">
              <h3 className="text-sm font-bold text-neutral-content/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TagIcon className="size-4" />
                {t("inventory.categoriesAndModes")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <div
                    key={c.eng_domain_value}
                    className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-sm"
                  >
                    <span className="text-accent font-semibold">
                      {c.sch_domain_value || c.eng_domain_value}
                    </span>
                    {c.sch_domain_value && c.eng_domain_value && (
                      <span className="text-neutral-content/30 ml-2 text-xs">
                        {c.eng_domain_value}
                      </span>
                    )}
                  </div>
                ))}
                {modes.map((m) => (
                  <div
                    key={m.eng_domain_value}
                    className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-sm"
                  >
                    <span className="text-primary font-semibold">
                      {m.sch_domain_value || m.eng_domain_value}
                    </span>
                    {m.sch_domain_value && m.eng_domain_value && (
                      <span className="text-neutral-content/30 ml-2 text-xs">
                        {m.eng_domain_value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {difficulty > 0 && (
          <div className="card bg-neutral text-neutral-content border border-base-content/5 mb-8">
            <div className="card-body p-5 sm:p-6">
              <h3 className="text-sm font-bold text-neutral-content/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                <GameControllerIcon className="size-4" />
                {t("inventory.difficultyIndex")}
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-base-300 rounded-full overflow-hidden">
                  <div
                    className="h-full w-full rounded-full bg-gradient-to-r from-success via-warning to-error transition-all duration-700"
                    style={{
                      maskImage: `linear-gradient(to right, black ${(difficulty / 10) * 100}%, transparent ${(difficulty / 10) * 100}%)`,
                      WebkitMaskImage: `linear-gradient(to right, black ${(difficulty / 10) * 100}%, transparent ${(difficulty / 10) * 100}%)`,
                    }}
                  />
                </div>
                <span className="text-lg font-bold text-neutral-content/70 shrink-0">
                  {difficulty.toFixed(1)}
                  <span className="text-sm text-neutral-content/30">/10</span>
                </span>
              </div>
              <div className="flex justify-between text-xs text-neutral-content/30 mt-1 px-0.5">
                <span>{t("inventory.easy")}</span>
                <span>{t("inventory.medium")}</span>
                <span>{t("inventory.hard")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
