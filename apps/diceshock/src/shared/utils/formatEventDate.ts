import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import isYesterday from "dayjs/plugin/isYesterday";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.locale("zh-cn");

/**
 * 格式化活动日期，显示人性化的时间表述
 * @param eventDate 活动日期（Date 或 string）
 * @returns 格式化后的日期字符串
 */
export function formatEventDate(eventDate: Date | string | null | undefined): string {
  if (!eventDate) return "";

  const date = dayjs(eventDate);
  const now = dayjs();

  // 如果活动已过期（在当前时间之前）
  if (date.isBefore(now, "minute")) {
    return "已过期";
  }

  // 今天：显示 "今天 HH:mm"
  if (date.isToday()) {
    return `今天 ${date.format("HH:mm")}`;
  }

  // 明天：显示 "明天 HH:mm"
  if (date.isTomorrow()) {
    return `明天 ${date.format("HH:mm")}`;
  }

  // 昨天：显示 "昨天 HH:mm"（虽然理论上不应该出现，但为了完整性）
  if (date.isYesterday()) {
    return `昨天 ${date.format("HH:mm")}`;
  }

  // 本周内：显示 "周X HH:mm"
  const daysDiff = date.diff(now, "day");
  if (daysDiff >= 0 && daysDiff < 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${weekdays[date.day()]} ${date.format("HH:mm")}`;
  }

  // 下周：显示 "下周一" 等
  if (daysDiff >= 7 && daysDiff < 14) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `下${weekdays[date.day()]} ${date.format("HH:mm")}`;
  }

  // 更远的日期：显示 "MM月DD日 HH:mm"
  return date.format("MM月DD日 HH:mm");
}
