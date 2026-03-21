import {
  CalendarBlankIcon,
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

function ActivesPage() {
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpired, setShowExpired] = useState(false);
  const { userInfo } = useAuth();

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

  const grouped = groupByDate(actives);

  return (
    <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
      <div className="mx-auto w-full max-w-3xl">
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
          <div className="relative">
            <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-base-300" />

            {grouped.map(([dateKey, items]) => (
              <div key={dateKey} className="mb-8">
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="size-3 rounded-full bg-primary shrink-0 relative z-10 ml-[10px] sm:ml-[18px]" />
                  <h2 className="text-lg sm:text-xl font-bold text-primary">
                    {formatDateLabel(dateKey)}
                  </h2>
                </div>

                <div className="pl-10 sm:pl-14 flex flex-col gap-3">
                  {items.map((active) => (
                    <ActiveCard key={active.id} active={active} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ActiveCard({ active }: { active: ActiveItem }) {
  const joinedCount = active.registrations.filter((r) => !r.is_watching).length;
  const watchingCount = active.registrations.filter(
    (r) => r.is_watching,
  ).length;
  const isExpired =
    active.date < dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  return (
    <Link
      to="/actives/$id"
      params={{ id: active.id }}
      className={clsx(
        "card bg-base-200 border border-base-content/10 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer",
        isExpired && "opacity-60",
      )}
    >
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg truncate">
              {active.title}
            </h3>
            {active.boardGame && (
              <span className="badge badge-primary badge-sm mt-1">
                🎲 {active.boardGame.sch_name || active.boardGame.eng_name}
              </span>
            )}
          </div>
          {isExpired && (
            <span className="badge badge-ghost badge-sm shrink-0">已过期</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-base-content/60">
          <span className="flex items-center gap-1">
            <CalendarBlankIcon className="size-3.5" />
            {active.date}
          </span>
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
  );
}

function groupByDate(items: ActiveItem[]): [string, ActiveItem[]][] {
  const map = new Map<string, ActiveItem[]>();
  for (const item of items) {
    const key = item.date;
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function formatDateLabel(dateStr: string): string {
  const d = dayjs(dateStr);
  const today = dayjs();
  const tomorrow = today.add(1, "day");

  if (d.isSame(today, "day")) return `今天 · ${d.format("MM/DD")}`;
  if (d.isSame(tomorrow, "day")) return `明天 · ${d.format("MM/DD")}`;

  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[d.day()];

  if (d.isSame(today, "year")) return `${d.format("MM/DD")} ${weekday}`;
  return `${d.format("YYYY/MM/DD")} ${weekday}`;
}
