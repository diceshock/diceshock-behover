const CDN_URL = "https://cdn.jsdelivr.net/npm/chinese-days/dist/index.es.js";

type ChineseDaysModule = {
  isWorkday: (date: string | number | Date) => boolean;
  isHoliday: (date: string | number | Date) => boolean;
  isInLieu: (date: string | number | Date) => boolean;
  getDayDetail: (date: string | number | Date) => {
    work: boolean;
    name: string;
    date: string;
  };
  getHolidaysInRange: (
    start: string | number | Date,
    end: string | number | Date,
    includeWeekends?: boolean,
  ) => string[];
  getWorkdaysInRange: (
    start: string | number | Date,
    end: string | number | Date,
    includeWeekends?: boolean,
  ) => string[];
};

let cachedModule: ChineseDaysModule | null = null;

export async function loadChineseDays(): Promise<ChineseDaysModule> {
  if (cachedModule) return cachedModule;
  const mod = (await import(/* @vite-ignore */ CDN_URL)) as
    | ChineseDaysModule
    | { default: ChineseDaysModule };
  cachedModule =
    "isWorkday" in mod ? mod : (mod as { default: ChineseDaysModule }).default;
  return cachedModule;
}

export async function isWorkday(
  date: string | number | Date,
): Promise<boolean> {
  const cd = await loadChineseDays();
  return cd.isWorkday(date);
}

export async function isHoliday(
  date: string | number | Date,
): Promise<boolean> {
  const cd = await loadChineseDays();
  return cd.isHoliday(date);
}

export async function getDayDetail(
  date: string | number | Date,
): Promise<{ work: boolean; name: string; date: string }> {
  const cd = await loadChineseDays();
  return cd.getDayDetail(date);
}

export async function getWorkdaysInRange(
  start: string | number | Date,
  end: string | number | Date,
): Promise<string[]> {
  const cd = await loadChineseDays();
  return cd.getWorkdaysInRange(start, end);
}

export async function getHolidaysInRange(
  start: string | number | Date,
  end: string | number | Date,
): Promise<string[]> {
  const cd = await loadChineseDays();
  return cd.getHolidaysInRange(start, end);
}
