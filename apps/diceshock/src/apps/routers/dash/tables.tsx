import {
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminStoreFilter from "@/client/components/AdminStoreFilter";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

type TablesList = Awaited<
  ReturnType<typeof trpcClientDash.tablesManagement.list.query>
>;
type TableItem = TablesList[number];

type TypeFilter = "all" | "fixed" | "solo";
type StatusFilter = "all" | "active" | "inactive";

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

export const Route = createFileRoute("/dash/tables")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    type: ["all", "fixed", "solo"].includes(search.type as string)
      ? (search.type as TypeFilter)
      : "all",
    status: ["all", "active", "inactive"].includes(search.status as string)
      ? (search.status as StatusFilter)
      : "all",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { storeFilter } = useAdminStoreFilter();
  const { q, type, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setSearch = useCallback(
    (updates: Partial<{ q: string; type: TypeFilter; status: StatusFilter }>) =>
      navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
    [navigate],
  );
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);

  const createDialogRef = useRef<HTMLDialogElement>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "fixed" as "fixed" | "solo",
    scope: "boardgame" as "trpg" | "boardgame" | "console" | "mahjong",
    capacity: 4,
  });
  const [createPending, setCreatePending] = useState(false);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<TableItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const refreshTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.tablesManagement.list.query();
      setTables(data);
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashTables.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [storeFilter, msg]);

  useEffect(() => {
    void refreshTables();
  }, [refreshTables]);

  const filteredTables = useMemo(() => {
    let result = tables;

    if (type !== "all") {
      result = result.filter((t) => t.type === type);
    }

    if (status !== "all") {
      result = result.filter((t) => t.status === status);
    }

    if (q.trim()) {
      const search = q.trim().toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(search));
    }

    return result;
  }, [tables, type, status, q]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      msg.error(t("dashTables.nameRequired"));
      return;
    }
    setCreatePending(true);
    try {
      await trpcClientDash.tablesManagement.create.mutate({
        name: createForm.name.trim(),
        type: createForm.type,
        scope: createForm.scope,
        ...(createForm.type !== "solo"
          ? { capacity: createForm.capacity }
          : {}),
      });
      msg.success(t("dashTables.created"));
      createDialogRef.current?.close();
      setCreateForm({
        name: "",
        type: "fixed",
        scope: "boardgame",
        capacity: 4,
      });
      await refreshTables();
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
      const res = await trpcClientDash.tablesManagement.toggleStatus.mutate({
        id: table.id,
      });
      msg.success(
        res.status === "active"
          ? t("dashTables.listed")
          : t("dashTables.unlisted"),
      );
      await refreshTables();
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
      await trpcClientDash.tablesManagement.remove.mutate({
        id: pendingDelete.id,
      });
      msg.success(t("dashTables.deleted"));
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      await refreshTables();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashTables.deleteFailed"),
      );
    } finally {
      setDeletePending(false);
    }
  };

  function formatCreateAt(val: unknown): string {
    if (!val) return "—";
    try {
      const d = dayjs.tz(val as string | number | Date, "Asia/Shanghai");
      return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
    } catch {
      return "—";
    }
  }

  const typeLabel = (value: string) => {
    const key = TYPE_LABEL_KEYS[value];
    return key ? t(key) : value;
  };

  const scopeLabel = (value: string) => {
    const key = SCOPE_LABEL_KEYS[value];
    return key ? t(key) : value;
  };

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <DashBackButton />
          <AdminStoreFilter />
          <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
            <MagnifyingGlassIcon className="size-4 opacity-50 shrink-0" />
            <input
              type="text"
              className="grow min-w-0"
              placeholder={t("dashTables.searchPlaceholder")}
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="btn btn-sm btn-primary shrink-0"
            onClick={() => createDialogRef.current?.showModal()}
          >
            <PlusIcon className="size-4" />
            {t("dashTables.newTable")}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              ["all", t("dashTables.all")],
              ["fixed", t("dashTables.fixedTable")],
              ["solo", t("dashTables.openTable")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${type === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setSearch({ type: key })}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {(
              [
                ["all", t("dashTables.all")],
                ["active", t("dashTables.active")],
                ["inactive", t("dashTables.inactive")],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn btn-xs ${status === key ? "btn-secondary" : "btn-ghost"}`}
                onClick={() => setSearch({ status: key })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[900px]">
          <thead>
            <tr className="z-20">
              <td className="whitespace-nowrap">{t("dashTables.name")}</td>
              <td className="whitespace-nowrap">{t("dashTables.type")}</td>
              <td className="whitespace-nowrap">{t("dashTables.status")}</td>
              <td className="whitespace-nowrap">{t("dashTables.capacity")}</td>
              <td className="whitespace-nowrap">
                {t("dashTables.currentUsage")}
              </td>
              <td className="whitespace-nowrap">{t("dashTables.createdAt")}</td>
              <th className="whitespace-nowrap">{t("dashTables.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </td>
              </tr>
            ) : filteredTables.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-base-content/60"
                >
                  {q.trim() || type !== "all" || status !== "all"
                    ? t("dashTables.noMatchedTables")
                    : t("dashTables.noTables")}
                </td>
              </tr>
            ) : (
              filteredTables.map((table) => {
                const occupiedCount = table.occupancies.length;

                return (
                  <tr key={table.id}>
                    <td className="font-semibold whitespace-nowrap">
                      {table.name}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`badge badge-sm ${table.type === "solo" ? "badge-secondary" : "badge-info"}`}
                      >
                        {typeLabel(table.type)}
                      </span>
                      {table.scope && (
                        <span className="badge badge-sm badge-outline ml-1">
                          {scopeLabel(table.scope)}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {table.status === "active" ? (
                        <span className="badge badge-success badge-sm">
                          {t("dashTables.active")}
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">
                          {t("dashTables.inactive")}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {table.type === "solo" ? "∞" : table.capacity}
                    </td>
                    <td className="whitespace-nowrap">
                      {table.type === "solo"
                        ? occupiedCount
                        : `${occupiedCount}/${table.capacity}`}
                    </td>
                    <td className="whitespace-nowrap">
                      {formatCreateAt(table.create_at)}
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
                            <li>
                              <button
                                type="button"
                                onClick={() => void handleToggleStatus(table)}
                              >
                                <PowerIcon className="size-3.5" />
                                {table.status === "active"
                                  ? t("dashTables.inactive")
                                  : t("dashTables.active")}
                              </button>
                            </li>
                            <li>
                              <Link
                                to="/dash/tables/$id"
                                params={{ id: table.id }}
                              >
                                <PencilSimpleIcon className="size-4" />
                                {t("dashTables.details")}
                              </Link>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="text-error"
                                onClick={() => openDeleteDialog(table)}
                              >
                                <TrashIcon className="size-3.5" />
                                {t("dashTables.delete")}
                              </button>
                            </li>
                          </ul>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className={`btn btn-xs btn-ghost ${table.status === "active" ? "btn-neutral" : "btn-success"}`}
                            onClick={() => void handleToggleStatus(table)}
                          >
                            <PowerIcon className="size-3.5" />
                            {table.status === "active"
                              ? t("dashTables.inactive")
                              : t("dashTables.active")}
                          </button>
                          <Link
                            to="/dash/tables/$id"
                            params={{ id: table.id }}
                            className="btn btn-xs btn-ghost"
                          >
                            <PencilSimpleIcon className="size-4" />
                            {t("dashTables.details")}
                          </Link>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-error"
                            onClick={() => openDeleteDialog(table)}
                          >
                            <TrashIcon className="size-3.5" />
                            {t("dashTables.delete")}
                          </button>
                        </div>
                      )}
                    </th>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
                    type: e.target.value as "fixed" | "solo",
                  }))
                }
              >
                <option value="fixed">{t("dashTables.fixedTable")}</option>
                <option value="solo">{t("dashTables.openTable")}</option>
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

            {createForm.type !== "solo" && (
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
                {typeLabel(pendingDelete.type)}
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
