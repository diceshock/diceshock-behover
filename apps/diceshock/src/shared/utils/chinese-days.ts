const CDN_BASE = "https://cdn.jsdelivr.net/npm/chinese-days/dist";

// CDN JSON value format: "NameEN,NameCN,dayCount"
type HolidayRecord = Record<string, string>;

interface ChineseDaysData {
  holidays: HolidayRecord;
  workdays: HolidayRecord; // 调休补班日
  inLieuDays: HolidayRecord; // 调休休息日
}

let cachedData: ChineseDaysData | null = null;

function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseName(raw: string): string {
  const parts = raw.split(",");
  return parts[1] ?? parts[0] ?? "";
}

export async function loadChineseDays(): Promise<ChineseDaysData> {
  if (cachedData) return cachedData;

  const res = await fetch(`${CDN_BASE}/chinese-days.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch chinese-days data: ${res.status}`);
  }
  cachedData = (await res.json()) as ChineseDaysData;
  return cachedData;
}

// workday = in workdays dict (调休补班) OR Mon–Fri not in holidays dict
export async function isWorkday(
  date: string | number | Date,
): Promise<boolean> {
  const data = await loadChineseDays();
  const key = formatDate(date);
  const day = new Date(key).getDay();

  return !!(
    data.workdays[key] ||
    (day >= 1 && day <= 5 && !data.holidays[key])
  );
}

// holiday = in holidays dict (法定节假日) OR Sat/Sun not in workdays dict
export async function isHoliday(
  date: string | number | Date,
): Promise<boolean> {
  const data = await loadChineseDays();
  const key = formatDate(date);
  const day = new Date(key).getDay();

  return !!(
    data.holidays[key] ||
    ((day === 0 || day === 6) && !data.workdays[key])
  );
}

export async function isInLieu(date: string | number | Date): Promise<boolean> {
  const data = await loadChineseDays();
  return !!data.inLieuDays[formatDate(date)];
}

export async function getDayDetail(
  date: string | number | Date,
): Promise<{ work: boolean; name: string; date: string }> {
  const data = await loadChineseDays();
  const key = formatDate(date);
  const work = await isWorkday(date);

  const raw =
    data.holidays[key] ?? data.workdays[key] ?? data.inLieuDays[key] ?? "";
  const name = raw ? parseName(raw) : "";

  return { work, name, date: key };
}

export async function getWorkdaysInRange(
  start: string | number | Date,
  end: string | number | Date,
): Promise<string[]> {
  await loadChineseDays();
  const result: string[] = [];
  const current = new Date(formatDate(start));
  const endDate = new Date(formatDate(end));

  while (current <= endDate) {
    if (await isWorkday(current)) {
      result.push(formatDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export async function getHolidaysInRange(
  start: string | number | Date,
  end: string | number | Date,
): Promise<string[]> {
  await loadChineseDays();
  const result: string[] = [];
  const current = new Date(formatDate(start));
  const endDate = new Date(formatDate(end));

  while (current <= endDate) {
    if (await isHoliday(current)) {
      result.push(formatDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}
