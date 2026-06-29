import {
  CopyIcon,
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
import { DashTable } from "@/client/components/dash/DashTable";
import { usePendingSearch } from "@/client/components/dash/SearchBridge";
import { TableToolbar } from "@/client/components/dash/TableToolbar";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
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
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  ORDER_SEARCH_GRAMMAR,
  type ParsedSearch,
  parseSearch,
  serialize,
} from "@/client/lib/searchParser";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";
import {
  calculatePrice,
  formatPrice,
  type SnapshotData,
} from "@/shared/utils/pricing";

const PAGE_SIZE = 50;

type SortBy = "start_at" | "end_at";
type SortOrderVal = "asc" | "desc";
type GroupBy = "table" | "user" | "date" | "none";
type StatusTab = "all" | "active" | "paused" | "ended";

type OrdersList = NonNullable<
  ReturnType<typeof useOrdersQuery>["data"]
>["orders"];
type OrderItem = OrdersList["items"][number];

export const Route = createFileRoute("/dash/orders")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
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

function formatDuration(
  startAt: string | null | undefined,
  endAt?: string | null,
) {
  if (!startAt) return "—";

  const start = dayjs(startAt);
  const end = endAt ? dayjs(endAt) : dayjs();
  if (!start.isValid() || !end.isValid()) return "—";

  const minutes = Math.max(0, end.diff(start, "minute"));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
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

function singleFilterValue(
  parsed: ParsedSearch,
  key: string,
): string | undefined {
  const value = parsed.filters[key]?.value;
  return typeof value === "string" ? value : undefined;
}

function stringArrayFilterValue(
  parsed: ParsedSearch,
  key: string,
): string[] | undefined {
  const value = parsed.filters[key]?.value;
  if (typeof value === "string") return [value];
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string");
  return undefined;
}

function mapOrderStatuses(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined;

  const mapped = values
    .map(
      (value) =>
        ({
          active: "ACTIVE",
          paused: "PAUSED",
          ended: "SETTLED",
        })[value],
    )
    .filter(Boolean) as string[];

  return mapped.length > 0 ? mapped : undefined;
}

function dateRangeFromSearch(parsed: ParsedSearch): {
  dateFrom?: string;
  dateTo?: string;
} {
  const filter = parsed.filters.date;
  if (!filter) return {};

  if (filter.operator === "eq" && typeof filter.value === "string") {
    return { dateFrom: filter.value, dateTo: filter.value };
  }

  if (filter.operator === "gt" && typeof filter.value === "string") {
    return { dateFrom: filter.value };
  }

  if (filter.operator === "lt" && typeof filter.value === "string") {
    return { dateTo: filter.value };
  }

  if (filter.operator === "range" && Array.isArray(filter.value)) {
    return { dateFrom: filter.value[0], dateTo: filter.value[1] };
  }

  return {};
}

export function buildFilter(
  parsed: ParsedSearch,
  page: number,
  sorting: SortingState,
  groupBy: GroupBy = "none",
) {
  const search = [parsed.freeText, singleFilterValue(parsed, "user")]
    .filter(Boolean)
    .join(" ");
  const sort = sorting[0];
  const status = mapOrderStatuses(
    stringArrayFilterValue(parsed, "is") ??
      stringArrayFilterValue(parsed, "status"),
  );
  const { dateFrom, dateTo } = dateRangeFromSearch(parsed);

  return {
    search: search || undefined,
    status,
    tableCode: singleFilterValue(parsed, "table"),
    store: singleFilterValue(parsed, "store"),
    dateFrom,
    dateTo,
    sortBy: sort?.id,
    sortOrder: sort ? (sort.desc ? SortOrder.Desc : SortOrder.Asc) : undefined,
    groupBy,
    pagination: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
  };
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
      <span className="badge badge-neutral badge-sm">
        {t("dashOrders.statusPaused")}
      </span>
    );
  }

  return (
    <span className="badge badge-ghost badge-sm">{t("dashOrders.ended")}</span>
  );
}

function orderAmount(order: OrderItem, pricingSnapshot: SnapshotData | null) {
  if (order.finalPrice != null) return formatPrice(order.finalPrice);

  if (order.status !== "SETTLED" && pricingSnapshot) {
    const price = calculatePrice(
      order.startAt ? new Date(order.startAt).getTime() : Date.now(),
      Date.now(),
      order.table?.scope ?? "boardgame",
      pricingSnapshot,
    );

    return price ? (
      <span className="text-base-content/50">
        ~{formatPrice(price.finalPrice)}
      </span>
    ) : (
      "—"
    );
  }

  return "—";
}

