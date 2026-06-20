import { LOCALES, type LocaleCode } from "../store-locale";

function toBcp47(locale: LocaleCode): string {
  return LOCALES[locale].bcp47;
}

export function formatDate(
  date: Date | number | string,
  locale: LocaleCode,
  style: "short" | "medium" | "long" = "medium",
): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { month: "numeric", day: "numeric" }
      : style === "long"
        ? {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          }
        : { year: "numeric", month: "long", day: "numeric" };
  return new Intl.DateTimeFormat(toBcp47(locale), options).format(d);
}

export function formatNumber(num: number, locale: LocaleCode): string {
  return new Intl.NumberFormat(toBcp47(locale)).format(num);
}

export function formatCurrency(
  amount: number,
  locale: LocaleCode,
  currency = "CNY",
): string {
  return new Intl.NumberFormat(toBcp47(locale), {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatRelativeTime(
  date: Date | number,
  locale: LocaleCode,
): string {
  const now = Date.now();
  const diff = new Date(date).getTime() - now;
  const seconds = Math.round(diff / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(toBcp47(locale), { numeric: "auto" });

  if (Math.abs(days) >= 1) return rtf.format(days, "day");
  if (Math.abs(hours) >= 1) return rtf.format(hours, "hour");
  if (Math.abs(minutes) >= 1) return rtf.format(minutes, "minute");
  return rtf.format(seconds, "second");
}
