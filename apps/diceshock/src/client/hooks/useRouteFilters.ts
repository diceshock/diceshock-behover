import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { getCategoryByRoute } from "@/client/components/dash/launcher/categories";
import {
  type FilterValue,
  searchParamsToFilters,
} from "@/client/components/dash/launcher/types";

/**
 * Hook that reads URL search params and converts them to FilterValue[] + query.
 * Table pages use this to drive their data fetching.
 */
export function useRouteFilters(): {
  filters: FilterValue[];
  query: string;
  categoryId: string | undefined;
} {
  const location = useLocation();

  return useMemo(() => {
    const category = getCategoryByRoute(location.pathname);
    const params: Record<string, string> = {};
    // TanStack Router location.search is a parsed object
    const searchObj = location.search;
    if (searchObj && typeof searchObj === "object") {
      for (const [k, v] of Object.entries(searchObj)) {
        if (v != null) params[k] = String(v);
      }
    }

    const { filters, query } = searchParamsToFilters(params, category);
    return { filters, query, categoryId: category?.id };
  }, [location.pathname, location.search]);
}

/**
 * Convert FilterValue[] into variables for GraphQL queries.
 * Each table page can extend this with category-specific logic.
 *
 * New format maps operator-based filters:
 * - eq → key = value (exact match)
 * - include → key contains value (text search)
 * - gte → key >= value
 * - lte → key <= value
 * - range → key between from|to
 * - sort_asc / sort_desc → sortBy + sortOrder
 */
export function filtersToGqlVariables(
  filters: FilterValue[],
  query: string,
): Record<string, unknown> {
  const vars: Record<string, unknown> = {};

  if (query) vars.search = query;

  for (const f of filters) {
    switch (f.operator) {
      case "eq":
        vars[f.key] = f.value;
        break;
      case "include":
        // Use the same key — server interprets as LIKE/contains
        vars[f.key] = f.value;
        break;
      case "gte":
        vars[`${f.key}From`] = f.value;
        break;
      case "lte":
        vars[`${f.key}To`] = f.value;
        break;
      case "range": {
        const sep = f.value.indexOf("|");
        if (sep !== -1) {
          vars[`${f.key}From`] = f.value.slice(0, sep);
          vars[`${f.key}To`] = f.value.slice(sep + 1);
        }
        break;
      }
      case "sort_asc":
        vars.sortBy = f.key;
        vars.sortOrder = "asc";
        break;
      case "sort_desc":
        vars.sortBy = f.key;
        vars.sortOrder = "desc";
        break;
    }
  }

  return vars;
}
