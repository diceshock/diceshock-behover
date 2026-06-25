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

type ReplyState =
  | "idle"
  | "waiting"
  | "querying"
  | "thinking"
  | "replying"
  | "done";

const STATUS_LABELS: Record<Exclude<ReplyState, "idle" | "done">, string> = {
  waiting: "等待中",
  querying: "正在查询",
  thinking: "正在思考",
  replying: "正在回复",
};

function deriveReplyState(messages: Message[], isLoading: boolean): ReplyState {
  if (!isLoading) return "idle";
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return "waiting";
  if (lastMsg.role === "user") return "waiting";
  if (lastMsg.role === "assistant") {
    const pending = lastMsg.toolInvocations?.filter(
      (t) => t.state === "call" || t.state === "partial-call",
    );
    if (pending?.length) return "querying";
    if (lastMsg.toolInvocations?.length && !lastMsg.content) return "thinking";
    return "replying";
  }
  return "waiting";
}

export default function ChatMessages({
  messages,
  isLoading,
  error,
  onRetry,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyState = deriveReplyState(messages, isLoading);

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
            <div key={message.id} className="space-y-2">
              {message.content && (
                <div className="prose prose-sm max-w-none text-base-content [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {message.content}
                  </Markdown>
                </div>
              )}
              {message.toolInvocations?.map((invocation) => (
                <ToolResultRenderer
                  key={invocation.toolCallId}
                  toolInvocation={invocation}
                />
              ))}
            </div>
          );
        }

        return null;
      })}

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

      {replyState !== "idle" && replyState !== "done" && (
        <div className="flex items-center gap-2 text-xs text-base-content/50 py-1">
          <span className="loading loading-spinner loading-xs" />
          <span>{STATUS_LABELS[replyState]}</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
