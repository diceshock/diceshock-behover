import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SearchGrammar } from "@/client/lib/searchParser";
import { buildNextSortingState, DashTable, getPageSummary } from "../DashTable";
import { SearchBar } from "../SearchBar";
import { TableToolbar } from "../TableToolbar";

type Row = {
  id: string;
  name: string;
  status: string;
};

const rows: Row[] = [
  { id: "a", name: "Alpha", status: "active" },
  { id: "b", name: "Beta", status: "paused" },
];

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => row.original.status,
  },
];

const grammar: SearchGrammar = {
  status: { type: "enum", values: ["active", "paused"] },
  user: { type: "string" },
};

describe("DashTable", () => {
  it("renders a DaisyUI table with columns, rows, selection, actions, and pagination", () => {
    const html = renderToString(
      createElement(DashTable<Row>, {
        columns,
        data: rows,
        enableRowSelection: true,
        selectedRows: new Set(["a"]),
        getRowId: (row) => row.id,
        pagination: { offset: 0, limit: 10, total: 25, hasMore: true },
        renderActions: (row) => createElement("button", null, `Open ${row.id}`),
      }),
    );

    expect(html).toContain("table table-lg table-pin-rows table-pin-cols");
    expect(html).toContain("Name");
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Open a");
    expect(html).toContain("Showing 1-10 of 25");
  });

  it("renders loading and empty states with full-width table rows", () => {
    const loadingHtml = renderToString(
      createElement(DashTable<Row>, { columns, data: [], loading: true }),
    );
    const emptyHtml = renderToString(
      createElement(DashTable<Row>, {
        columns,
        data: [],
        emptyMessage: "Nothing here",
      }),
    );

    expect(loadingHtml).toContain("loading loading-dots loading-lg");
    expect(emptyHtml).toContain("Nothing here");
  });

  it("builds controlled sorting state for sortable headers", () => {
    expect(buildNextSortingState("name", [], ["name"])).toEqual([
      { id: "name", desc: false },
    ]);
    expect(
      buildNextSortingState("name", [{ id: "name", desc: false }], ["name"]),
    ).toEqual([{ id: "name", desc: true }]);
    expect(
      buildNextSortingState("name", [{ id: "name", desc: true }], ["name"]),
    ).toEqual([]);
    expect(buildNextSortingState("status", [], ["name"])).toEqual([]);
  });

  it("summarizes offset pagination windows", () => {
    expect(
      getPageSummary({ offset: 20, limit: 10, total: 35, hasMore: true }),
    ).toBe("Showing 21-30 of 35");
    expect(
      getPageSummary({ offset: 30, limit: 10, total: 35, hasMore: false }),
    ).toBe("Showing 31-35 of 35");
  });
});

describe("SearchBar", () => {
  it("renders parser validation errors for invalid search input", () => {
    const html = renderToString(
      createElement(SearchBar, {
        grammar,
        value: "status:cancelled unknown:value",
        onChange: vi.fn(),
        onSubmit: vi.fn(),
      }),
    );

    expect(html).toContain("input input-bordered w-full");
    expect(html).toContain("Invalid value for status: cancelled");
    expect(html).toContain("Unsupported search key: unknown");
  });

  it("renders external errors alongside parser errors", () => {
    const html = renderToString(
      createElement(SearchBar, {
        grammar,
        value: "status:active",
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        errors: ["Server rejected filter"],
      }),
    );

    expect(html).toContain("Server rejected filter");
  });
});

describe("TableToolbar", () => {
  it("renders SearchBar, quick filters, AdminStoreFilter, and extra content", () => {
    const html = renderToString(
      createElement(TableToolbar, {
        searchBar: {
          grammar,
          value: "status:active",
          onChange: vi.fn(),
          onSubmit: vi.fn(),
        },
        quickFilters: [
          { label: "Active", key: "status", value: "active", active: true },
          { label: "Paused", key: "status", value: "paused", active: false },
        ],
        storeFilter: true,
        extra: createElement("button", null, "Export"),
      }),
    );

    expect(html).toContain("Active");
    expect(html).toContain("btn-primary");
    expect(html).toContain("select select-bordered select-sm");
    expect(html).toContain("Export");
  });
});
