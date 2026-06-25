import type { ReactNode } from "react";
import AdminStoreFilter from "@/client/components/AdminStoreFilter";
import { parseSearch, serialize } from "@/client/lib/searchParser";
import { SearchBar, type SearchBarProps } from "./SearchBar";

export interface TableToolbarProps {
  searchBar: SearchBarProps;
  quickFilters?: {
    label: string;
    key: string;
    value: string;
    active: boolean;
  }[];
  onQuickFilterToggle?: (key: string, value: string) => void;
  storeFilter?: boolean;
  extra?: ReactNode;
}

export function TableToolbar({
  searchBar,
  quickFilters = [],
  onQuickFilterToggle,
  storeFilter = false,
  extra,
}: TableToolbarProps) {
  const toggleQuickFilter = (filter: (typeof quickFilters)[number]) => {
    const parsed = parseSearch(searchBar.value, searchBar.grammar);
    const nextFilters = { ...parsed.filters };

    if (filter.active) delete nextFilters[filter.key];
    else nextFilters[filter.key] = { operator: "eq", value: filter.value };

    searchBar.onChange(
      serialize(
        { ...parsed, filters: nextFilters, errors: [] },
        searchBar.grammar,
      ),
    );
    onQuickFilterToggle?.(filter.key, filter.value);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1 lg:max-w-xl">
        <SearchBar {...searchBar} />
      </div>
      {quickFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-center">
          {quickFilters.map((filter) => (
            <button
              key={`${filter.key}:${filter.value}`}
              type="button"
              className={`btn btn-xs ${filter.active ? "btn-primary" : "btn-ghost"}`}
              onClick={() => toggleQuickFilter(filter)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}
      {(storeFilter || extra) && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {storeFilter && <AdminStoreFilter />}
          {extra}
        </div>
      )}
    </div>
  );
}
