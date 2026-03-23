import {
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

function formatCreateAt(val: unknown): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val as string | number | Date, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

type ActivesList = Awaited<
  ReturnType<typeof trpcClientDash.activesManagement.list.query>
>;
type ActiveItem = ActivesList[number];

type StatusFilter = "all" | "active" | "expired";

export const Route = createFileRoute("/dash/actives")({
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<ActiveItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const batchDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const [batchDeletePending, setBatchDeletePending] = useState(false);

  const shanghaiToday = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  const refreshActives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.activesManagement.list.query();
      setActives(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取约局列表失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void refreshActives();
  }, [refreshActives]);

  const filteredActives = useMemo(() => {
    let result = actives;

    if (statusFilter === "active") {
      result = result.filter((a) => a.date >= shanghaiToday);
    } else if (statusFilter === "expired") {
      result = result.filter((a) => a.date < shanghaiToday);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((a) => {
        const title = a.title.toLowerCase();
        const gameName = (
          a.boardGame?.sch_name ||
          a.boardGame?.eng_name ||
          ""
        ).toLowerCase();
        return title.includes(q) || gameName.includes(q);
      });
    }

    return result;
  }, [actives, statusFilter, searchText, shanghaiToday]);

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
      await trpcClientDash.activesManagement.remove.mutate({
        id: pendingDelete.id,
      });
      msg.success("约局已删除");
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(pendingDelete.id);
        return next;
      });
      await refreshActives();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
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
      await trpcClientDash.activesManagement.batchRemove.mutate({
        ids: [...selectedIds],
      });
      msg.success(`已删除 ${selectedIds.size} 条约局`);
      batchDeleteDialogRef.current?.close();
      setSelectedIds(new Set());
      await refreshActives();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "批量删除失败");
    } finally {
      setBatchDeletePending(false);
    }
  };

  return (
    <main className="size-full">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between gap-3">
        <DashBackButton />

        {/* Search */}
        <label className="input input-bordered input-sm flex items-center gap-2 flex-1 max-w-xs">
          <MagnifyingGlassIcon className="size-4 opacity-50" />
          <input
            type="text"
            className="grow"
            placeholder="搜索标题/桌游..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </label>

        {/* Status filter */}
        <div className="flex gap-1">
          {(
            [
              ["all", "全部"],
              ["active", "进行中"],
              ["expired", "已过期"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${statusFilter === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="w-full h-[calc(100vh-8rem)] overflow-y-auto overflow-x-auto pb-40">
        <table className="table table-pin-rows table-pin-cols">
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
              <td>ID</td>
              <td>标题</td>
              <td>桌游</td>
              <td>日期</td>
              <td>时间</td>
              <td>人数</td>
              <td>已报名</td>
              <td>观望</td>
              <td>发起人</td>
              <td>创建时间</td>
              <td>状态</td>
              <td>操作</td>
              <th />
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
                  {searchText.trim() || statusFilter !== "all"
                    ? "没有匹配的约局。"
                    : "暂无约局数据。"}
                </td>
              </tr>
            ) : (
              filteredActives.map((active) => {
                const joinedCount = active.registrations.filter(
                  (r) => !r.is_watching,
                ).length;
                const watchingCount = active.registrations.filter(
                  (r) => r.is_watching,
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
                    <td className="font-mono text-xs max-w-24 truncate">
                      {active.id}
                    </td>
                    <td className="font-semibold max-w-40 truncate">
                      {active.title}
                    </td>
                    <td className="text-sm">
                      {active.boardGame
                        ? active.boardGame.sch_name || active.boardGame.eng_name
                        : "—"}
                    </td>
                    <td className="text-sm">{active.date}</td>
                    <td className="text-sm">{active.time ?? "—"}</td>
                    <td className="text-sm">{active.max_players}</td>
                    <td className="text-sm">{joinedCount}</td>
                    <td className="text-sm">{watchingCount}</td>
                    <td className="text-sm">{active.creator?.name ?? "—"}</td>
                    <td className="text-sm">
                      {formatCreateAt(active.create_at)}
                    </td>
                    <td>
                      {isExpired ? (
                        <span className="badge badge-ghost badge-sm">
                          已过期
                        </span>
                      ) : (
                        <span className="badge badge-success badge-sm">
                          进行中
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link
                          to="/dash/actives/$id"
                          params={{ id: active.id }}
                          className="btn btn-xs btn-ghost"
                        >
                          <PencilSimpleIcon className="size-4" />
                          编辑
                        </Link>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={() => openDeleteDialog(active)}
                        >
                          删除
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                    <th />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-base-300 rounded-box px-6 py-3 shadow-xl">
          <span className="text-sm font-medium">
            已选择 {selectedIds.size} 项
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            取消选择
          </button>
          <button
            type="button"
            className="btn btn-sm btn-error"
            onClick={openBatchDeleteDialog}
          >
            <TrashIcon className="size-4" />
            批量删除
          </button>
        </div>
      )}

      {/* Single delete dialog */}
      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认删除约局</h3>
            <p>删除后将同时清除所有报名记录，此操作不可撤销。</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>标题:</strong> {pendingDelete.title}
              </p>
              <p className="text-sm">
                <strong>日期:</strong> {pendingDelete.date}
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
                取消
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
                {deletePending ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Batch delete dialog */}
      <dialog ref={batchDeleteDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">确认批量删除</h3>
          <p>
            即将删除 <strong>{selectedIds.size}</strong>{" "}
            条约局及其所有报名记录，此操作不可撤销。
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
              取消
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
                ? "删除中..."
                : `确认删除 ${selectedIds.size} 项`}
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
