import {
  CheckIcon,
  CopyIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ToolInvocation } from "ai";
import clsx from "clsx";
import { useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { useChatMutation } from "@/client/hooks/useChatMutation";
import { pendingSearchAtom } from "./chatAtoms";

type ToolResultRendererProps = {
  toolInvocation: ToolInvocation;
};

function isToolResult(
  invocation: ToolInvocation,
): invocation is ToolInvocation & { state: "result"; result: unknown } {
  return invocation.state === "result";
}

function GqlQueryCard({
  result,
  args,
}: {
  result: unknown;
  args?: { query?: string; variables?: Record<string, unknown> };
}) {
  const [queryExpanded, setQueryExpanded] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(true);
  const [currentResult, setCurrentResult] = useState(result);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!args?.query) return;
    setRefreshing(true);
    try {
      const response = await fetch("/graphql", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: args.query, variables: args.variables }),
      });
      setCurrentResult(await response.json());
    } finally {
      setRefreshing(false);
    }
  }, [args?.query, args?.variables]);

  return (
    <div className="rounded-lg border border-base-content/10 bg-base-100 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-base-content/70">
          查询结果
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={!args?.query || refreshing}
            onClick={refresh}
          >
            {refreshing ? (
              <span className="loading loading-spinner loading-xs" />
            ) : null}
            刷新
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setResultExpanded(!resultExpanded)}
          >
            {resultExpanded ? "收起" : "展开"}
          </button>
        </div>
      </div>
      {args?.query && (
        <div className="mt-2">
          <button
            type="button"
            className="btn btn-ghost btn-xs px-0"
            onClick={() => setQueryExpanded(!queryExpanded)}
          >
            {queryExpanded ? "隐藏 GraphQL" : "查看 GraphQL"}
          </button>
          {queryExpanded && (
            <pre className="mt-1 text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
              {args.query}
            </pre>
          )}
        </div>
      )}
      {resultExpanded && (
        <pre className="mt-2 text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(currentResult, null, 2)}
        </pre>
      )}
    </div>
  );
}

function MutationConfirmCard({
  result,
}: {
  result: {
    mutationId: string;
    query: string;
    variables: object;
    description: string;
  };
}) {
  const [status, setStatus] = useState<
    "pending" | "confirming" | "confirmed" | "rejected" | "expired" | "error"
  >("pending");
  const [executionResult, setExecutionResult] = useState<unknown>(null);
  const { refreshAfterConfirm } = useChatMutation();

  const handleConfirm = useCallback(async () => {
    setStatus("confirming");
    try {
      const outcome = await refreshAfterConfirm(result.mutationId);
      if (outcome.success) {
        setExecutionResult(outcome.body);
        setStatus("confirmed");
      } else if (outcome.reason === "expired") {
        setStatus("expired");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [result.mutationId, refreshAfterConfirm]);

  const handleReject = useCallback(() => {
    setStatus("rejected");
  }, []);

  return (
    <div className="rounded-lg border border-warning/30 bg-base-100 p-3">
      <p className="text-sm font-medium">{result.description}</p>
      <pre className="mt-2 text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
        {result.query}
      </pre>

      {status === "pending" && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={handleConfirm}
          >
            <CheckIcon className="size-4" />
            执行
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleReject}
          >
            取消
          </button>
        </div>
      )}

      {status === "confirming" && (
        <div className="mt-3">
          <span className="loading loading-spinner loading-sm" />
        </div>
      )}

      {status === "confirmed" && (
        <div className="badge badge-success mt-3 gap-1">
          <CheckIcon className="size-3" weight="bold" />
          已执行
        </div>
      )}

      {status === "confirmed" && (
        <div className="mt-3 space-y-2">
          <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
            {JSON.stringify(executionResult, null, 2)}
          </pre>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={handleConfirm}
          >
            刷新
          </button>
        </div>
      )}

      {status === "rejected" && (
        <div className="badge badge-ghost mt-3 gap-1">
          <XIcon className="size-3" weight="bold" />
          已取消
        </div>
      )}

      {status === "expired" && (
        <div className="badge badge-warning mt-3">已过期</div>
      )}

      {status === "error" && (
        <div className="badge badge-error mt-3">执行失败</div>
      )}
    </div>
  );
}

function SearchQueryChip({ result }: { result: string }) {
  const setPendingSearch = useSetAtom(pendingSearchAtom);

  const handleClick = useCallback(() => {
    setPendingSearch(result);
  }, [result, setPendingSearch]);

  return (
    <button
      type="button"
      className="badge badge-primary cursor-pointer gap-1 hover:badge-secondary transition-colors"
      onClick={handleClick}
    >
      <MagnifyingGlassIcon className="size-3" />
      {result}
    </button>
  );
}

function TotpDisplay({
  result,
}: {
  result: { code: string; remaining_seconds: number };
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result.code]);

  return (
    <div className="rounded-lg border border-base-content/10 bg-base-100 p-3 flex items-center gap-3">
      <span className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
        {result.code}
      </span>
      <button
        type="button"
        className={clsx("btn btn-ghost btn-sm btn-square")}
        onClick={copyCode}
      >
        {copied ? (
          <CheckIcon className="size-4 text-success" />
        ) : (
          <CopyIcon className="size-4" />
        )}
      </button>
      <span className="text-xs text-base-content/50">
        {result.remaining_seconds}s
      </span>
    </div>
  );
}

