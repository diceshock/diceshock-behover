/**
 * Unified filter & launcher type system.
 *
 * State flow: Launcher → Enter → URL search params → Table reads params
 *
 * Filter types:
 * - kv: text include search (nickname, uid, phone…)
 * - option: enum select (role, status…)
 * - boolean: toggle (is_active, is_disabled…)
 * - number: gt/lt/eq numeric comparison
 * - date: time range with start/end
 * - sort: ordering direction
 * - group: grouping key
 */

// ─── Filter Value Types ──────────────────────────────────────────────────────

export type FilterKind =
  | "kv"
  | "option"
  | "boolean"
  | "number"
  | "date"
  | "sort"
  | "group";

export type NumberOperator = "gt" | "lt" | "eq";

export interface KvFilterValue {
  kind: "kv";
  key: string;
  value: string;
}

export interface OptionFilterValue {
  kind: "option";
  key: string;
  value: string;
}

export interface BooleanFilterValue {
  kind: "boolean";
  key: string;
  value: true;
}

export interface NumberFilterValue {
  kind: "number";
  key: string;
  operator: NumberOperator;
  value: number;
}

export interface DateFilterValue {
  kind: "date";
  key: string;
  from: string; // ISO date or datetime
  to: string;
}

export interface SortFilterValue {
  kind: "sort";
  key: string;
  value: "asc" | "desc";
}

export interface GroupFilterValue {
  kind: "group";
  key: string;
  value: string;
}

export type FilterValue =
  | KvFilterValue
  | OptionFilterValue
  | BooleanFilterValue
  | NumberFilterValue
  | DateFilterValue
  | SortFilterValue
  | GroupFilterValue;

// ─── Filter Definition (schema) ──────────────────────────────────────────────

export interface KvFilterDef {
  kind: "kv";
  key: string;
  label: string;
  placeholder?: string;
}

export interface OptionFilterDef {
  kind: "option";
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface BooleanFilterDef {
  kind: "boolean";
  key: string;
  label: string;
}

export interface NumberFilterDef {
  kind: "number";
  key: string;
  label: string;
  unit?: string;
}

export interface DateFilterDef {
  kind: "date";
  key: string;
  label: string;
  granularity: "day" | "hour" | "minute";
}

export interface SortFilterDef {
  kind: "sort";
  key: string;
  label: string;
  fields: { value: string; label: string }[];
}

export interface GroupFilterDef {
  kind: "group";
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export type FilterDef =
  | KvFilterDef
  | OptionFilterDef
  | BooleanFilterDef
  | NumberFilterDef
  | DateFilterDef
  | SortFilterDef
  | GroupFilterDef;

// ─── Category ────────────────────────────────────────────────────────────────

export interface CategoryDef {
  id: string;
  label: string;
  icon: string; // phosphor icon weight identifier
  route: string; // e.g. "/dash/users"
  filters: FilterDef[];
  /** Fuse.js search keys when searching items in this category */
  searchKeys: string[];
}

// ─── Search Result Item ──────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string;
  type: string; // category id
  title: string;
  subtitle?: string;
  /** Extra fields shown when focused */
  detail?: Record<string, string | number | null>;
  /** Route to navigate on enter */
  href: string;
  /** Avatar URL or icon */
  avatar?: string;
}

// ─── Launcher State ──────────────────────────────────────────────────────────

export type LauncherMode =
  | { type: "search" } // default: search items + categories
  | { type: "filter-menu" } // showing all filters for current category
  | { type: "kv-input"; filter: KvFilterDef } // typing kv value
  | { type: "option-select"; filter: OptionFilterDef | GroupFilterDef } // selecting enum/group
  | { type: "date-pick"; filter: DateFilterDef } // picking date range
  | { type: "number-input"; filter: NumberFilterDef }; // entering number

export interface LauncherState {
  open: boolean;
  mode: LauncherMode;
  /** Current category (bound when user selects one, or inferred from route) */
  categoryId: string | null;
  query: string;
  filters: FilterValue[];
  focusIndex: number;
}

// ─── URL Serialization ───────────────────────────────────────────────────────

/** Serialize filters to URL search params */
export function filtersToSearchParams(
  filters: FilterValue[],
  query: string,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (query) params.q = query;

  for (const f of filters) {
    switch (f.kind) {
      case "kv":
        params[`f.${f.key}`] = f.value;
        break;
      case "option":
        params[`f.${f.key}`] = f.value;
        break;
      case "boolean":
        params[`f.${f.key}`] = "1";
        break;
      case "number":
        params[`f.${f.key}`] = `${f.operator}:${f.value}`;
        break;
      case "date":
        params[`f.${f.key}.from`] = f.from;
        params[`f.${f.key}.to`] = f.to;
        break;
      case "sort":
        params.sort = `${f.key}:${f.value}`;
        break;
      case "group":
        params.group = f.value;
        break;
    }
  }
  return params;
}

/** Deserialize URL search params back to filters */
export function searchParamsToFilters(
  params: Record<string, string>,
  category: CategoryDef | undefined,
): { filters: FilterValue[]; query: string } {
  const filters: FilterValue[] = [];
  const query = params.q ?? "";

  if (!category) return { filters, query };

  for (const def of category.filters) {
    switch (def.kind) {
      case "kv": {
        const val = params[`f.${def.key}`];
        if (val) filters.push({ kind: "kv", key: def.key, value: val });
        break;
      }
      case "option": {
        const val = params[`f.${def.key}`];
        if (val) filters.push({ kind: "option", key: def.key, value: val });
        break;
      }
      case "boolean": {
        if (params[`f.${def.key}`] === "1")
          filters.push({ kind: "boolean", key: def.key, value: true });
        break;
      }
      case "number": {
        const val = params[`f.${def.key}`];
        if (val) {
          const [op, num] = val.split(":");
          if (op && num)
            filters.push({
              kind: "number",
              key: def.key,
              operator: op as NumberOperator,
              value: Number(num),
            });
        }
        break;
      }
      case "date": {
        const from = params[`f.${def.key}.from`];
        const to = params[`f.${def.key}.to`];
        if (from && to)
          filters.push({ kind: "date", key: def.key, from, to });
        break;
      }
      case "sort": {
        const sortVal = params.sort;
        if (sortVal) {
          const [key, dir] = sortVal.split(":");
          if (key && (dir === "asc" || dir === "desc"))
            filters.push({ kind: "sort", key, value: dir });
        }
        break;
      }
      case "group": {
        const groupVal = params.group;
        if (groupVal)
          filters.push({ kind: "group", key: def.key, value: groupVal });
        break;
      }
    }
  }

  return { filters, query };
}

/** Compare two filter states for equality (to decide if navigation is needed) */
export function filtersEqual(
  a: { filters: FilterValue[]; query: string },
  b: { filters: FilterValue[]; query: string },
): boolean {
  if (a.query !== b.query) return false;
  if (a.filters.length !== b.filters.length) return false;
  const serialize = (f: FilterValue) => JSON.stringify(f);
  const aSet = new Set(a.filters.map(serialize));
  return b.filters.every((f) => aSet.has(serialize(f)));
}
