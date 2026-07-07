import { NetworkStatus } from "@apollo/client";
import {
  DotsThreeVerticalIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { DataTable } from "@/client/components/dash/DataTable"
import { launcherOpenForFieldAtom } from "@/client/components/dash/launcher/atoms";
import { getCategoryById } from "@/client/components/dash/launcher/categories";
import { IdCell } from "@/client/components/dash/IdCell";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  type OrderFilterInput,
  SortOrder,
  useBatchPauseOrdersMutation,
  useBatchResumeOrdersMutation,
  useOrderStatusChangedSubscription,
  useOrdersQuery,
  usePauseOrderMutation,
  usePublishedPricingQuery,
  useResumeOrderMutation,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import {
  filtersToGqlVariables,
  useRouteFilters,
} from "@/client/hooks/useRouteFilters";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";
import {
  calculatePrice,
  formatPrice,
  type SnapshotData,
} from "@/shared/utils/pricing";

const BATCH_SIZE = 100

interface OrderItem {
  id: string;
  tableId: string;
  userId: string | null;
  tempId: string | null;
  nickname: string | null;
  uid: string | null;
  phone: string | null;
  seats: number;
  status: string;
  startAt: string;
  endAt: string | null;
  finalPrice: number | null;
  pricingSnapshotId: string | null;
  deductedAmount: number | null;
  table: { id: string; name: string; code: string; scope: string } | null;
}

export const Route = createFileRoute("/dash/orders")({
  validateSearch: (search) => search as Record<string, string>,
  component: RouteComponent,
});

function formatTime(val: number | null | undefined): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

function formatDuration(
  startAt: string | null | undefined,
  endAt?: string | null,
) {
  if (!startAt) return "—";
  const start = dayjs(startAt);
  const end = endAt ? dayjs(endAt) : dayjs();
  if (!start.isValid()) return "—";
  const diffMin = end.diff(start, "minute");
  if (diffMin < 60) return `${diffMin}分钟`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
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

function orderStatusBadge(order: OrderItem, t: (key: string) => string) {
  if (order.status === "ACTIVE") {
    return (
      <span className="badge badge-success badge-sm">
        {t("dashOrders.active")}
      </span>
    );
  }
  if (order.status === "PAUSED") {
    return (
      <span className="badge badge-warning badge-sm">
        {t("dashOrders.statusPaused")}
      </span>
    );
  }
  if (order.status === "SETTLED") {
    return (
      <span className="badge badge-ghost badge-sm">
        {t("dashOrders.ended")}
      </span>
    );
  }
  return <span className="badge badge-sm">{order.status}</span>;
}

function orderCalculatedAmount(
  order: OrderItem,
  pricingSnapshot: SnapshotData | null,
) {
  if (!pricingSnapshot) return "—";

  const startAt = order.startAt
    ? new Date(order.startAt).getTime()
    : Date.now();
  const endAt = order.endAt ? new Date(order.endAt).getTime() : Date.now();

  const price = calculatePrice(
    startAt,
    endAt,
    order.table?.scope ?? "boardgame",
    pricingSnapshot,
  );

  if (!price) return "—";

  if (order.status === "ACTIVE" || order.status === "PAUSED") {
    return (
      <span className="text-base-content/50">
        ~{formatPrice(price.finalPrice)}
      </span>
    );
  }

  return formatPrice(price.finalPrice);
}

function RouteComponent() {
  const msg = useMsg();
  const navigate = useNavigate({ from: Route.fullPath });
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [, setTick] = useState(0);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionPending, setActionPending] = useState<string | null>(null);

  const { filters, query } = useRouteFilters();

  const openForField = useSetAtom(launcherOpenForFieldAtom);
  const ordersCategory = getCategoryById("orders");
  const handleColumnFilter = useCallback(
    (columnId: string) => {
      if (!ordersCategory) return;
      const field = ordersCategory.fields.find((f) => f.key === columnId);
      if (!field) return;
      openForField({ field, filters, query, categoryId: "orders" });
    },
    [ordersCategory, openForField, filters, query],
  );

  const gqlVars = useMemo(
    () => filtersToGqlVariables(filters, query),
    [filters, query],
  );

  const filter = useMemo<OrderFilterInput>(() => {
    const input: OrderFilterInput = {};
    if (gqlVars.search) input.search = gqlVars.search as string;
    if (gqlVars.status) {
      input.status = Array.isArray(gqlVars.status)
        ? gqlVars.status
        : [gqlVars.status as string];
    }
    if (gqlVars.table) input.tableCode = gqlVars.table as string;
    if (gqlVars.store) input.store = gqlVars.store as string;
    if (gqlVars.dateFrom) input.dateFrom = gqlVars.dateFrom as string;
    if (gqlVars.dateTo) input.dateTo = gqlVars.dateTo as string;
    if (gqlVars.groupBy) input.groupBy = gqlVars.groupBy as string;

    if (gqlVars.sortBy) {
      input.sortBy = gqlVars.sortBy as string;
      input.sortOrder =
        gqlVars.sortOrder === "asc" ? SortOrder.Asc : SortOrder.Desc;
    } else if (sorting.length > 0) {
      input.sortBy = sorting[0].id;
      input.sortOrder = sorting[0].desc ? SortOrder.Desc : SortOrder.Asc;
    }

    input.pagination = { offset: 0, limit: BATCH_SIZE };
    return input;
  }, [gqlVars, sorting]);

  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: qlData,
    loading,
    fetchMore,
    refetch,
    networkStatus,
  } = useOrdersQuery({
    variables: { filter },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  useOrderStatusChangedSubscription({
    onData: () => {
      void refetch();
    },
  });

  const { data: pricingData } = usePublishedPricingQuery();
  const pricingSnapshot = useMemo(
    () => parsePricingData(pricingData?.publishedPricing),
    [pricingData],
  );

  const [pauseOrder] = usePauseOrderMutation();
  const [resumeOrder] = useResumeOrderMutation();
  const [batchPause] = useBatchPauseOrdersMutation();
  const [batchResume] = useBatchResumeOrdersMutation();

  const items = useMemo<OrderItem[]>(
    () => (qlData?.orders?.items ?? []) as OrderItem[],
    [qlData],
  );
  const pageInfo = qlData?.orders?.pageInfo;
  const hasMore = pageInfo?.hasMore ?? false;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextOffset = items.length;
    await fetchMore({
      variables: {
        filter: {
          ...filter,
          pagination: { offset: nextOffset, limit: BATCH_SIZE },
        },
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          orders: {
            ...fetchMoreResult.orders,
            items: [
              ...(prev.orders?.items ?? []),
              ...(fetchMoreResult.orders?.items ?? []),
            ],
          },
        };
      },
    });
  }, [fetchMore, filter, items.length, isLoadingMore, hasMore]);

  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "订单",
    rows: items,
    selectedIds,
    getRowId: (order) => order.id,
    onClear: clearSelectedIds,
  });

  const handleEndOrder = async (id: string, orderStatus: string) => {
    setActionPending(id);
    try {
      if (orderStatus === "ACTIVE") await pauseOrder({ variables: { id } });
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
      void refetch();
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
      void refetch();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashOrders.resumeFailed"),
      );
    } finally {
      setActionPending(null);
    }
  };

  const selectAllByStatus = (targetStatus: "ACTIVE" | "PAUSED") => {
    setSelectedIds(
      new Set(
        items
          .filter((order) => order.status === targetStatus)
          .map((order) => order.id),
      ),
    );
  };

  const selectedItems = items.filter((order) => selectedIds.has(order.id));
  const hasActiveSelected = selectedItems.some(
    (order) => order.status === "ACTIVE",
  );
  const hasPausedSelected = selectedItems.some(
    (order) => order.status === "PAUSED",
  );
  const hasNonSettledSelected = selectedItems.some(
    (order) => order.status !== "SETTLED",
  );

  const handleBatchPause = async () => {
    const activeIds = selectedItems
      .filter((order) => order.status === "ACTIVE")
      .map((order) => order.id);
    if (activeIds.length === 0) return;

    setActionPending("batch");
    try {
      await batchPause({ variables: { ids: activeIds } });
      msg.success(
        formatMessage(t("dashOrders.batchPaused"), { count: activeIds.length }),
      );
      setSelectedIds(new Set());
      void refetch();
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
      .filter((order) => order.status === "PAUSED")
      .map((order) => order.id);
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
      void refetch();
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
      .filter((order) => order.status !== "SETTLED")
      .map((order) => order.id);
    if (nonSettledIds.length === 0) return;

    void navigate({
      to: "/dash/orders/settle",
      search: { ids: nonSettledIds },
    });
  };

  const columns = useMemo<ColumnDef<OrderItem, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 120,
        cell: ({ row }) => <IdCell value={row.original.id} />,
      },
      {
        accessorKey: "tableCode",
        header: t("dashOrders.table"),
        cell: ({ row }) =>
          row.original.table && row.original.table.code !== "DELETED" ? (
            <Link
              to="/dash/tables/$id"
              params={{ id: row.original.tableId }}
              search={{ tab: "basic" }}
              className="link link-hover"
            >
              {row.original.table.name}
            </Link>
          ) : (
            <span className="text-base-content/40">
              {row.original.table?.name ?? "—"}
            </span>
          ),
      },
      {
        accessorKey: "nickname",
        header: t("dashOrders.user"),
        cell: ({ row }) =>
          row.original.userId ? (
            <Link
              to="/dash/users/$id"
              params={{ id: row.original.userId }}
              search={{ tab: "basic" }}
              className="link link-hover block max-w-[120px] truncate"
              title={row.original.nickname ?? undefined}
            >
              {row.original.nickname}
            </Link>
          ) : (
            <span
              className="block max-w-[120px] truncate text-base-content/70"
              title={row.original.nickname ?? undefined}
            >
              {row.original.nickname}
              <span className="badge badge-outline badge-xs ml-1">
                {t("dashOrders.temporary")}
              </span>
            </span>
          ),
      },
      {
        accessorKey: "start_at",
        header: t("dashOrders.startTime"),
        cell: ({ row }) =>
          row.original.startAt
            ? formatTime(new Date(row.original.startAt).getTime())
            : "—",
      },
      {
        accessorKey: "end_at",
        header: t("dashOrders.endTime"),
        cell: ({ row }) =>
          row.original.endAt
            ? formatTime(new Date(row.original.endAt).getTime())
            : "—",
      },
      {
        accessorKey: "duration",
        header: t("dashOrders.duration"),
        cell: ({ row }) =>
          formatDuration(row.original.startAt, row.original.endAt),
      },
      {
        accessorKey: "status",
        header: t("dashOrders.status"),
        cell: ({ row }) => orderStatusBadge(row.original, t),
      },
      {
        accessorKey: "amount",
        header: "自动计算",
        cell: ({ row }) => (
          <span className="font-mono whitespace-nowrap">
            {orderCalculatedAmount(row.original, pricingSnapshot)}
          </span>
        ),
      },
      {
        accessorKey: "deductedAmount",
        header: "计划划扣",
        cell: ({ row }) => (
          <span className="font-mono whitespace-nowrap">
            {row.original.deductedAmount != null
              ? formatPrice(row.original.deductedAmount)
              : "—"}
          </span>
        ),
      },
    ],
    [t, pricingSnapshot],
  );

  const renderActions = (order: OrderItem) =>
    isMobile ? (
      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="btn btn-xs btn-ghost btn-square"
        >
          <DotsThreeVerticalIcon className="size-4" weight="bold" />
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
                  onClick={() => void handlePauseOrder(order.id)}
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
                  onClick={() => void handleEndOrder(order.id, order.status)}
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
                  onClick={() => void handleResumeOrder(order.id)}
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
                  onClick={() => void handleEndOrder(order.id, order.status)}
                  disabled={actionPending === order.id}
                >
                  <StopIcon className="size-3" />
                  {t("dashOrders.terminate")}
                </button>
              </li>
            </>
          )}
          <li>
            <Link to="/dash/orders/$id/settle" params={{ id: order.id }}>
              <EyeIcon className="size-3" />
              {t("dashOrders.details")}
            </Link>
          </li>
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
                actionPending === order.id && "btn-disabled",
              )}
              onClick={() => void handlePauseOrder(order.id)}
              disabled={actionPending === order.id}
            >
              <PauseIcon className="size-3" />
              {t("dashOrders.pause")}
            </button>
            <button
              type="button"
              className={clsx(
                "btn btn-xs btn-ghost btn-error",
                actionPending === order.id && "btn-disabled",
              )}
              onClick={() => void handleEndOrder(order.id, order.status)}
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
                actionPending === order.id && "btn-disabled",
              )}
              onClick={() => void handleResumeOrder(order.id)}
              disabled={actionPending === order.id}
            >
              <PlayIcon className="size-3" />
              {t("dashOrders.resume")}
            </button>
            <button
              type="button"
              className={clsx(
                "btn btn-xs btn-ghost btn-error",
                actionPending === order.id && "btn-disabled",
              )}
              onClick={() => void handleEndOrder(order.id, order.status)}
              disabled={actionPending === order.id}
            >
              <StopIcon className="size-3" />
              {t("dashOrders.terminate")}
            </button>
          </>
        )}
        <Link
          to="/dash/orders/$id/settle"
          params={{ id: order.id }}
          className="btn btn-xs btn-ghost"
        >
          <EyeIcon className="size-3" />
          {t("dashOrders.details")}
        </Link>
      </div>
    );

  const selectedActions = [
    ...(hasActiveSelected
      ? [
          {
            key: "pause",
            label: formatMessage(t("dashOrders.batchPause"), {
              count: selectedItems.filter((order) => order.status === "ACTIVE")
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
              count: selectedItems.filter((order) => order.status === "PAUSED")
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
              count: selectedItems.filter((order) => order.status !== "SETTLED")
                .length,
            }),
            icon: <StopIcon className="size-4" />,
            className: "btn-primary",
            disabled: actionPending === "batch",
            onClick: handleBatchSettle,
          } satisfies BatchAction,
        ]
      : []),
  ];

  return (
    <main className="flex-1 min-h-0 flex flex-col">
      <DataTable columns={columns}
      data={items}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      sorting={sorting}
      onSortingChange={setSorting}
      sortableColumns={["start_at", "end_at", "status", "amount"]}
      filterableColumns={["table", "user", "status", "store", "date", "start_at", "end_at"]}
      onColumnFilter={handleColumnFilter}
      enableRowSelection
      selectedRows={selectedIds}
      onSelectedRowsChange={setSelectedIds}
      getRowId={(row) => row.id}
      emptyMessage={
        query.trim()
          ? t("dashOrders.noMatchedOrders")
          : t("dashOrders.noOrders")
      }
      renderActions={renderActions} />
      {selectedIds.size > 0 && (
        <BatchActionBar
          count={selectedIds.size}
          unit={t("dashOrders.orderUnit")}
          onClear={clearSelectedIds}
          actions={selectedActions}
        />
      )}
    </main>
  );
}
