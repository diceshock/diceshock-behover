import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

export interface DashTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  onPaginationChange?: (page: { offset: number; limit: number }) => void;
  paginationMode?: "offset" | "cursor" | "none";
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  sortableColumns?: string[];
  enableRowSelection?: boolean;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (selected: Set<string>) => void;
  getRowId?: (row: TData) => string;
  renderActions?: (row: TData) => ReactNode;
}

export function buildNextSortingState(
  columnId: string,
  sorting: SortingState,
  sortableColumns?: string[],
): SortingState {
  if (sortableColumns && !sortableColumns.includes(columnId)) return sorting;

  const current = sorting.find((item) => item.id === columnId);
  if (!current) return [{ id: columnId, desc: false }];
  if (!current.desc) return [{ id: columnId, desc: true }];
  return [];
}

export function getPageSummary(pagination: {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}): string {
  if (pagination.total === 0) return "Showing 0 of 0";

  const start = pagination.offset + 1;
  const end = Math.min(pagination.offset + pagination.limit, pagination.total);
  return `Showing ${start}-${end} of ${pagination.total}`;
}

export function DashTable<TData>({
  columns,
  data,
  loading = false,
  emptyMessage = "No results found",
  pagination,
  onPaginationChange,
  paginationMode = "offset",
  sorting = [],
  onSortingChange,
  sortableColumns,
  enableRowSelection = false,
  selectedRows = new Set<string>(),
  onSelectedRowsChange,
  getRowId,
  renderActions,
}: DashTableProps<TData>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId
      ? (row) => getRowId(row)
      : (_row, index) => String(index),
    state: { sorting },
    manualPagination: true,
  });

  const rows = table.getRowModel().rows;
  const visibleRowIds = rows.map((row) => row.id);
  const allVisibleSelected =
    visibleRowIds.length > 0 &&
    visibleRowIds.every((id) => selectedRows.has(id));
  const colSpan =
    columns.length + (enableRowSelection ? 1 : 0) + (renderActions ? 1 : 0);

  const updateSelection = (id: string, selected: boolean) => {
    const next = new Set(selectedRows);
    if (selected) next.add(id);
    else next.delete(id);
    onSelectedRowsChange?.(next);
  };

  const toggleAllVisible = (selected: boolean) => {
    const next = new Set(selectedRows);
    for (const id of visibleRowIds) {
      if (selected) next.add(id);
      else next.delete(id);
    }
    onSelectedRowsChange?.(next);
  };

  const handleSort = (columnId: string) => {
    const next = buildNextSortingState(columnId, sorting, sortableColumns);
    if (next !== sorting) onSortingChange?.(next);
  };

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

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.limit))
    : 1;
  const currentPage = pagination
    ? Math.floor(pagination.offset / pagination.limit) + 1
    : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full flex-1 min-h-0 overflow-auto relative">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="z-20">
                {enableRowSelection && (
                  <td className="w-10">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={allVisibleSelected}
                      disabled={rows.length === 0 || loading}
                      onChange={(event) =>
                        toggleAllVisible(event.target.checked)
                      }
                    />
                  </td>
                )}
                {headerGroup.headers.map((header) => {
                  const canSort =
                    !header.isPlaceholder &&
                    (!sortableColumns ||
                      sortableColumns.includes(header.column.id));
                  const sorted = sorting.find(
                    (item) => item.id === header.column.id,
                  );

                  return (
                    <th key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left font-semibold disabled:cursor-default"
                          disabled={!canSort}
                          onClick={() => handleSort(header.column.id)}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && (
                            <span className="text-xs text-base-content/60">
                              {sorted ? (sorted.desc ? "▼" : "▲") : "↕"}
                            </span>
                          )}
                        </button>
                      )}
                    </th>
                  );
                })}
                {renderActions && (
                  <th className="whitespace-nowrap">Actions</th>
                )}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center">
                  <span className="loading loading-dots loading-lg" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-12 text-center text-base-content/60"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {enableRowSelection && (
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedRows.has(row.id)}
                        onChange={(event) =>
                          updateSelection(row.id, event.target.checked)
                        }
                      />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                  {renderActions && (
                    <th className="whitespace-nowrap">
                      {renderActions(row.original)}
                    </th>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && paginationMode !== "none" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="text-sm text-base-content/70">
            {paginationMode === "cursor"
              ? `Page ${currentPage}`
              : getPageSummary(pagination)}
          </span>
          {paginationMode === "offset" && (
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
          )}
          <div className="join">
            <button
              type="button"
              className="btn btn-sm btn-ghost join-item"
              disabled={pagination.offset <= 0 || loading}
              onClick={goToPreviousPage}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost join-item"
              disabled={!pagination.hasMore || loading}
              onClick={goToNextPage}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
