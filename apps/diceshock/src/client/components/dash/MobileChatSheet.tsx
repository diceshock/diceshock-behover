import { useChat } from "@ai-sdk/react";
import { ChatCircleIcon, XIcon } from "@phosphor-icons/react";
import { useMatches } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import { mobileChatSheetOpenAtom } from "./chatAtoms";

export default function MobileChatSheet() {
  const [isOpen, setIsOpen] = useAtom(mobileChatSheetOpenAtom);
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
  });

  return (
    <div className="lg:hidden">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-5 z-50 btn btn-circle btn-primary shadow-lg"
        >
          <ChatCircleIcon className="size-6" weight="fill" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-base-200 rounded-t-2xl flex flex-col"
              style={{ height: "70vh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-base-content/20" />
              </div>

              <div className="flex items-center justify-between px-4 py-1 border-b border-base-content/10">
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
