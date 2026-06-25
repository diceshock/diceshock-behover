import { atom } from "jotai";

export const chatPanelOpenAtom = atom(false);

export const chatPanelWidthAtom = atom(320);

export const currentSessionIdAtom = atom<string | null>(null);

export const mobileChatSheetOpenAtom = atom(false);

/**
 * Pending search string set by AI chip click.
 * Dash pages watch this atom and navigate to apply the search.
 */
export const pendingSearchAtom = atom<string | null>(null);

/**
 * Chat context that updates with current dash route and active filters.
 */
export const chatContextAtom = atom<{
  page: string;
  filters?: Record<string, unknown>;
}>({
  page: "",
});

export const selectedTableDataAtom = atom<{
  count: number;
  entityType: string;
  rows: object[];
}>({
  count: 0,
  entityType: "",
  rows: [],
});

export const selectionClearSignalAtom = atom(0);
