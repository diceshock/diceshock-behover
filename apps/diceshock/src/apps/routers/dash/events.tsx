import {
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

function formatCreateAt(val: unknown): string {
  if (!val) return "\u2014";
  try {
    const d = dayjs.tz(val as string | number | Date, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "\u2014";
  } catch {
    return "\u2014";
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
      msg.error(
        err instanceof Error
          ? err.message
          : "\u83B7\u53D6\u6D3B\u52A8\u5217\u8868\u5931\u8D25",
      );
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
        title: "\u65B0\u6D3B\u52A8",
      });
      msg.success("\u6D3B\u52A8\u5DF2\u521B\u5EFA");
      await refreshEvents();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : "\u521B\u5EFA\u5931\u8D25",
      );
    }
  };

  const handleTogglePublish = async (event: EventItem) => {
    try {
      await trpcClientDash.eventsManagement.togglePublish.mutate({
        id: event.id,
      });
      msg.success(
        event.is_published
          ? "\u5DF2\u53D6\u6D88\u4E0A\u67B6"
          : "\u5DF2\u4E0A\u67B6",
      );
      await refreshEvents();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : "\u64CD\u4F5C\u5931\u8D25",
      );
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
      msg.success("\u6D3B\u52A8\u5DF2\u5220\u9664");
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      await refreshEvents();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : "\u5220\u9664\u5931\u8D25",
      );
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
          \u65B0\u5EFA\u6D3B\u52A8
        </button>
      </div>

      <div className="w-full h-[calc(100vh-8rem)] overflow-y-auto overflow-x-auto pb-40">
        <table className="table table-pin-rows table-pin-cols">
          <thead>
            <tr className="z-20">
              <th />
              <td>ID</td>
              <td>\u6807\u9898</td>
              <td>\u63CF\u8FF0</td>
              <td>\u5934\u56FE</td>
              <td>\u72B6\u6001</td>
              <td>\u521B\u5EFA\u65F6\u95F4</td>
              <td>\u66F4\u65B0\u65F6\u95F4</td>
              <td>\u64CD\u4F5C</td>
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
                  \u6682\u65E0\u6D3B\u52A8\u6570\u636E\u3002
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
                    {event.description || "\u2014"}
                  </td>
                  <td className="text-sm">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="w-16 h-10 object-cover rounded"
                      />
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td>
                    {event.is_published ? (
                      <span className="badge badge-success badge-sm">
                        \u5DF2\u4E0A\u67B6
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">
                        \u672A\u4E0A\u67B6
                      </span>
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
                        <PencilSimpleIcon className="size-4" />
                        \u7F16\u8F91
                      </Link>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => handleTogglePublish(event)}
                      >
                        {event.is_published
                          ? "\u53D6\u6D88\u4E0A\u67B6"
                          : "\u4E0A\u67B6"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-error"
                        onClick={() => openDeleteDialog(event)}
                      >
                        \u5220\u9664
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
            <h3 className="font-bold text-lg mb-4">
              \u786E\u8BA4\u5220\u9664\u6D3B\u52A8
            </h3>
            <p>
              \u5220\u9664\u540E\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002
            </p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>\u6807\u9898:</strong> {pendingDelete.title}
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
                \u53D6\u6D88
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
                  ? "\u5220\u9664\u4E2D..."
                  : "\u786E\u8BA4\u5220\u9664"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
