import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/zh-cn";

// 扩展 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区为上海时间
dayjs.tz.setDefault("Asia/Shanghai");

// 设置默认语言为中文
dayjs.locale("zh-cn");

/**
 * 获取上海时区的当前时间
 * @returns dayjs 对象（上海时区）
 */
export function now() {
  return dayjs.tz("Asia/Shanghai");
}

/**
 * 将日期转换为上海时区
 * @param date 日期（Date、string、number 或 dayjs 对象）
 * @returns dayjs 对象（上海时区）
 */
export function toShanghai(date?: dayjs.ConfigType) {
  return dayjs.tz(date, "Asia/Shanghai");
}

export default dayjs;
