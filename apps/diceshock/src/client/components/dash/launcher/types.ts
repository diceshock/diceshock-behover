/**
 * Field-first filter system for the Launcher.
 *
 * Flow: Select Field → Pick Operator → Enter Value
 *
 * Each field definition declares which operators are available.
 * Operators vary by field type:
 *   - text fields: eq (equals), include (contains), sort
 *   - number fields: eq, gte (>=), lte (<=), range, sort
 *   - date fields: eq (specific day), gte, lte, range, sort
 *   - enum fields: eq (pick from options), sort
 *   - boolean fields: eq (toggle true/false)
 *
 * State flow: Launcher → select field → pick operator → enter value → URL search params
 */

// ─── Operators ───────────────────────────────────────────────────────────────

export type FilterOperator =
  | "eq" // equals (exact match)
  | "include" // contains / like
  | "gte" // >=
  | "lte" // <=
  | "range" // between (for date / number)
  | "sort_asc" // sort ascending
  | "sort_desc"; // sort descending

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "等于",
  include: "包含",
  gte: "大于等于",
  lte: "小于等于",
  range: "区间",
  sort_asc: "排序 ↑",
  sort_desc: "排序 ↓",
};

/** Runtime type guard for FilterOperator */
export function isFilterOperator(value: string): value is FilterOperator {
  return value in OPERATOR_LABELS;
}

// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType = "text" | "number" | "date" | "enum" | "boolean";

/** Operators allowed per field type */
export const OPERATORS_BY_TYPE: Record<FieldType, FilterOperator[]> = {
  text: ["include", "eq", "sort_asc", "sort_desc"],
  number: ["eq", "gte", "lte", "range", "sort_asc", "sort_desc"],
  date: ["eq", "gte", "lte", "range", "sort_asc", "sort_desc"],
  enum: ["eq", "sort_asc", "sort_desc"],
  boolean: ["eq"],
};

// ─── Field Definition (schema) ───────────────────────────────────────────────

interface BaseFieldDef {
  key: string;
  label: string;
  /** Restrict operators to a subset (defaults to all for the type) */
  operators?: FilterOperator[];
}

export interface TextFieldDef extends BaseFieldDef {
  type: "text";
  placeholder?: string;
}

export interface NumberFieldDef extends BaseFieldDef {
  type: "number";
  unit?: string;
}

export interface DateFieldDef extends BaseFieldDef {
  type: "date";
  granularity: "day" | "hour" | "minute";
}

export interface EnumFieldDef extends BaseFieldDef {
  type: "enum";
  options: { value: string; label: string }[];
}

export interface BooleanFieldDef extends BaseFieldDef {
  type: "boolean";
}

export type FieldDef =
  | TextFieldDef
  | NumberFieldDef
  | DateFieldDef
  | EnumFieldDef
  | BooleanFieldDef;

/** Get available operators for a field */
export function getFieldOperators(field: FieldDef): FilterOperator[] {
  if (field.operators) return field.operators;
  return OPERATORS_BY_TYPE[field.type];
}

// ─── Filter Value (applied filter) ──────────────────────────────────────────

export interface FilterValue {
  key: string;
  operator: FilterOperator;
  /** String for text/enum, number for number, ISO string for date, "from|to" for range */
  value: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  route: string;
  fields: FieldDef[];
  /** Fuse.js search keys when searching items in this category */
  searchKeys: string[];
  /** Fields available for sorting (shown under "排序" in field-select) */
  sortFields?: { key: string; label: string }[];
  /** Fields available for grouping (shown under "分组" in field-select) */
  groupFields?: { key: string; label: string }[];
}

// ─── Search Result Item ──────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string;
  type: string; // category id
  title: string;
  subtitle?: string;
  detail?: Record<string, string | number | null>;
  href: string;
  avatar?: string;
}

// ─── Search History ──────────────────────────────────────────────────────────

/** A persisted search history entry, bound to the current user */
export interface SearchHistoryEntry {
  id: string;
  /** Display label (e.g. "用户 · 昵称 包含 张三") */
  label: string;
  /** Category id */
  categoryId: string;
  /** Route to navigate with params */
  route: string;
  /** Serialized search params */
  params: Record<string, string>;
  /** ISO timestamp */
  timestamp: string;
}

// ─── Launcher State ──────────────────────────────────────────────────────────

