import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AdminStoreFilter from "@/client/components/AdminStoreFilter";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  OrderGroupBy,
  OrderSortBy,
  OrderStatusFilter,
  SortOrder,
  useBatchPauseOrdersMutation,
  useBatchResumeOrdersMutation,
  useOrderStatusChangedSubscription,
  useOrdersQuery,
  usePauseOrderMutation,
  usePublishedPricingQuery,
  useResumeOrderMutation,
} from "@/client/graphql/__generated__";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";
import {
  calculatePrice,
  formatPrice,
  type SnapshotData,
} from "@/shared/utils/pricing";

type StatusFilter = "all" | "active" | "paused" | "ended";
type SortBy = "start_at" | "end_at";
type SortOrderVal = "asc" | "desc";
type GroupBy = "table" | "user" | "date" | "none";

type OrdersList = NonNullable<
  ReturnType<typeof useOrdersQuery>["data"]
>["orders"];
type OrderItem = OrdersList["items"][number];

export const Route = createFileRoute("/dash/orders")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    status: ["all", "active", "paused", "ended"].includes(
      search.status as string,
    )
      ? (search.status as StatusFilter)
      : "all",
    sortBy: ["start_at", "end_at"].includes(search.sortBy as string)
      ? (search.sortBy as SortBy)
      : "start_at",
    sortOrder: ["asc", "desc"].includes(search.sortOrder as string)
      ? (search.sortOrder as SortOrderVal)
      : "desc",
    groupBy: ["table", "user", "date", "none"].includes(
      search.groupBy as string,
    )
      ? (search.groupBy as GroupBy)
      : "none",
    page: Number(search.page) > 0 ? Number(search.page) : 1,
  }),
});

function formatTime(val: number | null | undefined): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm:ss") : "—";
  } catch {
    return "—";
  }
}

function parsePricingData(
  publishedPricing:
    | {
        data?: {
          config?: { daytimeStart?: string; daytimeEnd?: string } | null;
          plans?: string | null;
        } | null;
      }
    | null
    | undefined,
): SnapshotData | null {
  if (!publishedPricing?.data?.plans) return null;
  try {
    const plans = JSON.parse(publishedPricing.data.plans);
    const config = publishedPricing.data.config;
    return {
      config: {
        daytime_start: config?.daytimeStart ?? "10:00",
        daytime_end: config?.daytimeEnd ?? "18:00",
      },
      plans,
    };
  } catch {
    return null;
  }
}

const STATUS_TO_GQL: Record<StatusFilter, OrderStatusFilter> = {
  all: OrderStatusFilter.All,
  active: OrderStatusFilter.Active,
  paused: OrderStatusFilter.Paused,
  ended: OrderStatusFilter.Settled,
};

const SORT_BY_TO_GQL: Record<SortBy, OrderSortBy> = {
  start_at: OrderSortBy.StartAt,
  end_at: OrderSortBy.EndAt,
};

const SORT_ORDER_TO_GQL: Record<SortOrderVal, SortOrder> = {
  asc: SortOrder.Asc,
  desc: SortOrder.Desc,
};

const GROUP_BY_TO_GQL: Record<GroupBy, OrderGroupBy> = {
  table: OrderGroupBy.Table,
  user: OrderGroupBy.User,
  date: OrderGroupBy.Date,
  none: OrderGroupBy.None,
};

