import {
  CalendarBlankIcon,
  ClockIcon,
  FunnelIcon,
  PlusIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import type {
  GetActivesQuery,
  GetEventsQuery,
} from "@/client/graphql/__generated__";
import {
  type ActiveDateRange,
  useGetActivesQuery,
  useGetEventsQuery,
} from "@/client/graphql/__generated__";
import useAuth from "@/client/hooks/useAuth";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";

const SITE_URL = "https://origin.runespark.fun";

export const Route = createFileRoute("/{-$storeLocale}/_with-home-lo/actives")({
  head: () => ({
    meta: [
      { title: "约局 & 活动 - DiceShock 骰子奇兵" },
      {
        name: "description",
        content: "查看 DiceShock 骰子奇兵的约局和活动信息",
      },
      { property: "og:title", content: "约局 & 活动 - DiceShock 骰子奇兵" },
      { property: "og:description", content: "查看约局和活动，加入桌游社区" },
      { property: "og:image", content: `${SITE_URL}/edge/media/card/actives` },
      { property: "og:url", content: `${SITE_URL}/actives` },
    ],
  }),
  component: ActivesPage,
});

type ActiveItem = GetActivesQuery["actives"]["items"][number];
type EventItem = GetEventsQuery["events"][number];

type FilterType = "all" | "events" | "actives" | "expired";
type DateRange = "today" | "week" | "month" | "year" | undefined;

function ActiveTags({
  active,
  userId,
}: {
  active: ActiveItem;
  userId?: string;
}) {
  const { t } = useTranslation();
  const isCreator = userId && active.creatorId === userId;
  const myReg = userId
    ? active.registrations.find((r) => r.userId === userId)
    : undefined;

  const hasAny =
    isCreator ||
    myReg ||
    (active.boardGames && active.boardGames.length > 0) ||
    active.isSystemRecommended;

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {active.isSystemRecommended && (
        <span className="badge badge-primary badge-xs">推荐</span>
      )}
      {isCreator && (
        <span className="badge badge-accent badge-xs">
          {t("actives.creator")}
        </span>
      )}
      {!isCreator && myReg && !myReg.isWatching && (
        <span className="badge badge-primary badge-xs">
          {t("actives.joined")}
        </span>
      )}
      {!isCreator && myReg?.isWatching && (
        <span className="badge badge-ghost badge-xs">
          {t("actives.watching")}
        </span>
      )}
      {active.boardGames?.map(
        (g) =>
          g && (
            <span key={g.id} className="badge badge-primary badge-xs">
              🎲 {g.schName || g.engName}
            </span>
          ),
      )}
    </div>
  );
}

type WeekGroup = {
  weekKey: string;
  weekLabelKey: string;
  weekRange: string;
  weekYearPrefix: string;
  days: DayGroup[];
};

type DayGroup = {
  dateKey: string;
  dayLabelKey: string;
  dayDate: string;
  items: ActiveItem[];
};

type FlatCard = {
  type: "card";
  item: ActiveItem;
  dateKey: string;
  isFirstOfDay: boolean;
  dayLabel: string;
  sameDayCount: number;
};

