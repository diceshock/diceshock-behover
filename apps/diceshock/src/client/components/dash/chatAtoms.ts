import type { Message } from "ai";
import { atom } from "jotai";

export const chatPanelOpenAtom = atom(false);

export const mobileChatSheetOpenAtom = atom(false);

/**
 * Pending search string set by AI chip click.
 * Dash pages watch this atom and navigate to apply the search.
 */
export const pendingSearchAtom = atom<string | null>(null);

/**
 * Persistent message store that survives route changes within a session.
 * Synced from useChat's `messages` in ChatPanel.
 * Capped at 100 messages (oldest trimmed).
 */
export const chatMessagesAtom = atom<Message[]>([]);

/**
 * Chat context that updates with current dash route and active filters.
 */
export const chatContextAtom = atom<{
  page: string;
  filters?: Record<string, unknown>;
}>({
  page: "",
});
