import {
  FunnelIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useLocation, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import Fuse from "fuse.js";
import { useAtomValue, useSetAtom } from "jotai";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { CATEGORIES, getCategoryByRoute } from "./categories";
import {
  launcherAddFilterAtom,
  launcherAtom,
  launcherEnterFilterMenuAtom,
  launcherExitFilterMenuAtom,
  launcherRemoveFilterAtom,
  launcherResetAtom,
  launcherUpdateAtom,
} from "./atoms";
import {
  type CategoryDef,
  type FilterDef,
  type FilterValue,
  filtersEqual,
  filtersToSearchParams,
  searchParamsToFilters,
} from "./types";

// ─── Launcher Dialog ─────────────────────────────────────────────────────────

export function Launcher() {
  const state = useAtomValue(launcherAtom);
  const { open, mode, query, categoryId, filters, focusIndex, results } = state;
  const update = useSetAtom(launcherUpdateAtom);
  const addFilter = useSetAtom(launcherAddFilterAtom);
  const removeFilter = useSetAtom(launcherRemoveFilterAtom);
  const enterFilterMenu = useSetAtom(launcherEnterFilterMenuAtom);
  const exitFilterMenu = useSetAtom(launcherExitFilterMenuAtom);
  const reset = useSetAtom(launcherResetAtom);

  // Convenience setters via immer update
  const setMode = useCallback((m: typeof mode) => update((d) => { d.mode = m; }), [update]);
  const setQuery = useCallback((q: string) => update((d) => { d.query = q; }), [update]);
  const setCategoryId = useCallback((id: string | null) => update((d) => { d.categoryId = id; }), [update]);
  const setFilters = useCallback((f: FilterValue[]) => update((d) => { d.filters = f; }), [update]);
  const setFocusIndex = useCallback((i: number) => update((d) => { d.focusIndex = i; }), [update]);

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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // If in sub-mode, go back to search
        if (mode.type !== "search" && mode.type !== "filter-menu") {
          setMode({ type: "search" });
          setQuery("");
        } else {
          reset();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, mode, reset, setMode, setQuery]);

  // Build options list
  const menuItems = useMemo(() => {
    if (mode.type === "filter-menu" && activeCategory) {
      // Show all available filters for this category
      return activeCategory.filters.map((f) => ({
        id: `filter:${f.key}`,
        label: f.label,
        kind: f.kind,
        filterDef: f,
      }));
    }

    if (mode.type === "kv-input") {
      // Autocomplete from results
      return results
        .filter((r) => r.type === categoryId)
        .slice(0, 10)
        .map((r) => ({
          id: `ac:${r.id}`,
          label: r.title,
          subtitle: r.subtitle,
        }));
    }

    if (mode.type === "option-select") {
      return mode.filter.options.map((o) => ({
        id: `opt:${o.value}`,
        label: o.label,
        value: o.value,
      }));
    }

    // Default search mode
    if (!activeCategory) {
      // Show all categories
      const filtered = query
        ? CATEGORIES.filter((c) =>
            c.label.toLowerCase().includes(query.toLowerCase()),
          )
        : CATEGORIES;
      return filtered.map((c) => ({
        id: `cat:${c.id}`,
        label: c.label,
        icon: c.icon,
        category: c,
      }));
    }

    // In a category with search mode — show "go to" + results
    const items: MenuItemData[] = [];
    // First item: navigate to category with current filters
    items.push({
      id: "navigate",
      label: `前往 ${activeCategory.label}`,
      description: buildFilterDescription(filters, query),
      isNavigate: true,
    });

    // Fuse search on results
    if (results.length > 0) {
      const fuse = new Fuse(results, {
        keys: ["title", "subtitle"],
        threshold: 0.4,
        includeScore: true,
      });
      const matched = query
        ? fuse.search(query).map((r) => r.item)
        : results.slice(0, 20);
      for (const r of matched) {
        items.push({
          id: `result:${r.id}`,
          label: r.title,
          subtitle: r.subtitle,
          detail: r.detail,
          href: r.href,
          avatar: r.avatar,
          resultType: r.type,
        });
      }
    }

    return items;
  }, [mode, activeCategory, categoryId, query, results, filters]);

  // Clamp focus
  useEffect(() => {
    if (focusIndex >= menuItems.length) {
      setFocusIndex(Math.max(0, menuItems.length - 1));
    }
  }, [menuItems.length, focusIndex, setFocusIndex]);

  // Handle Enter
  const handleSubmit = useCallback(() => {
    const item = menuItems[focusIndex];
    if (!item) return;

    // Category selection
    if ("category" in item && item.category) {
      setCategoryId(item.category.id);
      setQuery("");
      setFocusIndex(0);
      return;
    }

    // Filter menu item
    if ("filterDef" in item && item.filterDef) {
      const def = item.filterDef;
      if (def.kind === "boolean") {
        addFilter({ kind: "boolean", key: def.key, value: true });
        return;
      }
      if (def.kind === "kv") {
        setMode({ type: "kv-input", filter: def });
        setQuery("");
        setFocusIndex(0);
        return;
      }
      if (def.kind === "option") {
        setMode({ type: "option-select", filter: def });
        setQuery("");
        setFocusIndex(0);
        return;
      }
      if (def.kind === "date") {
        setMode({ type: "date-pick", filter: def });
        setQuery("");
        setFocusIndex(0);
        return;
      }
      if (def.kind === "sort") {
        // Sort uses option-select UI
        setMode({
          type: "option-select",
          filter: {
            kind: "option",
            key: def.key,
            label: def.label,
            options: [
              ...def.fields.map((f) => ({ value: `${f.value}:asc`, label: `${f.label} ↑` })),
              ...def.fields.map((f) => ({ value: `${f.value}:desc`, label: `${f.label} ↓` })),
            ],
          },
        });
        setQuery("");
        setFocusIndex(0);
        return;
      }
      if (def.kind === "group") {
        setMode({
          type: "option-select",
          filter: { kind: "option", key: def.key, label: def.label, options: def.options },
        });
        setQuery("");
        setFocusIndex(0);
        return;
      }
      return;
    }

    // Option select mode → add the filter
    if (mode.type === "option-select" && "value" in item) {
      const filterDef = mode.filter;
      // Check if this is a sort (encoded as "field:dir")
      if (filterDef.key === "sort" && typeof item.value === "string" && item.value.includes(":")) {
        const [key, dir] = item.value.split(":");
        addFilter({ kind: "sort", key: key!, value: dir as "asc" | "desc" });
      } else if (typeof item.value === "string") {
        addFilter({ kind: "option", key: filterDef.key, value: item.value });
      }
      return;
    }

    // KV input mode → use query as the value
    if (mode.type === "kv-input") {
      const val = "label" in item && item.id.startsWith("ac:")
        ? item.label
        : query;
      if (val) {
        addFilter({ kind: "kv", key: mode.filter.key, value: val });
      }
      return;
    }

    // Navigate item → go to filtered page
    if ("isNavigate" in item && item.isNavigate && activeCategory) {
      const searchParams = filtersToSearchParams(filters, query);
      // Check if different from current
      const currentParams: Record<string, string> = {};
      const searchObj = (location.search ?? {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(searchObj)) {
        if (v != null) currentParams[k] = String(v);
      }

      const currentState = searchParamsToFilters(currentParams, activeCategory);
      const nextState = { filters, query };

      if (!filtersEqual(currentState, nextState)) {
        navigate({ to: activeCategory.route, search: searchParams as never });
      }
      reset();
      return;
    }

    // Result item → navigate to detail
    if ("href" in item && item.href) {
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

  const isFilterMode = mode.type === "filter-menu";
  const isSubMode =
    mode.type === "kv-input" ||
    mode.type === "option-select" ||
    mode.type === "date-pick" ||
    mode.type === "number-input";

  // Sub-mode header text
  const subModeLabel = isSubMode
    ? mode.type === "kv-input"
      ? `${mode.filter.label} =`
      : mode.type === "option-select"
        ? mode.filter.label
        : mode.type === "date-pick"
          ? mode.filter.label
          : ""
    : "";

  return (
    <div
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
        {/* Active category + filters chips above input */}
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
                key={f.key}
                filter={f}
                category={activeCategory}
                onRemove={() => removeFilter(f.key)}
                onEdit={() => {
                  if (!activeCategory) return;
                  const def = activeCategory.filters.find((d) => d.key === f.key);
                  if (!def) return;
                  if (def.kind === "kv") {
                    setMode({ type: "kv-input", filter: def });
                    setQuery(f.kind === "kv" ? f.value : "");
                  } else if (def.kind === "option") {
                    setMode({ type: "option-select", filter: def });
                  } else if (def.kind === "date") {
                    setMode({ type: "date-pick", filter: def });
                  } else if (def.kind === "number") {
                    setMode({ type: "number-input", filter: def });
                  }
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
              {subModeLabel}
            </span>
          )}
          <MagnifyingGlassIcon className="size-4 text-base-content/40 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className={clsx(
              "flex-1 bg-transparent outline-none text-sm",
              "placeholder:text-base-content/30",
              mode.type === "option-select" && "pointer-events-none",
            )}
            placeholder={
              isFilterMode
                ? "搜索筛选器…"
                : mode.type === "kv-input"
                  ? mode.filter.placeholder ?? "输入值…"
                  : "搜索…"
            }
            value={mode.type === "option-select" ? menuItems[focusIndex]?.label ?? "" : query}
            onChange={(e) => {
              if (mode.type !== "option-select") {
                setQuery(e.target.value);
                setFocusIndex(0);
              }
            }}
            onKeyDown={handleKeyDown}
            readOnly={mode.type === "option-select"}
          />
          {/* Filter icon / X button */}
          {!isSubMode && (
            <button
              type="button"
              onClick={() => {
                if (isFilterMode) exitFilterMenu();
                else enterFilterMenu();
              }}
              className="btn btn-ghost btn-xs btn-square"
              title={isFilterMode ? "返回搜索" : "筛选器"}
            >
              {isFilterMode ? (
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
                setMode({ type: "search" });
                setQuery("");
              }}
              className="btn btn-ghost btn-xs btn-square"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-1">
          {mode.type === "date-pick" ? (
            <DatePickPanel
              filter={mode.filter}
              onConfirm={(from, to) => {
                addFilter({ kind: "date", key: mode.filter.key, from, to });
              }}
            />
          ) : (
            menuItems.map((item, i) => (
              <MenuItem
                key={item.id}
                item={item}
                focused={i === focusIndex}
                onMouseEnter={() => setFocusIndex(i)}
                onClick={() => {
                  setFocusIndex(i);
                  handleSubmit();
                }}
              />
            ))
          )}
          {menuItems.length === 0 && mode.type !== "date-pick" && (
            <div className="px-4 py-6 text-center text-xs text-base-content/40">
              无结果
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
  kind?: string;
  filterDef?: FilterDef;
  category?: CategoryDef;
  value?: string;
  detail?: Record<string, string | number | null>;
  href?: string;
  avatar?: string;
  resultType?: string;
  isNavigate?: boolean;
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  return (
    <div
      ref={ref}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors",
        focused ? "bg-primary/10 text-primary" : "hover:bg-base-200/60",
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {item.avatar && (
        <img src={item.avatar} alt="" className="size-7 rounded-full object-cover" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{item.label}</span>
          {item.kind && (
            <span className="text-[10px] text-base-content/40 shrink-0">
              {item.kind}
            </span>
          )}
        </div>
        {item.subtitle && (
          <span className="text-xs text-base-content/50 truncate block">
            {item.subtitle}
          </span>
        )}
        {item.description && (
          <span className="text-xs text-base-content/40 truncate block">
            {item.description}
          </span>
        )}
        {/* Show detail when focused */}
        {focused && item.detail && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(item.detail).map(([k, v]) =>
              v != null ? (
                <span key={k} className="text-[10px] text-base-content/50">
                  {k}: {v}
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>
      {item.isNavigate && (
        <span className="text-[10px] text-base-content/30 shrink-0">↵ 前往</span>
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
  const def = category?.filters.find((d) => d.key === filter.key);
  const label = formatFilterLabel(filter, def);
  const editable = def && (def.kind === "kv" || def.kind === "option" || def.kind === "date" || def.kind === "number");
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-2 pr-1 rounded bg-primary/10 text-primary text-[11px]">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (editable) onEdit(); }}
        className={clsx("truncate max-w-32", editable && "hover:underline cursor-pointer")}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="size-3.5 flex items-center justify-center rounded-full hover:bg-primary/20"
      >
        <XIcon className="size-2.5" weight="bold" />
      </button>
    </span>
  );
}

function formatFilterLabel(f: FilterValue, def?: FilterDef): string {
  const label = def?.label ?? f.key;
  switch (f.kind) {
    case "kv": return `${label} = ${f.value}`;
    case "option": {
      const optLabel = def?.kind === "option"
        ? def.options.find((o) => o.value === f.value)?.label ?? f.value
        : f.value;
      return `${label}: ${optLabel}`;
    }
    case "boolean": return label;
    case "number": return `${label} ${f.operator} ${f.value}`;
    case "date": return `${label}: ${f.from}~${f.to}`;
    case "sort": return `排序: ${f.value}`;
    case "group": return `分组: ${f.value}`;
  }
}

// ─── DatePickPanel ───────────────────────────────────────────────────────────

function DatePickPanel({
  filter,
  onConfirm,
}: {
  filter: { key: string; label: string; granularity: "day" | "hour" | "minute" };
  onConfirm: (from: string, to: string) => void;
}) {
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const inputType =
    filter.granularity === "day"
      ? "date"
      : filter.granularity === "hour"
        ? "datetime-local"
        : "datetime-local";

  const handleConfirm = () => {
    const from = fromRef.current?.value;
    const to = toRef.current?.value;
    if (from && to) onConfirm(from, to);
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      <div className="text-xs text-base-content/60 font-medium">{filter.label}</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-base-content/40">开始</span>
          <input
            ref={fromRef}
            type={inputType}
            className="input input-bordered input-sm w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-base-content/40">结束</span>
          <input
            ref={toRef}
            type={inputType}
            className="input input-bordered input-sm w-full"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleConfirm}
        className="btn btn-primary btn-sm self-end"
      >
        确认
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilterDescription(filters: FilterValue[], query: string): string {
  const parts: string[] = [];
  if (query) parts.push(query);
  for (const f of filters) {
    parts.push(formatFilterLabel(f));
  }
  return parts.length > 0 ? `[${parts.join(", ")}]` : "";
}
