import { CheckIcon, PlayIcon, RobotIcon, XIcon } from "@phosphor-icons/react";
import type { Message } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
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

type ReplyState = "idle" | "waiting" | "querying" | "thinking" | "replying";

const STATUS_LABELS: Record<Exclude<ReplyState, "idle">, string> = {
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

function GqlQueryBlock({ query }: { query: string }) {
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [queryVisible, setQueryVisible] = useState(false);
  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) return;
    executed.current = true;
    fetch("/graphql", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((r) => r.json())
      .then((data) => {
        setResult(data);
        setLoading(false);
        setTimeout(() => setExpanded(false), 2000);
      })
      .catch((err) => {
        setResult({ errors: [String(err)] });
        setLoading(false);
      });
  }, [query]);

  return (
    <div className="rounded-lg border border-base-content/10 bg-base-100 p-3 my-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-base-content/70">
          {loading ? "查询中..." : "查询结果"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setQueryVisible(!queryVisible)}
          >
            {queryVisible ? "隐藏 GraphQL" : "查看 GraphQL"}
          </button>
          {!loading && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "收起" : "展开"}
            </button>
          )}
        </div>
      </div>
      {queryVisible && (
        <pre className="mt-2 text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
          {query}
        </pre>
      )}
      {loading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-base-content/50">
          <span className="loading loading-spinner loading-xs" />
          <span>执行中</span>
        </div>
      )}
      {!loading && expanded && (
        <pre className="mt-2 text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function GqlMutationBlock({ query }: { query: string }) {
  const [status, setStatus] = useState<
    "pending" | "executing" | "done" | "skipped" | "error"
  >("pending");
  const [result, setResult] = useState<unknown>(null);
  const [queryVisible, setQueryVisible] = useState(false);

  const handleExecute = useCallback(async () => {
    setStatus("executing");
    try {
      const response = await fetch("/graphql", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await response.json()) as {
        errors?: unknown[];
      };
      setResult(data);
      setStatus(data.errors?.length ? "error" : "done");
    } catch (err) {
      setResult({ errors: [String(err)] });
      setStatus("error");
    }
  }, [query]);

  const handleSkip = useCallback(() => {
    setStatus("skipped");
  }, []);

  return (
    <div className="rounded-lg border border-warning/30 bg-base-100 p-3 my-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-warning">变更操作</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => setQueryVisible(!queryVisible)}
        >
          {queryVisible ? "隐藏" : "查看 GraphQL"}
        </button>
      </div>
      {queryVisible && (
        <pre className="mt-2 text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
          {query}
        </pre>
      )}

      {status === "pending" && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="btn btn-success btn-sm gap-1"
            onClick={handleExecute}
          >
            <PlayIcon className="size-4" weight="fill" />
            执行
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1"
            onClick={handleSkip}
          >
            <XIcon className="size-4" />
            跳过
          </button>
        </div>
      )}

      {status === "executing" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-base-content/50">
          <span className="loading loading-spinner loading-xs" />
          <span>执行中</span>
        </div>
      )}

      {status === "done" && (
        <div className="mt-3 space-y-2">
          <div className="badge badge-success gap-1">
            <CheckIcon className="size-3" weight="bold" />
            已执行
          </div>
          <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {status === "skipped" && (
        <div className="badge badge-ghost mt-3 gap-1">
          <XIcon className="size-3" weight="bold" />
          已跳过
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 space-y-2">
          <div className="badge badge-error">执行失败</div>
          <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const markdownComponents = {
  pre({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  },
  code({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) {
    const match = className?.match(/language-(\S+)/);
    const lang = match?.[1];
    const code = String(children ?? "").replace(/\n$/, "");

    if (lang === "graphql") {
      return <GqlQueryBlock query={code} />;
    }
    if (lang === "graphql-mutation") {
      return <GqlMutationBlock query={code} />;
    }

    if (lang) {
      return (
        <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto my-2">
          <code>{code}</code>
        </pre>
      );
    }

    return (
      <code className="bg-base-200 px-1 py-0.5 rounded text-xs">{code}</code>
    );
  },
};

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
                    components={markdownComponents}
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

      {replyState !== "idle" && (
        <div className="flex items-center gap-2 text-xs text-base-content/50 py-1">
          <span className="loading loading-spinner loading-xs" />
          <span>{STATUS_LABELS[replyState]}</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