export type LauncherMode =
  | { type: "search" }
  | { type: "field-select" } // showing all fields for current category
  | { type: "sort-field-select" } // picking a sort field
  | { type: "group-field-select" } // picking a group field
  | { type: "operator-select"; field: FieldDef } // picking an operator for a field
  | { type: "value-input"; field: FieldDef; operator: FilterOperator }; // entering value

export interface LauncherState {
  open: boolean;
  mode: LauncherMode;
  categoryId: string | null;
  query: string;
  filters: FilterValue[];
  focusIndex: number;
}

// ─── URL Serialization ───────────────────────────────────────────────────────

/**
 * Serialize filters to URL search params.
 * Format: f.<key>=<value> for eq (default), f.<key>=<op>:<value> for others
 * Sort: sort=<key>:<asc|desc>
 * Group: group=<value>
 */
export function filtersToSearchParams(
  filters: FilterValue[],
  query: string,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (query) params.q = query;

  for (const f of filters) {
    if (f.operator === "sort_asc") {
      params.sort = `${f.key}:asc`;
    } else if (f.operator === "sort_desc") {
      params.sort = `${f.key}:desc`;
    } else if (f.key === "__group") {
      params.group = f.value;
    } else if (f.operator === "eq") {
      // eq is the default — no prefix needed
      params[`f.${f.key}`] = f.value;
    } else {
      // Non-default operators: prefix with op
      params[`f.${f.key}`] = `${f.operator}:${f.value}`;
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

  // Parse f.<key>=<value> (eq default) or f.<key>=<op>:<value>
  for (const [paramKey, paramVal] of Object.entries(params)) {
    if (paramKey.startsWith("f.")) {
      const fieldKey = paramKey.slice(2); // strip "f."
      if (!category.fields.some((f) => f.key === fieldKey)) continue;

      const colonIdx = paramVal.indexOf(":");
      if (colonIdx === -1) {
        // No colon → default operator (eq)
        filters.push({ key: fieldKey, operator: "eq", value: paramVal });
      } else {
        const opRaw = paramVal.slice(0, colonIdx);
        if (isFilterOperator(opRaw)) {
          const val = paramVal.slice(colonIdx + 1);
          filters.push({ key: fieldKey, operator: opRaw, value: val });
        } else {
          // Not a valid operator prefix — treat entire value as eq
          filters.push({ key: fieldKey, operator: "eq", value: paramVal });
        }
      }
    }
  }

  // Parse sort=<key>:<asc|desc>
  if (params.sort) {
    const [key, dir] = params.sort.split(":");
    if (key && (dir === "asc" || dir === "desc")) {
      const op: FilterOperator = dir === "asc" ? "sort_asc" : "sort_desc";
      filters.push({ key, operator: op, value: "" });
    }
  }

  // Parse group=<field>
  if (params.group) {
    filters.push({ key: "__group", operator: "eq", value: params.group });
  }

  return { filters, query };
}

/** Compare two filter states for equality */
export function filtersEqual(
  a: { filters: FilterValue[]; query: string },
  b: { filters: FilterValue[]; query: string },
): boolean {
  if (a.query !== b.query) return false;
  if (a.filters.length !== b.filters.length) return false;
  const serialize = (f: FilterValue) => `${f.key}:${f.operator}:${f.value}`;
  const aSet = new Set(a.filters.map(serialize));
  return b.filters.every((f) => aSet.has(serialize(f)));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a filter for display as a chip label */
export function formatFilterChipLabel(
  f: FilterValue,
  category: CategoryDef | undefined,
): string {
  const field = category?.fields.find((d) => d.key === f.key);
  const fieldLabel = field?.label ?? f.key;

  if (f.operator === "sort_asc") return `${fieldLabel} ↑`;
  if (f.operator === "sort_desc") return `${fieldLabel} ↓`;

  const opLabel = OPERATOR_LABELS[f.operator];
  let valLabel = f.value;

  // For enum fields, resolve option label
  if (field?.type === "enum") {
    const opt = field.options.find((o) => o.value === f.value);
    if (opt) valLabel = opt.label;
  }

  // For range, split value
  if (f.operator === "range" && f.value.includes("|")) {
    const [from, to] = f.value.split("|");
    return `${fieldLabel} ${from} ~ ${to}`;
  }

  // For boolean eq, just show the field name
  if (field?.type === "boolean") {
    return f.value === "true" ? fieldLabel : `非${fieldLabel}`;
  }

  return `${fieldLabel} ${opLabel} ${valLabel}`;
}
