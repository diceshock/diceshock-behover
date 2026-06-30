import {
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  QrCodeIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TableScope,
  TableStatus,
  TableType,
  useCreateTableMutation,
  useManagedTablesQuery,
  useRemoveTableMutation,
  useToggleTableStatusMutation,
} from "@/client/graphql/__generated__";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  type ParsedSearch,
  parseSearch,
  serialize,
  TABLE_SEARCH_GRAMMAR,
} from "@/client/lib/searchParser";
import dayjs from "@/shared/utils/dayjs-config";

const PAGE_SIZE = 20;

const TYPE_LABEL_KEYS: Record<string, string> = {
  fixed: "dashTables.fixedTable",
  solo: "dashTables.openTable",
};

const SCOPE_LABEL_KEYS: Record<string, string> = {
  trpg: "dashTables.trpg",
  boardgame: "dashTables.boardGames",
  console: "dashTables.console",
  mahjong: "dashTables.riichiMahjong",
};

type TablesList = NonNullable<
  ReturnType<typeof useManagedTablesQuery>["data"]
>["managedTables"];
type TableItem = NonNullable<TablesList>[number];

function formatCreateAt(val: unknown): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val as string | number | Date, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

function typeLabel(t: (key: string) => string, value: string) {
  const key = TYPE_LABEL_KEYS[value];
  return key ? t(key) : value;
}

function scopeLabel(value: string) {
  const key = SCOPE_LABEL_KEYS[value];
  return key ?? value;
}

