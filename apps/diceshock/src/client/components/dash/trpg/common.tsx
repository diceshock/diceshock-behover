import type { ReactNode } from "react";
import dayjs from "@/shared/utils/dayjs-config";
export const localTime = (value?: string | null) =>
  value ? dayjs(value).tz("Asia/Shanghai").format("YYYY-MM-DDTHH:mm") : "";
export const displayTime = (value?: string | null) =>
  localTime(value).replace("T", " ");
export const instant = (value: FormDataEntryValue | null) =>
  value ? `${value}:00+08:00` : null;
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="fieldset min-w-0">
      <span className="fieldset-legend">{label}</span>
      {children}
    </label>
  );
}
export function ErrorMessage({ error }: { error?: string }) {
  return error ? (
    <div role="alert" className="alert alert-error text-sm">
      {error}
    </div>
  ) : null;
}