function SearchRulesCard({ result }: { result: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const data = result as { results?: Array<{ text: string; source: string }> };

  if (!data?.results?.length) {
    return <div className="text-xs text-base-content/50">未找到相关规则</div>;
  }

  return (
    <div className="rounded-lg border border-base-content/10 bg-base-100 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-base-content/70">
          规则搜索 ({data.results.length} 条)
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起" : "展开"}
        </button>
      </div>
      {expanded &&
        data.results.map((chunk, i) => (
          <div
            key={`${chunk.source}-${i}`}
            className="mt-2 text-xs bg-base-200 p-2 rounded"
          >
            <p className="text-base-content/50 mb-1">{chunk.source}</p>
            <p className="whitespace-pre-wrap">{chunk.text}</p>
          </div>
        ))}
    </div>
  );
}

export default function ToolResultRenderer({
  toolInvocation,
}: ToolResultRendererProps) {
  if (!isToolResult(toolInvocation)) {
    return (
      <div className="flex items-center gap-2 text-xs text-base-content/50 py-1">
        <span className="loading loading-spinner loading-xs" />
        {toolInvocation.toolName}
      </div>
    );
  }

  const { toolName, result } = toolInvocation;
  const args = (toolInvocation as { args?: unknown }).args;

  switch (toolName) {
    case "query_gql":
      return (
        <GqlQueryCard
          result={result}
          args={args as { query?: string; variables?: Record<string, unknown> }}
        />
      );

    case "mutate_gql":
      return (
        <MutationConfirmCard
          result={
            result as {
              mutationId: string;
              query: string;
              variables: object;
              description: string;
            }
          }
        />
      );

    case "format_search_query":
      return <SearchQueryChip result={result as string} />;

    case "generate_totp": {
      const totpResult = result as {
        code?: string;
        remaining_seconds?: number;
        error?: string;
      };
      if (totpResult.error) {
        return <div className="text-xs text-error">{totpResult.error}</div>;
      }
      if (totpResult.code) {
        return (
          <TotpDisplay
            result={{
              code: totpResult.code,
              remaining_seconds: totpResult.remaining_seconds ?? 30,
            }}
          />
        );
      }
      return null;
    }

    case "search_rules":
      return <SearchRulesCard result={result} />;

    default:
      return (
        <div className="text-xs text-base-content/50 bg-base-200 p-2 rounded">
          <pre className="overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
  }
}
