import { produce } from "immer";
import { atom } from "jotai";
import type { FilterValue, LauncherMode, SearchResultItem } from "./types";

// ─── Launcher state shape ────────────────────────────────────────────────────

export interface LauncherFormState {
  open: boolean;
  mode: LauncherMode;
  query: string;
  categoryId: string | null;
  filters: FilterValue[];
  focusIndex: number;
  results: SearchResultItem[];
}

const INITIAL_STATE: LauncherFormState = {
  open: false,
  mode: { type: "search" },
  query: "",
  categoryId: null,
  filters: [],
  focusIndex: 0,
  results: [],
};

// ─── Single source of truth ──────────────────────────────────────────────────

export const launcherAtom = atom<LauncherFormState>(INITIAL_STATE);

// ─── Derived read-only atoms (for consumers that only need a slice) ──────────

export const launcherOpenAtom = atom((get) => get(launcherAtom).open);
export const launcherModeAtom = atom((get) => get(launcherAtom).mode);
export const launcherQueryAtom = atom((get) => get(launcherAtom).query);
export const launcherCategoryAtom = atom((get) => get(launcherAtom).categoryId);
export const launcherFiltersAtom = atom((get) => get(launcherAtom).filters);
export const launcherFocusIndexAtom = atom((get) => get(launcherAtom).focusIndex);
export const launcherResultsAtom = atom((get) => get(launcherAtom).results);

// ─── Update helper: produce-based write atom ─────────────────────────────────

/** Mutate launcher state with an immer recipe */
export const launcherUpdateAtom = atom(
  null,
  (get, set, recipe: (draft: LauncherFormState) => void) => {
    set(launcherAtom, produce(get(launcherAtom), recipe));
  },
);

// ─── Action atoms ────────────────────────────────────────────────────────────

const FILTER_PRIORITY: Record<string, number> = {
  sort: 0,
  group: 1,
  date: 2,
  number: 3,
  option: 4,
  kv: 5,
  boolean: 6,
};

/** Reset launcher to initial state */
export const launcherResetAtom = atom(null, (_get, set) => {
  set(launcherAtom, INITIAL_STATE);
});

/**
 * Open launcher, hydrating form state from URL search params.
 * Called by DashHeader trigger button with current route filters.
 */
export const launcherOpenWithFiltersAtom = atom(
  null,
  (
    get,
    set,
    payload: {
      filters: FilterValue[];
      query: string;
      categoryId: string | null;
    },
  ) => {
    set(
      launcherAtom,
      produce(get(launcherAtom), (d) => {
        d.open = true;
        d.mode = { type: "search" };
        d.query = payload.query;
        d.categoryId = payload.categoryId;
        d.filters = payload.filters;
        d.focusIndex = 0;
      }),
    );
  },
);

/** Toggle launcher open/closed. When opening, hydrates from provided params. */
export const launcherToggleAtom = atom(
  null,
  (
    get,
    set,
    payload?: {
      filters: FilterValue[];
      query: string;
      categoryId: string | null;
    },
  ) => {
    const state = get(launcherAtom);
    if (state.open) {
      set(launcherAtom, INITIAL_STATE);
    } else if (payload) {
      set(
        launcherAtom,
        produce(INITIAL_STATE, (d) => {
          d.open = true;
          d.query = payload.query;
          d.categoryId = payload.categoryId;
          d.filters = payload.filters;
        }),
      );
    } else {
      set(
        launcherAtom,
        produce(INITIAL_STATE, (d) => {
          d.open = true;
        }),
      );
    }
  },
);

/** Switch to filter-menu mode */
export const launcherEnterFilterMenuAtom = atom(null, (get, set) => {
  set(
    launcherAtom,
    produce(get(launcherAtom), (d) => {
      d.mode = { type: "filter-menu" };
      d.query = "";
      d.focusIndex = 0;
    }),
  );
});

/** Exit filter-menu back to search mode */
export const launcherExitFilterMenuAtom = atom(null, (get, set) => {
  set(
    launcherAtom,
    produce(get(launcherAtom), (d) => {
      d.mode = { type: "search" };
      d.query = "";
      d.focusIndex = 0;
    }),
  );
});

/** Add a filter value, replacing existing with same key */
export const launcherAddFilterAtom = atom(
  null,
  (get, set, filter: FilterValue) => {
    set(
      launcherAtom,
      produce(get(launcherAtom), (d) => {
        d.filters = d.filters.filter((f) => f.key !== filter.key);
        d.filters.push(filter);
        d.filters.sort(
          (a, b) =>
            (FILTER_PRIORITY[a.kind] ?? 99) - (FILTER_PRIORITY[b.kind] ?? 99),
        );
        d.mode = { type: "search" };
        d.query = "";
        d.focusIndex = 0;
      }),
    );
  },
);

/** Remove a filter by key */
export const launcherRemoveFilterAtom = atom(
  null,
  (get, set, key: string) => {
    set(
      launcherAtom,
      produce(get(launcherAtom), (d) => {
        d.filters = d.filters.filter((f) => f.key !== key);
      }),
    );
  },
);
