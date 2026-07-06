import { CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";

interface IdCellProps {
  /** Full ID value */
  value: string;
  /** Number of leading characters to display (default: 5) */
  truncate?: number;
  /** Fallback when value is empty */
  fallback?: string;
}

/**
 * Compact ID cell: shows first N chars with tooltip (full value on hover)
 * and a copy button.
 */
export function IdCell({
  value,
  truncate = 5,
  fallback = "—",
}: IdCellProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  if (!value) {
    return <span className="text-base-content/40">{fallback}</span>;
  }

  return (
    <div className="relative group flex items-center gap-1">
      <span className="font-mono text-xs cursor-default">
        {value.slice(0, truncate)}
      </span>
      <button
        type="button"
        className="btn btn-xs btn-ghost btn-square shrink-0"
        onClick={handleCopy}
        title={copied ? "✓" : value}
      >
        <CopyIcon className="size-3.5" />
      </button>
      {/* Tooltip on hover */}
      <div className="absolute left-0 top-full z-30 hidden group-hover:block pt-1">
        <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
          {value}
        </div>
      </div>
    </div>
  );
}
