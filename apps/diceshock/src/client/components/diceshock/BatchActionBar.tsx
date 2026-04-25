import { XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import type { ReactNode } from "react";

export interface BatchAction {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface BatchActionBarProps {
  count: number;
  actions: BatchAction[];
  onClear: () => void;
  unit?: string;
}

export default function BatchActionBar({
  count,
  actions,
  onClear,
  unit = "项",
}: BatchActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-base-content/10 backdrop-blur-md bg-base-100/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold shrink-0 mr-1">
          已选择 {count} {unit}
        </span>
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            className={clsx("btn btn-sm", a.className)}
            disabled={a.disabled}
            onClick={a.onClick}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-square"
          onClick={onClear}
          title="取消选择"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
