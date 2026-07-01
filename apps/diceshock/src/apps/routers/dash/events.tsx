import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashTable } from "@/client/components/dash/DashTable";
import { DateRangeFilter } from "@/client/components/dash/DateRangeFilter";
import { usePendingSearch } from "@/client/components/dash/SearchBridge";
import { TableToolbar } from "@/client/components/dash/TableToolbar";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  SortOrder,
  useCreateEventMutation,
  useManagedEventsQuery,
  useRemoveEventMutation,
  useToggleEventPublishMutation,
} from "@/client/graphql/__generated__";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  EVENT_SEARCH_GRAMMAR,
  type ParsedSearch,
  parseSearch,
  serialize,
} from "@/client/lib/searchParser";
import dayjs from "@/shared/utils/dayjs-config";

const PAGE_SIZE = 20;

function formatCreateAt(val: unknown): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val as string | number | Date, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

type EventsList = NonNullable<
  ReturnType<typeof useManagedEventsQuery>["data"]
>["managedEvents"];
type EventItem = NonNullable<EventsList>[number];

export const Route = createFileRoute("/dash/events")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    page: Number(search.page) > 0 ? Number(search.page) : 1,
  }),
  component: RouteComponent,
});

export function buildFilter(
  parsed: ParsedSearch,
  page: number,
  sorting: SortingState,
) {
  const typeFilter = parsed.filters.type?.value;
  const statusFilter = parsed.filters.status?.value;
  const storeFilter = parsed.filters.store?.value;
  const dateFilter = parsed.filters.date?.value;

  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  if (dateFilter) {
    if (typeof dateFilter === "string") {
      dateFrom = dateTo = dateFilter;
    } else if (Array.isArray(dateFilter) && dateFilter.length === 2) {
      dateFrom = dateFilter[0];
      dateTo = dateFilter[1];
    }
  }

  const searchParts = [parsed.freeText];
  if (typeof typeFilter === "string") searchParts.push(typeFilter);
  const search = searchParts.filter(Boolean).join(" ") || undefined;

  return {
    search,
    status:
      typeof statusFilter === "string"
        ? [statusFilter.toUpperCase()]
        : Array.isArray(statusFilter)
          ? statusFilter.map((s) => s.toUpperCase())
          : undefined,
    dateFrom,
    dateTo,
    store: typeof storeFilter === "string" ? storeFilter : undefined,
    sortBy: sorting.length > 0 ? sorting[0].id : undefined,
    sortOrder: sorting[0]?.desc ? SortOrder.Desc : SortOrder.Asc,
    pagination: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
  };
}

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { storeFilter } = useAdminStoreFilter();
  const { q, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState(q);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { pendingSearch, clearPendingSearch } = usePendingSearch();

  const setSearchParam = useCallback(
    (updates: Partial<{ q: string; page: number }>) =>
      navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
    [navigate],
  );

  useEffect(() => {
    if (pendingSearch !== null) {
      setSearchInput(pendingSearch);
      setSearchParam({ q: pendingSearch, page: 1 });
      clearPendingSearch();
    }
  }, [pendingSearch, clearPendingSearch, setSearchParam]);

  const parsed = useMemo(() => parseSearch(q, EVENT_SEARCH_GRAMMAR), [q]);
  const filter = useMemo(
    () => buildFilter(parsed, page, sorting),
    [parsed, page, sorting],
  );

  const { data, loading } = useManagedEventsQuery({
    variables: { filter },
    onError: (err) => {
      msg.error(err.message || t("dashEvents.fetchFailed"));
    },
  });

  const events = (data?.managedEvents ?? []) as EventItem[];

  const [createEventMutation] = useCreateEventMutation({
    refetchQueries: ["ManagedEvents"],
  });
  const [toggleEventPublishMutation] = useToggleEventPublishMutation({
    refetchQueries: ["ManagedEvents"],
  });
  const [removeEventMutation] = useRemoveEventMutation({
    refetchQueries: ["ManagedEvents"],
  });

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<EventItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [batchDeletePending, setBatchDeletePending] = useState(false);

  const handleCopy = useCallback(
    (text: string) => {
      try {
        navigator.clipboard.writeText(text);
        msg.success(t("dashEvents.copied"));
      } catch {
        msg.error(t("dashEvents.clipboardDenied"));
      }
    },
    [t, msg],
  );

  const handleCreate = async () => {
    try {
      await createEventMutation({
        variables: {
          input: { title: t("dashEvents.newEventTitle") },
        },
      });
      msg.success(t("dashEvents.createSuccess"));
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.createFailed"),
      );
    }
  };

  const handleTogglePublish = async (event: EventItem) => {
    try {
      await toggleEventPublishMutation({
        variables: { id: event.id },
      });
      msg.success(
        event.isPublished
          ? t("dashEvents.unpublishSuccess")
          : t("dashEvents.publishSuccess"),
      );
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.operationFailed"),
      );
    }
  };

  const openDeleteDialog = (event: EventItem) => {
    setPendingDelete(event);
    setTimeout(() => {
      deleteDialogRef.current?.showModal();
    }, 0);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletePending(true);
    try {
      await removeEventMutation({
        variables: { id: pendingDelete.id },
      });
      msg.success(t("dashEvents.deleteSuccess"));
      deleteDialogRef.current?.close();
      setPendingDelete(null);
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.deleteFailed"),
      );
    } finally {
      setDeletePending(false);
    }
  };

  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "活动",
    rows: events,
    selectedIds,
    getRowId: (event) => event.id,
    onClear: clearSelectedIds,
  });

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeletePending(true);
    try {
      for (const id of selectedIds) {
        await removeEventMutation({ variables: { id } });
      }
      msg.success("删除成功");
      clearSelectedIds();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.deleteFailed"),
      );
    } finally {
      setBatchDeletePending(false);
    }
  };

  const selectedActions: BatchAction[] = [
    {
      key: "delete",
      label: "删除",
      icon: <TrashIcon className="size-4" />,
      className: "btn-error",
      disabled: batchDeletePending,
      onClick: () => void handleBatchDelete(),
    },
  ];

  const columns = useMemo<ColumnDef<EventItem, unknown>[]>(
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
              title={t("dashEvents.copyId")}
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
        accessorKey: "title",
        header: t("dashEvents.title"),
        cell: ({ row }) => (
          <span className="font-semibold max-w-40 truncate inline-block">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: t("dashEvents.description"),
        cell: ({ row }) => (
          <span className="max-w-48 truncate inline-block">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "coverImageUrl",
        header: t("dashEvents.coverImage"),
        cell: ({ row }) =>
          row.original.coverImageUrl ? (
            <img
              src={row.original.coverImageUrl}
              alt=""
              className="w-16 h-10 object-cover rounded"
            />
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "isPublished",
        header: t("dashEvents.status"),
        cell: ({ row }) =>
          row.original.isPublished ? (
            <span className="badge badge-success badge-sm">
              {t("dashEvents.published")}
            </span>
          ) : (
            <span className="badge badge-ghost badge-sm">
              {t("dashEvents.unpublished")}
            </span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: t("dashEvents.createdAt"),
        cell: ({ row }) => formatCreateAt(row.original.createdAt),
      },
    ],
    [t, handleCopy],
  );

  const total = events.length;
  const hasMore = events.length === PAGE_SIZE;

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex items-center gap-3">
        <DashBackButton />
        <TableToolbar
          searchBar={{
            grammar: EVENT_SEARCH_GRAMMAR,
            value: searchInput,
            onChange: setSearchInput,
            onSubmit: (parsedResult) => {
              const serialized = serialize(parsedResult, EVENT_SEARCH_GRAMMAR);
              setSearchParam({ q: serialized, page: 1 });
            },
            placeholder: t("dashEvents.searchPlaceholder") ?? "Search events…",
          }}
          storeFilter
          extra={
            <div className="flex items-center gap-2">
              <DateRangeFilter
                value={
                  parsed.filters.date
                    ? {
                        from: Array.isArray(parsed.filters.date.value)
                          ? parsed.filters.date.value[0]
                          : typeof parsed.filters.date.value === "string"
                            ? parsed.filters.date.value
                            : undefined,
                        to: Array.isArray(parsed.filters.date.value)
                          ? parsed.filters.date.value[1]
                          : typeof parsed.filters.date.value === "string"
                            ? parsed.filters.date.value
                            : undefined,
                      }
                    : undefined
                }
                onChange={(range) => {
                  const nextFilters = { ...parsed.filters };
                  if (!range) {
                    delete nextFilters.date;
                  } else if (range.from && range.to) {
                    nextFilters.date = { operator: "range", value: [range.from, range.to] };
                  } else if (range.from) {
                    nextFilters.date = { operator: "gt", value: range.from };
                  } else if (range.to) {
                    nextFilters.date = { operator: "lt", value: range.to };
                  }
                  const serialized = serialize(
                    { ...parsed, filters: nextFilters, errors: [] },
                    EVENT_SEARCH_GRAMMAR,
                  );
                  setSearchInput(serialized);
                  setSearchParam({ q: serialized, page: 1 });
                }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm gap-1"
                onClick={handleCreate}
              >
                <PlusIcon className="size-4" weight="bold" />
                {t("dashEvents.createEvent")}
              </button>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0">
        <DashTable
          columns={columns}
          data={events}
          loading={loading}
          emptyMessage={t("dashEvents.noData")}
          pagination={{
            offset: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            total: total,
            hasMore,
          }}
          onPaginationChange={(p) =>
            setSearchParam({ page: Math.floor(p.offset / PAGE_SIZE) + 1 })
          }
          sorting={sorting}
          onSortingChange={setSorting}
          sortableColumns={["title", "isPublished", "createdAt"]}
          enableRowSelection
          selectedRows={selectedIds}
          onSelectedRowsChange={setSelectedIds}
          getRowId={(row) => row.id}
          renderActions={(row) =>
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
                  className="dropdown-content menu bg-base-200 rounded-box z-50 w-36 p-2 shadow-lg"
                >
                  <li>
                    <Link to="/dash/events/$id" params={{ id: row.id }}>
                      <EyeIcon className="size-4" />
                      {t("dashEvents.details")}
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(row)}
                    >
                      {row.isPublished
                        ? t("dashEvents.unpublish")
                        : t("dashEvents.publish")}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="text-error"
                      onClick={() => openDeleteDialog(row)}
                    >
                      <TrashIcon className="size-4" />
                      {t("dashEvents.delete")}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  to="/dash/events/$id"
                  params={{ id: row.id }}
                  className="btn btn-xs btn-ghost"
                >
                  <EyeIcon className="size-4" />
                  {t("dashEvents.details")}
                </Link>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => handleTogglePublish(row)}
                >
                  {row.isPublished
                    ? t("dashEvents.unpublish")
                    : t("dashEvents.publish")}
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost btn-error"
                  onClick={() => openDeleteDialog(row)}
                >
                  {t("dashEvents.delete")}
                  <TrashIcon />
                </button>
              </div>
            )
          }
        />
      </div>

      <BatchActionBar
        count={selectedIds.size}
        actions={selectedActions}
        onClear={clearSelectedIds}
        unit="活动"
      />

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t("dashEvents.confirmDeleteTitle")}
            </h3>
            <p>{t("dashEvents.confirmDeleteDescription")}</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>{t("dashEvents.titleLabel")}</strong>{" "}
                {pendingDelete.title}
              </p>
              <p className="text-sm">
                <strong>ID:</strong> {pendingDelete.id}
              </p>
            </div>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteDialogRef.current?.close();
                  setTimeout(() => setPendingDelete(null), 100);
                }}
              >
                {t("dashEvents.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void confirmDelete();
                }}
                disabled={deletePending}
              >
                {deletePending
                  ? t("dashEvents.deleting")
                  : t("dashEvents.confirmDelete")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
