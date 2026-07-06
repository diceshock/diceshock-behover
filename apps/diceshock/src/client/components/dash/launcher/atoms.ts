import { produce } from "immer";
import { atom } from "jotai";
import type {
  FieldDef,
  FilterOperator,
  FilterValue,
  LauncherMode,
  SearchResultItem,
} from "./types";

// ─── Launcher state shape ────────────────────────────────────────────────────

export type LauncherOrigin = "search" | "header";

export interface LauncherFormState {
  open: boolean;
  mode: LauncherMode;
  categoryId: string | null;
  query: string;
  filters: FilterValue[];
  focusIndex: number;
  results: SearchResultItem[];
  /** How the launcher was opened: "search" = from search mode, "header" = from table header click */
  origin: LauncherOrigin;
}

const INITIAL_STATE: LauncherFormState = {
  open: false,
  mode: { type: "search" },
  categoryId: null,
  query: "",
  filters: [],
  focusIndex: 0,
  results: [],
  origin: "search",
};

// ─── Single source of truth ──────────────────────────────────────────────────

export const launcherAtom = atom<LauncherFormState>(INITIAL_STATE);


// ─── Derived read-only atoms ─────────────────────────────────────────────────

export const launcherOpenAtom = atom((get) => get(launcherAtom).open);
export const launcherModeAtom = atom((get) => get(launcherAtom).mode);
export const launcherQueryAtom = atom((get) => get(launcherAtom).query);
export const launcherCategoryAtom = atom((get) => get(launcherAtom).categoryId);
export const launcherFiltersAtom = atom((get) => get(launcherAtom).filters);
export const launcherFocusIndexAtom = atom(
  (get) => get(launcherAtom).focusIndex,
);
export const launcherResultsAtom = atom((get) => get(launcherAtom).results);

// ─── Update helper ───────────────────────────────────────────────────────────

export const launcherUpdateAtom = atom(
  null,
  (get, set, recipe: (draft: LauncherFormState) => void) => {
    set(launcherAtom, produce(get(launcherAtom), recipe));
  },
);

// ─── Action atoms ────────────────────────────────────────────────────────────

/** Reset launcher to initial state */
export const launcherResetAtom = atom(null, (_get, set) => {
  set(launcherAtom, INITIAL_STATE);
});

/**
 * Open launcher, hydrating from URL search params.
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
        d.origin = "search";
        d.mode = { type: "search" };
        d.filters = payload.filters;
        d.query = payload.query;
        d.categoryId = payload.categoryId;
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
    const current = get(launcherAtom);
    if (current.open) {
      set(launcherAtom, INITIAL_STATE);
    } else {
      set(
        launcherAtom,
        produce(INITIAL_STATE, (d) => {
          d.open = true;
          if (payload) {
            d.filters = payload.filters;
            d.query = payload.query;
            d.categoryId = payload.categoryId;
          }
        }),
      );
    }
  },
);

/** Enter field-select mode (筛选器列表) */
export const launcherEnterFieldSelectAtom = atom(null, (get, set) => {
  set(
    launcherAtom,
    produce(get(launcherAtom), (d) => {
      d.mode = { type: "field-select" };
      d.query = "";
      d.focusIndex = 0;
    }),
  );
});

/** Exit back to search mode */
export const launcherExitToSearchAtom = atom(null, (get, set) => {
  set(
    launcherAtom,
    produce(get(launcherAtom), (d) => {
      d.mode = { type: "search" };
      d.query = "";
      d.focusIndex = 0;
    }),
  );
});

/** Add a filter value, replacing existing with same key+operator type */
export const launcherAddFilterAtom = atom(
  null,
  (get, set, filter: FilterValue) => {
    set(
      launcherAtom,
      produce(get(launcherAtom), (d) => {
        // For sort, replace any existing sort filter
        if (
          filter.operator === "sort_asc" ||
          filter.operator === "sort_desc"
        ) {
          d.filters = d.filters.filter(
            (f) => f.operator !== "sort_asc" && f.operator !== "sort_desc",
          );
        } else {
          // Replace same key filter
          d.filters = d.filters.filter((f) => f.key !== filter.key);
        }
        d.filters.push(filter);
        // Return to search mode
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

/**
 * Open launcher directly at operator-select for a specific field.
 * Used by table header clicks.
 */
export const launcherOpenForFieldAtom = atom(
  null,
  (
    get,
    set,
    payload: {
      field: FieldDef;
      filters: FilterValue[];
      query: string;
      categoryId: string;
    },
  ) => {
    set(
      launcherAtom,
      produce(get(launcherAtom), (d) => {
        d.open = true;
        d.origin = "header";
        d.categoryId = payload.categoryId;
        d.filters = payload.filters;
        d.query = "";
        d.mode = { type: "operator-select", field: payload.field };
        d.focusIndex = 0;
      }),
    );
  },
);
