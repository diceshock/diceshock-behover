import { atom } from "jotai";
import type { FilterValue, LauncherMode, SearchResultItem } from "./types";

// ─── Core launcher state atoms ───────────────────────────────────────────────

export const launcherOpenAtom = atom(false);
export const launcherModeAtom = atom<LauncherMode>({ type: "search" });
export const launcherQueryAtom = atom("");
export const launcherCategoryAtom = atom<string | null>(null);
export const launcherFiltersAtom = atom<FilterValue[]>([]);
export const launcherFocusIndexAtom = atom(0);

/** SSE-fed search results pool */
export const launcherResultsAtom = atom<SearchResultItem[]>([]);

// ─── Derived atoms ───────────────────────────────────────────────────────────

/** Reset launcher to initial state */
export const launcherResetAtom = atom(null, (_get, set) => {
  set(launcherOpenAtom, false);
  set(launcherModeAtom, { type: "search" });
  set(launcherQueryAtom, "");
  set(launcherFiltersAtom, []);
  set(launcherFocusIndexAtom, 0);
  set(launcherResultsAtom, []);
});

/** Open launcher preserving current category context */
export const launcherToggleAtom = atom(null, (get, set) => {
  const isOpen = get(launcherOpenAtom);
  if (isOpen) {
    set(launcherOpenAtom, false);
  } else {
    set(launcherOpenAtom, true);
    set(launcherModeAtom, { type: "search" });
    set(launcherQueryAtom, "");
    set(launcherFocusIndexAtom, 0);
  }
});

/** Switch to filter-menu mode (click on filter icon) */
export const launcherEnterFilterMenuAtom = atom(null, (_get, set) => {
  set(launcherModeAtom, { type: "filter-menu" });
  set(launcherQueryAtom, "");
  set(launcherFocusIndexAtom, 0);
});

/** Exit filter-menu back to search mode (click x) */
export const launcherExitFilterMenuAtom = atom(null, (_get, set) => {
  set(launcherModeAtom, { type: "search" });
  set(launcherQueryAtom, "");
  set(launcherFocusIndexAtom, 0);
});

/** Add a filter value, replacing existing with same key */
export const launcherAddFilterAtom = atom(
  null,
  (get, set, filter: FilterValue) => {
    const current = get(launcherFiltersAtom);
    const next = current.filter((f) => f.key !== filter.key);
    next.push(filter);
    // Sort by kind priority: sort > group > date > option > kv > boolean (large to small)
    const priority: Record<string, number> = {
      sort: 0,
      group: 1,
      date: 2,
      number: 3,
      option: 4,
      kv: 5,
      boolean: 6,
    };
    next.sort((a, b) => (priority[a.kind] ?? 99) - (priority[b.kind] ?? 99));
    set(launcherFiltersAtom, next);
    // Return to search mode after adding
    set(launcherModeAtom, { type: "search" });
    set(launcherQueryAtom, "");
    set(launcherFocusIndexAtom, 0);
  },
);

/** Remove a filter by key */
export const launcherRemoveFilterAtom = atom(
  null,
  (get, set, key: string) => {
    const current = get(launcherFiltersAtom);
    set(
      launcherFiltersAtom,
      current.filter((f) => f.key !== key),
    );
  },
);
