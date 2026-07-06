import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  FunnelIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useTranslation } from "@/client/hooks/useTranslation";
import { useIsMobile } from "@/client/hooks/useIsMobile";

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

  /** Infinite scroll: whether there are more rows to load */
  hasMore?: boolean;
  /** Infinite scroll: called when scroll reaches bottom */
  onLoadMore?: () => void;

  /** Pagination mode (mutually exclusive with infinite scroll) */
  pagination?: DataTablePagination;
  onPaginationChange?: (page: { offset: number; limit: number }) => void;

  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  sortableColumns?: string[];

  /** Called when user clicks a column header to open filter for that column */
  onColumnFilter?: (columnId: string) => void;
  /** Column IDs that support filtering via header click */
  filterableColumns?: string[];

  enableRowSelection?: boolean;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (ids: Set<string>) => void;
  getRowId?: (row: TData) => string;

  /** Sticky right actions column */
  renderActions?: (row: TData) => ReactNode;
  /** Width of the actions column in px (default: 200) */
  actionsColumnSize?: number;

  /** Row height estimate for virtualizer (default: 44) */
  estimateRowHeight?: number;
}

// ---------------------------------------------------------------------------
// Sticky column pinning styles (from TanStack official example)
// ---------------------------------------------------------------------------

function getColumnPinningStyles<TData>(
  column: Column<TData, unknown>,
): CSSProperties {
  const isPinned = column.getIsPinned();
  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    // Visual separation for pinned columns
    boxShadow:
      isPinned === "right"
        ? "-2px 0 4px -2px rgba(0,0,0,0.06)"
        : isPinned === "left"
          ? "2px 0 4px -2px rgba(0,0,0,0.06)"
          : undefined,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ROW_HEIGHT_ESTIMATE = 44;

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
  onColumnFilter,
  filterableColumns,
  enableRowSelection = false,
  selectedRows = new Set<string>(),
  onSelectedRowsChange,
  getRowId,
  renderActions,
  actionsColumnSize,
  estimateRowHeight = ROW_HEIGHT_ESTIMATE,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const tableContainerRef = useRef<HTMLDivElement>(null);
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
            size: actionsColumnSize ?? (isMobile ? 48 : 200),
          } satisfies ColumnDef<TData, unknown>,
        ]
      : []),
  ];

  // -- TanStack Table instance with column pinning --
  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnPinning: {
        left: enableRowSelection ? ["__select"] : [],
        right: renderActions ? ["__actions"] : [],
      },
    },
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
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => estimateRowHeight,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== "undefined" &&
      !navigator.userAgent.includes("Firefox")
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
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
      { root: tableContainerRef.current, rootMargin: "300px" },
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

  const colSpan = allColumns.length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable container */}
      <div
        ref={tableContainerRef}
        className="flex-1 min-h-0 overflow-auto relative"
      >
        {/* Table with CSS grid display (TanStack recommended for virtualization) */}
        <table style={{ display: "grid" }}>
          {/* Sticky header */}
          <thead
            style={{
              display: "grid",
              position: "sticky",
              top: 0,
              zIndex: 2,
            }}
            className="bg-base-200/95 backdrop-blur-sm"
          >
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ display: "flex", width: "100%" }}>
                {hg.headers.map((header) => {
                  const canSort = isSortable(header.id);
                  const canFilter = filterableColumns?.includes(header.id) ?? false;
                  const sorted = sorting.find((s) => s.id === header.id);
                  const pinningStyles = getColumnPinningStyles(header.column);
                  const isPinned = header.column.getIsPinned();
                  const isInteractive = canSort || canFilter;

                  return (
                    <th
                      key={header.id}
                      className={clsx(
                        "flex items-center gap-1 px-3 py-2 text-xs font-medium text-base-content/70 whitespace-nowrap",
                        isInteractive &&
                          "cursor-pointer select-none hover:bg-base-300/40",
                        isPinned && "bg-base-200/95 backdrop-blur-sm",
                      )}
                      style={{
                        ...pinningStyles,
                      }}
                      onClick={() => {
                        if (canFilter && onColumnFilter) {
                          onColumnFilter(header.id);
                        } else if (canSort) {
                          handleSort(header.id);
                        }
                      }}
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
                      {canFilter && (
                        <FunnelIcon className="size-3 opacity-40" />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Virtualized body */}
          <tbody
            style={{
              display: "grid",
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rows.length > 0 ? (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className={clsx(
                      "hover:bg-base-200/40 transition-colors border-b border-base-content/5",
                      selectedRows.has(row.id) && "bg-primary/5",
                    )}
                    style={{
                      display: "flex",
                      position: "absolute",
                      transform: `translateY(${virtualRow.start}px)`,
                      width: "100%",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const pinningStyles = getColumnPinningStyles(
                        cell.column,
                      );
                      const isPinned = cell.column.getIsPinned();

                      return (
                        <td
                          key={cell.id}
                          className={clsx(
                            "flex items-center px-3 py-2 text-sm",
                            isPinned && "bg-base-100",
                          )}
                          style={{
                            ...pinningStyles,
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : loading ? null : (
              <tr style={{ display: "flex" }}>
                <td
                  colSpan={colSpan}
                  className="flex-1 py-12 text-center text-base-content/40 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
