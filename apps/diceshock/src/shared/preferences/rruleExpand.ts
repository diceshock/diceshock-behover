// ─── RRule Date Expansion ─────────────────────────────────────────
// Uses rrule library for date expansion, plus custom DTSTART/DTEND
// time-window parsing (non-standard extension to the RRULE format).

import { RRule } from "rrule";

export interface DateRange {
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

/**
 * Expand an rrule string into concrete date+time ranges within a window.
 *
 * Our custom rrule format includes DTSTART=T19:00;DTEND=T22:00 for time
 * windows, which are NOT standard RRULE fields. We extract them separately
 * and let the rrule library handle only the date expansion.
 *
 * Example:
 *   expandRruleToDateRanges(
 *     "FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00",
 *     new Date("2025-06-01"),
 *     new Date("2025-06-30"),
 *   )
 *   → [{ date: "2025-06-04", start: "19:00", end: "22:00" }, ...]
 */
export function expandRruleToDateRanges(
  rruleStr: string,
  fromDate: Date,
  toDate: Date,
): DateRange[] {
  const parts = rruleStr.split(";");
  const params: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) params[key] = value;
  }

  const startTime = params.DTSTART?.replace("T", "") ?? "00:00";
  const endTime = params.DTEND?.replace("T", "") ?? "23:59";

  // Build standard rrule (without our custom DTSTART/DTEND time params)
  const rruleParts: string[] = [];
  if (params.FREQ) rruleParts.push(`FREQ=${params.FREQ}`);
  if (params.BYDAY) rruleParts.push(`BYDAY=${params.BYDAY}`);
  if (params.INTERVAL) rruleParts.push(`INTERVAL=${params.INTERVAL}`);

  // Parse with rrule library
  const rule = RRule.fromString(
    `RRULE:${rruleParts.join(";")}\nDTSTART:${formatDateForRRule(fromDate)}`,
  );

  const occurrences = rule.between(fromDate, toDate, true);

  return occurrences.map((date) => ({
    date: formatDate(date),
    start: startTime,
    end: endTime,
  }));
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateForRRule(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}T000000Z`;
}
