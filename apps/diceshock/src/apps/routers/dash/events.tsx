import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminStoreFilter from "@/client/components/AdminStoreFilter";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { storeFilter } = useAdminStoreFilter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<EventItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success(t("dashEvents.copied"));
    } catch {
      msg.error(t("dashEvents.clipboardDenied"));
    }
  };

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.eventsManagement.list.query();
      setEvents(data);
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.fetchFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [storeFilter, msg, t]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const handleCreate = async () => {
    try {
      const event = await trpcClientDash.eventsManagement.create.mutate({
        title: t("dashEvents.newEventTitle"),
      });
      msg.success(t("dashEvents.createSuccess"));
      await refreshEvents();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.createFailed"),
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
          ? t("dashEvents.unpublishSuccess")
          : t("dashEvents.publishSuccess"),
      );
      await refreshEvents();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.operationFailed"),
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
      msg.success(t("dashEvents.deleteSuccess"));
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      await refreshEvents();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.deleteFailed"),
      );
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DashBackButton />
          <AdminStoreFilter />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm gap-1"
          onClick={handleCreate}
        >
          <PlusIcon className="size-4" weight="bold" />
          {t("dashEvents.createEvent")}
        </button>
      </div>

      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1100px]">
          <thead>
            <tr className="z-20">
              <th />
              <td className="whitespace-nowrap">ID</td>
              <td className="whitespace-nowrap">{t("dashEvents.title")}</td>
              <td className="whitespace-nowrap">
                {t("dashEvents.description")}
              </td>
              <td className="whitespace-nowrap">
                {t("dashEvents.coverImage")}
              </td>
              <td className="whitespace-nowrap">{t("dashEvents.status")}</td>
              <td className="whitespace-nowrap">{t("dashEvents.createdAt")}</td>
              <td className="whitespace-nowrap">{t("dashEvents.updatedAt")}</td>
              <th className="whitespace-nowrap">{t("dashEvents.actions")}</th>
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
                  {t("dashEvents.noData")}
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
                        title={t("dashEvents.copyId")}
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
                        {t("dashEvents.published")}
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">
                        {t("dashEvents.unpublished")}
                      </span>
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
                              {t("dashEvents.details")}
                            </Link>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(event)}
                            >
                              {event.is_published
                                ? t("dashEvents.unpublish")
                                : t("dashEvents.publish")}
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              className="text-error"
                              onClick={() => openDeleteDialog(event)}
                            >
                              <TrashIcon className="size-4" />
                              {t("dashEvents.delete")}
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
                          {t("dashEvents.details")}
                        </Link>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleTogglePublish(event)}
                        >
                          {event.is_published
                            ? t("dashEvents.unpublish")
                            : t("dashEvents.publish")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={() => openDeleteDialog(event)}
                        >
                          {t("dashEvents.delete")}
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
            <h3 className="font-bold text-lg mb-4">
              {t("dashEvents.confirmDeleteTitle")}
            </h3>
            <p>{t("dashEvents.confirmDeleteDescription")}</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>{t("dashEvents.titleLabel")}</strong>{" "}
                {pendingDelete.title}
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
                {t("dashEvents.cancel")}
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
                  ? t("dashEvents.deleting")
                  : t("dashEvents.confirmDelete")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
