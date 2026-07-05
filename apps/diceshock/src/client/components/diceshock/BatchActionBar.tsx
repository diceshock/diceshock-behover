import { XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";

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
  unit,
}: BatchActionBarProps) {
  const { t } = useTranslation();

  if (count === 0) return null;

  const selectedUnit = unit ?? t("dashBatch.defaultUnit");

  return (
    <div className="sticky bottom-0 z-30 border-t border-base-content/10 backdrop-blur-md bg-base-100/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 py-3 w-full min-w-full">
      <div className="flex items-center gap-2 w-full">
        <span className="text-sm font-semibold shrink-0 mr-1">
          {formatMessage(t("dashBatch.selectedCount"), {
            count,
            unit: selectedUnit,
          })}
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
          className="btn btn-sm btn-ghost btn-square ml-auto shrink-0"
          onClick={onClear}
          title={t("dashBatch.clearSelection")}
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
