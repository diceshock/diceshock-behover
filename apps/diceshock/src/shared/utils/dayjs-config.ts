import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/zh-cn";
import "dayjs/locale/ja";
import "dayjs/locale/de";
import "dayjs/locale/fr";
import "dayjs/locale/es";
import "dayjs/locale/pt";
import "dayjs/locale/ru";

// 扩展 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区为上海时间
dayjs.tz.setDefault("Asia/Shanghai");

/**
 * 获取上海时区的当前时间
 * @returns dayjs 对象（上海时区）
 */
export function now() {
  return dayjs().tz("Asia/Shanghai");
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

const localeMap: Record<string, string> = {
  zh_Hans: "zh-cn",
  zh_Hant: "zh-tw",
  en: "en",
  ja: "ja",
  ru: "ru",
  es: "es",
  pt: "pt",
  fr: "fr",
  de: "de",
};

/**
 * Set dayjs locale dynamically from the app's LocaleCode.
 * Call this when the user switches language.
 */
export function setDayjsLocale(locale: string): void {
  const mapped = localeMap[locale] ?? "en";
  dayjs.locale(mapped);
}
