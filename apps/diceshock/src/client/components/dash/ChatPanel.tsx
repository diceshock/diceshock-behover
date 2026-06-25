import { useChat } from "@ai-sdk/react";
import { XIcon } from "@phosphor-icons/react";
import { useMatches } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import {
  chatContextAtom,
  chatMessagesAtom,
  chatPanelOpenAtom,
} from "./chatAtoms";

const MAX_MESSAGES = 100;

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useAtom(chatPanelOpenAtom);
  const [persistedMessages, setPersistedMessages] = useAtom(chatMessagesAtom);
  const setContext = useSetAtom(chatContextAtom);
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.pathname ?? "";

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
  } = useChat({
    api: "/api/chat/stream",
    body: { context: { page: currentPath } },
    credentials: "include",
    initialMessages: persistedMessages,
  });

  useEffect(() => {
    setContext({ page: currentPath });
  }, [currentPath, setContext]);

  useEffect(() => {
    if (messages.length > 0) {
      const capped = messages.slice(-MAX_MESSAGES);
      setPersistedMessages(capped);
    }
  }, [messages, setPersistedMessages]);

  return (
    <aside
      className={clsx(
        "hidden lg:flex fixed top-0 right-0 h-full z-40",
        "flex-col bg-base-200 border-l border-base-content/10",
        "transition-[width] duration-200 overflow-hidden",
        isOpen ? "w-80" : "w-0",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-base-content/10 shrink-0">
        <span className="text-sm font-medium">AI 助手</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => setIsOpen(false)}
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={reload}
      />

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </aside>
  );
}
