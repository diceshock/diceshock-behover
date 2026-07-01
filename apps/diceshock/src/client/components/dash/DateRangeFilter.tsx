import { CalendarBlankIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";

export interface DateRangeFilterProps {
  /** Current date range from parsed search (e.g. filter.value) */
  value?: { from?: string; to?: string };
  /** Called with the new range; undefined to clear */
  onChange: (range: { from?: string; to?: string } | undefined) => void;
  /** Placeholder label when no range selected */
  label?: string;
}

const PRESETS = [
  { key: "today", days: 0 },
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
] as const;

export function DateRangeFilter({
  value,
  onChange,
  label,
}: DateRangeFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasValue = value?.from || value?.to;

  const handlePreset = useCallback(
    (days: number) => {
      const to = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");
      const from =
        days === 0
          ? to
          : dayjs().tz("Asia/Shanghai").subtract(days, "day").format("YYYY-MM-DD");
      onChange({ from, to });
      setOpen(false);
    },
    [onChange],
  );

  const handleApply = useCallback(() => {
    const from = fromRef.current?.value || undefined;
    const to = toRef.current?.value || undefined;
    if (from || to) {
      onChange({ from, to });
    }
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(undefined);
      setOpen(false);
    },
    [onChange],
  );

  const displayText = hasValue
    ? [value?.from, value?.to].filter(Boolean).join(" ~ ")
    : (label ?? t("dashDateFilter.selectRange") ?? "日期范围");

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`btn btn-xs gap-1 ${hasValue ? "btn-primary" : "btn-ghost"}`}
        onClick={() => setOpen(!open)}
      >
        <CalendarBlankIcon className="size-3.5" />
        <span className="max-w-32 truncate">{displayText}</span>
        {hasValue && (
          <span
            role="button"
            tabIndex={0}
            className="hover:bg-primary-content/20 rounded-full p-0.5"
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleClear(e as unknown as React.MouseEvent);
            }}
          >
            <XIcon className="size-3" />
          </span>
        )}
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            onKeyDown={() => {}}
            role="presentation"
          />
          <div className="absolute top-full right-0 mt-1 z-50 bg-base-100 border border-base-content/10 rounded-lg shadow-lg p-3 min-w-[260px]">
            {/* Presets */}
            <div className="flex flex-wrap gap-1 mb-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => handlePreset(preset.days)}
                >
                  {t(`dashDateFilter.${preset.key}`) ?? preset.key}
                </button>
              ))}
            </div>

            {/* Custom range */}
            <div className="flex items-center gap-2 mb-3">
              <input
                ref={fromRef}
                type="date"
                className="input input-bordered input-xs flex-1"
                defaultValue={value?.from ?? ""}
              />
              <span className="text-xs text-base-content/50">~</span>
              <input
                ref={toRef}
                type="date"
                className="input input-bordered input-xs flex-1"
                defaultValue={value?.to ?? ""}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setOpen(false)}
              >
                {t("dashDateFilter.cancel") ?? "取消"}
              </button>
              <button
                type="button"
                className="btn btn-xs btn-primary"
                onClick={handleApply}
              >
                {t("dashDateFilter.apply") ?? "确定"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
