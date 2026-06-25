import { useChat } from "@ai-sdk/react";
import { ChatCircleIcon, MinusIcon } from "@phosphor-icons/react";
import { useMatches } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
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
    <div className="hidden lg:block fixed top-0 right-0 h-full z-40">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="collapsed"
            type="button"
            onClick={() => setIsOpen(true)}
            className={clsx(
              "h-full w-12 flex flex-col items-center justify-center",
              "bg-base-200 border-l border-base-content/10",
              "hover:bg-base-300 transition-colors cursor-pointer",
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChatCircleIcon className="size-5 text-base-content/60" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            className={clsx(
              "h-full w-80 flex flex-col",
              "bg-base-200 border-l border-base-content/10",
            )}
            initial={{ width: 48, opacity: 0.8 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 48, opacity: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-base-content/10">
              <span className="text-sm font-medium">AI 助手</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                onClick={() => setIsOpen(false)}
              >
                <MinusIcon className="size-4" />
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
