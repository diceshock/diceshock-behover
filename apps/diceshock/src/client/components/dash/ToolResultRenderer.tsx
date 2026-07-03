import {
  CheckIcon,
  CopyIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import type { ToolInvocation } from "ai";
import { useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { pendingSearchAtom } from "./chatAtoms";

type ToolResultRendererProps = {
  toolInvocation: ToolInvocation;
};

function isToolResult(
  invocation: ToolInvocation,
): invocation is ToolInvocation & { state: "result"; result: unknown } {
  return invocation.state === "result";
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
        className="btn btn-ghost btn-sm btn-square"
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
  const data = result as {
    results?: Array<{
      text: string;
      source: string;
      originalUrl?: string | null;
    }>;
  };

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
            <div className="flex items-center justify-between mb-1">
              <p className="text-base-content/50">{chunk.source}</p>
              {chunk.originalUrl && (
                <a
                  href={`/rules?url=${encodeURIComponent(chunk.originalUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-[10px] hover:underline"
                >
                  查看原文 ↗
                </a>
              )}
            </div>
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
