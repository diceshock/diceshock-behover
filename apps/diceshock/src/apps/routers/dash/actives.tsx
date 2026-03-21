import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

export const Route = createFileRoute("/dash/actives")({
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<ActiveItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

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

  const openDeleteDialog = (active: ActiveItem) => {
    setPendingDelete(active);
    setTimeout(() => {
      deleteDialogRef.current?.showModal();
    }, 0);
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
      await refreshActives();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletePending(false);
    }
  };

  const shanghaiToday = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  return (
    <main className="size-full">
      <div className="px-4 pt-4">
        <DashBackButton />
      </div>

      <div className="w-full h-[calc(100vh-8rem)] overflow-y-auto overflow-x-auto pb-40">
        <table className="table table-pin-rows table-pin-cols">
          <thead>
            <tr className="z-20">
              <th />
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
            ) : actives.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="py-12 text-center text-base-content/60"
                >
                  暂无约局数据。
                </td>
              </tr>
            ) : (
              actives.map((active) => {
                const joinedCount = active.registrations.filter(
                  (r) => !r.is_watching,
                ).length;
                const watchingCount = active.registrations.filter(
                  (r) => r.is_watching,
                ).length;
                const isExpired = active.date < shanghaiToday;

                return (
                  <tr key={active.id}>
                    <th className="z-10" />
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
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-error"
                        onClick={() => openDeleteDialog(active)}
                      >
                        删除
                        <TrashIcon />
                      </button>
                    </td>
                    <th />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
    </main>
  );
}
