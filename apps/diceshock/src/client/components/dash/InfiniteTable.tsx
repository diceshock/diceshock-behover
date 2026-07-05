import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

export interface InfiniteTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
  /** Whether there are more rows to load */
  hasMore?: boolean;
  /** Called when scroll reaches bottom */
  onLoadMore?: () => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  sortableColumns?: string[];
  enableRowSelection?: boolean;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (ids: Set<string>) => void;
  getRowId?: (row: TData) => string;
  renderActions?: (row: TData) => ReactNode;
}

export function InfiniteTable<TData>({
  columns,
  data,
  loading = false,
  emptyMessage = "暂无数据",
  hasMore = false,
  onLoadMore,
  sorting = [],
  onSortingChange,
  sortableColumns,
  enableRowSelection = false,
  selectedRows = new Set(),
  onSelectedRowsChange,
  getRowId,
  renderActions,
}: InfiniteTableProps<TData>) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const allColumns: ColumnDef<TData, unknown>[] = [
    ...(enableRowSelection
      ? [
          {
            id: "__select",
            header: () => (
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={data.length > 0 && selectedRows.size === data.length}
                onChange={(e) => {
                  if (!onSelectedRowsChange || !getRowId) return;
                  if (e.target.checked) {
                    onSelectedRowsChange(new Set(data.map(getRowId)));
                  } else {
                    onSelectedRowsChange(new Set());
                  }
                }}
              />
            ),
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

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting },
    onSortingChange: onSortingChange
      ? (updater) => {
          const next = typeof updater === "function" ? updater(sorting) : updater;
          onSortingChange(next);
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    getRowId: getRowId as (row: TData) => string,
  });

  const isSortable = useCallback(
    (colId: string) => {
      if (!sortableColumns) return false;
      return sortableColumns.includes(colId);
    },
    [sortableColumns],
  );

  const handleSort = (colId: string) => {
    if (!onSortingChange || !isSortable(colId)) return;
    const current = sorting.find((s) => s.id === colId);
    if (!current) {
      onSortingChange([{ id: colId, desc: false }]);
    } else if (!current.desc) {
      onSortingChange([{ id: colId, desc: true }]);
    } else {
      onSortingChange([]);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-auto">
      <table className="table table-sm table-pin-rows w-full">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="bg-base-200/60">
              {hg.headers.map((header) => {
                const canSort = isSortable(header.id);
                const sorted = sorting.find((s) => s.id === header.id);
                return (
                  <th
                    key={header.id}
                    className={clsx(
                      "text-xs font-medium text-base-content/70",
                      canSort && "cursor-pointer select-none hover:bg-base-300/40",
                    )}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={() => handleSort(header.id)}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={clsx(
                "hover:bg-base-200/40 transition-colors",
                selectedRows.has(row.id) && "bg-primary/5",
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <span className="loading loading-dots loading-sm text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="flex justify-center py-12 text-base-content/40 text-sm">
          {emptyMessage}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-1" />}

      {/* End of list */}
      {!hasMore && data.length > 0 && !loading && (
        <div className="flex justify-center py-3 text-base-content/30 text-xs">
          已加载全部 {data.length} 条
        </div>
      )}
    </div>
  );
}
