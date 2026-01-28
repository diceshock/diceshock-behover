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
  
  // 先检查原始日期是否有效（如果是 Date 对象）
  if (date instanceof Date && Number.isNaN(date.getTime())) {
    return "—";
  }
  
  // 使用 dayjs 处理日期，先检查有效性
  const d = dayjs.tz(date, "Asia/Shanghai");
  
  // 检查 dayjs 对象是否有效
  if (!d.isValid()) {
    return "—";
  }
  
  // 转换为 Date 对象用于 toLocaleString
  const dateObj = d.toDate();
  
  // 再次检查转换后的 Date 对象是否有效
  if (Number.isNaN(dateObj.getTime())) {
    return "—";
  }
  
  return dateObj.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
