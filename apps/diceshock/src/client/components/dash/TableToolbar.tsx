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
    <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
      <div className="min-w-0 w-full sm:w-auto sm:flex-1 sm:max-w-xs">
        <SearchBar {...searchBar} />
      </div>
      {quickFilters.length > 0 &&
        quickFilters.map((filter) => (
          <button
            key={`${filter.key}:${filter.value}`}
            type="button"
            className={`btn btn-xs ${filter.active ? "btn-primary" : "btn-ghost"}`}
            onClick={() => toggleQuickFilter(filter)}
          >
            {filter.label}
          </button>
        ))}
      <div className="flex items-center gap-2 ml-auto">
        {storeFilter && <AdminStoreFilter />}
        {extra}
      </div>
    </div>
  );
}
