import dayjs from "./dayjs-config";

/**
 * 格式化日期时间为上海时区的本地化字符串
 * @param date 日期（Date、string 或 number）
 * @returns 格式化后的日期时间字符串（上海时区）
 */
export function formatDateToShanghai(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  
  const d = dayjs.tz(date, "Asia/Shanghai");
  
  // 检查日期是否有效
  if (!d.isValid()) {
    return "—";
  }
  
  // 使用 dayjs 将日期转换为上海时区，然后格式化为本地化字符串
  return d.format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 格式化日期时间为上海时区的本地化字符串（使用 toLocaleString 格式）
 * @param date 日期（Date、string 或 number）
 * @returns 格式化后的日期时间字符串（上海时区，中文格式）
 */
export function formatDateToLocaleString(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  
  const d = dayjs.tz(date, "Asia/Shanghai").toDate();
  
  // 检查日期是否有效
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  
  return d.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
