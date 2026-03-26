import { EyeIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
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

type EventsList = Awaited<
  ReturnType<typeof trpcClientDash.eventsManagement.list.query>
>;
type EventItem = EventsList[number];

export const Route = createFileRoute("/dash/events")({
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<EventItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.eventsManagement.list.query();
      setEvents(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取活动列表失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const handleCreate = async () => {
    try {
      const event = await trpcClientDash.eventsManagement.create.mutate({
        title: "新活动",
      });
      msg.success("活动已创建");
      await refreshEvents();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "创建失败");
    }
  };

  const handleTogglePublish = async (event: EventItem) => {
    try {
      await trpcClientDash.eventsManagement.togglePublish.mutate({
        id: event.id,
      });
      msg.success(event.is_published ? "已取消上架" : "已上架");
      await refreshEvents();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "操作失败");
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
      await trpcClientDash.eventsManagement.remove.mutate({
        id: pendingDelete.id,
      });
      msg.success("活动已删除");
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      await refreshEvents();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <main className="size-full">
      <div className="px-4 pt-4 flex items-center justify-between">
        <DashBackButton />
        <button
          type="button"
          className="btn btn-primary btn-sm gap-1"
          onClick={handleCreate}
        >
          <PlusIcon className="size-4" weight="bold" />
          新建活动
        </button>
      </div>

      <div className="w-full h-[calc(100vh-8rem)] overflow-y-auto overflow-x-auto pb-40">
        <table className="table table-pin-rows table-pin-cols">
          <thead>
            <tr className="z-20">
              <th />
              <td>ID</td>
              <td>标题</td>
              <td>描述</td>
              <td>头图</td>
              <td>状态</td>
              <td>创建时间</td>
              <td>更新时间</td>
              <td>操作</td>
              <th />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-12 text-center text-base-content/60"
                >
                  暂无活动数据。
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <th className="z-10" />
                  <td className="font-mono text-xs max-w-24 truncate">
                    {event.id}
                  </td>
                  <td className="font-semibold max-w-40 truncate">
                    {event.title}
                  </td>
                  <td className="text-sm max-w-48 truncate">
                    {event.description || "—"}
                  </td>
                  <td className="text-sm">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="w-16 h-10 object-cover rounded"
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {event.is_published ? (
                      <span className="badge badge-success badge-sm">
                        已上架
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">未上架</span>
                    )}
                  </td>
                  <td className="text-sm">{formatCreateAt(event.create_at)}</td>
                  <td className="text-sm">{formatCreateAt(event.update_at)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link
                        to="/dash/events/$id"
                        params={{ id: event.id }}
                        className="btn btn-xs btn-ghost"
                      >
                        <EyeIcon className="size-4" />
                        详情
                      </Link>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => handleTogglePublish(event)}
                      >
                        {event.is_published ? "取消上架" : "上架"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-error"
                        onClick={() => openDeleteDialog(event)}
                      >
                        删除
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                  <th />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认删除活动</h3>
            <p>删除后此操作不可撤销。</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>标题:</strong> {pendingDelete.title}
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
