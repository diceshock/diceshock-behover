import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/client/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataTablePagination {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;

  // Infinite scroll mode (default)
  hasMore?: boolean;
  onLoadMore?: () => void;

  // Pagination mode
  pagination?: DataTablePagination;
  onPaginationChange?: (page: { offset: number; limit: number }) => void;

  // Sorting
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  sortableColumns?: string[];

  // Row selection
  enableRowSelection?: boolean;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (ids: Set<string>) => void;
  getRowId?: (row: TData) => string;

  // Actions column (sticky right)
  renderActions?: (row: TData) => ReactNode;

  // Estimated row height for virtualizer (default: 44)
  estimateRowHeight?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROW_HEIGHT_ESTIMATE = 44;
const LOAD_MORE_THRESHOLD = 300; // px from bottom to trigger load more

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  emptyMessage = "暂无数据",
  hasMore = false,
  onLoadMore,
  pagination,
  onPaginationChange,
  sorting = [],
  onSortingChange,
  sortableColumns,
  enableRowSelection = false,
  selectedRows = new Set<string>(),
  onSelectedRowsChange,
  getRowId,
  renderActions,
  estimateRowHeight = ROW_HEIGHT_ESTIMATE,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // -- Build column list with optional select & actions columns --
  const allColumns: ColumnDef<TData, unknown>[] = [
    ...(enableRowSelection
      ? [
          {
            id: "__select",
            header: () => {
              const allSelected =
                data.length > 0 && selectedRows.size === data.length;
              return (
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={allSelected}
                  onChange={(e) => {
                    if (!onSelectedRowsChange || !getRowId) return;
                    if (e.target.checked) {
                      onSelectedRowsChange(new Set(data.map(getRowId)));
                    } else {
                      onSelectedRowsChange(new Set());
                    }
                  }}
                />
              );
            },
            cell: ({ row }: { row: { original: TData } }) => {
              const id = getRowId?.(row.original) ?? "";
              return (
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={selectedRows.has(id)}
                  onChange={(e) => {
                    if (!onSelectedRowsChange) return;
                    const next = new Set(selectedRows);
                    if (e.target.checked) next.add(id);
                    else next.delete(id);
                    onSelectedRowsChange(next);
                  }}
                />
              );
            },
            size: 40,
            meta: { sticky: "left" as const },
          } satisfies ColumnDef<TData, unknown>,
        ]
      : []),
    ...columns,
    ...(renderActions
      ? [
          {
            id: "__actions",
            header: () => null,
            cell: ({ row }: { row: { original: TData } }) =>
              renderActions(row.original),
            size: 60,
            meta: { sticky: "right" as const },
          } satisfies ColumnDef<TData, unknown>,
        ]
      : []),
  ];

  // -- TanStack Table instance --
  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting },
    onSortingChange: onSortingChange
      ? (updater) => {
          const next =
            typeof updater === "function" ? updater(sorting) : updater;
          onSortingChange(next);
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    getRowId: getRowId as (row: TData) => string,
  });

  const { rows } = table.getRowModel();

  // -- Virtualizer --
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
  });

  // -- Infinite scroll via IntersectionObserver --
  useEffect(() => {
    if (!sentinelRef.current || !onLoadMore || pagination) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { root: scrollRef.current, rootMargin: `${LOAD_MORE_THRESHOLD}px` },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, pagination]);

  // -- Sorting helpers --
  const isSortable = useCallback(
    (colId: string) => sortableColumns?.includes(colId) ?? false,
    [sortableColumns],
  );

  const handleSort = (colId: string) => {
    if (!onSortingChange || !isSortable(colId)) return;
    const current = sorting.find((s) => s.id === colId);
    if (!current) onSortingChange([{ id: colId, desc: false }]);
    else if (!current.desc) onSortingChange([{ id: colId, desc: true }]);
    else onSortingChange([]);
  };

  // -- Pagination helpers --
  const isPaginated = !!pagination && !!onPaginationChange;
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.limit))
    : 1;
  const currentPage = pagination
    ? Math.floor(pagination.offset / pagination.limit) + 1
    : 1;

  const goToPreviousPage = () => {
    if (!pagination || !onPaginationChange) return;
    onPaginationChange({
      offset: Math.max(0, pagination.offset - pagination.limit),
      limit: pagination.limit,
    });
  };
  const goToNextPage = () => {
    if (!pagination || !onPaginationChange) return;
    onPaginationChange({
      offset: pagination.offset + pagination.limit,
      limit: pagination.limit,
    });
  };

  // -- Column sticky helpers --
  const headerGroups = table.getHeaderGroups();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto relative">
        {/* Header - pinned */}
        <div className="sticky top-0 z-20 bg-base-200/95 backdrop-blur-sm border-b border-base-content/5">
          {headerGroups.map((hg) => (
            <div key={hg.id} className="flex">
              {hg.headers.map((header) => {
                const canSort = isSortable(header.id);
                const sorted = sorting.find((s) => s.id === header.id);
                const isActionsCol = header.id === "__actions";
                const isSelectCol = header.id === "__select";
                const stickyRight = isActionsCol;
                const stickyLeft = isSelectCol;

                return (
                  <div
                    key={header.id}
                    className={clsx(
                      "flex items-center gap-1 px-3 py-2 text-xs font-medium text-base-content/70 shrink-0",
                      canSort &&
                        "cursor-pointer select-none hover:bg-base-300/40",
                      stickyRight &&
                        "sticky right-0 bg-base-200/95 backdrop-blur-sm shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]",
                      stickyLeft &&
                        "sticky left-0 bg-base-200/95 backdrop-blur-sm z-10",
                    )}
                    style={{
                      width:
                        header.getSize() !== 150 ? header.getSize() : undefined,
                      minWidth: isActionsCol ? 60 : isSelectCol ? 40 : 80,
                      flex:
                        header.getSize() === 150 && !isActionsCol && !isSelectCol
                          ? "1 1 0%"
                          : undefined,
                    }}
                    onClick={() => handleSort(header.id)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {canSort && (
                      <span className="size-3.5 inline-flex items-center justify-center">
                        {sorted ? (
                          sorted.desc ? (
                            <ArrowDownIcon className="size-3" />
                          ) : (
                            <ArrowUpIcon className="size-3" />
                          )
                        ) : (
                          <ArrowsDownUpIcon className="size-3 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Virtualized rows */}
        {rows.length > 0 ? (
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className={clsx(
                    "flex absolute w-full hover:bg-base-200/40 transition-colors border-b border-base-content/5",
                    selectedRows.has(row.id) && "bg-primary/5",
                  )}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isActionsCol = cell.column.id === "__actions";
                    const isSelectCol = cell.column.id === "__select";
                    const stickyRight = isActionsCol;
                    const stickyLeft = isSelectCol;

                    return (
                      <div
                        key={cell.id}
                        className={clsx(
                          "flex items-center px-3 py-2 text-sm shrink-0",
                          stickyRight &&
                            "sticky right-0 bg-base-100 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]",
                          stickyLeft &&
                            "sticky left-0 bg-base-100 z-10",
                        )}
                        style={{
                          width:
                            cell.column.getSize() !== 150
                              ? cell.column.getSize()
                              : undefined,
                          minWidth: isActionsCol
                            ? 60
                            : isSelectCol
                              ? 40
                              : 80,
                          flex:
                            cell.column.getSize() === 150 &&
                            !isActionsCol &&
                            !isSelectCol
                              ? "1 1 0%"
                              : undefined,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : loading ? null : (
          <div className="flex justify-center py-12 text-base-content/40 text-sm">
            {emptyMessage}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-4">
            <span className="loading loading-dots loading-sm text-primary" />
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {!pagination && hasMore && <div ref={sentinelRef} className="h-1" />}

        {/* End of infinite list */}
        {!pagination && !hasMore && data.length > 0 && !loading && (
          <div className="py-3 text-center text-base-content/30 text-xs">
            已加载全部 {data.length} 条
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {isPaginated && (
        <div className="shrink-0 flex flex-wrap items-center justify-end gap-3 px-2 py-3 border-t border-base-content/10">
          <span className="text-sm text-base-content/70">
            {pagination.total === 0
              ? t("dashTable.showingEmpty")
              : t("dashTable.showingRange")
                  .replace("{start}", String(pagination.offset + 1))
                  .replace(
                    "{end}",
                    String(
                      Math.min(
                        pagination.offset + pagination.limit,
                        pagination.total,
                      ),
                    ),
                  )
                  .replace("{total}", String(pagination.total))}
          </span>
          <span className="text-sm font-medium">
            {t("dashTable.pageOf")
              .replace("{current}", String(currentPage))
              .replace("{total}", String(totalPages))}
          </span>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm btn-ghost join-item"
              disabled={pagination.offset <= 0 || loading}
              onClick={goToPreviousPage}
            >
              {t("dashTable.previous")}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost join-item"
              disabled={!pagination.hasMore || loading}
              onClick={goToNextPage}
            >
              {t("dashTable.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
