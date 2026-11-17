import type { TrpgSessionFieldsFragment } from "@/client/graphql/__generated__/trpg";
import { useTranslation } from "@/client/hooks/useTranslation";
import { sessionPricing } from "@/shared/trpg/pricing";
import dayjs from "@/shared/utils/dayjs-config";
import { displayTime } from "./common";

export function WeekSchedule({
  start,
  sessions,
  incomplete,
  onSelect,
}: {
  start: string;
  sessions: TrpgSessionFieldsFragment[];
  incomplete: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const days = Array.from({ length: 7 }, (_, i) =>
    dayjs.tz(start, "Asia/Shanghai").add(i, "day"),
  );
  const today = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      {days.map((day) => {
        const items = sessions.filter(
          (s) =>
            s.startsAt &&
            Date.parse(s.startsAt) < day.add(1, "day").valueOf() &&
            Date.parse(s.startsAt) + s.durationMinutes * 60000 > day.valueOf(),
        );
        return (
          <section
            key={day.format("YYYY-MM-DD")}
            className={`min-w-0 rounded-box border bg-base-100 ${day.format("YYYY-MM-DD") === today ? "border-primary" : "border-base-300"}`}
          >
            <h2 className="border-b border-base-200 p-3 font-semibold">
              {day.format("MM/DD")}{" "}
              <span className="text-sm text-base-content/60">
                {t(`trpgOps.day${day.day()}`)}
              </span>
            </h2>
            <div className="space-y-2 p-2">
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="w-full space-y-2 rounded-lg border border-base-300 p-3 text-left hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span
                    className={`badge badge-sm ${s.status === "pending" ? "badge-warning" : s.status === "published" ? "badge-success" : "badge-ghost"}`}
                  >
                    {t(`trpg.status.${s.status}`)}
                  </span>
                  <p className="text-sm font-semibold break-words">{s.title}</p>
                  <p className="text-xs text-base-content/70">
                    {sessionPricing(s.sessionType).label}
                  </p>
                  <p className="text-xs">
                    {displayTime(s.startsAt).slice(5)}
                    <br />—{" "}
                    {dayjs(s.startsAt)
                      .tz("Asia/Shanghai")
                      .add(s.durationMinutes, "minute")
                      .format("MM-DD HH:mm")}
                  </p>
                  <p className="text-xs text-base-content/70 break-words">
                    {s.storeName} · {s.tableName || t("trpgOps.noTable")}
                  </p>
                  <p className="text-xs text-base-content/70">
                    {s.hostName} · {s.confirmedCount}/{s.capacity}{" "}
                    {t("trpgOps.confirmed")}
                  </p>
                  {s.pendingCount > 0 && (
                    <p className="text-xs font-medium">
                      {t("trpg.pendingCount")}：{s.pendingCount}
                    </p>
                  )}
                </button>
              ))}
              {items.length === 0 && (
                <p className="py-5 text-center text-sm text-base-content/60">
                  {t(incomplete ? "trpgOps.moreNotLoaded" : "trpgOps.freeDay")}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
