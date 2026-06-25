import { RobotIcon } from "@phosphor-icons/react";
import type { Message } from "ai";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import ToolResultRenderer from "./ToolResultRenderer";

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  error?: Error;
  onRetry?: () => void;
};

export default function ChatMessages({
  messages,
  isLoading,
  error,
  onRetry,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-base-content/40">
          <RobotIcon className="size-10 mx-auto mb-2" weight="thin" />
          <p className="text-sm">有什么可以帮你的?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <div key={message.id} className="chat chat-end">
              <div className="chat-bubble chat-bubble-primary text-sm whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          );
        }

        if (message.role === "assistant") {
          return (
            <div key={message.id} className="chat chat-start">
              <div className="chat-image avatar">
                <div className="size-7 rounded-full bg-base-300 flex items-center justify-center">
                  <RobotIcon className="size-4 text-base-content/70" />
                </div>
              </div>
              <div className="chat-bubble bg-base-300 text-base-content text-sm">
                {message.content && (
                  <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {message.content}
                    </Markdown>
                  </div>
                )}
                {message.toolInvocations?.map((invocation) => (
                  <div key={invocation.toolCallId} className="mt-2">
                    <ToolResultRenderer toolInvocation={invocation} />
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return null;
      })}

      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="chat chat-start">
          <div className="chat-image avatar">
            <div className="size-7 rounded-full bg-base-300 flex items-center justify-center">
              <RobotIcon className="size-4 text-base-content/70" />
            </div>
          </div>
          <div className="chat-bubble bg-base-300 text-base-content">
            <span className="loading loading-dots loading-sm" />
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-3">
          <p className="text-xs text-error">{error.message}</p>
          {onRetry && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={onRetry}
            >
              重试
            </button>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
