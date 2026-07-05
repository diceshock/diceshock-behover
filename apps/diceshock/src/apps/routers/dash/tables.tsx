import {
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PowerIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCallback, useMemo, useRef, useState } from "react";
import { InfiniteTable } from "@/client/components/dash/InfiniteTable";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import { useMsg } from "@/client/components/diceshock/Msg";
import type { ManagedTablesQuery } from "@/client/graphql/__generated__";
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
import {
  filtersToGqlVariables,
  useRouteFilters,
} from "@/client/hooks/useRouteFilters";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";

const BATCH_SIZE = 100

const TYPE_LABEL_KEYS: Record<string, string> = {
  FIXED: "dashTables.fixedTable",
  SOLO: "dashTables.openTable",
};

const SCOPE_LABEL_KEYS: Record<string, string> = {
  BOARDGAME: "dashTables.boardGames",
  TRPG: "dashTables.trpg",
  CONSOLE: "dashTables.console",
  MAHJONG: "dashTables.riichiMahjong",
};

type TableItem = ManagedTablesQuery["managedTables"][number];

function formatCreateAt(val: unknown): string {
  if (!val) return "—";
  const d = dayjs(val as string);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : "—";
}

function typeLabel(t: (key: string) => string, value: string) {
  const key = TYPE_LABEL_KEYS[value.toUpperCase()];
  return key ? t(key) : value;
}

function scopeLabel(value: string) {
  return SCOPE_LABEL_KEYS[value.toUpperCase()] ?? value;
}

export const Route = createFileRoute("/dash/tables")({
  validateSearch: (search) => search as Record<string, string>,
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { filters, query } = useRouteFilters();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);

  const gqlVars = useMemo(() => filtersToGqlVariables(filters, query), [filters, query]);

  const filter = useMemo(
    () => ({
      search: gqlVars.search as string | undefined,
      type: gqlVars.type
        ? Array.isArray(gqlVars.type)
          ? (gqlVars.type as string[]).map((v) => v.toUpperCase())
          : [String(gqlVars.type).toUpperCase()]
        : undefined,
      status: gqlVars.status
        ? Array.isArray(gqlVars.status)
          ? (gqlVars.status as string[]).map((v) => v.toUpperCase())
          : [String(gqlVars.status).toUpperCase()]
        : undefined,
      store: gqlVars.store as string | undefined,
      sortBy: (gqlVars.sortBy as string) ?? (sorting.length > 0 ? sorting[0].id : undefined),
      sortOrder:
        (gqlVars.sortOrder as SortOrder) ??
        (sorting.length > 0
          ? sorting[0].desc
            ? SortOrder.Desc
            : SortOrder.Asc
          : undefined),
      pagination: { offset: 0, limit: BATCH_SIZE },
    }),
    [gqlVars, sorting],
  );

  const { data, loading, fetchMore } = useManagedTablesQuery({
    variables: { filter },
    onError: (err) => {
      msg.error(err.message || t("dashTables.loadFailed"));
    },
  });

  const tables = (data?.managedTables ?? []) as TableItem[];
  const hasMore = tables.length >= offset + BATCH_SIZE;

  const handleLoadMore = useCallback(() => {
    const nextOffset = offset + BATCH_SIZE;
    setOffset(nextOffset);
    void fetchMore({
      variables: {
        filter: { ...filter, pagination: { offset: nextOffset, limit: BATCH_SIZE } },
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          managedTables: [...prev.managedTables, ...fetchMoreResult.managedTables],
        };
      },
    });
  }, [offset, filter, fetchMore]);

  const [createTableMutation] = useCreateTableMutation({
    refetchQueries: ["ManagedTables"],
    awaitRefetchQueries: true,
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

  return (
    <main className="flex-1 min-h-0 flex flex-col">
      <InfiniteTable
        columns={columns}
        data={tables}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        sorting={sorting}
        onSortingChange={setSorting}
        sortableColumns={["name", "type", "status", "capacity", "createdAt"]}
        enableRowSelection
        selectedRows={selectedIds}
        onSelectedRowsChange={setSelectedIds}
        getRowId={(row) => row.id}
        emptyMessage={t("dashTables.noMatchedTables")}
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
