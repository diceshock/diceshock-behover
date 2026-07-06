import {
  ClockCounterClockwiseIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useNavigate, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import Fuse from "fuse.js";
import { useAtomValue, useSetAtom } from "jotai";
import {
  useDashSearchHistoryQuery,
  useSaveDashSearchHistoryMutation,
  useClearDashSearchHistoryMutation,
  useDashGlobalSearchLazyQuery,
  DashSearchHistoryDocument,
} from "@/client/graphql/__generated__/operations";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  launcherAddFilterAtom,
  launcherAtom,
  launcherEnterFieldSelectAtom,
  launcherExitToSearchAtom,
  launcherRemoveFilterAtom,
  launcherResetAtom,
  launcherUpdateAtom,
} from "./atoms";
import { CATEGORIES, getCategoryByRoute } from "./categories";
import {
  type CategoryDef,
  type FieldDef,
  type FilterOperator,
  type FilterValue,
  type SearchHistoryEntry,
  OPERATOR_LABELS,
  filtersEqual,
  filtersToSearchParams,
  formatFilterChipLabel,
  getFieldOperators,
  searchParamsToFilters,
} from "./types";

// ─── Launcher Dialog ─────────────────────────────────────────────────────────

export function Launcher() {
  const state = useAtomValue(launcherAtom);
  const { open, mode, query, categoryId, filters, focusIndex, results, origin } = state;
  const update = useSetAtom(launcherUpdateAtom);
  const addFilter = useSetAtom(launcherAddFilterAtom);
  const removeFilter = useSetAtom(launcherRemoveFilterAtom);
  const enterFieldSelect = useSetAtom(launcherEnterFieldSelectAtom);
  const exitToSearch = useSetAtom(launcherExitToSearchAtom);
  const reset = useSetAtom(launcherResetAtom);
  // ── Remote search history ──
  const { data: historyData } = useDashSearchHistoryQuery({ fetchPolicy: "cache-and-network" });
  const searchHistory: SearchHistoryEntry[] = useMemo(() =>
    (historyData?.dashSearchHistory ?? []).map((h: { id: string; label: string; categoryId: string; route: string; params: string; createdAt: string }) => ({
      id: h.id,
      label: h.label,
      categoryId: h.categoryId,
      route: h.route,
      params: JSON.parse(h.params) as Record<string, string>,
      timestamp: h.createdAt,
    })),
    [historyData],
  );
  const [saveHistory] = useSaveDashSearchHistoryMutation({
    refetchQueries: [{ query: DashSearchHistoryDocument }],
  });
  const [clearHistoryMutation] = useClearDashSearchHistoryMutation({
    refetchQueries: [{ query: DashSearchHistoryDocument }],
  });
  const clearHistory = useCallback(() => { clearHistoryMutation(); }, [clearHistoryMutation]);

  const setQuery = useCallback((q: string) => update((d) => { d.query = q; }), [update]);
  const setCategoryId = useCallback((id: string | null) => update((d) => { d.categoryId = id; }), [update]);
  const setFocusIndex = useCallback((i: number) => update((d) => { d.focusIndex = i; }), [update]);
  const setMode = useCallback((m: typeof mode) => update((d) => { d.mode = m; }), [update]);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect category from current route
  const routeCategory = getCategoryByRoute(location.pathname);
  const activeCategory = categoryId
    ? CATEGORIES.find((c) => c.id === categoryId)
    : routeCategory;

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ── Global live search (debounced) ──
  const [execGlobalSearch, { data: globalSearchData, loading: globalSearchLoading }] =
    useDashGlobalSearchLazyQuery({ fetchPolicy: "cache-and-network" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run global search in search mode with query text
    if (!open || mode.type !== "search" || !query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const categories = categoryId ? [categoryId] : undefined;
      execGlobalSearch({ variables: { query: query.trim(), categories, limit: 15 } });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, mode.type, query, categoryId, execGlobalSearch]);

  // Flatten server results for Fuse.js re-ranking
  const globalResults = useMemo(() => {
    if (!globalSearchData?.dashGlobalSearch) return [];
    return globalSearchData.dashGlobalSearch.flatMap((g) => g.items);
  }, [globalSearchData]);

  // Re-focus input on mode change
  useEffect(() => {
    if (open && mode.type !== "operator-select") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, mode.type]);

  // Escape / X behavior depends on how the launcher was opened:
  // - origin "header" (table header click): close the launcher entirely
  // - origin "search" (normal open): return directly to search mode from any level
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (origin === "header") {
          reset();
        } else if (mode.type === "search") {
          reset();
        } else {
          exitToSearch();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, mode, origin, reset, exitToSearch]);

  // Build menu items based on current mode
  const menuItems = useMemo((): MenuItemData[] => {
    // ── Field-select: show all fields for the current category
    if (mode.type === "field-select" && activeCategory) {
      const filtered = query
        ? activeCategory.fields.filter((f) =>
            f.label.toLowerCase().includes(query.toLowerCase()),
          )
        : activeCategory.fields;
      return filtered.map((f) => ({
        id: `field:${f.key}`,
        label: f.label,
        subtitle: f.type === "enum" ? `${f.options.length} 选项` : undefined,
        fieldDef: f,
      }));
    }

    // ── Operator-select: show operators for the selected field
    if (mode.type === "operator-select") {
      const operators = getFieldOperators(mode.field);
      return operators.map((op) => ({
        id: `op:${op}`,
        label: OPERATOR_LABELS[op],
        operator: op,
      }));
    }

    // ── Value-input: show autocomplete or enum options
    if (mode.type === "value-input") {
      const field = mode.field;
      if (field.type === "enum") {
        const filtered = query
          ? field.options.filter((o) =>
              o.label.toLowerCase().includes(query.toLowerCase()),
            )
          : field.options;
        return filtered.map((o) => ({
          id: `val:${o.value}`,
          label: o.label,
          enumValue: o.value,
        }));
      }
      if (field.type === "boolean") {
        return [
          { id: "val:true", label: "是", enumValue: "true" },
          { id: "val:false", label: "否", enumValue: "false" },
        ];
      }
      // Text/number: show autocomplete from results
      if (results.length > 0) {
        return results
          .filter((r) => r.type === categoryId)
          .slice(0, 10)
          .map((r) => ({
            id: `ac:${r.id}`,
            label: r.title,
            subtitle: r.subtitle,
          }));
      }
      return [];
    }

    // ── Search mode (default): show history or search results
    // History is shown when: no query text AND no filters applied
    // (category selection alone does NOT count as a filter)
    const hasFilters = filters.length > 0;
    const showHistory = !query && !hasFilters;

    if (showHistory) {
      // Show history entries, filtered by current category if one is selected
      const historyItems = activeCategory
        ? searchHistory.filter((h) => h.categoryId === categoryId)
        : searchHistory;
      if (historyItems.length > 0) {
        return historyItems.map((h) => ({
          id: `history:${h.id}`,
          label: h.label,
          subtitle: h.categoryId,
          historyEntry: h,
        }));
      }
      // No history — show categories as quick navigation (only when no category selected)
      if (!activeCategory) {
        return CATEGORIES.map((c) => ({
          id: `cat:${c.id}`,
          label: c.label,
          icon: c.icon,
          category: c,
        }));
      }
      return [];
    }

    // ── Has query or filters → show live search results (from server, re-ranked locally)
    const items: MenuItemData[] = [];

    // If a category is active, show "navigate" item for applying filters
    if (activeCategory) {
      items.push({
        id: "navigate",
        label: `前往 ${activeCategory.label}`,
        description: buildFilterDescription(filters, query),
        isNavigate: true,
      });
    }

    // Also show matching category entries (only when no category selected)
    if (!activeCategory && query) {
      const matchedCats = CATEGORIES.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()),
      );
      for (const c of matchedCats) {
        items.push({ id: `cat:${c.id}`, label: c.label, icon: c.icon, category: c });
      }
    }

    // Use globalResults from server, re-ranked by Fuse.js with weighted keys
    if (globalResults.length > 0) {
      // Weight title highest, then subtitle, then searchableFields for broad matching
      const fuse = new Fuse(globalResults, {
        keys: [
          { name: "title", weight: 3 },
          { name: "subtitle", weight: 1.5 },
          { name: "searchableFields", weight: 1 },
        ],
        threshold: 0.5,
        includeScore: true,
        ignoreLocation: true,
      });
      const ranked = query
        ? fuse.search(query).map((r) => r.item)
        : globalResults;
      for (const r of ranked.slice(0, 20)) {
        items.push({
          id: `result:${r.id}`,
          label: r.title,
          subtitle: r.subtitle ?? undefined,
          detail: r.detail ? (JSON.parse(r.detail) as Record<string, string | number | null>) : undefined,
          href: r.href,
          avatar: r.avatar ?? undefined,
          resultType: r.category,
        });
      }
    }

    return items;
  }, [mode, activeCategory, categoryId, query, results, filters, searchHistory, globalResults]);

  // Clamp focus
  useEffect(() => {
    if (focusIndex >= menuItems.length) {
      setFocusIndex(Math.max(0, menuItems.length - 1));
    }
  }, [menuItems.length, focusIndex, setFocusIndex]);

  // Handle Enter / item selection
  const handleSubmit = useCallback((indexOverride?: number) => {
    const idx = indexOverride ?? focusIndex;
    const item = menuItems[idx];

    // ── Value-input mode
    if (mode.type === "value-input") {
      if (item && "enumValue" in item && item.enumValue) {
        addFilter({ key: mode.field.key, operator: mode.operator, value: item.enumValue });
      } else if (query) {
        addFilter({ key: mode.field.key, operator: mode.operator, value: query });
      }
      return;
    }

    if (!item) return;

    // ── Field selection
    if ("fieldDef" in item && item.fieldDef) {
      const def = item.fieldDef;
      // Boolean fields: skip operator, go directly
      if (def.type === "boolean") {
        setMode({ type: "value-input", field: def, operator: "eq" });
        setQuery("");
        setFocusIndex(0);
        return;
      }
      setMode({ type: "operator-select", field: def });
      setQuery("");
      setFocusIndex(0);
      return;
    }

    // ── Operator selection
    if ("operator" in item && item.operator) {
      const field = mode.type === "operator-select" ? mode.field : null;
      if (!field) return;
      const op = item.operator;
      // Sort operators apply immediately
      if (op === "sort_asc" || op === "sort_desc") {
        addFilter({ key: field.key, operator: op, value: "" });
        return;
      }
      // Enum eq: go to value with options
      setMode({ type: "value-input", field, operator: op });
      setQuery("");
      setFocusIndex(0);
      return;
    }

    // ── Category selection
    if ("category" in item && item.category) {
      setCategoryId(item.category.id);
      setQuery("");
      setFocusIndex(0);
      return;
    }

    // ── History entry
    if ("historyEntry" in item && item.historyEntry) {
      const h = item.historyEntry;
      navigate({ to: h.route, search: h.params });
      reset();
      return;
    }

    // ── Navigate item (apply filters)
    if ("isNavigate" in item && item.isNavigate && activeCategory) {
      const searchParams = filtersToSearchParams(filters, query);
      const currentParams: Record<string, string> = {};
      const searchObj = location.search;
      if (searchObj && typeof searchObj === "object") {
        for (const [k, v] of Object.entries(searchObj)) {
          if (v != null) currentParams[k] = String(v);
        }
      }

      const currentState = searchParamsToFilters(currentParams, activeCategory);
      const nextState = { filters, query };

      if (!filtersEqual(currentState, nextState)) {
        navigate({ to: activeCategory.route, search: searchParams as never });
        // Save to history (remote)
        saveHistory({
          variables: {
            input: {
              label: buildFilterDescription(filters, query) || activeCategory.label,
              categoryId: activeCategory.id,
              route: activeCategory.route,
              params: JSON.stringify(searchParams),
            },
          },
        });
      }
      reset();
      return;
    }

    // ── Result item
    if ("href" in item && item.href) {
      // Save to search history when navigating to a concrete result
      const resultCategory = ("resultType" in item ? item.resultType : categoryId) || "";
      saveHistory({
        variables: {
          input: {
            label: item.label,
            categoryId: resultCategory,
            route: item.href,
            params: "{}",
          },
        },
      });
      navigate({ to: item.href });
      reset();
      return;
    }
  }, [
    menuItems,
    focusIndex,
    setCategoryId,
    setQuery,
    setFocusIndex,
    addFilter,
    setMode,
    mode,
    query,
    activeCategory,
    filters,
    navigate,
    reset,
    location.search,
    saveHistory,
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex(Math.min(focusIndex + 1, menuItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex(Math.max(focusIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!open) return null;

  const isFieldSelect = mode.type === "field-select";
  const isSubMode =
    mode.type === "operator-select" || mode.type === "value-input";

  // Build header breadcrumb for sub-modes
  const modeLabel = (() => {
    if (mode.type === "operator-select") return mode.field.label;
    if (mode.type === "value-input") {
      return `${mode.field.label} · ${OPERATOR_LABELS[mode.operator]}`;
    }
    return "";
  })();

  // Placeholder text
  const placeholder = (() => {
    if (isFieldSelect) return "搜索字段…";
    if (mode.type === "operator-select") return "选择操作…";
    if (mode.type === "value-input") {
      const f = mode.field;
      if (f.type === "text" && "placeholder" in f && f.placeholder) return f.placeholder;
      if (f.type === "number") return `输入数值${f.unit ? ` (${f.unit})` : ""}…`;
      if (f.type === "date") {
        if (mode.operator === "range") return "选择日期区间…";
        return "输入日期 (YYYY-MM-DD)…";
      }
      return "输入值…";
    }
    return "搜索…";
  })();

  // Whether to show the date picker
  const showDatePicker =
    mode.type === "value-input" &&
    mode.field.type === "date";

  return (
    <div
      data-testid="launcher-dialog"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) reset();
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onMouseDown={reset} />

      {/* Dialog */}
      <div
        className={clsx(
          "relative w-full max-w-lg bg-base-100 rounded-xl shadow-2xl",
          "border border-base-300/50 flex flex-col overflow-hidden",
          "max-h-[70vh]",
        )}
      >
        {/* Active category + filter chips */}
        {(activeCategory || filters.length > 0) && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1">
            {activeCategory && (
              <span className="inline-flex items-center gap-1 h-5 pl-2 pr-1 rounded bg-accent/15 text-accent text-[11px] font-semibold">
                <span className="truncate max-w-24">{activeCategory.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    update((d) => {
                      d.categoryId = null;
                      d.filters = [];
                      d.mode = { type: "search" };
                      d.query = "";
                    });
                  }}
                  className="size-3.5 flex items-center justify-center rounded-full hover:bg-accent/20"
                >
                  <XIcon className="size-2.5" weight="bold" />
                </button>
              </span>
            )}
            {filters.map((f) => (
              <FilterChip
                key={`${f.key}:${f.operator}`}
                filter={f}
                category={activeCategory}
                onRemove={() => removeFilter(f.key)}
                onEdit={() => {
                  if (!activeCategory) return;
                  const def = activeCategory.fields.find((d) => d.key === f.key);
                  if (!def) return;
                  setMode({ type: "operator-select", field: def });
                  setQuery("");
                  setFocusIndex(0);
                }}
              />
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-base-300/30">
          {isSubMode && (
            <span className="text-xs font-medium text-primary shrink-0">
              {modeLabel}
            </span>
          )}
          <MagnifyingGlassIcon className="size-4 text-base-content/40 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className={clsx(
              "flex-1 bg-transparent outline-none text-sm",
              "placeholder:text-base-content/30",
              mode.type === "operator-select" && "pointer-events-none",
            )}
            placeholder={placeholder}
            value={mode.type === "operator-select" ? menuItems[focusIndex]?.label ?? "" : query}
            onChange={(e) => {
              if (mode.type !== "operator-select") {
                setQuery(e.target.value);
                setFocusIndex(0);
              }
            }}
            onKeyDown={handleKeyDown}
            readOnly={mode.type === "operator-select"}
          />
          {/* Right button: filter/x */}
          {!isSubMode && (
            <button
              type="button"
              onClick={() => {
                if (isFieldSelect) exitToSearch();
                else enterFieldSelect();
              }}
              className="btn btn-ghost btn-xs btn-square"
              title={isFieldSelect ? "返回搜索" : "筛选器"}
            >
              {isFieldSelect ? (
                <XIcon className="size-3.5" />
              ) : (
                <FunnelIcon className="size-3.5" />
              )}
            </button>
          )}
          {isSubMode && (
            <button
              type="button"
              onClick={() => {
                if (origin === "header") {
                  reset();
                } else {
                  exitToSearch();
                }
              }}
              className="btn btn-ghost btn-xs btn-square"
              title={origin === "header" ? "关闭 (Esc)" : "返回搜索 (Esc)"}
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-1">
          {showDatePicker ? (
            <DatePickPanel
              field={mode.field}
              operator={mode.operator}
              onConfirm={(value) => {
                addFilter({ key: mode.field.key, operator: mode.operator, value });
              }}
            />
          ) : (
            <>
              {menuItems.map((item, i) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  focused={i === focusIndex}
                  onMouseEnter={() => setFocusIndex(i)}
                  onClick={() => {
                    setFocusIndex(i);
                    handleSubmit(i);
                  }}
                />
              ))}
              {/* Empty states */}
              {menuItems.length === 0 && mode.type === "search" && !query && filters.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <ClockCounterClockwiseIcon className="size-8 mx-auto text-base-content/20 mb-2" />
                  <p className="text-xs text-base-content/40">暂无搜索历史</p>
                  <p className="text-[10px] text-base-content/30 mt-1">
                    按 <kbd className="kbd kbd-xs">⌘/Ctrl</kbd><span className="mx-0.5">+</span><kbd className="kbd kbd-xs">K</kbd> 然后输入搜索, 或点击漏斗图标筛选
                  </p>
                </div>
              )}
              {menuItems.length === 0 && query && !globalSearchLoading && (
                <div className="px-4 py-6 text-center text-xs text-base-content/40">
                  无结果
                </div>
              )}
              {menuItems.length === 0 && query && globalSearchLoading && (
                <div className="px-4 py-6 text-center">
                  <span className="loading loading-dots loading-sm text-base-content/30" />
                </div>
              )}
            </>
          )}
          {/* Clear history button — shown whenever history entries are displayed */}
          {mode.type === "search" && !query && filters.length === 0 && searchHistory.length > 0 && (
            <div className="border-t border-base-300/30 px-3 py-2">
              <button
                type="button"
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-[11px] text-base-content/40 hover:text-error transition-colors"
              >
                <TrashIcon className="size-3" />
                清除搜索历史
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Types for menu items ────────────────────────────────────────────────────

interface MenuItemData {
  id: string;
  label: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  fieldDef?: FieldDef;
  operator?: FilterOperator;
  enumValue?: string;
  category?: CategoryDef;
  historyEntry?: SearchHistoryEntry;
  isNavigate?: boolean;
  href?: string;
  avatar?: string;
  resultType?: string;
  detail?: Record<string, string | number | null>;
}

// ─── MenuItem component ──────────────────────────────────────────────────────

function MenuItem({
  item,
  focused,
  onMouseEnter,
  onClick,
}: {
  item: MenuItemData;
  focused: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
        focused ? "bg-primary/10 text-primary" : "hover:bg-base-200/60",
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {/* History icon */}
      {"historyEntry" in item && item.historyEntry && (
        <ClockCounterClockwiseIcon className="size-3.5 text-base-content/40 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{item.label}</div>
        {item.subtitle && (
          <div className="text-[11px] text-base-content/50 truncate">
            {item.subtitle}
          </div>
        )}
        {item.description && (
          <div className="text-[11px] text-base-content/40 truncate">
            {item.description}
          </div>
        )}
      </div>
      {/* Operator badge for field items */}
      {"fieldDef" in item && item.fieldDef && (
        <span className="text-[10px] text-base-content/30 shrink-0">
          {item.fieldDef.type}
        </span>
      )}
    </div>
  );
}

// ─── FilterChip ──────────────────────────────────────────────────────────────

function FilterChip({
  filter,
  category,
  onRemove,
  onEdit,
}: {
  filter: FilterValue;
  category: CategoryDef | undefined;
  onRemove: () => void;
  onEdit: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5 h-5 pl-2 pr-0.5 rounded bg-primary/10 text-primary text-[11px] cursor-pointer hover:bg-primary/15 transition-colors"
      onClick={onEdit}
    >
      <span className="truncate max-w-32">
        {formatFilterChipLabel(filter, category)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="size-3.5 flex items-center justify-center rounded-full hover:bg-primary/20"
      >
        <XIcon className="size-2.5" weight="bold" />
      </button>
    </span>
  );
}

// ─── DatePickPanel ───────────────────────────────────────────────────────────

function DatePickPanel({
  field,
  operator,
  onConfirm,
}: {
  field: FieldDef;
  operator: FilterOperator;
  onConfirm: (value: string) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [single, setSingle] = useState("");

  const isRange = operator === "range";
  const granularity = field.type === "date" ? field.granularity : "day";
  const inputType = granularity === "day" ? "date" : "datetime-local";

  const handleConfirm = () => {
    if (isRange) {
      if (from && to) onConfirm(`${from}|${to}`);
    } else {
      if (single) onConfirm(single);
    }
  };

  return (
    <div className="px-4 py-3 space-y-3">
      {isRange ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-base-content/50">开始</span>
            <input
              type={inputType}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input input-sm input-bordered w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-base-content/50">结束</span>
            <input
              type={inputType}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input input-sm input-bordered w-full"
            />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-base-content/50">
            {operator === "gte" ? "起始日期" : operator === "lte" ? "截止日期" : "日期"}
          </span>
          <input
            type={inputType}
            value={single}
            onChange={(e) => setSingle(e.target.value)}
            className="input input-sm input-bordered w-full"
          />
        </label>
      )}
      <button
        type="button"
        onClick={handleConfirm}
        className="btn btn-primary btn-sm w-full"
        disabled={isRange ? !from || !to : !single}
      >
        确认
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilterDescription(filters: FilterValue[], query: string): string {
  const parts: string[] = [];
  if (query) parts.push(`搜索: ${query}`);
  for (const f of filters) {
    parts.push(`${f.key}${OPERATOR_LABELS[f.operator]}${f.value}`);
  }
  return parts.join(" · ") || "无筛选条件";
}
