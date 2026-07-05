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
    const searchObj = (location.search ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(searchObj)) {
      if (v != null) params[k] = String(v);
    }

    const { filters, query } = searchParamsToFilters(params, category);
    return { filters, query, categoryId: category?.id };
  }, [location.pathname, location.search]);
}

/**
 * Convert FilterValue[] into variables for GraphQL queries.
 * Each table page can extend this with category-specific logic.
 */
export function filtersToGqlVariables(
  filters: FilterValue[],
  query: string,
): Record<string, unknown> {
  const vars: Record<string, unknown> = {};

  if (query) vars.search = query;

  for (const f of filters) {
    switch (f.kind) {
      case "kv":
        vars[f.key] = f.value;
        break;
      case "option":
        vars[f.key] = f.value;
        break;
      case "boolean":
        vars[f.key] = true;
        break;
      case "number":
        vars[`${f.key}_${f.operator}`] = f.value;
        break;
      case "date":
        vars[`${f.key}From`] = f.from;
        vars[`${f.key}To`] = f.to;
        break;
      case "sort": {
        vars.sortBy = f.key;
        vars.sortOrder = f.value;
        break;
      }
      case "group":
        vars.groupBy = f.value;
        break;
    }
  }

  return vars;
}
