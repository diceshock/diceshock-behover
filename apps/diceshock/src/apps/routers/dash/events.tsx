import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { useIsMobile } from "@/client/hooks/useIsMobile";
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
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<EventItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success("已复制");
    } catch {
      msg.error("没有剪贴板访问权限");
    }
  };

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
    <main className="size-full flex flex-col">
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

      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1100px]">
          <thead>
            <tr className="z-20">
              <th />
              <td className="whitespace-nowrap">ID</td>
              <td className="whitespace-nowrap">标题</td>
              <td className="whitespace-nowrap">描述</td>
              <td className="whitespace-nowrap">头图</td>
              <td className="whitespace-nowrap">状态</td>
              <td className="whitespace-nowrap">创建时间</td>
              <td className="whitespace-nowrap">更新时间</td>
              <th className="whitespace-nowrap">操作</th>
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
                  <td className="font-mono">
                    <div className="relative group flex items-center gap-1">
                      <span className="cursor-default">
                        {event.id.slice(0, 5)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-square shrink-0"
                        onClick={() => handleCopy(event.id)}
                        title="复制ID"
                      >
                        <CopyIcon className="size-3.5" />
                      </button>
                      <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
                        <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
                          {event.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold max-w-40 truncate">
                    {event.title}
                  </td>
                  <td className="max-w-48 truncate">
                    {event.description || "—"}
                  </td>
                  <td>
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
                  <td className="whitespace-nowrap">
                    {event.is_published ? (
                      <span className="badge badge-success badge-sm">
                        已上架
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">未上架</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatCreateAt(event.create_at)}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatCreateAt(event.update_at)}
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
                          className="dropdown-content menu bg-base-200 rounded-box z-50 w-36 p-2 shadow-lg"
                        >
                          <li>
                            <Link
                              to="/dash/events/$id"
                              params={{ id: event.id }}
                            >
                              <EyeIcon className="size-4" />
                              详情
                            </Link>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(event)}
                            >
                              {event.is_published ? "取消上架" : "上架"}
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              className="text-error"
                              onClick={() => openDeleteDialog(event)}
                            >
                              <TrashIcon className="size-4" />
                              删除
                            </button>
                          </li>
                        </ul>
                      </div>
                    ) : (
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
                    )}
                  </th>
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
