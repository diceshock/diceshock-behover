import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminStoreFilter from "@/client/components/AdminStoreFilter";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  useBatchRemoveActivesMutation,
  useManagedActivesQuery,
  useRemoveActiveMutation,
} from "@/client/graphql/__generated__";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";

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

type StatusFilter = "all" | "active" | "expired";

export const Route = createFileRoute("/dash/actives")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    status: ["all", "active", "expired"].includes(search.status as string)
      ? (search.status as StatusFilter)
      : "all",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { storeFilter } = useAdminStoreFilter();
  const [actives, setActives] = useState<ActiveItem[]>([]);

  const {
    data,
    loading,
    refetch: refreshActives,
  } = useManagedActivesQuery({
    onCompleted: (res) => {
      setActives((res.managedActives ?? []) as ActiveItem[]);
    },
    onError: (err) => {
      msg.error(err.message || t("dashActives.fetchFailed"));
    },
  });

  const [removeActiveMutation] = useRemoveActiveMutation({
    refetchQueries: ["ManagedActives"],
  });
  const [batchRemoveActivesMutation] = useBatchRemoveActivesMutation({
    refetchQueries: ["ManagedActives"],
  });

  const { q, status } = Route.useSearch();
  const navigate = useNavigate();
  const setSearch = useCallback(
    (updates: Partial<{ q: string; status: StatusFilter }>) =>
      navigate({
        from: Route.fullPath,
        search: (prev) => ({ ...prev, ...updates }),
        replace: true,
      }),
    [navigate],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<ActiveItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const batchDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const [batchDeletePending, setBatchDeletePending] = useState(false);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success(t("dashActives.copied"));
    } catch {
      msg.error(t("dashActives.clipboardDenied"));
    }
  };

  const shanghaiToday = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  const filteredActives = useMemo(() => {
    let result = actives;

    if (status === "active") {
      result = result.filter((a) => a.date >= shanghaiToday);
    } else if (status === "expired") {
      result = result.filter((a) => a.date < shanghaiToday);
    }

    if (q.trim()) {
      const lower = q.trim().toLowerCase();
      result = result.filter((a) => {
        const title = a.title.toLowerCase();
        const gameName = (
          a.boardGame?.schName ||
          a.boardGame?.engName ||
          ""
        ).toLowerCase();
        return title.includes(lower) || gameName.includes(lower);
      });
    }

    return result;
  }, [actives, status, q, shanghaiToday]);

  const allVisibleSelected =
    filteredActives.length > 0 &&
    filteredActives.every((a) => selectedIds.has(a.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredActives.map((a) => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
        variables: {
          ids: [...selectedIds],
        },
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

  return (
    <main className="size-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DashBackButton />
          <AdminStoreFilter />
        </div>

        {/* Search */}
        <label className="input input-bordered input-sm flex items-center gap-2 flex-1 max-w-xs">
          <MagnifyingGlassIcon className="size-4 opacity-50" />
          <input
            type="text"
            className="grow"
            placeholder={t("dashActives.searchPlaceholder")}
            value={q}
            onChange={(e) => setSearch({ q: e.target.value })}
          />
        </label>

        {/* Status filter */}
        <div className="flex gap-1">
          {(
            [
              ["all", t("dashActives.statusAll")],
              ["active", t("dashActives.statusActive")],
              ["expired", t("dashActives.statusExpired")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${status === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setSearch({ status: key })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1400px]">
          <thead>
            <tr className="z-20">
              <th>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  disabled={filteredActives.length === 0}
                />
              </th>
              <td className="whitespace-nowrap">ID</td>
              <td className="whitespace-nowrap">{t("dashActives.title")}</td>
              <td className="whitespace-nowrap">
                {t("dashActives.boardGame")}
              </td>
              <td className="whitespace-nowrap">{t("dashActives.date")}</td>
              <td className="whitespace-nowrap">{t("dashActives.time")}</td>
              <td className="whitespace-nowrap">{t("dashActives.players")}</td>
              <td className="whitespace-nowrap">{t("dashActives.joined")}</td>
              <td className="whitespace-nowrap">{t("dashActives.watching")}</td>
              <td className="whitespace-nowrap">{t("dashActives.creator")}</td>
              <td className="whitespace-nowrap">
                {t("dashActives.createdAt")}
              </td>
              <td className="whitespace-nowrap">{t("dashActives.status")}</td>
              <th className="whitespace-nowrap">{t("dashActives.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </td>
              </tr>
            ) : filteredActives.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="py-12 text-center text-base-content/60"
                >
                  {q.trim() || status !== "all"
                    ? t("dashActives.noMatch")
                    : t("dashActives.noData")}
                </td>
              </tr>
            ) : (
              filteredActives.map((active) => {
                const joinedCount = active.registrations.filter(
                  (r) => !r.isWatching,
                ).length;
                const watchingCount = active.registrations.filter(
                  (r) => r.isWatching,
                ).length;
                const isExpired = active.date < shanghaiToday;

                return (
                  <tr
                    key={active.id}
                    className={selectedIds.has(active.id) ? "active" : ""}
                  >
                    <th className="z-10">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.has(active.id)}
                        onChange={() => toggleSelect(active.id)}
                      />
                    </th>
                    <td className="font-mono">
                      <div className="relative group flex items-center gap-1">
                        <span className="cursor-default">
                          {active.id.slice(0, 5)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-square shrink-0"
                          onClick={() => handleCopy(active.id)}
                          title={t("dashActives.copyId")}
                        >
                          <CopyIcon className="size-3.5" />
                        </button>
                        <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
                          <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
                            {active.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="font-semibold max-w-40 truncate">
                      {active.title}
                    </td>
                    <td className="whitespace-nowrap">
                      {active.boardGame
                        ? active.boardGame.schName || active.boardGame.engName
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap">{active.date}</td>
                    <td className="whitespace-nowrap">{active.time ?? "—"}</td>
                    <td className="whitespace-nowrap">{active.maxPlayers}</td>
                    <td className="whitespace-nowrap">{joinedCount}</td>
                    <td className="whitespace-nowrap">{watchingCount}</td>
                    <td className="whitespace-nowrap">
                      {active.creator?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      {formatCreateAt(active.createdAt)}
                    </td>
                    <td className="whitespace-nowrap">
                      {isExpired ? (
                        <span className="badge badge-ghost badge-sm">
                          {t("dashActives.statusExpired")}
                        </span>
                      ) : (
                        <span className="badge badge-success badge-sm">
                          {t("dashActives.statusActive")}
                        </span>
                      )}
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
                              <Link
                                to="/dash/actives/$id"
                                params={{ id: active.id }}
                              >
                                <EyeIcon className="size-4" />
                                {t("dashActives.details")}
                              </Link>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="text-error"
                                onClick={() => openDeleteDialog(active)}
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
                            params={{ id: active.id }}
                            className="btn btn-xs btn-ghost"
                          >
                            <EyeIcon className="size-4" />
                            {t("dashActives.details")}
                          </Link>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-error"
                            onClick={() => openDeleteDialog(active)}
                          >
                            {t("dashActives.delete")}
                            <TrashIcon />
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
        {selectedIds.size > 0 && <div className="h-24" />}
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

      {/* Single delete dialog */}
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

      {/* Batch delete dialog */}
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