function RouteComponent() { const msg = useMsg();
const navigate = useNavigate({ from: Route.fullPath });
const isMobile = useIsMobile();
const { t } = useTranslation();
const [, setTick] = useState(0);

const { q, sortBy, sortOrder, groupBy, page } = Route.useSearch();
const [searchInput, setSearchInput] = useState(q);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [actionPending, setActionPending] = useState<string | null>(null);

useEffect(() => {
  setSearchInput(q);
}, [q]);

useEffect(() => {
  const timer = setInterval(() => setTick((tick) => tick + 1), 30000);
  return () => clearInterval(timer);
}, []);

const setSearchParam = useCallback(
  (
    updates: Partial<{
      q: string;
      sortBy: SortBy;
      sortOrder: SortOrderVal;
      groupBy: GroupBy;
      page: number;
    }>,
  ) =>
    navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
  [navigate],
);

const { pendingSearch, clearPendingSearch } = usePendingSearch();

useEffect(() => {
  if (pendingSearch !== null) {
    setSearchInput(pendingSearch);
    setSearchParam({ q: pendingSearch, page: 1 });
    clearPendingSearch();
  }
}, [pendingSearch, clearPendingSearch, setSearchParam]);

const parsed = useMemo(() => parseSearch(q, ORDER_SEARCH_GRAMMAR), [q]);
const sorting = useMemo<SortingState>(
  () => [{ id: sortBy, desc: sortOrder === "desc" }],
  [sortBy, sortOrder],
);
const filter = useMemo(
  () => buildFilter(parsed, page, sorting, groupBy),
  [parsed, page, sorting, groupBy],
);

const {
  data: qlData,
  loading,
  refetch,
} = useOrdersQuery({
  variables: { filter },
  fetchPolicy: "cache-and-network",
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

const data = qlData?.orders ?? null;
const items = useMemo<OrderItem[]>(
  () => (data?.items ?? []) as OrderItem[],
  [data],
);
const total = data?.pageInfo?.total ?? 0;

const handleCopy = useCallback(
  (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success(t("dashOrders.copied"));
    } catch {
      msg.error(t("dashOrders.clipboardDenied"));
    }
  },
  [msg, t],
);

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
const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
useSelectedTableData({
  entityType: "订单",
  rows: items,
  selectedIds,
  getRowId: (order) => order.id,
  onClear: clearSelectedIds,
});
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
      cell: ({ row }) => (
        <div className="relative group flex items-center gap-1">
          <span className="font-mono cursor-default">
            {row.original.id.slice(0, 5)}
          </span>
          <button
            type="button"
            className="btn btn-xs btn-ghost btn-square shrink-0"
            onClick={() => handleCopy(row.original.id)}
            title={t("dashOrders.copyOrderNumber")}
          >
            <CopyIcon className="size-3.5" />
          </button>
          <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
            <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
              {row.original.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "tableCode",
      header: t("dashOrders.table"),
      cell: ({ row }) =>
        row.original.table && row.original.table.code !== "DELETED" ? (
          <Link
            to="/dash/tables/$id"
            params={{ id: row.original.tableId }}
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
      header: t("dashOrders.duration") ?? "Duration",
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
      header: t("dashOrders.cost"),
      cell: ({ row }) => (
        <span className="font-mono whitespace-nowrap">
          {orderAmount(row.original, pricingSnapshot)}
        </span>
      ),
    },
  ],
  [t, handleCopy, pricingSnapshot],
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
        {order.status === "SETTLED" && (
          <li>
            <Link to="/dash/orders/$id/settle" params={{ id: order.id }}>
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
  );

const groups = useMemo(() => {
  if (groupBy === "none") return [{ key: "", items }];

  const grouped = new Map<string, OrderItem[]>();
  for (const item of items) {
    const key =
      groupBy === "table"
        ? (item.table?.name ?? t("dashOrders.unknownTable"))
        : groupBy === "user"
          ? (item.nickname ?? t("dashOrders.unknownUser"))
          : item.startAt
            ? dayjs(item.startAt).format("YYYY/MM/DD")
            : t("dashOrders.unknownDate");
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    items,
  }));
}, [items, groupBy, t]);

const groupLabel = (key: string): string => {
  if (groupBy === "table")
    return formatMessage(t("dashOrders.groupTable"), { value: key });
  if (groupBy === "user")
    return formatMessage(t("dashOrders.groupUser"), { value: key });
  if (groupBy === "date")
    return formatMessage(t("dashOrders.groupDate"), { value: key });
  return key;
};

const quickFilters = useMemo(
  () =>
    (
      [
        ["all", t("dashOrders.all")],
        ["active", t("dashOrders.active")],
        ["paused", t("dashOrders.statusPaused")],
        ["ended", t("dashOrders.ended")],
      ] as const
    ).map(([value, label]) => ({
      label,
      key: "status",
      value,
      active:
        value === "all"
          ? !parsed.filters.status && !parsed.filters.is
          : parsed.filters.status?.value === value ||
            parsed.filters.is?.value === value,
    })),
  [t, parsed],
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

const renderTable = (
  tableItems: OrderItem[],
  paginationMode: "offset" | "none",
) => (
  <DashTable
    columns={columns}
    data={tableItems}
    loading={loading}
    emptyMessage={
      q.trim() ? t("dashOrders.noMatchedOrders") : t("dashOrders.noOrders")
    }
    pagination={{
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      total,
      hasMore: page * PAGE_SIZE < total,
    }}
    paginationMode={paginationMode}
    onPaginationChange={(nextPage) =>
      setSearchParam({ page: Math.floor(nextPage.offset / PAGE_SIZE) + 1 })
    }
    sorting={sorting}
    onSortingChange={(nextSorting) => {
      const nextSort = nextSorting[0];
      setSearchParam({
        sortBy: (nextSort?.id as SortBy | undefined) ?? "start_at",
        sortOrder: nextSort?.desc ? "desc" : "asc",
        page: 1,
      });
    }}
    sortableColumns={["start_at", "end_at"]}
    enableRowSelection
    selectedRows={selectedIds}
    onSelectedRowsChange={setSelectedIds}
    getRowId={(row) => row.id}
    renderActions={renderActions}
  />
);

return (
  <main className="size-full flex flex-col overflow-hidden relative">
    <div className="px-4 pt-4 flex flex-col gap-3 shrink-0">
      <div className="flex items-center gap-3">
        <DashBackButton />
        <TableToolbar
          searchBar={{
            grammar: ORDER_SEARCH_GRAMMAR,
            value: searchInput,
            onChange: setSearchInput,
            onSubmit: (parsedResult) => {
              const serialized = serialize(
                parsedResult,
                ORDER_SEARCH_GRAMMAR,
              );
              setSearchParam({ q: serialized, page: 1 });
            },
            placeholder: t("dashOrders.searchPlaceholder"),
          }}
          quickFilters={quickFilters}
          onQuickFilterToggle={(key, value) => {
            const nextParsed = parseSearch(searchInput, ORDER_SEARCH_GRAMMAR);
            const nextFilters = { ...nextParsed.filters };
            if (value === "all") delete nextFilters[key];
            else if (nextFilters[key]?.value === value)
              delete nextFilters[key];
            else nextFilters[key] = { operator: "eq", value };
            delete nextFilters.is;
            const serialized = serialize(
              { ...nextParsed, filters: nextFilters, errors: [] },
              ORDER_SEARCH_GRAMMAR,
            );
            setSearchInput(serialized);
            setSearchParam({ q: serialized, page: 1 });
          }}
          storeFilter
          extra={
            <div className="flex flex-wrap items-center gap-2">
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
              <select
                className="select select-bordered select-xs"
                value={groupBy}
                onChange={(event) =>
                  setSearchParam({
                    groupBy: event.target.value as GroupBy,
                    page: 1,
                  })
                }
              >
                <option value="none">{t("dashOrders.noGrouping")}</option>
                <option value="table">{t("dashOrders.groupByTable")}</option>
                <option value="user">{t("dashOrders.groupByUser")}</option>
                <option value="date">{t("dashOrders.groupByDate")}</option>
              </select>
            </div>
          }
        />
      </div>
    </div>

    <div className="w-full flex-1 min-h-0 overflow-auto relative px-4 pb-4 pt-3">
      {groupBy === "none" ? (
        renderTable(items, "offset")
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section
              key={group.key || "__ungrouped"}
              className="flex flex-col gap-2"
            >
              {group.key && (
                <div className="bg-base-200 rounded-box px-4 py-2 font-semibold text-sm">
                  {groupLabel(group.key)}
                </div>
              )}
              {renderTable(group.items, "none")}
            </section>
          ))}
          {total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-sm font-medium">
                {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </span>
              <div className="join">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost join-item"
                  disabled={page <= 1 || loading}
                  onClick={() => setSearchParam({ page: page - 1 })}
                >
                  {t("dashOrders.previousPage")}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost join-item"
                  disabled={page * PAGE_SIZE >= total || loading}
                  onClick={() => setSearchParam({ page: page + 1 })}
                >
                  {t("dashOrders.nextPage")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {selectedIds.size > 0 && <div className="h-24" />}
    </div>

    {selectedIds.size > 0 && (
      <BatchActionBar
        count={selectedIds.size}
        unit={t("dashOrders.orderUnit")}
        onClear={clearSelectedIds}
        actions={selectedActions}
      />
    )}
  </main>
); }
