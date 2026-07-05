import { NetworkStatus } from "@apollo/client";
import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCallback, useMemo, useRef, useState } from "react";
import { InfiniteTable } from "@/client/components/dash/InfiniteTable";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  ArticleType,
  type EventFilterInput,
  SortOrder,
  useCreateEventMutation,
  useManagedEventsQuery,
  usePublishArticleToWechatMutation,
  useRemoveEventMutation,
  useToggleEventPublishMutation,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import {
  filtersToGqlVariables,
  useRouteFilters,
} from "@/client/hooks/useRouteFilters";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";

const BATCH_SIZE = 200;

/** Extracted from generated query (codegen owns the shape). */
type EventsList = NonNullable<
  ReturnType<typeof useManagedEventsQuery>["data"]
>["managedEvents"];
type EventItem = NonNullable<EventsList>[number];

export const Route = createFileRoute("/dash/events")({
  validateSearch: (search) => search as Record<string, string>,
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { filters, query } = useRouteFilters();

  const gqlVars = useMemo(
    () => filtersToGqlVariables(filters, query),
    [filters, query],
  );

  const filter = useMemo<EventFilterInput>(() => {
    const input: EventFilterInput = {};
    if (gqlVars.search) input.search = gqlVars.search as string;
    if (gqlVars.status)
      input.status = Array.isArray(gqlVars.status)
        ? gqlVars.status
        : [gqlVars.status as string];
    if (gqlVars.type) input.type = gqlVars.type as string;
    if (gqlVars.store) input.store = gqlVars.store as string;
    if (gqlVars.dateFrom) input.dateFrom = gqlVars.dateFrom as string;
    if (gqlVars.dateTo) input.dateTo = gqlVars.dateTo as string;

    if (gqlVars.sortBy) {
      input.sortBy = gqlVars.sortBy as string;
      input.sortOrder =
        gqlVars.sortOrder === "asc" ? SortOrder.Asc : SortOrder.Desc;
    } else if (sorting.length > 0) {
      input.sortBy = sorting[0].id;
      input.sortOrder = sorting[0].desc ? SortOrder.Desc : SortOrder.Asc;
    }

    input.pagination = { offset: 0, limit: BATCH_SIZE };
    return input;
  }, [gqlVars, sorting]);

  const { data, loading, fetchMore, networkStatus } = useManagedEventsQuery({
    variables: { filter },
    notifyOnNetworkStatusChange: true,
    onError: (err) => {
      msg.error(err.message || t("dashEvents.fetchFailed"));
    },
  });

  const events = (data?.managedEvents ?? []) as EventItem[];
  const hasMore = events.length > 0 && events.length % BATCH_SIZE === 0;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextFilter: EventFilterInput = {
      ...filter,
      pagination: { offset: events.length, limit: BATCH_SIZE },
    };
    await fetchMore({
      variables: { filter: nextFilter },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          managedEvents: [
            ...(prev.managedEvents ?? []),
            ...(fetchMoreResult.managedEvents ?? []),
          ],
        };
      },
    });
  }, [fetchMore, filter, events.length, isLoadingMore, hasMore]);

  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "活动",
    rows: events,
    selectedIds,
    getRowId: (event) => event.id,
    onClear: clearSelectedIds,
  });

  const [createEventMutation] = useCreateEventMutation({
    refetchQueries: ["ManagedEvents"],
  });
  const [toggleEventPublishMutation] = useToggleEventPublishMutation({
    refetchQueries: ["ManagedEvents"],
  });
  const [removeEventMutation] = useRemoveEventMutation({
    refetchQueries: ["ManagedEvents"],
  });

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<EventItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [batchDeletePending, setBatchDeletePending] = useState(false);

  const [publishArticleMutation] = usePublishArticleToWechatMutation();
  const publishDialogRef = useRef<HTMLDialogElement>(null);
  const [publishTarget, setPublishTarget] = useState<EventItem | null>(null);
  const [publishPending, setPublishPending] = useState(false);
  const [batchPublishPending, setBatchPublishPending] = useState(false);
  const batchPublishDialogRef = useRef<HTMLDialogElement>(null);

  const openPublishDialog = (event: EventItem) => {
    setPublishTarget(event);
    setTimeout(() => publishDialogRef.current?.showModal(), 0);
  };

  const handlePublishToWechat = async (autoPublish: boolean) => {
    if (!publishTarget) return;
    setPublishPending(true);
    try {
      const { data } = await publishArticleMutation({
        variables: {
          input: { type: ArticleType.Event, id: publishTarget.id, autoPublish },
        },
      });
      const result = data?.publishArticleToWechat;
      if (result?.success) {
        msg.success(autoPublish ? "已发布到微信" : "草稿已创建");
      } else {
        msg.error(`发布失败: ${result?.error ?? "未知错误"}`);
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishPending(false);
      publishDialogRef.current?.close();
      setPublishTarget(null);
    }
  };

  const openBatchPublishDialog = () => {
    setTimeout(() => batchPublishDialogRef.current?.showModal(), 0);
  };

  const handleBatchPublishToWechat = async (autoPublish: boolean) => {
    if (selectedIds.size === 0) return;
    setBatchPublishPending(true);
    let successCount = 0;
    let failCount = 0;
    for (const eventId of selectedIds) {
      try {
        const { data } = await publishArticleMutation({
          variables: {
            input: { type: ArticleType.Event, id: eventId, autoPublish },
          },
        });
        if (data?.publishArticleToWechat?.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
    if (failCount === 0) {
      msg.success(`${successCount} 条活动已${autoPublish ? "发布" : "创建草稿"}`);
    } else {
      msg.error(`成功 ${successCount} 条，失败 ${failCount} 条`);
    }
    setBatchPublishPending(false);
    batchPublishDialogRef.current?.close();
  };

  const handleCopy = useCallback(
    (text: string) => {
      try {
        navigator.clipboard.writeText(text);
        msg.success(t("dashEvents.copied"));
      } catch {
        msg.error(t("dashEvents.clipboardDenied"));
      }
    },
    [t, msg],
  );

  const handleCreate = async () => {
    try {
      await createEventMutation({
        variables: {
          input: { title: t("dashEvents.newEventTitle") },
        },
      });
      msg.success(t("dashEvents.createSuccess"));
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.createFailed"),
      );
    }
  };

  const handleTogglePublish = async (event: EventItem) => {
    try {
      await toggleEventPublishMutation({
        variables: { id: event.id },
      });
      msg.success(
        event.isPublished
          ? t("dashEvents.unpublishSuccess")
          : t("dashEvents.publishSuccess"),
      );
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
      await removeEventMutation({
        variables: { id: pendingDelete.id },
      });
      msg.success(t("dashEvents.deleteSuccess"));
      deleteDialogRef.current?.close();
      setPendingDelete(null);
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.deleteFailed"),
      );
    } finally {
      setDeletePending(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeletePending(true);
    try {
      for (const id of selectedIds) {
        await removeEventMutation({ variables: { id } });
      }
      msg.success("删除成功");
      clearSelectedIds();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashEvents.deleteFailed"),
      );
    } finally {
      setBatchDeletePending(false);
    }
  };

  const selectedActions: BatchAction[] = [
    {
      key: "publish",
      label: "发布微信",
      icon: <PaperPlaneTiltIcon className="size-4" />,
      className: "btn-primary",
      disabled: batchPublishPending,
      onClick: openBatchPublishDialog,
    },
    {
      key: "delete",
      label: "删除",
      icon: <TrashIcon className="size-4" />,
      className: "btn-error",
      disabled: batchDeletePending,
      onClick: () => void handleBatchDelete(),
    },
  ];

  const columns = useMemo<ColumnDef<EventItem, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <div className="relative group flex items-center gap-1">
            <span className="font-mono cursor-default">
              {row.original.id.slice(0, 5)}
            </span>
            <button
              type="button"
              className="btn btn-xs btn-ghost btn-square shrink-0"
              onClick={() => handleCopy(row.original.id)}
              title={t("dashEvents.copyId")}
            >
              <CopyIcon className="size-3.5" />
            </button>
            <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
              <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
                {row.original.id}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: t("dashEvents.title"),
        cell: ({ row }) => (
          <span className="font-semibold max-w-40 truncate inline-block">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: t("dashEvents.description"),
        cell: ({ row }) => (
          <span className="max-w-48 truncate inline-block">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "coverImageUrl",
        header: t("dashEvents.coverImage"),
        cell: ({ row }) =>
          row.original.coverImageUrl ? (
            <img
              src={row.original.coverImageUrl}
              alt=""
              className="w-16 h-10 object-cover rounded"
            />
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "isPublished",
        header: t("dashEvents.status"),
        cell: ({ row }) =>
          row.original.isPublished ? (
            <span className="badge badge-success badge-sm">
              {t("dashEvents.published")}
            </span>
          ) : (
            <span className="badge badge-ghost badge-sm">
              {t("dashEvents.unpublished")}
            </span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: t("dashEvents.createdAt"),
        cell: ({ row }) => {
          const val = row.original.createdAt;
          if (!val) return "—";
          try {
            const d = dayjs.tz(val as string | number | Date, "Asia/Shanghai");
            return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
          } catch {
            return "—";
          }
        },
      },
    ],
    [t, handleCopy],
  );

  return (
    <main className="size-full flex flex-col">
      <InfiniteTable
        columns={columns}
        data={events}
        loading={loading}
        emptyMessage={t("dashEvents.noData")}
        hasMore={hasMore}
        onLoadMore={loadMore}
        sorting={sorting}
        onSortingChange={setSorting}
        sortableColumns={["title", "isPublished", "createdAt"]}
        enableRowSelection
        selectedRows={selectedIds}
        onSelectedRowsChange={setSelectedIds}
        getRowId={(row) => row.id}
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
                  <Link to="/dash/events/$id" params={{ id: row.id }}>
                    <EyeIcon className="size-4" />
                    {t("dashEvents.details")}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(row)}
                  >
                    {row.isPublished
                      ? t("dashEvents.unpublish")
                      : t("dashEvents.publish")}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openPublishDialog(row)}
                  >
                    <PaperPlaneTiltIcon className="size-4" />
                    发布微信
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="text-error"
                    onClick={() => openDeleteDialog(row)}
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
                params={{ id: row.id }}
                className="btn btn-xs btn-ghost"
              >
                <EyeIcon className="size-4" />
                {t("dashEvents.details")}
              </Link>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => handleTogglePublish(row)}
              >
                {row.isPublished
                  ? t("dashEvents.unpublish")
                  : t("dashEvents.publish")}
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => openPublishDialog(row)}
                title="发布到微信"
              >
                <PaperPlaneTiltIcon className="size-4" />
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost btn-error"
                onClick={() => openDeleteDialog(row)}
              >
                {t("dashEvents.delete")}
                <TrashIcon />
              </button>
            </div>
          )
        }
      />

      <BatchActionBar
        count={selectedIds.size}
        actions={selectedActions}
        onClear={clearSelectedIds}
        unit="活动"
      />

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

      <dialog ref={publishDialogRef} className="modal">
        {publishTarget && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">发布到微信服务号</h3>
            <p className="text-sm text-base-content/70 mb-2">
              将活动「{publishTarget.title}」渲染为图片文章并同步到微信。
            </p>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  publishDialogRef.current?.close();
                  setPublishTarget(null);
                }}
                disabled={publishPending}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void handlePublishToWechat(false)}
                disabled={publishPending}
              >
                {publishPending ? "处理中..." : "创建草稿"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handlePublishToWechat(true)}
                disabled={publishPending}
              >
                {publishPending ? "发布中..." : "立即发布"}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={batchPublishDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">批量发布到微信</h3>
          <p className="text-sm text-base-content/70">
            将选中的 <strong>{selectedIds.size}</strong> 条活动逐一渲染并同步到微信服务号。
          </p>
          <div className="modal-action mt-6">
            <button
              type="button"
              className="btn"
              onClick={() => batchPublishDialogRef.current?.close()}
              disabled={batchPublishPending}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void handleBatchPublishToWechat(false)}
              disabled={batchPublishPending}
            >
              {batchPublishPending ? "处理中..." : "批量创建草稿"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleBatchPublishToWechat(true)}
              disabled={batchPublishPending}
            >
              {batchPublishPending ? "发布中..." : "批量立即发布"}
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