function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      to="/{-$storeLocale}/events/$id"
      params={(prev) => ({ ...prev, id: event.id })}
      className="card bg-base-200 border border-base-content/10 hover:border-primary/30 transition-all hover:shadow-md overflow-hidden cursor-pointer"
    >
      {event.coverImageUrl && (
        <figure className="h-40 overflow-hidden">
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </figure>
      )}
      <div className="card-body p-4">
        <h3 className="card-title text-base">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-base-content/60 line-clamp-2">
            {event.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function ActivesPage() {
  const { t } = useTranslation();
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateRange, setDateRange] = useState<DateRange>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const { userInfo, session } = useAuth();
  const userId = session?.user?.id;

  const hasFilters = filterType !== "all" || dateRange !== undefined;

  const { data: eventsData } = useGetEventsQuery();

  const {
    data: activesData,
    loading: activesLoading,
    fetchMore,
  } = useGetActivesQuery({
    variables: {
      input: {
        pagination: { limit: 20 },
        showExpired: filterType === "expired" || undefined,
        dateRange: dateRange
          ? (dateRange.toUpperCase() as ActiveDateRange)
          : undefined,
        storeId: undefined,
      },
    },
  });

  useEffect(() => {
    if (eventsData?.events) {
      setEvents(eventsData.events);
    }
  }, [eventsData]);

  useEffect(() => {
    setLoading(activesLoading);
  }, [activesLoading]);

  useEffect(() => {
    if (activesData?.actives) {
      setActives(activesData.actives.items);
      setNextCursor(activesData.actives.pageInfo.nextCursor ?? undefined);
    }
  }, [activesData]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: {
          input: {
            pagination: { cursor: nextCursor, limit: 20 },
            showExpired: filterType === "expired" || undefined,
            dateRange: dateRange
              ? (dateRange.toUpperCase() as ActiveDateRange)
              : undefined,
            storeId: undefined,
          },
        },
      });
      if (result.data?.actives) {
        setActives((prev) => [...prev, ...result.data.actives.items]);
        setNextCursor(result.data.actives.pageInfo.nextCursor ?? undefined);
      }
    } catch (error) {
      console.error("Failed to fetch more actives:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchMore, nextCursor, filterType, dateRange]);

  const showEvents = filterType === "all" || filterType === "events";
  const showActives =
    filterType === "all" ||
    filterType === "actives" ||
    filterType === "expired";

  const weeks = useCallback(() => groupByWeekAndDay(actives), [actives])();

  const handleFilterType = (type: FilterType) => {
    if (type === "expired") {
      setFilterType("expired");
      setDateRange(undefined);
    } else {
      setFilterType(type === filterType ? "all" : type);
    }
  };

  const handleDateRange = (range: DateRange) => {
    setDateRange(range === dateRange ? undefined : range);
    if (filterType === "expired") {
      setFilterType("all");
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setDateRange(undefined);
  };

  return (
    <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            {t("actives.pageTitle")}
          </h1>

          <ClientOnly>
            <div className="flex items-center gap-2">
              {userInfo && (
                <Link
                  to="/{-$storeLocale}/actives/new"
                  className="btn btn-primary btn-sm gap-1"
                >
                  <PlusIcon className="size-4" weight="bold" />
                  {t("actives.createButton")}
                </Link>
              )}
            </div>
          </ClientOnly>
        </div>

        <ClientOnly>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <FunnelIcon className="size-4 text-base-content/40" />
            <button
              type="button"
              className={clsx(
                "btn btn-xs",
                filterType === "events" ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => handleFilterType("events")}
            >
              {t("actives.filterEvents")}
            </button>
            <button
              type="button"
              className={clsx(
                "btn btn-xs",
                filterType === "actives" ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => handleFilterType("actives")}
            >
              {t("actives.filterActives")}
            </button>
            <button
              type="button"
              className={clsx(
                "btn btn-xs",
                filterType === "expired" ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => handleFilterType("expired")}
            >
              {t("actives.filterExpired")}
            </button>
            <div className="w-px h-4 bg-base-300" />
            <button
              type="button"
              className={clsx(
                "btn btn-xs",
                dateRange === "today" ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => handleDateRange("today")}
            >
              {t("actives.filterToday")}
            </button>
            <button
              type="button"
              className={clsx(
                "btn btn-xs",
                dateRange === "week" ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => handleDateRange("week")}
            >
              {t("actives.filterThisWeek")}
            </button>
            <button
              type="button"
              className={clsx(
                "btn btn-xs",
                dateRange === "month" ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => handleDateRange("month")}
            >
              {t("actives.filterThisMonth")}
            </button>
            <button
              type="button"
              className={clsx(
                "btn btn-xs",
                dateRange === "year" ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => handleDateRange("year")}
            >
              {t("actives.filterThisYear")}
            </button>
            {hasFilters && (
              <button
                type="button"
                className="btn btn-xs btn-ghost text-error gap-1"
                onClick={clearFilters}
              >
                <XIcon className="size-3" />
                {t("actives.clearFilter")}
              </button>
            )}
          </div>
        </ClientOnly>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <>
            {showEvents && events.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-bold mb-4 text-base-content/70">
                  {t("actives.sectionEvents")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {showActives && (
              <>
                {actives.length === 0 ? (
                  <div className="text-center py-20 text-base-content/50">
                    <p className="text-lg mb-2">
                      {filterType === "expired"
                        ? t("actives.noExpiredActives")
                        : t("actives.noActives")}
                    </p>
                    <p className="text-sm">
                      {userInfo
                        ? t("actives.createHint")
                        : t("actives.loginToCreate")}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-10">
                    {weeks.map((week) => (
                      <WeekSection
                        key={week.weekKey}
                        week={week}
                        userId={userId}
                      />
                    ))}

                    {nextCursor && (
                      <div className="flex justify-center mt-4">
                        <button
                          type="button"
                          className={clsx(
                            "btn btn-ghost",
                            loadingMore && "loading",
                          )}
                          onClick={() => handleLoadMore()}
                          disabled={loadingMore}
                        >
                          {loadingMore
                            ? t("common.loading")
                            : t("common.loadMore")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!showEvents && !showActives && (
              <div className="text-center py-20 text-base-content/50">
                <p className="text-lg">{t("actives.noMatch")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

const COLS = 3;

function WeekSection({ week, userId }: { week: WeekGroup; userId?: string }) {
  const { t } = useTranslation();
  const flatCards = flattenWeek(week, t);

  const weekDisplay = week.weekLabelKey
    ? `${t(week.weekLabelKey)} · ${week.weekRange}`
    : `${week.weekYearPrefix}${week.weekRange}`;

  return (
    <section>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-base-300" />
        <span className="text-sm font-semibold text-base-content/40 tracking-wider">
          {weekDisplay}
        </span>
        <span className="text-xs text-base-content/30">
          {week.weekKey.slice(0, 4)}
        </span>
        <div className="flex-1 h-px bg-base-300" />
      </div>

      <div className="flex flex-col gap-y-4 md:hidden">
        {week.days.map((day) => (
          <div key={day.dateKey} className="flex flex-col">
            {day.items.map((item, idx) => (
              <SmActiveCard
                key={item.id}
                active={item}
                userId={userId}
                isFirstOfDay={idx === 0}
                isLastOfDay={idx === day.items.length - 1}
                dayLabel={computeDayLabel(day, t)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="hidden md:grid md:grid-cols-3 gap-y-8">
        {flatCards.map((card, gridIdx) => {
          if (card === null) {
            return <EmptyCell key={`empty-${gridIdx}`} />;
          }

          const col = gridIdx % COLS;
          const prevInRow = col > 0 ? flatCards[gridIdx - 1] : null;
          const nextInRow = col < COLS - 1 ? flatCards[gridIdx + 1] : null;

          const borderExtendBefore =
            prevInRow !== null &&
            prevInRow !== undefined &&
            prevInRow.dateKey === card.dateKey;
          const borderExtendAfter =
            nextInRow !== null &&
            nextInRow !== undefined &&
            nextInRow.dateKey === card.dateKey;

          const borderLeft = col === 0;
          const borderRight =
            col === COLS - 1 ||
            flatCards[gridIdx + 1] === null ||
            flatCards[gridIdx + 1] === undefined;

          return (
            <ActiveCard
              key={card.item.id}
              active={card.item}
              userId={userId}
              isFirstOfDay={card.isFirstOfDay}
              dayLabel={card.dayLabel}
              borderLeft={borderLeft}
              borderRight={borderRight}
              borderExtendBefore={borderExtendBefore}
              borderExtendAfter={borderExtendAfter}
            />
          );
        })}
      </div>
    </section>
  );
}

function computeDayLabel(day: DayGroup, t: (key: string) => string): string {
  return `${t(day.dayLabelKey)} · ${day.dayDate}`;
}

function EmptyCell() {
  return <div className="h-44" />;
}

function SmActiveCard({
  active,
  userId,
  isFirstOfDay,
  isLastOfDay,
  dayLabel,
}: {
  active: ActiveItem;
  userId?: string;
  isFirstOfDay: boolean;
  isLastOfDay: boolean;
  dayLabel: string;
}) {
  const { t } = useTranslation();
  const joinedCount = active.registrations.filter((r) => !r.isWatching).length;
  const watchingCount = active.registrations.filter((r) => r.isWatching).length;
  const isExpired =
    active.date < dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  return (
    <div>
      {isFirstOfDay && (
        <span className="text-xs font-bold text-primary-content bg-primary border border-primary rounded px-2 py-0.5 mb-1 ml-5 inline-block">
          {dayLabel}
        </span>
      )}

      <div className={clsx("relative flex", isExpired && "opacity-60")}>
        <div
          className={clsx(
            "absolute left-0 w-0.5 bg-primary",
            isFirstOfDay ? "-top-7" : "top-0",
            isLastOfDay ? "bottom-2" : "bottom-0",
          )}
        />

        <Link
          to="/{-$storeLocale}/actives/$id"
          params={(prev) => ({ ...prev, id: active.id })}
          className="block flex-1 card bg-base-200 border border-base-content/10 rounded-lg ml-5 my-1 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="card-body p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate">{active.title}</h3>
                <ActiveTags active={active} userId={userId} />
              </div>
              {isExpired && (
                <span className="badge badge-ghost badge-sm shrink-0">
                  {t("actives.expired")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-base-content/60">
              {active.time && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3.5" />
                  {active.time}
                </span>
              )}
              <span className="flex items-center gap-1">
                <UsersIcon className="size-3.5" />
                {joinedCount}/{active.maxPlayers}
                {watchingCount > 0 && (
                  <span className="text-base-content/40">
                    ( {t("actives.watchingCount", { count: watchingCount })} )
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-base-content/40">
              <span>
                {t("actives.creatorLabel")}
                {active.creator?.name ?? "Anonymous"}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function ActiveCard({
  active,
  userId,
  isFirstOfDay,
  dayLabel,
  borderLeft,
  borderRight,
  borderExtendBefore,
  borderExtendAfter,
}: {
  active: ActiveItem;
  userId?: string;
  isFirstOfDay: boolean;
  dayLabel: string;
  borderLeft: boolean;
  borderRight: boolean;
  borderExtendBefore: boolean;
  borderExtendAfter: boolean;
}) {
  const { t } = useTranslation();
  const joinedCount = active.registrations.filter((r) => !r.isWatching).length;
  const watchingCount = active.registrations.filter((r) => r.isWatching).length;
  const isExpired =
    active.date < dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  return (
    <div className={clsx("relative h-44", isExpired && "opacity-60")}>
      <div
        className={clsx(
          "absolute top-0 z-10 h-0.5 bg-primary translate-y-[8px]",
          borderExtendBefore ? "left-0" : "left-2",
          borderExtendAfter ? "right-0" : "right-2",
        )}
      />

      {isFirstOfDay && (
        <span className="absolute top-0 left-3 -translate-y-[calc(50%+2px)] z-10 text-xs font-bold text-primary-content bg-primary border border-primary rounded rounded-b-none px-2 py-0.5">
          {dayLabel}
        </span>
      )}

      <Link
        to="/{-$storeLocale}/actives/$id"
        params={(prev) => ({ ...prev, id: active.id })}
        className={clsx(
          "block h-full pt-4 card bg-base-200 border border-base-content/10 border-t-0 rounded-lg rounded-t-none mx-2 mt-2 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer",
        )}
      >
        <div className="card-body p-4 pt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate">{active.title}</h3>
              <ActiveTags active={active} userId={userId} />
            </div>
            {isExpired && (
              <span className="badge badge-ghost badge-sm shrink-0">
                {t("actives.expired")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-base-content/60">
            {active.time && (
              <span className="flex items-center gap-1">
                <ClockIcon className="size-3.5" />
                {active.time}
              </span>
            )}
            <span className="flex items-center gap-1">
              <UsersIcon className="size-3.5" />
              {joinedCount}/{active.maxPlayers}
              {watchingCount > 0 && (
                <span className="text-base-content/40">
                  ( {t("actives.watchingCount", { count: watchingCount })} )
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-base-content/40">
            <span>
              {t("actives.creatorLabel")}
              {active.creator?.name ?? "Anonymous"}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function flattenWeek(
  week: WeekGroup,
  t: (key: string) => string,
): (FlatCard | null)[] {
  const result: (FlatCard | null)[] = [];

  for (const day of week.days) {
    const startCol = result.length % COLS;
    if (startCol !== 0 && startCol + day.items.length > COLS) {
      const padding = COLS - startCol;
      for (let i = 0; i < padding; i++) {
        result.push(null);
      }
    }

    for (let i = 0; i < day.items.length; i++) {
      const col = result.length % COLS;
      result.push({
        type: "card",
        item: day.items[i],
        dateKey: day.dateKey,
        isFirstOfDay: i === 0,
        dayLabel: computeDayLabel(day, t),
        sameDayCount: day.items.length,
      });
    }
  }

  return result;
}

function groupByWeekAndDay(items: ActiveItem[]): WeekGroup[] {
  const weekMap = new Map<string, Map<string, ActiveItem[]>>();
  const today = dayjs().tz("Asia/Shanghai");

  for (const item of items) {
    const d = dayjs(item.date);
    const weekStart = d.startOf("week");
    const weekKey = weekStart.format("YYYY-MM-DD");
    const dateKey = item.date;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, new Map());
    }
    const dayMap = weekMap.get(weekKey)!;
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, []);
    }
    dayMap.get(dateKey)!.push(item);
  }

  const weeks: WeekGroup[] = [];

  for (const [weekKey, dayMap] of weekMap) {
    const weekStart = dayjs(weekKey);
    const weekEnd = weekStart.add(6, "day");

    const days: DayGroup[] = [];
    for (const [dateKey, dayItems] of dayMap) {
      const { labelKey, date: dayDate } = formatDayLabel(dateKey, today);
      days.push({
        dateKey,
        dayLabelKey: labelKey,
        dayDate,
        items: dayItems,
      });
    }

    const { labelKey, range, yearPrefix } = formatWeekLabel(
      weekStart,
      weekEnd,
      today,
    );
    weeks.push({
      weekKey,
      weekLabelKey: labelKey,
      weekRange: range,
      weekYearPrefix: yearPrefix,
      days,
    });
  }

  return weeks;
}

function formatWeekLabel(
  weekStart: dayjs.Dayjs,
  weekEnd: dayjs.Dayjs,
  today: dayjs.Dayjs,
): { labelKey: string; range: string; yearPrefix: string } {
  const thisWeekStart = today.startOf("week");
  const nextWeekStart = thisWeekStart.add(1, "week");
  const lastWeekStart = thisWeekStart.subtract(1, "week");

  const rangeStr = weekStart.isSame(weekEnd, "month")
    ? `${weekStart.format("M/D")} - ${weekEnd.format("D")}`
    : `${weekStart.format("M/D")} - ${weekEnd.format("M/D")}`;

  if (weekStart.isSame(thisWeekStart, "day")) {
    return { labelKey: "actives.thisWeek", range: rangeStr, yearPrefix: "" };
  }
  if (weekStart.isSame(nextWeekStart, "day")) {
    return { labelKey: "actives.nextWeek", range: rangeStr, yearPrefix: "" };
  }
  if (weekStart.isSame(lastWeekStart, "day")) {
    return { labelKey: "actives.lastWeek", range: rangeStr, yearPrefix: "" };
  }

  if (!weekStart.isSame(today, "year")) {
    return {
      labelKey: "",
      range: rangeStr,
      yearPrefix: `${weekStart.format("YYYY")}/`,
    };
  }

  return { labelKey: "", range: rangeStr, yearPrefix: "" };
}

const WEEKDAY_KEYS = [
  "actives.sunday",
  "actives.monday",
  "actives.tuesday",
  "actives.wednesday",
  "actives.thursday",
  "actives.friday",
  "actives.saturday",
];

function formatDayLabel(
  dateStr: string,
  today: dayjs.Dayjs,
): { labelKey: string; date: string } {
  const d = dayjs(dateStr);
  const tomorrow = today.add(1, "day");

  if (d.isSame(today, "day"))
    return { labelKey: "actives.today", date: d.format("M/D") };
  if (d.isSame(tomorrow, "day"))
    return { labelKey: "actives.tomorrow", date: d.format("M/D") };

  const weekdayKey = WEEKDAY_KEYS[d.day()];
  return { labelKey: weekdayKey, date: d.format("M/D") };
}
