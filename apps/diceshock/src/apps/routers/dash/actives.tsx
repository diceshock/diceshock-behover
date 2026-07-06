import { NetworkStatus } from "@apollo/client";
import {
  DotsThreeVerticalIcon,
  EyeIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCallback, useMemo, useRef, useState } from "react";
import { DataTable } from "@/client/components/dash/DataTable"
import { IdCell } from "@/client/components/dash/IdCell";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  type ActiveFilterInput,
  ArticleType,
  SortOrder,
  useBatchRemoveActivesMutation,
  useManagedActivesQuery,
  usePublishArticleToWechatMutation,
  useRemoveActiveMutation,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import {
  filtersToGqlVariables,
  useRouteFilters,
} from "@/client/hooks/useRouteFilters";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";

const BATCH_SIZE = 100

function formatCreateAt(val: unknown): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val as string | number | Date, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

/** Extracted from generated query return type (codegen owns the shape). */
type ActivesList = NonNullable<
  ReturnType<typeof useManagedActivesQuery>["data"]
>["managedActives"];
type ActiveItem = NonNullable<ActivesList>[number];

export const Route = createFileRoute("/dash/actives")({
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

  const filter = useMemo<ActiveFilterInput>(() => {
    const input: ActiveFilterInput = {};
    if (gqlVars.search) input.search = gqlVars.search as string;
    if (gqlVars.status) input.status = Array.isArray(gqlVars.status) ? gqlVars.status : [gqlVars.status as string];
    if (gqlVars.type) input.type = gqlVars.type as string;
    if (gqlVars.creator) input.creator = gqlVars.creator as string;
    if (gqlVars.store) input.store = gqlVars.store as string;
    if (gqlVars.dateFrom) input.dateFrom = gqlVars.dateFrom as string;
    if (gqlVars.dateTo) input.dateTo = gqlVars.dateTo as string;

    if (gqlVars.sortBy) {
      input.sortBy = gqlVars.sortBy as string;
      input.sortOrder = gqlVars.sortOrder === "asc" ? SortOrder.Asc : SortOrder.Desc;
    } else if (sorting.length > 0) {
      input.sortBy = sorting[0].id;
      input.sortOrder = sorting[0].desc ? SortOrder.Desc : SortOrder.Asc;
    }

    input.pagination = { limit: BATCH_SIZE };
    return input;
  }, [gqlVars, sorting]);

  const { data, loading, fetchMore, networkStatus } = useManagedActivesQuery({
    variables: { filter },
    notifyOnNetworkStatusChange: true,
    onError: (err) => {
      msg.error(err.message || t("dashActives.fetchFailed"));
    },
  });

  const actives = (data?.managedActives ?? []) as ActiveItem[];
  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "活动",
    rows: actives,
    selectedIds,
    getRowId: (active) => active.id,
    onClear: clearSelectedIds,
  });

  const lastCursor = actives.length > 0 ? actives[actives.length - 1].id : null;
  const hasMore = actives.length > 0 && actives.length % BATCH_SIZE === 0;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  const [removeActiveMutation] = useRemoveActiveMutation({
    refetchQueries: ["ManagedActives"],
  });
  const [batchRemoveActivesMutation] = useBatchRemoveActivesMutation({
    refetchQueries: ["ManagedActives"],
  });

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDelete, setPendingDelete] = useState<ActiveItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const batchDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const [batchDeletePending, setBatchDeletePending] = useState(false);

  const [publishArticleMutation] = usePublishArticleToWechatMutation();
  const publishDialogRef = useRef<HTMLDialogElement>(null);
  const [publishTarget, setPublishTarget] = useState<ActiveItem | null>(null);
  const [publishPending, setPublishPending] = useState(false);
  const [batchPublishPending, setBatchPublishPending] = useState(false);
  const batchPublishDialogRef = useRef<HTMLDialogElement>(null);

  const openPublishDialog = (active: ActiveItem) => {
    setPublishTarget(active);
    setTimeout(() => publishDialogRef.current?.showModal(), 0);
  };

  const handlePublish = async (autoPublish: boolean) => {
    if (!publishTarget) return;
    setPublishPending(true);
    try {
      const { data } = await publishArticleMutation({
        variables: {
          input: { type: ArticleType.Active, id: publishTarget.id, autoPublish },
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

  const handleBatchPublish = async (autoPublish: boolean) => {
    if (selectedIds.size === 0) return;
    setBatchPublishPending(true);
    let successCount = 0;
    let failCount = 0;
    for (const activeId of selectedIds) {
      try {
        const { data } = await publishArticleMutation({
          variables: {
            input: { type: ArticleType.Active, id: activeId, autoPublish },
          },
        });
        if (data?.publishArticleToWechat?.success) {
          successCount++;
        } else {
          failCount++;
        }
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

  const loadMore = useCallback(async () => {
    if (!lastCursor || isLoadingMore) return;
    const nextFilter: ActiveFilterInput = {
      ...filter,
      pagination: { cursor: lastCursor, limit: BATCH_SIZE },
    };
    await fetchMore({
      variables: { filter: nextFilter },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          managedActives: [
            ...(prev.managedActives ?? []),
            ...(fetchMoreResult.managedActives ?? []),
          ],
        };
      },
    });
  }, [fetchMore, filter, lastCursor, isLoadingMore]);

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
        variables: { ids: [...selectedIds] },
      });
      msg.success(
        formatMessage(t("dashActives.batchDeleteSuccess"), {
          count: selectedIds.size,
        }),
      );
      batchDeleteDialogRef.current?.close();
      clearSelectedIds();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashActives.batchDeleteFailed"),
      );
    } finally {
      setBatchDeletePending(false);
    }
  };

  const shanghaiToday = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  const columns = useMemo<ColumnDef<ActiveItem, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 120,
        cell: ({ row }) => <IdCell value={row.original.id} />,
      },
      {
        accessorKey: "title",
        header: t("dashActives.title"),
        cell: ({ row }) => (
          <span className="font-semibold max-w-40 truncate inline-block">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "isGame",
        header: t("dashActives.type"),
        cell: ({ row }) =>
          row.original.isGame ? (
            <span className="badge badge-success badge-sm">
              {t("dashActives.typeGame")}
            </span>
          ) : (
            <span className="badge badge-ghost badge-sm">
              {t("dashActives.typeNotGame")}
            </span>
          ),
      },
      {
        accessorKey: "date",
        header: t("dashActives.date"),
        cell: ({ row }) => row.original.date,
      },
      {
        accessorKey: "time",
        header: t("dashActives.time"),
        cell: ({ row }) => row.original.time ?? "—",
      },
      {
        accessorKey: "maxPlayers",
        header: t("dashActives.players"),
      },
      {
        accessorKey: "creator",
        header: t("dashActives.creator"),
        cell: ({ row }) => row.original.creator?.name ?? "—",
      },
      {
        accessorKey: "store",
        header: t("dashActives.store"),
        cell: () => "—",
      },
      {
        accessorKey: "status",
        header: t("dashActives.status"),
        cell: ({ row }) => {
          const isExpired = row.original.date < shanghaiToday;
          return isExpired ? (
            <span className="badge badge-ghost badge-sm">
              {t("dashActives.statusExpired")}
            </span>
          ) : (
            <span className="badge badge-success badge-sm">
              {t("dashActives.statusActive")}
            </span>
          );
        },
      },
    ],
    [t, shanghaiToday],
  );

  return (
    <main className="flex-1 min-h-0 flex flex-col">
      <DataTable columns={columns}
      data={actives}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      sorting={sorting}
      onSortingChange={setSorting}
      sortableColumns={["title", "date", "maxPlayers", "createdAt"]}
      enableRowSelection
      selectedRows={selectedIds}
      onSelectedRowsChange={setSelectedIds}
      getRowId={(row) => row.id}
      emptyMessage={t("dashActives.noData")}
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
              className="dropdown-content menu bg-base-200 rounded-box z-50 w-32 p-2 shadow-lg"
            >
              <li>
                <Link to="/dash/actives/$id" params={{ id: row.id }}>
                  <EyeIcon className="size-4" />
                  {t("dashActives.details")}
                </Link>
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
                  {t("dashActives.delete")}
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              to="/dash/actives/$id"
              params={{ id: row.id }}
              className="btn btn-xs btn-ghost"
            >
              <EyeIcon className="size-4" />
              {t("dashActives.details")}
            </Link>
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
              {t("dashActives.delete")}
              <TrashIcon />
            </button>
          </div>
        )
      } />

      {selectedIds.size > 0 && (
        <BatchActionBar
          count={selectedIds.size}
          onClear={clearSelectedIds}
          actions={[
            {
              key: "publish",
              label: "发布微信",
              icon: <PaperPlaneTiltIcon className="size-4" />,
              className: "btn-primary",
              onClick: openBatchPublishDialog,
              disabled: batchPublishPending,
            },
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
                onClick={() => void handlePublish(false)}
                disabled={publishPending}
              >
                {publishPending ? "处理中..." : "创建草稿"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handlePublish(true)}
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
          <p className="text-sm text-base-content/70 mt-2">
            批量发布可能耗时较长，请耐心等待。
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
              onClick={() => void handleBatchPublish(false)}
              disabled={batchPublishPending}
            >
              {batchPublishPending ? "处理中..." : "批量创建草稿"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleBatchPublish(true)}
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
