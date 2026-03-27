import {
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

type TablesList = Awaited<
  ReturnType<typeof trpcClientDash.tablesManagement.list.query>
>;
type TableItem = TablesList[number];

type TypeFilter = "all" | "mahjong" | "boardgame" | "solo";
type StatusFilter = "all" | "active" | "inactive";

const TYPE_LABELS: Record<string, string> = {
  mahjong: "麻将台",
  boardgame: "桌游台",
  solo: "散人台",
};

export const Route = createFileRoute("/dash/tables")({
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const isMobile = useIsMobile();
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const createDialogRef = useRef<HTMLDialogElement>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "boardgame" as "mahjong" | "boardgame" | "solo",
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
      msg.error(err instanceof Error ? err.message : "获取桌台列表失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void refreshTables();
  }, [refreshTables]);

  const filteredTables = useMemo(() => {
    let result = tables;

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }

    return result;
  }, [tables, typeFilter, statusFilter, searchText]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      msg.error("请输入桌台名称");
      return;
    }
    setCreatePending(true);
    try {
      await trpcClientDash.tablesManagement.create.mutate({
        name: createForm.name.trim(),
        type: createForm.type,
        ...(createForm.type !== "solo"
          ? { capacity: createForm.capacity }
          : {}),
      });
      msg.success("桌台已创建");
      createDialogRef.current?.close();
      setCreateForm({ name: "", type: "boardgame", capacity: 4 });
      await refreshTables();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreatePending(false);
    }
  };

  const handleToggleStatus = async (table: TableItem) => {
    try {
      const res = await trpcClientDash.tablesManagement.toggleStatus.mutate({
        id: table.id,
      });
      msg.success(res.status === "active" ? "已上架" : "已下架");
      await refreshTables();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "操作失败");
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
      msg.success("桌台已删除");
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      await refreshTables();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
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

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <DashBackButton />
          <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
            <MagnifyingGlassIcon className="size-4 opacity-50 shrink-0" />
            <input
              type="text"
              className="grow min-w-0"
              placeholder="搜索桌台名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-sm btn-primary shrink-0"
            onClick={() => createDialogRef.current?.showModal()}
          >
            <PlusIcon className="size-4" />
            新建桌台
          </button>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              ["all", "全部"],
              ["mahjong", "麻将台"],
              ["boardgame", "桌游台"],
              ["solo", "散人台"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${typeFilter === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {(
              [
                ["all", "全部"],
                ["active", "上架"],
                ["inactive", "下架"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn btn-xs ${statusFilter === key ? "btn-secondary" : "btn-ghost"}`}
                onClick={() => setStatusFilter(key)}
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
              <td className="whitespace-nowrap">名称</td>
              <td className="whitespace-nowrap">类型</td>
              <td className="whitespace-nowrap">状态</td>
              <td className="whitespace-nowrap">适用人数</td>
              <td className="whitespace-nowrap">当前使用</td>
              <td className="whitespace-nowrap">创建时间</td>
              <th className="whitespace-nowrap">操作</th>
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
                  {searchText.trim() ||
                  typeFilter !== "all" ||
                  statusFilter !== "all"
                    ? "没有匹配的桌台。"
                    : "暂无桌台数据。"}
                </td>
              </tr>
            ) : (
              filteredTables.map((table) => {
                const occupiedSeats = table.occupancies.reduce(
                  (sum, o) => sum + (o.seats ?? 1),
                  0,
                );

                return (
                  <tr key={table.id}>
                    <td className="font-semibold whitespace-nowrap">
                      {table.name}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`badge badge-sm ${table.type === "mahjong" ? "badge-accent" : table.type === "solo" ? "badge-secondary" : "badge-info"}`}
                      >
                        {TYPE_LABELS[table.type] ?? table.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      {table.status === "active" ? (
                        <span className="badge badge-success badge-sm">
                          上架
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">下架</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {table.type === "solo" ? "∞" : table.capacity}
                    </td>
                    <td className="whitespace-nowrap">
                      {table.type === "solo"
                        ? occupiedSeats
                        : `${occupiedSeats}/${table.capacity}`}
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
                                {table.status === "active" ? "下架" : "上架"}
                              </button>
                            </li>
                            <li>
                              <Link
                                to="/dash/tables/$id"
                                params={{ id: table.id }}
                              >
                                <PencilSimpleIcon className="size-4" />
                                详情
                              </Link>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="text-error"
                                onClick={() => openDeleteDialog(table)}
                              >
                                <TrashIcon className="size-3.5" />
                                删除
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
                            {table.status === "active" ? "下架" : "上架"}
                          </button>
                          <Link
                            to="/dash/tables/$id"
                            params={{ id: table.id }}
                            className="btn btn-xs btn-ghost"
                          >
                            <PencilSimpleIcon className="size-4" />
                            详情
                          </Link>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-error"
                            onClick={() => openDeleteDialog(table)}
                          >
                            <TrashIcon className="size-3.5" />
                            删除
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
            <h3 className="font-bold text-lg">新建桌台</h3>
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
              <span className="label text-sm font-semibold">桌台名称</span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="例：A1桌"
                maxLength={50}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">桌台类型</span>
              <select
                className="select select-bordered w-full"
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    type: e.target.value as "mahjong" | "boardgame" | "solo",
                  }))
                }
              >
                <option value="boardgame">桌游台</option>
                <option value="mahjong">麻将台</option>
                <option value="solo">散人台</option>
              </select>
            </label>

            {createForm.type !== "solo" && (
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">适用人数</span>
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
              {createPending ? "创建中..." : "创建"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认删除桌台</h3>
            <p>删除后将同时清除所有使用记录，此操作不可撤销。</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>名称:</strong> {pendingDelete.name}
              </p>
              <p className="text-sm">
                <strong>类型:</strong>{" "}
                {TYPE_LABELS[pendingDelete.type] ?? pendingDelete.type}
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
    </main>
  );
}
