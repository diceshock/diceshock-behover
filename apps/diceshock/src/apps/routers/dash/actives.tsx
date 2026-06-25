import { NetworkStatus } from "@apollo/client";
import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashTable } from "@/client/components/dash/DashTable";
import { usePendingSearch } from "@/client/components/dash/SearchBridge";
import { TableToolbar } from "@/client/components/dash/TableToolbar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  type ActiveFilterInput,
  useBatchRemoveActivesMutation,
  useManagedActivesQuery,
  useRemoveActiveMutation,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  ACTIVE_SEARCH_GRAMMAR,
  type ParsedSearch,
  parseSearch,
  serialize,
} from "@/client/lib/searchParser";
import { formatMessage } from "@/shared/i18n";
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

type ActivesList = NonNullable<
  ReturnType<typeof useManagedActivesQuery>["data"]
>["managedActives"];
type ActiveItem = NonNullable<ActivesList>[number];

export const Route = createFileRoute("/dash/actives")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
  }),
  component: RouteComponent,
});

export function buildFilter(
  parsed: ParsedSearch,
  cursor?: string,
): ActiveFilterInput {
  const statusFilter = parsed.filters.status?.value;
  const statusArray =
    typeof statusFilter === "string"
      ? [statusFilter]
      : Array.isArray(statusFilter)
        ? statusFilter
        : undefined;

  const typeValue = parsed.filters.type?.value;
  const creatorValue = parsed.filters.creator?.value;
  const storeValue = parsed.filters.store?.value;

  const input: ActiveFilterInput = {};

  if (parsed.freeText) input.search = parsed.freeText;
  if (statusArray) input.status = statusArray;
  if (typeof typeValue === "string") input.type = typeValue;
  if (typeof creatorValue === "string") input.creator = creatorValue;
  if (typeof storeValue === "string") input.store = storeValue;
  input.pagination = { cursor: cursor ?? undefined, limit: PAGE_SIZE };

  return input;
}

