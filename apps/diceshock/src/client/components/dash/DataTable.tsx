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

  enableRowSelection?: boolean;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (ids: Set<string>) => void;
  getRowId?: (row: TData) => string;

  /** Sticky right actions column */
  renderActions?: (row: TData) => ReactNode;

  /** Row height estimate for virtualizer (default: 44) */
  estimateRowHeight?: number;
}

// ---------------------------------------------------------------------------
// Shared styles for the sticky actions column
// ---------------------------------------------------------------------------

const STICKY_ACTIONS_TH =
  "sticky right-0 z-10 bg-base-200/95 backdrop-blur-sm shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]";
const STICKY_ACTIONS_TD =
  "sticky right-0 bg-base-100 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]";

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

  // -- Virtualizer: virtualizes table rows --
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 12,
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
      { root: scrollRef.current, rootMargin: "300px" },
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
      {/* Scrollable container — both horizontal & vertical */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm table-pin-rows w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-base-200/60">
                {hg.headers.map((header) => {
                  const canSort = isSortable(header.id);
                  const sorted = sorting.find((s) => s.id === header.id);
                  const isActions = header.id === "__actions";

                  return (
                    <th
                      key={header.id}
                      className={clsx(
                        "text-xs font-medium text-base-content/70 whitespace-nowrap",
                        canSort &&
                          "cursor-pointer select-none hover:bg-base-300/40",
                        isActions && STICKY_ACTIONS_TH,
                      )}
                      style={{
                        width:
                          header.getSize() !== 150
                            ? header.getSize()
                            : undefined,
                      }}
                      onClick={() => handleSort(header.id)}
                    >
                      <div className="flex items-center gap-1">
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
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows.length > 0 ? (
              <>
                {/* Top spacer for virtual scroll */}
                {virtualizer.getVirtualItems()[0]?.start > 0 && (
                  <tr>
                    <td
                      colSpan={colSpan}
                      style={{
                        height: virtualizer.getVirtualItems()[0]?.start,
                        padding: 0,
                        border: "none",
                      }}
                    />
                  </tr>
                )}

                {/* Virtualized rows */}
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      ref={virtualizer.measureElement}
                      data-index={virtualRow.index}
                      className={clsx(
                        "hover:bg-base-200/40 transition-colors",
                        selectedRows.has(row.id) && "bg-primary/5",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isActions = cell.column.id === "__actions";
                        return (
                          <td
                            key={cell.id}
                            className={clsx(
                              "text-sm",
                              isActions && STICKY_ACTIONS_TD,
                            )}
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
                })}

                {/* Bottom spacer for virtual scroll */}
                {virtualizer.getVirtualItems().length > 0 &&
                  virtualizer.getTotalSize() -
                    (virtualizer.getVirtualItems().at(-1)?.end ?? 0) >
                    0 && (
                    <tr>
                      <td
                        colSpan={colSpan}
                        style={{
                          height:
                            virtualizer.getTotalSize() -
                            (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                          padding: 0,
                          border: "none",
                        }}
                      />
                    </tr>
                  )}
              </>
            ) : loading ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center">
                  <span className="loading loading-dots loading-lg" />
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-12 text-center text-base-content/40 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Loading at bottom (infinite scroll) */}
        {loading && rows.length > 0 && (
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
