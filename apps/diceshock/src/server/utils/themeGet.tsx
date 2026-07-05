import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { HonoCtxEnv } from "@/shared/types";

export default function themeGet(c: Context<HonoCtxEnv>) {
  const crossData = c.get("InjectCrossData");
  const dbTheme = (crossData?.UserInfo as Record<string, unknown> | undefined)
    ?.preferred_theme as string | undefined;
  const cookieTheme = getCookie(c, "syft-theme");

  // Priority: DB preference > cookie > default "light"
  const theme = dbTheme || cookieTheme || "light";
  setCookie(c, "syft-theme", theme);

  return [
    <div
      key="theme"
      className="size-0 opacity-0 overflow-hidden pointer-events-none"
    >
      <input
        value="light"
        type="checkbox"
        id="syft-theme-controller"
        defaultChecked={theme === "light"}
        className="theme-controller"
      />
    </div>,
    theme,
  ] as const;
}