export function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [searchInput, setSearchInput] = useState(q);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { pendingSearch, clearPendingSearch } = usePendingSearch();

  const parsed = useMemo(() => parseSearch(q, ACTIVE_SEARCH_GRAMMAR), [q]);
  const filter = useMemo(() => buildFilter(parsed), [parsed]);

  const { data, loading, fetchMore, networkStatus } = useManagedActivesQuery({
    variables: { filter },
    notifyOnNetworkStatusChange: true,
    onError: (err) => {
      msg.error(err.message || t("dashActives.fetchFailed"));
    },
  });

  const actives = (data?.managedActives ?? []) as ActiveItem[];
  const lastCursor = actives.length > 0 ? actives[actives.length - 1].id : null;
  const hasMore = actives.length > 0 && actives.length % PAGE_SIZE === 0;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  const [removeActiveMutation] = useRemoveActiveMutation({
    refetchQueries: ["ManagedActives"],
  });
  const [batchRemoveActivesMutation] = useBatchRemoveActivesMutation({
    refetchQueries: ["ManagedActives"],
  });

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<ActiveItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const batchDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const [batchDeletePending, setBatchDeletePending] = useState(false);

  const setSearchParam = useCallback(
    (updates: Partial<{ q: string }>) =>
      navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
    [navigate],
  );

  useEffect(() => {
    if (pendingSearch !== null) {
      setSearchInput(pendingSearch);
      setSearchParam({ q: pendingSearch });
      clearPendingSearch();
    }
  }, [pendingSearch, clearPendingSearch, setSearchParam]);

  const handleCopy = useCallback(
    (text: string) => {
      try {
        navigator.clipboard.writeText(text);
        msg.success(t("dashActives.copied"));
      } catch {
        msg.error(t("dashActives.clipboardDenied"));
      }
    },
    [t, msg],
  );

  const loadMore = useCallback(async () => {
    if (!lastCursor || isLoadingMore) return;
    await fetchMore({
      variables: {
        filter: buildFilter(parsed, lastCursor),
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          managedActives: [
            ...(prev.managedActives ?? []),
            ...(fetchMoreResult.managedActives ?? []),
          ],
        };
      },
    });
  }, [fetchMore, parsed, lastCursor, isLoadingMore]);

  const openDeleteDialog = (active: ActiveItem) => {
    setPendingDelete(active);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletePending(true);
    try {
      await removeActiveMutation({
        variables: { id: pendingDelete.id },
      });
      msg.success(t("dashActives.deleteSuccess"));
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(pendingDelete.id);
        return next;
      });
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashActives.deleteFailed"),
      );
    } finally {
      setDeletePending(false);
    }
  };

  const openBatchDeleteDialog = () => {
    setTimeout(() => batchDeleteDialogRef.current?.showModal(), 0);
  };

  const confirmBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeletePending(true);
    try {
      await batchRemoveActivesMutation({
        variables: { ids: [...selectedIds] },
      });
      msg.success(
        formatMessage(t("dashActives.batchDeleteSuccess"), {
          count: selectedIds.size,
        }),
      );
      batchDeleteDialogRef.current?.close();
      setSelectedIds(new Set());
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashActives.batchDeleteFailed"),
      );
    } finally {
      setBatchDeletePending(false);
    }
  };

  const shanghaiToday = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  const columns = useMemo<ColumnDef<ActiveItem, unknown>[]>(
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
              title={t("dashActives.copyId")}
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
        header: t("dashActives.title"),
        cell: ({ row }) => (
          <span className="font-semibold max-w-40 truncate inline-block">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "isGame",
        header: t("dashActives.type"),
        cell: ({ row }) =>
          row.original.isGame ? (
            <span className="badge badge-success badge-sm">
              {t("dashActives.typeGame")}
            </span>
          ) : (
            <span className="badge badge-ghost badge-sm">
              {t("dashActives.typeNotGame")}
            </span>
          ),
      },
      {
        accessorKey: "date",
        header: t("dashActives.date"),
        cell: ({ row }) => row.original.date,
      },
      {
        accessorKey: "time",
        header: t("dashActives.time"),
        cell: ({ row }) => row.original.time ?? "—",
      },
      {
        accessorKey: "maxPlayers",
        header: t("dashActives.players"),
      },
      {
        accessorKey: "creator",
        header: t("dashActives.creator"),
        cell: ({ row }) => row.original.creator?.name ?? "—",
      },
      {
        accessorKey: "store",
        header: t("dashActives.store"),
        cell: () => "—",
      },
      {
        accessorKey: "status",
        header: t("dashActives.status"),
        cell: ({ row }) => {
          const isExpired = row.original.date < shanghaiToday;
          return isExpired ? (
            <span className="badge badge-ghost badge-sm">
              {t("dashActives.statusExpired")}
            </span>
          ) : (
            <span className="badge badge-success badge-sm">
              {t("dashActives.statusActive")}
            </span>
          );
        },
      },
    ],
    [t, handleCopy, shanghaiToday],
  );

  const quickFilters = useMemo(() => {
    const statusFilter = parsed.filters.status?.value;
    const activeStatus =
      typeof statusFilter === "string"
        ? [statusFilter]
        : Array.isArray(statusFilter)
          ? statusFilter
          : [];

    return [
      {
        label: t("dashActives.statusActive"),
        key: "status",
        value: "active",
        active: activeStatus.includes("active"),
      },
      {
        label: t("dashActives.statusExpired"),
        key: "status",
        value: "expired",
        active: activeStatus.includes("expired"),
      },
    ];
  }, [parsed, t]);

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex items-center gap-3">
        <DashBackButton />
        <TableToolbar
          searchBar={{
            grammar: ACTIVE_SEARCH_GRAMMAR,
            value: searchInput,
            onChange: setSearchInput,
            onSubmit: (parsedResult) => {
              const serialized = serialize(parsedResult, ACTIVE_SEARCH_GRAMMAR);
              setSearchParam({ q: serialized });
            },
            placeholder:
              t("dashActives.searchPlaceholder") ?? "Search actives…",
          }}
          quickFilters={quickFilters}
          storeFilter
        />
      </div>

      <div className="flex-1 min-h-0">
        <DashTable
          columns={columns}
          data={actives}
          loading={loading}
          emptyMessage={t("dashActives.noData")}
          paginationMode="none"
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
                  className="dropdown-content menu bg-base-200 rounded-box z-50 w-32 p-2 shadow-lg"
                >
                  <li>
                    <Link to="/dash/actives/$id" params={{ id: row.id }}>
                      <EyeIcon className="size-4" />
                      {t("dashActives.details")}
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="text-error"
                      onClick={() => openDeleteDialog(row)}
                    >
                      <TrashIcon className="size-4" />
                      {t("dashActives.delete")}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  to="/dash/actives/$id"
                  params={{ id: row.id }}
                  className="btn btn-xs btn-ghost"
                >
                  <EyeIcon className="size-4" />
                  {t("dashActives.details")}
                </Link>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost btn-error"
                  onClick={() => openDeleteDialog(row)}
                >
                  {t("dashActives.delete")}
                  <TrashIcon />
                </button>
              </div>
            )
          }
        />

        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <span className="loading loading-dots loading-sm" />
              ) : (
                t("dashActives.loadMore")
              )}
            </button>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <BatchActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              key: "delete",
              label: t("dashActives.batchDelete"),
              icon: <TrashIcon className="size-4" />,
              className: "btn-error",
              onClick: openBatchDeleteDialog,
            },
          ]}
        />
      )}

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t("dashActives.confirmDeleteTitle")}
            </h3>
            <p>{t("dashActives.confirmDeleteDescription")}</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>{t("dashActives.titleLabel")}</strong>{" "}
                {pendingDelete.title}
              </p>
              <p className="text-sm">
                <strong>{t("dashActives.dateLabel")}</strong>{" "}
                {pendingDelete.date}
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
                {t("dashActives.cancel")}
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
                  ? t("dashActives.deleting")
                  : t("dashActives.confirmDelete")}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={batchDeleteDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            {t("dashActives.confirmBatchDeleteTitle")}
          </h3>
          <p>
            {t("dashActives.batchDeletePrefix")}{" "}
            <strong>{selectedIds.size}</strong>{" "}
            {t("dashActives.batchDeleteSuffix")}
          </p>
          <div className="modal-action mt-6">
            <button
              type="button"
              className="btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                batchDeleteDialogRef.current?.close();
              }}
            >
              {t("dashActives.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-error"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void confirmBatchDelete();
              }}
              disabled={batchDeletePending}
            >
              {batchDeletePending
                ? t("dashActives.deleting")
                : formatMessage(t("dashActives.confirmDeleteItems"), {
                    count: selectedIds.size,
                  })}
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