function RouteComponent() {
  const msg = useMsg();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { storeFilter } = useAdminStoreFilter();
  const [, setTick] = useState(0);

  const { q, status, sortBy, sortOrder, groupBy, page } = Route.useSearch();
  const setSearch = useCallback(
    (
      updates: Partial<{
        q: string;
        status: StatusFilter;
        sortBy: SortBy;
        sortOrder: SortOrderVal;
        groupBy: GroupBy;
        page: number;
      }>,
    ) =>
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, ...updates }),
        replace: true,
      }),
    [navigate],
  );
  const pageSize = 50;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchRef = useRef(q);
  useEffect(() => {
    searchRef.current = q;
  }, [q]);

  const { data: qlData, loading } = useOrdersQuery({
    variables: {
      input: {
        search: searchRef.current || undefined,
        status: STATUS_TO_GQL[status],
        sortBy: SORT_BY_TO_GQL[sortBy],
        sortOrder: SORT_ORDER_TO_GQL[sortOrder],
        groupBy: GROUP_BY_TO_GQL[groupBy],
        pagination: {
          offset: (page - 1) * pageSize,
          limit: pageSize,
        },
      },
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: pricingData } = usePublishedPricingQuery();

  const data = qlData?.orders ?? null;
  const pricingSnapshot = useMemo(
    () => parsePricingData(pricingData?.publishedPricing),
    [pricingData],
  );

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const [pauseOrder, { loading: pauseLoading }] = usePauseOrderMutation();
  const [resumeOrder, { loading: resumeLoading }] = useResumeOrderMutation();
  const [batchPause, { loading: batchPauseLoading }] =
    useBatchPauseOrdersMutation();
  const [batchResume, { loading: batchResumeLoading }] =
    useBatchResumeOrdersMutation();

  const handleSearch = () => {
    setSearch({ page: 1 });
  };

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success(t("dashOrders.copied"));
    } catch {
      msg.error(t("dashOrders.clipboardDenied"));
    }
  };

  const [actionPending, setActionPending] = useState<string | null>(null);

  const handleEndOrder = async (id: string, orderStatus: string) => {
    setActionPending(id);
    try {
      if (orderStatus === "ACTIVE") {
        await pauseOrder({ variables: { id } });
      }
    } catch {
    } finally {
      setActionPending(null);
      void navigate({ to: "/dash/orders/$id/settle", params: { id } });
    }
  };

  const handlePauseOrder = async (id: string) => {
    setActionPending(id);
    try {
      await pauseOrder({ variables: { id } });
      msg.success(t("dashOrders.paused"));
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashOrders.pauseFailed"),
      );
    } finally {
      setActionPending(null);
    }
  };

  const handleResumeOrder = async (id: string) => {
    setActionPending(id);
    try {
      await resumeOrder({ variables: { id } });
      msg.success(t("dashOrders.resumed"));
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashOrders.resumeFailed"),
      );
    } finally {
      setActionPending(null);
    }
  };

  const toggleSortOrder = () => {
    setSearch({ sortOrder: sortOrder === "asc" ? "desc" : "asc", page: 1 });
  };

  const items = data?.items ?? [];
  const total = data?.pageInfo?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = items.map((o) => o.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const selectAllByStatus = (targetStatus: "ACTIVE" | "PAUSED") => {
    const matching = items
      .filter((o) => o.status === targetStatus)
      .map((o) => o.id);
    setSelectedIds(new Set(matching));
  };

  const selectedItems = items.filter((o) => selectedIds.has(o.id));
  const hasActiveSelected = selectedItems.some((o) => o.status === "ACTIVE");
  const hasPausedSelected = selectedItems.some((o) => o.status === "PAUSED");
  const hasNonSettledSelected = selectedItems.some(
    (o) => o.status !== "SETTLED",
  );

  const handleBatchPause = async () => {
    const activeIds = selectedItems
      .filter((o) => o.status === "ACTIVE")
      .map((o) => o.id);
    if (activeIds.length === 0) return;
    setActionPending("batch");
    try {
      await batchPause({ variables: { ids: activeIds } });
      msg.success(
        formatMessage(t("dashOrders.batchPaused"), { count: activeIds.length }),
      );
      setSelectedIds(new Set());
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashOrders.batchPauseFailed"),
      );
    } finally {
      setActionPending(null);
    }
  };

  const handleBatchResume = async () => {
    const pausedIds = selectedItems
      .filter((o) => o.status === "PAUSED")
      .map((o) => o.id);
    if (pausedIds.length === 0) return;
    setActionPending("batch");
    try {
      await batchResume({ variables: { ids: pausedIds } });
      msg.success(
        formatMessage(t("dashOrders.batchResumed"), {
          count: pausedIds.length,
        }),
      );
      setSelectedIds(new Set());
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashOrders.batchResumeFailed"),
      );
    } finally {
      setActionPending(null);
    }
  };

  const handleBatchSettle = () => {
    const nonSettledIds = selectedItems
      .filter((o) => o.status !== "SETTLED")
      .map((o) => o.id);
    if (nonSettledIds.length === 0) return;
    void navigate({
      to: "/dash/orders/settle",
      search: { ids: nonSettledIds },
    });
  };

  const groupedItems = useMemo(() => {
    if (groupBy === "none") return [{ key: "", items }];

    const groups = new Map<string, OrderItem[]>();
    for (const item of items) {
      let key: string;
      switch (groupBy) {
        case "table":
          key = item.table?.name ?? t("dashOrders.unknownTable");
          break;
        case "user":
          key = item.nickname ?? t("dashOrders.unknownUser");
          break;
        case "date":
          key = item.startAt
            ? dayjs(item.startAt).format("YYYY/MM/DD")
            : t("dashOrders.unknownDate");
          break;
        default:
          key = "";
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
  }, [items, groupBy, t]);

  const groupLabel = (key: string): string => {
    switch (groupBy) {
      case "table":
        return formatMessage(t("dashOrders.groupTable"), { value: key });
      case "user":
        return formatMessage(t("dashOrders.groupUser"), { value: key });
      case "date":
        return formatMessage(t("dashOrders.groupDate"), { value: key });
      default:
        return key;
    }
  };

  useOrderStatusChangedSubscription();

  return (
    <main className="size-full flex flex-col overflow-hidden relative">
      <div className="px-4 pt-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <DashBackButton />
          <AdminStoreFilter />
          <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
            <MagnifyingGlassIcon className="size-4 opacity-50 shrink-0" />
            <input
              type="text"
              className="grow min-w-0"
              placeholder={t("dashOrders.searchPlaceholder")}
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </label>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              ["all", t("dashOrders.all")],
              ["active", t("dashOrders.active")],
              ["paused", t("dashOrders.statusPaused")],
              ["ended", t("dashOrders.ended")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${status === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setSearch({ status: key, page: 1 });
              }}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => selectAllByStatus("ACTIVE")}
            >
              {t("dashOrders.selectAllActive")}
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => selectAllByStatus("PAUSED")}
            >
              {t("dashOrders.selectAllPaused")}
            </button>
          </div>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <select
              className="select select-bordered select-xs"
              value={sortBy}
              onChange={(e) => {
                setSearch({ sortBy: e.target.value as SortBy, page: 1 });
              }}
            >
              <option value="start_at">{t("dashOrders.startTime")}</option>
              <option value="end_at">{t("dashOrders.endTime")}</option>
            </select>

            <button
              type="button"
              className="btn btn-xs btn-ghost btn-square"
              onClick={toggleSortOrder}
              title={
                sortOrder === "asc"
                  ? t("dashOrders.ascending")
                  : t("dashOrders.descending")
              }
            >
              {sortOrder === "asc" ? (
                <ArrowUpIcon className="size-4" />
              ) : (
                <ArrowDownIcon className="size-4" />
              )}
            </button>

            <select
              className="select select-bordered select-xs"
              value={groupBy}
              onChange={(e) => {
                setSearch({ groupBy: e.target.value as GroupBy, page: 1 });
              }}
            >
              <option value="none">{t("dashOrders.noGrouping")}</option>
              <option value="table">{t("dashOrders.groupByTable")}</option>
              <option value="user">{t("dashOrders.groupByUser")}</option>
              <option value="date">{t("dashOrders.groupByDate")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0 overflow-auto relative">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1200px]">
          <thead>
            <tr className="z-20">
              <td className="w-10">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={
                    items.length > 0 &&
                    items.every((o) => selectedIds.has(o.id))
                  }
                  onChange={toggleSelectAll}
                />
              </td>
              <td className="whitespace-nowrap">
                {t("dashOrders.orderNumber")}
              </td>
              <td className="whitespace-nowrap">{t("dashOrders.status")}</td>
              <td className="whitespace-nowrap">{t("dashOrders.startTime")}</td>
              <td className="whitespace-nowrap">{t("dashOrders.endTime")}</td>
              <td className="whitespace-nowrap">{t("dashOrders.table")}</td>
              <td className="whitespace-nowrap">{t("dashOrders.user")}</td>
              <td className="whitespace-nowrap">{t("dashOrders.cost")}</td>
              <th className="whitespace-nowrap">{t("dashOrders.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-12 text-center text-base-content/60"
                >
                  {q.trim() || status !== "all"
                    ? t("dashOrders.noMatchedOrders")
                    : t("dashOrders.noOrders")}
                </td>
              </tr>
            ) : (
              groupedItems.map((group) => (
                <Fragment key={group.key || "__ungrouped"}>
                  {group.key && (
                    <tr>
                      <td
                        colSpan={9}
                        className="bg-base-200 font-semibold text-sm py-2"
                      >
                        {groupLabel(group.key)}
                      </td>
                    </tr>
                  )}
                  {group.items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                        />
                      </td>
                      <td className="font-mono">
                        <div className="relative group flex items-center gap-1">
                          <span className="cursor-default">
                            {order.id.slice(0, 5)}
                          </span>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-square shrink-0"
                            onClick={() => handleCopy(order.id)}
                            title={t("dashOrders.copyOrderNumber")}
                          >
                            <CopyIcon className="size-3.5" />
                          </button>
                          <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
                            <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
                              {order.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {order.status === "ACTIVE" ? (
                          <span className="badge badge-success badge-sm">
                            {t("dashOrders.active")}
                          </span>
                        ) : order.status === "PAUSED" ? (
                          <span className="badge badge-neutral badge-sm">
                            {t("dashOrders.statusPaused")}
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">
                            {t("dashOrders.ended")}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        {order.startAt
                          ? formatTime(new Date(order.startAt).getTime())
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap">
                        {order.endAt
                          ? formatTime(new Date(order.endAt).getTime())
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap">
                        {order.table && order.table.code !== "DELETED" ? (
                          <Link
                            to="/dash/tables/$id"
                            params={{ id: order.tableId }}
                            className="link link-hover"
                          >
                            {order.table.name}
                          </Link>
                        ) : (
                          <span className="text-base-content/40">
                            {order.table?.name ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[120px]">
                        {order.userId ? (
                          <Link
                            to="/dash/users/$id"
                            params={{ id: order.userId }}
                            className="link link-hover block truncate"
                            title={order.nickname ?? undefined}
                          >
                            {order.nickname}
                          </Link>
                        ) : (
                          <span
                            className="block truncate text-base-content/70"
                            title={order.nickname ?? undefined}
                          >
                            {order.nickname}
                            <span className="badge badge-outline badge-xs ml-1">
                              {t("dashOrders.temporary")}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="font-mono whitespace-nowrap">
                        {order.finalPrice != null
                          ? formatPrice(order.finalPrice)
                          : order.status !== "SETTLED" && pricingSnapshot
                            ? (() => {
                                const p = calculatePrice(
                                  order.startAt
                                    ? new Date(order.startAt).getTime()
                                    : Date.now(),
                                  Date.now(),
                                  order.table?.scope ?? "boardgame",
                                  pricingSnapshot,
                                );
                                return p ? (
                                  <span className="text-base-content/50">
                                    ~{formatPrice(p.finalPrice)}
                                  </span>
                                ) : (
                                  "—"
                                );
                              })()
                            : "—"}
                      </td>
                      <th className="whitespace-nowrap">
                        {isMobile ? (
                          <div className="dropdown dropdown-end">
                            <div
                              tabIndex={0}
                              role="button"
                              className="btn btn-xs btn-ghost btn-square"
                            >
                              <DotsThreeVerticalIcon
                                className="size-4"
                                weight="bold"
                              />
                            </div>
                            <ul
                              tabIndex={0}
                              className="dropdown-content menu bg-base-200 rounded-box z-50 w-32 p-2 shadow-lg"
                            >
                              {order.status === "ACTIVE" && (
                                <>
                                  <li>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handlePauseOrder(order.id)
                                      }
                                      disabled={actionPending === order.id}
                                    >
                                      <PauseIcon className="size-3" />
                                      {t("dashOrders.pause")}
                                    </button>
                                  </li>
                                  <li>
                                    <button
                                      type="button"
                                      className="text-error"
                                      onClick={() =>
                                        void handleEndOrder(
                                          order.id,
                                          order.status,
                                        )
                                      }
                                      disabled={actionPending === order.id}
                                    >
                                      <StopIcon className="size-3" />
                                      {t("dashOrders.terminate")}
                                    </button>
                                  </li>
                                </>
                              )}
                              {order.status === "PAUSED" && (
                                <>
                                  <li>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleResumeOrder(order.id)
                                      }
                                      disabled={actionPending === order.id}
                                    >
                                      <PlayIcon className="size-3" />
                                      {t("dashOrders.resume")}
                                    </button>
                                  </li>
                                  <li>
                                    <button
                                      type="button"
                                      className="text-error"
                                      onClick={() =>
                                        void handleEndOrder(
                                          order.id,
                                          order.status,
                                        )
                                      }
                                      disabled={actionPending === order.id}
                                    >
                                      <StopIcon className="size-3" />
                                      {t("dashOrders.terminate")}
                                    </button>
                                  </li>
                                </>
                              )}
                              {order.status === "SETTLED" && (
                                <li>
                                  <Link
                                    to="/dash/orders/$id/settle"
                                    params={{ id: order.id }}
                                  >
                                    <EyeIcon className="size-3" />
                                    {t("dashOrders.details")}
                                  </Link>
                                </li>
                              )}
                            </ul>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {order.status === "ACTIVE" && (
                              <>
                                <button
                                  type="button"
                                  className={clsx(
                                    "btn btn-xs btn-ghost",
                                    actionPending === order.id &&
                                      "btn-disabled",
                                  )}
                                  onClick={() =>
                                    void handlePauseOrder(order.id)
                                  }
                                  disabled={actionPending === order.id}
                                >
                                  <PauseIcon className="size-3" />
                                  {t("dashOrders.pause")}
                                </button>
                                <button
                                  type="button"
                                  className={clsx(
                                    "btn btn-xs btn-ghost btn-error",
                                    actionPending === order.id &&
                                      "btn-disabled",
                                  )}
                                  onClick={() =>
                                    void handleEndOrder(order.id, order.status)
                                  }
                                  disabled={actionPending === order.id}
                                >
                                  <StopIcon className="size-3" />
                                  {t("dashOrders.terminate")}
                                </button>
                              </>
                            )}
                            {order.status === "PAUSED" && (
                              <>
                                <button
                                  type="button"
                                  className={clsx(
                                    "btn btn-xs btn-ghost btn-success",
                                    actionPending === order.id &&
                                      "btn-disabled",
                                  )}
                                  onClick={() =>
                                    void handleResumeOrder(order.id)
                                  }
                                  disabled={actionPending === order.id}
                                >
                                  <PlayIcon className="size-3" />
                                  {t("dashOrders.resume")}
                                </button>
                                <button
                                  type="button"
                                  className={clsx(
                                    "btn btn-xs btn-ghost btn-error",
                                    actionPending === order.id &&
                                      "btn-disabled",
                                  )}
                                  onClick={() =>
                                    void handleEndOrder(order.id, order.status)
                                  }
                                  disabled={actionPending === order.id}
                                >
                                  <StopIcon className="size-3" />
                                  {t("dashOrders.terminate")}
                                </button>
                              </>
                            )}
                            {order.status === "SETTLED" && (
                              <Link
                                to="/dash/orders/$id/settle"
                                params={{ id: order.id }}
                                className="btn btn-xs btn-ghost"
                              >
                                <EyeIcon className="size-3" />
                                {t("dashOrders.details")}
                              </Link>
                            )}
                          </div>
                        )}
                      </th>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
        {total > pageSize && <div className="h-16" />}
        {selectedIds.size > 0 && <div className="h-24" />}
      </div>
      {total > pageSize && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-box border border-base-content/10 backdrop-blur-sm bg-base-100/80 shadow-lg">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={page <= 1}
            onClick={() => setSearch({ page: page - 1 })}
          >
            {t("dashOrders.previousPage")}
          </button>
          <span className="text-sm font-medium">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={page >= totalPages}
            onClick={() => setSearch({ page: page + 1 })}
          >
            {t("dashOrders.nextPage")}
          </button>
        </div>
      )}
      {selectedIds.size > 0 && (
        <BatchActionBar
          count={selectedIds.size}
          unit={t("dashOrders.orderUnit")}
          onClear={() => setSelectedIds(new Set())}
          actions={[
            ...(hasActiveSelected
              ? [
                  {
                    key: "pause",
                    label: formatMessage(t("dashOrders.batchPause"), {
                      count: selectedItems.filter((o) => o.status === "ACTIVE")
                        .length,
                    }),
                    icon: <PauseIcon className="size-4" />,
                    className: "btn-ghost",
                    disabled: actionPending === "batch",
                    onClick: () => void handleBatchPause(),
                  } satisfies BatchAction,
                ]
              : []),
            ...(hasPausedSelected
              ? [
                  {
                    key: "resume",
                    label: formatMessage(t("dashOrders.batchResume"), {
                      count: selectedItems.filter((o) => o.status === "PAUSED")
                        .length,
                    }),
                    icon: <PlayIcon className="size-4" />,
                    className: "btn-success",
                    disabled: actionPending === "batch",
                    onClick: () => void handleBatchResume(),
                  } satisfies BatchAction,
                ]
              : []),
            ...(hasNonSettledSelected
              ? [
                  {
                    key: "settle",
                    label: formatMessage(t("dashOrders.batchSettle"), {
                      count: selectedItems.filter((o) => o.status !== "SETTLED")
                        .length,
                    }),
                    icon: <StopIcon className="size-4" />,
                    className: "btn-primary",
                    disabled: actionPending === "batch",
                    onClick: handleBatchSettle,
                  } satisfies BatchAction,
                ]
              : []),
          ]}
        />
      )}
    </main>
  );
}