export const Route = createFileRoute("/dash/tables")({
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
  const nameFilter = parsed.filters.name?.value;

  const search =
    [parsed.freeText, typeof nameFilter === "string" ? nameFilter : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    search,
    type:
      typeof typeFilter === "string"
        ? [typeFilter.toUpperCase()]
        : Array.isArray(typeFilter)
          ? typeFilter.map((v) => v.toUpperCase())
          : undefined,
    status:
      typeof statusFilter === "string"
        ? [statusFilter.toUpperCase()]
        : Array.isArray(statusFilter)
          ? statusFilter.map((v) => v.toUpperCase())
          : undefined,
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

  const parsed = useMemo(() => parseSearch(q, TABLE_SEARCH_GRAMMAR), [q]);
  const filter = useMemo(
    () => buildFilter(parsed, page, sorting),
    [parsed, page, sorting],
  );

  const { data, loading } = useManagedTablesQuery({
    variables: { filter },
    onError: (err) => {
      msg.error(err.message || t("dashTables.loadFailed"));
    },
  });

  const tables = (data?.managedTables ?? []) as TableItem[];

  const [createTableMutation] = useCreateTableMutation({
    refetchQueries: ["ManagedTables"],
  });
  const [toggleTableStatusMutation] = useToggleTableStatusMutation({
    refetchQueries: ["ManagedTables"],
  });
  const [removeTableMutation] = useRemoveTableMutation({
    refetchQueries: ["ManagedTables"],
  });

  const createDialogRef = useRef<HTMLDialogElement>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "fixed" as "fixed" | TableType.Solo,
    scope: "boardgame" as "trpg" | "boardgame" | "console" | "mahjong",
    capacity: 4,
  });
  const [createPending, setCreatePending] = useState(false);
  const [batchPending, setBatchPending] = useState(false);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<TableItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      msg.error(t("dashTables.nameRequired"));
      return;
    }
    setCreatePending(true);
    try {
      await createTableMutation({
        variables: {
          input: {
            name: createForm.name.trim(),
            type:
              createForm.type === "fixed" ? TableType.Fixed : TableType.Solo,
            scope:
              createForm.scope === "boardgame"
                ? TableScope.Boardgame
                : createForm.scope === "trpg"
                  ? TableScope.Trpg
                  : createForm.scope === "console"
                    ? TableScope.Console
                    : TableScope.Mahjong,
            ...(createForm.type !== TableType.Solo
              ? { capacity: createForm.capacity }
              : {}),
          },
        },
      });
      msg.success(t("dashTables.created"));
      createDialogRef.current?.close();
      setCreateForm({
        name: "",
        type: "fixed",
        scope: "boardgame",
        capacity: 4,
      });
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashTables.createFailed"),
      );
    } finally {
      setCreatePending(false);
    }
  };

  const handleToggleStatus = async (table: TableItem) => {
    try {
      const res = await toggleTableStatusMutation({
        variables: { id: table.id },
      });
      msg.success(
        res.data?.toggleTableStatus.status === TableStatus.Active
          ? t("dashTables.listed")
          : t("dashTables.unlisted"),
      );
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashTables.operationFailed"),
      );
    }
  };

  const openDeleteDialog = (table: TableItem) => {
    setPendingDelete(table);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletePending(true);
    try {
      await removeTableMutation({
        variables: { id: pendingDelete.id },
      });
      msg.success(t("dashTables.deleted"));
      deleteDialogRef.current?.close();
      setPendingDelete(null);
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashTables.deleteFailed"),
      );
    } finally {
      setDeletePending(false);
    }
  };

  const columns = useMemo<ColumnDef<TableItem, unknown>[]>(
    () => [
      {
        accessorKey: "code",
        header: t("dashTables.code"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.code ? row.original.code.slice(0, 8) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: t("dashTables.name"),
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "type",
        header: t("dashTables.type"),
        cell: ({ row }) => (
          <span
            className={`badge badge-sm ${row.original.type === TableType.Solo ? "badge-secondary" : "badge-info"}`}
          >
            {typeLabel(t, row.original.type)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("dashTables.status"),
        cell: ({ row }) =>
          row.original.status === TableStatus.Active ? (
            <span className="badge badge-success badge-sm">
              {t("dashTables.active")}
            </span>
          ) : (
            <span className="badge badge-ghost badge-sm">
              {t("dashTables.inactive")}
            </span>
          ),
      },
      {
        accessorKey: "capacity",
        header: t("dashTables.capacity"),
        cell: ({ row }) => {
          const occupiedCount = row.original.occupancies.length;
          return (
            <span>
              {row.original.type === TableType.Solo
                ? "∞"
                : `${occupiedCount}/${row.original.capacity}`}
            </span>
          );
        },
      },
      {
        accessorKey: "scope",
        header: t("dashTables.scope"),
        cell: ({ row }) => (
          <span className="badge badge-sm badge-outline">
            {scopeLabel(row.original.scope)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("dashTables.createdAt"),
        cell: ({ row }) => formatCreateAt(row.original.createdAt),
      },
    ],
    [t],
  );

  const total = tables.length;
  const hasMore = tables.length === PAGE_SIZE;
  const selectedTables = tables.filter((table) => selectedIds.has(table.id));
  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "桌台",
    rows: tables,
    selectedIds,
    getRowId: (table) => table.id,
    onClear: clearSelectedIds,
  });

  const handleBatchStatus = async (targetStatus: TableStatus) => {
    const targets = selectedTables.filter(
      (table) => table.status !== targetStatus,
    );
    if (targets.length === 0) return;
    setBatchPending(true);
    try {
      for (const table of targets) {
        await toggleTableStatusMutation({ variables: { id: table.id } });
      }
      msg.success(t("dashTables.operationSuccess"));
      clearSelectedIds();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashTables.operationFailed"),
      );
    } finally {
      setBatchPending(false);
    }
  };

  const selectedActions: BatchAction[] = [
    {
      key: "enable",
      label: t("dashTables.enable"),
      disabled: batchPending,
      onClick: () => void handleBatchStatus(TableStatus.Active),
    },
    {
      key: "disable",
      label: t("dashTables.disable"),
      disabled: batchPending,
      onClick: () => void handleBatchStatus(TableStatus.Inactive),
    },
  ];

  const quickFilters = useMemo(
    () => [
      {
        label: t("dashTables.fixedTable"),
        key: "type",
        value: "fixed",
        active: parsed.filters.type?.value === "fixed",
      },
      {
        label: t("dashTables.openTable"),
        key: "type",
        value: "solo",
        active: parsed.filters.type?.value === "solo",
      },
      {
        label: t("dashTables.active"),
        key: "status",
        value: "active",
        active: parsed.filters.status?.value === "active",
      },
      {
        label: t("dashTables.inactive"),
        key: "status",
        value: "inactive",
        active: parsed.filters.status?.value === "inactive",
      },
    ],
    [t, parsed],
  );

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex items-center gap-3">
        <DashBackButton />
        <TableToolbar
          searchBar={{
            grammar: TABLE_SEARCH_GRAMMAR,
            value: searchInput,
            onChange: setSearchInput,
            onSubmit: (parsedResult) => {
              const serialized = serialize(parsedResult, TABLE_SEARCH_GRAMMAR);
              setSearchParam({ q: serialized, page: 1 });
            },
            placeholder: t("dashTables.searchPlaceholder") ?? "Search tables…",
          }}
          quickFilters={quickFilters}
          onQuickFilterToggle={(key, value) => {
            const nextParsed = parseSearch(searchInput, TABLE_SEARCH_GRAMMAR);
            const nextFilters = { ...nextParsed.filters };
            const already = nextFilters[key]?.value === value;
            if (already) delete nextFilters[key];
            else nextFilters[key] = { operator: "eq", value };
            const serialized = serialize(
              { ...nextParsed, filters: nextFilters, errors: [] },
              TABLE_SEARCH_GRAMMAR,
            );
            setSearchInput(serialized);
            setSearchParam({ q: serialized, page: 1 });
          }}
          storeFilter
          extra={
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1"
              onClick={() => createDialogRef.current?.showModal()}
            >
              <PlusIcon className="size-4" weight="bold" />
              {t("dashTables.newTable")}
            </button>
          }
        />
      </div>

      <div className="flex-1 min-h-0">
        <DashTable
          columns={columns}
          data={tables}
          loading={loading}
          emptyMessage={t("dashTables.noMatchedTables")}
          pagination={{
            offset: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            total,
            hasMore,
          }}
          onPaginationChange={(p) =>
            setSearchParam({
              page: Math.floor(p.offset / PAGE_SIZE) + 1,
            })
          }
          sorting={sorting}
          onSortingChange={setSorting}
          sortableColumns={["name", "type", "status", "capacity", "createdAt"]}
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
                    <Link to="/dash/tables/$id" params={{ id: row.id }} search={{ tab: "basic" }}>
                      <QrCodeIcon className="size-4" />
                      {t("dashTables.viewQr") ?? "QR Code"}
                    </Link>
                  </li>
                  <li>
                    <Link to="/dash/tables/$id" params={{ id: row.id }} search={{ tab: "basic" }}>
                      <PencilSimpleIcon className="size-4" />
                      {t("dashTables.details")}
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(row)}
                    >
                      <PowerIcon className="size-3.5" />
                      {row.status === TableStatus.Active
                        ? t("dashTables.inactive")
                        : t("dashTables.active")}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="text-error"
                      onClick={() => openDeleteDialog(row)}
                    >
                      <TrashIcon className="size-3.5" />
                      {t("dashTables.delete")}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  to="/dash/tables/$id"
                  params={{ id: row.id }}
                  search={{ tab: "basic" }}
                  className="btn btn-xs btn-ghost"
                  title={t("dashTables.viewQr") ?? "QR Code"}
                >
                  <QrCodeIcon className="size-4" />
                </Link>
                <Link
                  to="/dash/tables/$id"
                  params={{ id: row.id }}
                  search={{ tab: "basic" }}
                  className="btn btn-xs btn-ghost"
                >
                  <PencilSimpleIcon className="size-4" />
                  {t("dashTables.details")}
                </Link>
                <button
                  type="button"
                  className={`btn btn-xs btn-ghost ${row.status === TableStatus.Active ? "btn-neutral" : "btn-success"}`}
                  onClick={() => void handleToggleStatus(row)}
                >
                  <PowerIcon className="size-3.5" />
                  {row.status === TableStatus.Active
                    ? t("dashTables.inactive")
                    : t("dashTables.active")}
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost btn-error"
                  onClick={() => openDeleteDialog(row)}
                >
                  <TrashIcon className="size-3.5" />
                  {t("dashTables.delete")}
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
        unit="桌台"
      />

      <dialog ref={createDialogRef} className="modal">
        <form method="dialog" className="modal-box" onSubmit={handleCreate}>
          <div className="modal-action flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{t("dashTables.newTable")}</h3>
            <button
              type="button"
              className="btn btn-ghost btn-square"
              onClick={() => createDialogRef.current?.close()}
            >
              <XIcon />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {t("dashTables.tableName")}
              </span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder={t("dashTables.namePlaceholder")}
                maxLength={50}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {t("dashTables.tableType")}
              </span>
              <select
                className="select select-bordered w-full"
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    type: e.target.value as "fixed" | TableType.Solo,
                  }))
                }
              >
                <option value="fixed">{t("dashTables.fixedTable")}</option>
                <option value={TableType.Solo}>
                  {t("dashTables.openTable")}
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {t("dashTables.businessScope")}
              </span>
              <select
                className="select select-bordered w-full"
                value={createForm.scope}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    scope: e.target.value as
                      | "trpg"
                      | "boardgame"
                      | "console"
                      | "mahjong",
                  }))
                }
              >
                <option value="boardgame">{t("dashTables.boardGames")}</option>
                <option value="mahjong">{t("dashTables.riichiMahjong")}</option>
                <option value="trpg">{t("dashTables.trpg")}</option>
                <option value="console">{t("dashTables.console")}</option>
              </select>
            </label>

            {createForm.type !== TableType.Solo && (
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">
                  {t("dashTables.capacity")}
                </span>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={createForm.capacity}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      capacity: Number(e.target.value),
                    }))
                  }
                  min={1}
                  max={20}
                />
              </label>
            )}
          </div>

          <div className="modal-action mt-6">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createPending}
            >
              {createPending
                ? t("dashTables.creating")
                : t("dashTables.create")}
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t("dashTables.confirmDeleteTitle")}
            </h3>
            <p>{t("dashTables.confirmDeleteDesc")}</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>{t("dashTables.nameLabel")}</strong>{" "}
                {pendingDelete.name}
              </p>
              <p className="text-sm">
                <strong>{t("dashTables.typeLabel")}</strong>{" "}
                {typeLabel(t, pendingDelete.type)}
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
                {t("dashTables.cancel")}
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
                  ? t("dashTables.deleting")
                  : t("dashTables.confirmDelete")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
