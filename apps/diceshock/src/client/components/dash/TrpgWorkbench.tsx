import { ArrowClockwiseIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  type TrpgSessionFieldsFragment,
  useTrpgDashboardQuery,
} from "@/client/graphql/__generated__/trpg";
import { useTranslation } from "@/client/hooks/useTranslation";
import { sessionPricing } from "@/shared/trpg/pricing";
import dayjs from "@/shared/utils/dayjs-config";
import { DataTable } from "./DataTable";
import { displayTime, ErrorMessage } from "./trpg/common";
import { ExportScheduleButton } from "./trpg/ExportScheduleButton";
import { ManagementNav } from "./trpg/ManagementNav";
import { SessionDetails } from "./trpg/SessionDetails";
import { SessionEditor } from "./trpg/SessionEditor";
import { WeekSchedule } from "./trpg/WeekSchedule";

export function TrpgWorkbench() {
  const { t } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [mode, setMode] = useState("week");
  const [week, setWeek] = useState(() => {
    const today = dayjs().tz("Asia/Shanghai");
    return today.subtract((today.day() + 6) % 7, "day").format("YYYY-MM-DD");
  });
  const weekEnd = dayjs
    .tz(week, "Asia/Shanghai")
    .add(7, "day")
    .format("YYYY-MM-DD");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const { data, loading, error, refetch, fetchMore } = useTrpgDashboardQuery({
    variables: {
      filters: {
        storeId: storeId || undefined,
        offset,
        ...(mode === "week" ? { dateFrom: week, dateTo: weekEnd } : {}),
        ...(mode === "pending" ? { status: "pending" } : {}),
        ...(mode === "unscheduled" ? { unscheduled: true } : {}),
      },
    },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const selected = data?.trpgSessions.items.find((s) => s.id === selectedId);
  const store = data?.trpgStores.find((s) => s.id === storeId);
  const columns = useMemo<ColumnDef<TrpgSessionFieldsFragment, unknown>[]>(
    () => [
      { accessorKey: "title", header: t("trpg.title"), size: 240 },
      { accessorKey: "storeName", header: t("trpg.store") },
      { accessorKey: "hostName", header: t("trpg.host") },
      {
        accessorKey: "sessionType",
        header: t("trpg.type"),
        cell: ({ row }) => sessionPricing(row.original.sessionType).label,
      },
      {
        accessorKey: "startsAt",
        header: t("trpg.startsAt"),
        cell: ({ row }) =>
          displayTime(row.original.startsAt) || t("trpg.pendingTime"),
        size: 180,
      },
      {
        accessorKey: "status",
        header: t("trpg.state"),
        cell: ({ row }) => (
          <span className="badge badge-soft badge-sm">
            {t(`trpg.status.${row.original.status}`)}
          </span>
        ),
      },
      {
        accessorKey: "pendingCount",
        header: t("trpg.pendingCount"),
        size: 100,
      },
    ],
    [t],
  );
  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 p-4 md:p-6">
        {data?.trpgStores.some((s) => s.canReview) && <ManagementNav />}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("trpgOps.schedule")}</h1>
            <p className="mt-1 text-sm text-base-content/60">
              {t("trpg.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium" htmlFor="trpg-store">
              {t("trpg.store")}
            </label>
            <select
              id="trpg-store"
              className="select"
              value={storeId}
              onChange={(e) => {
                setStoreId(e.target.value);
                setOffset(0);
                setSelectedId("");
                setEditing(false);
              }}
            >
              <option value="">{t("trpg.allStores")}</option>
              {data?.trpgStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!storeId || loading}
              onClick={() => {
                setSelectedId("");
                setEditing(false);
                setEditing(true);
              }}
            >
              <PlusIcon size={18} />
              {t("trpg.create")}
            </button>
            <button
              type="button"
              className="btn btn-square"
              aria-label={t("trpg.refresh")}
              disabled={loading}
              onClick={() => void refetch().catch(() => {})}
            >
              <ArrowClockwiseIcon
                size={18}
                className={
                  loading ? "animate-spin motion-reduce:animate-none" : ""
                }
              />
            </button>
          </div>
        </header>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("trpgOps.views")}
        >
          {["week", "pending", "unscheduled", "all"].map((view) => (
            <button
              type="button"
              key={view}
              aria-pressed={mode === view}
              className={`btn btn-sm min-h-10 ${mode === view ? "btn-neutral" : "btn-ghost"}`}
              onClick={() => {
                setMode(view);
                setOffset(0);
                setSelectedId("");
                setEditing(false);
              }}
            >
              {t(`trpgOps.${view}`)}
            </button>
          ))}
        </div>
        {mode === "week" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setWeek(
                    dayjs
                      .tz(week, "Asia/Shanghai")
                      .subtract(7, "day")
                      .format("YYYY-MM-DD"),
                  );
                  setOffset(0);
                  setSelectedId("");
                  setEditing(false);
                }}
              >
                {t("trpgOps.previousWeek")}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  const today = dayjs().tz("Asia/Shanghai");
                  setWeek(
                    today
                      .subtract((today.day() + 6) % 7, "day")
                      .format("YYYY-MM-DD"),
                  );
                  setOffset(0);
                  setSelectedId("");
                  setEditing(false);
                }}
              >
                {t("trpgOps.thisWeek")}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setWeek(weekEnd);
                  setOffset(0);
                  setSelectedId("");
                  setEditing(false);
                }}
              >
                {t("trpgOps.nextWeek")}
              </button>
            </div>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              {t("trpgOps.chooseDate")}
              <input
                type="date"
                className="input input-sm"
                value={week}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const date = dayjs.tz(e.target.value, "Asia/Shanghai");
                  setWeek(
                    date
                      .subtract((date.day() + 6) % 7, "day")
                      .format("YYYY-MM-DD"),
                  );
                  setOffset(0);
                  setSelectedId("");
                  setEditing(false);
                }}
              />
            </label>
            <span className="text-sm">
              {week} —{" "}
              {dayjs
                .tz(weekEnd, "Asia/Shanghai")
                .subtract(1, "day")
                .format("YYYY-MM-DD")}{" "}
              · {t("trpgOps.beijingTime")}
            </span>
            <ExportScheduleButton
              key={`${week}-${storeId}`}
              start={week}
              end={weekEnd}
              storeId={storeId}
              storeName={store?.name || "全部门店"}
              disabled={loading || !!error || !data?.trpgStores.length}
            />
          </div>
        )}
        {!storeId && (
          <p className="text-sm text-base-content/70">
            {t("trpgOps.selectStoreToCreate")}
          </p>
        )}
        <ErrorMessage error={error?.message} />
        {error && (
          <button
            type="button"
            className="btn self-start"
            onClick={() => void refetch().catch(() => {})}
          >
            {t("common.retry")}
          </button>
        )}
        {!loading && !error && data?.trpgStores.length === 0 && (
          <div className="alert">{t("trpg.noAccess")}</div>
        )}
        {editing && (selected || storeId) && (
          <SessionEditor
            key={selected?.id || storeId}
            storeId={selected?.storeId || storeId}
            canReview={selected?.canReview ?? !!store?.canReview}
            session={selected}
            onSaved={() => refetch()}
            onClose={() => setEditing(false)}
          />
        )}
        {!editing && selected && (
          <SessionDetails
            key={selected.id}
            session={selected}
            onChanged={() => refetch()}
            onEdit={() => setEditing(true)}
            onClose={() => setSelectedId("")}
          />
        )}
        {mode === "week" ? (
          <section aria-busy={loading}>
            {loading ? (
              <p role="status" className="py-8 text-center">
                {t("common.loading")}
              </p>
            ) : (
              !error && (
                <WeekSchedule
                  start={week}
                  sessions={data?.trpgSessions.items ?? []}
                  incomplete={!!data?.trpgSessions.hasMore}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setEditing(false);
                  }}
                />
              )
            )}
            {data?.trpgSessions.hasMore && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-sm">{t("trpgOps.weekPaged")}</p>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={loading}
                  onClick={() =>
                    void fetchMore({
                      variables: {
                        filters: {
                          storeId: storeId || undefined,
                          dateFrom: week,
                          dateTo: weekEnd,
                          offset: data.trpgSessions.items.length,
                        },
                      },
                      updateQuery: (previous, { fetchMoreResult }) => ({
                        ...previous,
                        trpgSessions: {
                          ...fetchMoreResult.trpgSessions,
                          items: [
                            ...previous.trpgSessions.items,
                            ...fetchMoreResult.trpgSessions.items,
                          ],
                        },
                      }),
                    }).catch(() => {})
                  }
                >
                  {t("trpgOps.loadMore")}
                </button>
              </div>
            )}
          </section>
        ) : (
          <section
            className="flex min-h-96 flex-col overflow-hidden rounded-box border border-base-300 bg-base-100"
            aria-label={t("trpg.sessions")}
          >
            <DataTable
              columns={columns}
              data={data?.trpgSessions.items ?? []}
              loading={loading}
              emptyMessage={error ? t("common.error") : t("trpg.noSessions")}
              renderActions={(row) => (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSelectedId(row.id);
                    setEditing(false);
                  }}
                >
                  {t("trpg.details")}
                </button>
              )}
            />
            <div className="flex items-center justify-between border-t border-base-200 p-3">
              <span className="text-sm text-base-content/60">
                {t("trpg.page", { page: offset / 30 + 1 })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={offset === 0 || loading}
                  onClick={() => {
                    setOffset(offset - 30);
                    setSelectedId("");
                    setEditing(false);
                  }}
                >
                  {t("trpg.previous")}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={!data?.trpgSessions.hasMore || loading}
                  onClick={() => {
                    setOffset(offset + 30);
                    setSelectedId("");
                    setEditing(false);
                  }}
                >
                  {t("trpg.next")}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
