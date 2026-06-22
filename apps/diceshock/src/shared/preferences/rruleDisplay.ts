// ─── RRule Human-Readable Display (Chinese) ───────────────────────
// Pure string parsing — no external dependencies.

const DAY_MAP: Record<string, string> = {
  MO: "一",
  TU: "二",
  WE: "三",
  TH: "四",
  FR: "五",
  SA: "六",
  SU: "日",
};

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR"];
const WEEKENDS = ["SA", "SU"];

/**
 * Convert rrule string to human-readable Chinese description.
 * Only supports FREQ=WEEKLY with BYDAY and optional DTSTART/DTEND time window.
 *
 * Examples:
 *   "FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00" → "每周三 19:00-22:00"
 *   "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;DTSTART=T19:00;DTEND=T22:00" → "工作日 19:00-22:00"
 *   "FREQ=WEEKLY;BYDAY=SA,SU;DTSTART=T14:00;DTEND=T22:00" → "每周六、日 14:00-22:00"
 *   "FREQ=WEEKLY" → "每天"
 */
export function rruleToHumanReadable(rrule: string): string {
  const parts = rrule.split(";");
  const params: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) params[key] = value;
  }

  // Build day description
  let dayDesc = "";
  const byDay = params.BYDAY?.split(",") ?? [];

  if (byDay.length === 0) {
    dayDesc = "每天";
  } else if (byDay.length === 5 && WEEKDAYS.every((d) => byDay.includes(d))) {
    dayDesc = "工作日";
  } else if (byDay.length === 2 && WEEKENDS.every((d) => byDay.includes(d))) {
    dayDesc = "每周六、日";
  } else if (byDay.length === 7) {
    dayDesc = "每天";
  } else {
    const dayNames = byDay.map((d) => DAY_MAP[d] ?? d);
    dayDesc = `每周${dayNames.join("、")}`;
  }

  // Build time description
  let timeDesc = "";
  const startTime = params.DTSTART?.replace("T", "") ?? "";
  const endTime = params.DTEND?.replace("T", "") ?? "";
  if (startTime && endTime) {
    timeDesc = ` ${startTime}-${endTime}`;
  } else if (startTime) {
    timeDesc = ` ${startTime} 起`;
  }

  return `${dayDesc}${timeDesc}`;
}
