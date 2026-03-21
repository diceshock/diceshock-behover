import {
  ClockIcon,
  FunnelIcon,
  PlusIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/_with-home-lo/actives")({
  component: ActivesPage,
});

type ActiveItem = Awaited<
  ReturnType<typeof trpcClientPublic.actives.list.query>
>["items"][number];

function ActiveTags({
  active,
  userId,
}: {
  active: ActiveItem;
  userId?: string;
}) {
  const isCreator = userId && active.creator_id === userId;
  const myReg = userId
    ? active.registrations.find((r) => r.user_id === userId)
    : undefined;

  const hasAny =
    isCreator || myReg || (active.boardGames && active.boardGames.length > 0);

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {isCreator && <span className="badge badge-accent badge-xs">发起者</span>}
      {!isCreator && myReg && !myReg.is_watching && (
        <span className="badge badge-primary badge-xs">已加入</span>
      )}
      {!isCreator && myReg?.is_watching && (
        <span className="badge badge-ghost badge-xs">已观望</span>
      )}
      {active.boardGames?.map(
        (g) =>
          g && (
            <span key={g.id} className="badge badge-primary badge-xs">
              🎲 {g.sch_name || g.eng_name}
            </span>
          ),
      )}
    </div>
  );
}

type WeekGroup = {
  weekKey: string;
  weekLabel: string;
  days: DayGroup[];
};

type DayGroup = {
  dateKey: string;
  dayLabel: string;
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

function ActivesPage() {
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpired, setShowExpired] = useState(false);
  const { userInfo, session } = useAuth();
  const userId = session?.user?.id;

  const fetchActives = useCallback(async () => {
    setLoading(true);
    try {
      const result = await trpcClientPublic.actives.list.query({
        limit: 50,
        showExpired,
      });
      setActives(result.items);
    } catch (error) {
      console.error("Failed to fetch actives:", error);
    } finally {
      setLoading(false);
    }
  }, [showExpired]);

  useEffect(() => {
    fetchActives();
  }, [fetchActives]);

  const weeks = groupByWeekAndDay(actives);

  return (
    <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            活动&约局
          </h1>

          <ClientOnly>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={clsx(
                  "btn btn-sm btn-ghost gap-1",
                  showExpired && "btn-active",
                )}
                onClick={() => setShowExpired((v) => !v)}
              >
                <FunnelIcon className="size-4" />
                {showExpired ? "隐藏过期" : "显示过期"}
              </button>

              {userInfo && (
                <Link
                  to="/actives/new"
                  className="btn btn-primary btn-sm gap-1"
                >
                  <PlusIcon className="size-4" weight="bold" />
                  发起约局
                </Link>
              )}
            </div>
          </ClientOnly>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : actives.length === 0 ? (
          <div className="text-center py-20 text-base-content/50">
            <p className="text-lg mb-2">
              {showExpired ? "没有过期的约局" : "暂时没有约局"}
            </p>
            <p className="text-sm">
              {userInfo
                ? "点击右上角发起一个新的约局吧！"
                : "登录后可以发起约局"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {weeks.map((week) => (
              <WeekSection key={week.weekKey} week={week} userId={userId} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const COLS = 3;

function WeekSection({ week, userId }: { week: WeekGroup; userId?: string }) {
  const flatCards = flattenWeek(week);

  return (
    <section>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-base-300" />
        <span className="text-sm font-semibold text-base-content/40 tracking-wider">
          {week.weekLabel}
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
                dayLabel={day.dayLabel}
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
  const joinedCount = active.registrations.filter((r) => !r.is_watching).length;
  const watchingCount = active.registrations.filter(
    (r) => r.is_watching,
  ).length;
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
          to="/actives/$id"
          params={{ id: active.id }}
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
                  已过期
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
                {joinedCount}/{active.max_players}
                {watchingCount > 0 && (
                  <span className="text-base-content/40">
                    ({watchingCount}观望)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-base-content/40">
              <span>发起人: {active.creator.name ?? "Anonymous"}</span>
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
  const joinedCount = active.registrations.filter((r) => !r.is_watching).length;
  const watchingCount = active.registrations.filter(
    (r) => r.is_watching,
  ).length;
  const isExpired =
    active.date < dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  return (
    <div className={clsx("relative h-44", isExpired && "opacity-60")}>
      <div
        className={clsx(
          "absolute top-0 h-0.5 bg-primary",
          borderExtendBefore ? "left-0" : "left-2",
          borderExtendAfter ? "right-0" : "right-2",
        )}
      />

      {isFirstOfDay && (
        <span className="absolute top-0 left-3 -translate-y-1/2 z-10 text-xs font-bold text-primary-content bg-primary border border-primary rounded px-2 py-0.5">
          {dayLabel}
        </span>
      )}

      <Link
        to="/actives/$id"
        params={{ id: active.id }}
        className={clsx(
          "block h-full pt-4 card bg-base-200 border border-base-content/10 rounded-lg mx-2 mt-2 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer",
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
                已过期
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
              {joinedCount}/{active.max_players}
              {watchingCount > 0 && (
                <span className="text-base-content/40">
                  ({watchingCount}观望)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-base-content/40">
            <span>发起人: {active.creator.name ?? "Anonymous"}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function flattenWeek(week: WeekGroup): (FlatCard | null)[] {
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
        dayLabel: day.dayLabel,
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
      days.push({
        dateKey,
        dayLabel: formatDayLabel(dateKey, today),
        items: dayItems,
      });
    }

    weeks.push({
      weekKey,
      weekLabel: formatWeekLabel(weekStart, weekEnd, today),
      days,
    });
  }

  return weeks;
}

function formatWeekLabel(
  weekStart: dayjs.Dayjs,
  weekEnd: dayjs.Dayjs,
  today: dayjs.Dayjs,
): string {
  const thisWeekStart = today.startOf("week");
  const nextWeekStart = thisWeekStart.add(1, "week");
  const lastWeekStart = thisWeekStart.subtract(1, "week");

  const rangeStr = weekStart.isSame(weekEnd, "month")
    ? `${weekStart.format("M/D")} - ${weekEnd.format("D")}`
    : `${weekStart.format("M/D")} - ${weekEnd.format("M/D")}`;

  if (weekStart.isSame(thisWeekStart, "day")) {
    return `本周 · ${rangeStr}`;
  }
  if (weekStart.isSame(nextWeekStart, "day")) {
    return `下周 · ${rangeStr}`;
  }
  if (weekStart.isSame(lastWeekStart, "day")) {
    return `上周 · ${rangeStr}`;
  }

  if (!weekStart.isSame(today, "year")) {
    return `${weekStart.format("YYYY/")}${rangeStr}`;
  }

  return rangeStr;
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatDayLabel(dateStr: string, today: dayjs.Dayjs): string {
  const d = dayjs(dateStr);
  const tomorrow = today.add(1, "day");

  if (d.isSame(today, "day")) return `今天 · ${d.format("M/D")}`;
  if (d.isSame(tomorrow, "day")) return `明天 · ${d.format("M/D")}`;

  const weekday = WEEKDAYS[d.day()];
  return `${weekday} · ${d.format("M/D")}`;
}
